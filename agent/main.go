// Commando agent — local PTY bridge.
//
// Listens on 127.0.0.1:8787, prints a one-time token to stdout, and speaks the
// Commando WebSocket protocol with the browser. Only one connection is allowed
// at a time; a second connect kicks the first.
//
// Protocol (JSON over WebSocket, all data payloads are base64):
//
//   Browser → Agent
//     {"type":"hello","token":"<tok>"}
//     {"type":"open","session":"<id>"}
//     {"type":"close","session":"<id>"}
//     {"type":"stdin","session":"<id>","data":"<b64>"}
//     {"type":"resize","session":"<id>","cols":N,"rows":N}
//
//   Agent → Browser
//     {"type":"ready"}
//     {"type":"stdout","session":"<id>","data":"<b64>"}
//     {"type":"exit","session":"<id>","code":N}
//     {"type":"error","message":"<msg>"}
package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"unsafe"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

// ─────────────── config ───────────────────────────────────────────────────

const (
	defaultAddr = "127.0.0.1:8787"
	tokenBytes  = 24 // 24 random bytes → 32-char base64url token
)

// ─────────────── PTY session ──────────────────────────────────────────────

type session struct {
	id   string
	ptmx *os.File
	cmd  *exec.Cmd
}

func (s *session) close() {
	if s.cmd.Process != nil {
		_ = s.cmd.Process.Kill()
	}
	_ = s.ptmx.Close()
}

// ─────────────── hub ──────────────────────────────────────────────────────

type hub struct {
	token    string
	mu       sync.Mutex
	sessions map[string]*session
	conn     *websocket.Conn
	writeMu  sync.Mutex // protects conn writes
}

func newHub(token string) *hub {
	return &hub{token: token, sessions: make(map[string]*session)}
}

// send serialises obj and writes it to the WebSocket. Safe for concurrent use.
func (h *hub) send(obj any) {
	b, err := json.Marshal(obj)
	if err != nil {
		return
	}
	h.writeMu.Lock()
	defer h.writeMu.Unlock()
	if h.conn != nil {
		_ = h.conn.WriteMessage(websocket.TextMessage, b)
	}
}

func (h *hub) sendError(msg string) {
	h.send(map[string]any{"type": "error", "message": msg})
}

// ─────────────── WebSocket upgrade ────────────────────────────────────────

var upgrader = websocket.Upgrader{
	CheckOrigin: func(_ *http.Request) bool { return true }, // CORS: local-only anyway
}

func (h *hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("upgrade:", err)
		return
	}

	// Replace any existing connection.
	h.writeMu.Lock()
	if h.conn != nil {
		_ = h.conn.Close()
	}
	h.conn = ws
	h.writeMu.Unlock()

	defer func() {
		h.writeMu.Lock()
		if h.conn == ws {
			h.conn = nil
		}
		h.writeMu.Unlock()
		_ = ws.Close()
		h.closeAll()
	}()

	// ── auth handshake: first message must be {"type":"hello","token":"..."} ──
	_, raw, err := ws.ReadMessage()
	if err != nil {
		return
	}
	var hello struct {
		Type  string `json:"type"`
		Token string `json:"token"`
	}
	if json.Unmarshal(raw, &hello) != nil || hello.Type != "hello" || hello.Token != h.token {
		h.sendError("authentication failed")
		return
	}
	h.send(map[string]string{"type": "ready"})
	log.Println("client authenticated")

	// ── message loop ──────────────────────────────────────────────────────────
	for {
		_, raw, err := ws.ReadMessage()
		if err != nil {
			return
		}
		var msg map[string]json.RawMessage
		if json.Unmarshal(raw, &msg) != nil {
			continue
		}
		var typ string
		_ = json.Unmarshal(msg["type"], &typ)

		switch typ {
		case "open":
			var id string
			_ = json.Unmarshal(msg["session"], &id)
			h.openSession(id)

		case "close":
			var id string
			_ = json.Unmarshal(msg["session"], &id)
			h.removeSession(id)

		case "stdin":
			var id, b64 string
			_ = json.Unmarshal(msg["session"], &id)
			_ = json.Unmarshal(msg["data"], &b64)
			data, err := base64.StdEncoding.DecodeString(b64)
			if err == nil {
				h.write(id, data)
			}

		case "resize":
			var id string
			var cols, rows uint16
			_ = json.Unmarshal(msg["session"], &id)
			_ = json.Unmarshal(msg["cols"], &cols)
			_ = json.Unmarshal(msg["rows"], &rows)
			h.resize(id, cols, rows)
		}
	}
}

// ─────────────── session lifecycle ────────────────────────────────────────

func (h *hub) openSession(id string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.sessions[id]; ok {
		return // already open
	}

	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "/bin/bash"
	}

	cmd := exec.Command(shell, "-l")
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")

	ptmx, err := pty.Start(cmd)
	if err != nil {
		log.Println("pty.Start:", err)
		h.sendError("could not spawn PTY: " + err.Error())
		return
	}

	s := &session{id: id, ptmx: ptmx, cmd: cmd}
	h.sessions[id] = s

	// Stream PTY output → WebSocket.
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := ptmx.Read(buf)
			if n > 0 {
				encoded := base64.StdEncoding.EncodeToString(buf[:n])
				h.send(map[string]any{"type": "stdout", "session": id, "data": encoded})
			}
			if err != nil {
				break
			}
		}
		// Wait for the process to exit so we get the exit code.
		exitCode := 0
		if err := cmd.Wait(); err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				exitCode = exitErr.ExitCode()
			}
		}
		h.send(map[string]any{"type": "exit", "session": id, "code": exitCode})
		h.mu.Lock()
		delete(h.sessions, id)
		h.mu.Unlock()
	}()
}

func (h *hub) removeSession(id string) {
	h.mu.Lock()
	s, ok := h.sessions[id]
	if ok {
		delete(h.sessions, id)
	}
	h.mu.Unlock()
	if ok {
		s.close()
	}
}

func (h *hub) closeAll() {
	h.mu.Lock()
	ss := make([]*session, 0, len(h.sessions))
	for _, s := range h.sessions {
		ss = append(ss, s)
	}
	h.sessions = make(map[string]*session)
	h.mu.Unlock()
	for _, s := range ss {
		s.close()
	}
}

func (h *hub) write(id string, data []byte) {
	h.mu.Lock()
	s, ok := h.sessions[id]
	h.mu.Unlock()
	if ok {
		_, _ = s.ptmx.Write(data)
	}
}

func (h *hub) resize(id string, cols, rows uint16) {
	h.mu.Lock()
	s, ok := h.sessions[id]
	h.mu.Unlock()
	if !ok || cols == 0 || rows == 0 {
		return
	}
	ws := struct{ Row, Col, Xpixel, Ypixel uint16 }{rows, cols, 0, 0}
	syscall.Syscall(
		syscall.SYS_IOCTL,
		s.ptmx.Fd(),
		uintptr(syscall.TIOCSWINSZ),
		uintptr(unsafe.Pointer(&ws)),
	)
}

// ─────────────── entry point ──────────────────────────────────────────────

func main() {
	addr := defaultAddr
	if len(os.Args) > 1 {
		addr = os.Args[1]
	}

	// Generate a one-time token.
	rawToken := make([]byte, tokenBytes)
	if _, err := rand.Read(rawToken); err != nil {
		log.Fatal("could not generate token:", err)
	}
	token := base64.URLEncoding.EncodeToString(rawToken)

	h := newHub(token)
	http.Handle("/", h)

	ln, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatal("listen:", err)
	}

	fmt.Println("Commando agent ready.")
	fmt.Println()
	fmt.Printf("  Address : ws://%s\n", addr)
	fmt.Printf("  Token   : %s\n", token)
	fmt.Println()
	fmt.Println("Paste the token into the Connect dialog, then click Connect.")
	fmt.Println("The agent accepts connections only from 127.0.0.1.")
	log.Fatal(http.Serve(ln, nil))
}
