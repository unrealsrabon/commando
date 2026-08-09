// Commando agent — local PTY bridge.
//
// Listens on 127.0.0.1:8787 and speaks the Commando WebSocket protocol with
// the browser. Only one connection is allowed at a time; a second connect
// kicks the first.
//
// Flags:
//   --install    Register the agent as a system service (macOS / Linux) and exit.
//   --uninstall  Remove the system service and exit.
//
// Protocol (JSON over WebSocket, all data payloads are base64):
//
//   Browser → Agent
//     {"type":"hello","token":"<tok>"}
//     {"type":"open","session":"<id>"}     // spawns a new shell, or reattaches
//                                          // to an existing one and replays its
//                                          // buffered output
//     {"type":"close","session":"<id>"}    // explicitly kills the shell
//     {"type":"stdin","session":"<id>","data":"<b64>"}
//     {"type":"resize","session":"<id>","cols":N,"rows":N}
//
//   Agent → Browser
//     {"type":"ready"}
//     {"type":"sessions","ids":["<id>",...]} // shells still alive from before
//     {"type":"stdout","session":"<id>","data":"<b64>"}
//     {"type":"exit","session":"<id>","code":N}
//     {"type":"error","message":"<msg>"}
//
// Shells are NOT killed when the browser disconnects. This lets a page refresh
// or brief network blip reattach to still-running processes (long scans, reverse
// shell listeners) without losing them. On reattach the agent replays a rolling
// per-session output buffer so the terminal screen is restored.
package main


import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"unsafe"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

// ─────────────── config ───────────────────────────────────────────────────

const (
	defaultAddr  = "127.0.0.1:8787"
	tokenBytes   = 24     // 24 random bytes → 32-char base64url token
	serviceLabel = "io.commando.agent"
	scrollbackMax = 262144 // 256 KiB rolling output buffer per session (for replay)
)


// ─────────────── persistent token + config dir ────────────────────────────

// commandoDir returns ~/.commando, creating it if needed.
func commandoDir() (string, error) {
	u, err := user.Current()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(u.HomeDir, ".commando")
	return dir, os.MkdirAll(dir, 0700)
}

// loadOrCreateToken returns the permanent agent token.
// On first run it generates a random token and writes it to ~/.commando/token.
// On subsequent runs it reads and reuses that same token.
func loadOrCreateToken() (string, error) {
	dir, err := commandoDir()
	if err != nil {
		return "", err
	}
	tokenPath := filepath.Join(dir, "token")

	// Try to read an existing token.
	if data, err := os.ReadFile(tokenPath); err == nil {
		if tok := strings.TrimSpace(string(data)); tok != "" {
			return tok, nil
		}
	}

	// Generate a new permanent token and store it.
	raw := make([]byte, tokenBytes)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	tok := base64.URLEncoding.EncodeToString(raw)
	if err := os.WriteFile(tokenPath, []byte(tok+"\n"), 0600); err != nil {
		return "", err
	}
	return tok, nil
}

// ─────────────── system service install / uninstall ───────────────────────

// installSelf copies the running binary to ~/.commando/commando-agent.
func installSelf() (string, error) {
	dir, err := commandoDir()
	if err != nil {
		return "", err
	}

	exe, err := os.Executable()
	if err != nil {
		return "", err
	}

	dest := filepath.Join(dir, "commando-agent")

	src, err := os.Open(exe)
	if err != nil {
		return "", err
	}
	defer src.Close()

	dst, err := os.OpenFile(dest, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0755)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", err
	}
	return dest, nil
}

func installService() error {
	binPath, err := installSelf()
	if err != nil {
		return fmt.Errorf("could not install binary: %w", err)
	}

	token, err := loadOrCreateToken()
	if err != nil {
		return err
	}

	switch runtime.GOOS {
	case "darwin":
		if err := installMacOS(binPath); err != nil {
			return err
		}
	case "linux":
		if err := installLinux(binPath); err != nil {
			return err
		}
	default:
		return fmt.Errorf("--install is only supported on macOS and Linux")
	}

	fmt.Println("Commando agent installed as a system service.")
	fmt.Println("It will start automatically on every login.")
	fmt.Println()
	fmt.Printf("  Binary  : %s\n", binPath)
	fmt.Printf("  Token   : %s\n", token)
	fmt.Println()
	fmt.Println("Paste the token into the Connect dialog once.")
	fmt.Println("The browser will remember it — you will never be asked again.")
	fmt.Println()
	fmt.Println("To uninstall: commando-agent --uninstall")
	return nil
}

const macOSPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>io.commando.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>%s</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/commando-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/commando-agent.log</string>
</dict>
</plist>
`

func installMacOS(binPath string) error {
	u, err := user.Current()
	if err != nil {
		return err
	}
	plistDir := filepath.Join(u.HomeDir, "Library", "LaunchAgents")
	if err := os.MkdirAll(plistDir, 0755); err != nil {
		return err
	}
	plistPath := filepath.Join(plistDir, serviceLabel+".plist")

	if err := os.WriteFile(plistPath, []byte(fmt.Sprintf(macOSPlist, binPath)), 0644); err != nil {
		return err
	}

	// Unload any existing instance then load fresh.
	_ = exec.Command("launchctl", "unload", "-w", plistPath).Run()
	return exec.Command("launchctl", "load", "-w", plistPath).Run()
}

const linuxUnit = `[Unit]
Description=Commando Agent
After=network.target

[Service]
ExecStart=%s
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`

func installLinux(binPath string) error {
	u, err := user.Current()
	if err != nil {
		return err
	}
	unitDir := filepath.Join(u.HomeDir, ".config", "systemd", "user")
	if err := os.MkdirAll(unitDir, 0755); err != nil {
		return err
	}
	unitPath := filepath.Join(unitDir, "commando-agent.service")

	if err := os.WriteFile(unitPath, []byte(fmt.Sprintf(linuxUnit, binPath)), 0644); err != nil {
		return err
	}

	_ = exec.Command("systemctl", "--user", "daemon-reload").Run()
	return exec.Command("systemctl", "--user", "enable", "--now", "commando-agent").Run()
}

func uninstallService() error {
	u, err := user.Current()
	if err != nil {
		return err
	}
	switch runtime.GOOS {
	case "darwin":
		plistPath := filepath.Join(u.HomeDir, "Library", "LaunchAgents", serviceLabel+".plist")
		_ = exec.Command("launchctl", "unload", "-w", plistPath).Run()
		_ = os.Remove(plistPath)
	case "linux":
		_ = exec.Command("systemctl", "--user", "disable", "--now", "commando-agent").Run()
		_ = os.Remove(filepath.Join(u.HomeDir, ".config", "systemd", "user", "commando-agent.service"))
		_ = exec.Command("systemctl", "--user", "daemon-reload").Run()
	default:
		return fmt.Errorf("--uninstall is only supported on macOS and Linux")
	}
	fmt.Println("Commando agent uninstalled.")
	return nil
}

// ─────────────── PTY session ──────────────────────────────────────────────

type session struct {
	id   string
	ptmx *os.File
	cmd  *exec.Cmd

	bufMu sync.Mutex // protects buf
	buf   []byte     // rolling scrollback for replay on reattach
	cols  uint16     // last known terminal size, re-applied on reattach
	rows  uint16
}

func (s *session) close() {
	if s.cmd.Process != nil {
		_ = s.cmd.Process.Kill()
	}
	_ = s.ptmx.Close()
}

// appendOutput records PTY output into the rolling buffer, discarding the
// oldest bytes once it exceeds scrollbackMax so memory stays bounded.
func (s *session) appendOutput(p []byte) {
	s.bufMu.Lock()
	defer s.bufMu.Unlock()
	s.buf = append(s.buf, p...)
	if len(s.buf) > scrollbackMax {
		s.buf = s.buf[len(s.buf)-scrollbackMax:]
	}
}

// snapshot returns a copy of the current scrollback for replay.
func (s *session) snapshot() []byte {
	s.bufMu.Lock()
	defer s.bufMu.Unlock()
	out := make([]byte, len(s.buf))
	copy(out, s.buf)
	return out
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

	// NOTE: we intentionally do NOT kill shells when the browser disconnects.
	// Sessions keep running so a refresh or brief drop can reattach to them.
	// Only detach the connection here.
	defer func() {
		h.writeMu.Lock()
		if h.conn == ws {
			h.conn = nil
		}
		h.writeMu.Unlock()
		_ = ws.Close()
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

	// Tell the browser which shells are still alive so it can reattach to them.
	h.mu.Lock()
	ids := make([]string, 0, len(h.sessions))
	for id := range h.sessions {
		ids = append(ids, id)
	}
	h.mu.Unlock()
	h.send(map[string]any{"type": "sessions", "ids": ids})

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

		case "listwordlists":
			var roots []string
			_ = json.Unmarshal(msg["roots"], &roots)
			// Scan in a goroutine so a large tree never blocks the message loop
			// (which also carries terminal keystrokes).
			go h.listWordlists(roots)
		}

	}
}

// ─────────────── session lifecycle ────────────────────────────────────────

func (h *hub) openSession(id string) {
	h.mu.Lock()

	// Reattach path: the shell already exists (e.g. after a browser refresh).
	// Replay its buffered output and re-apply the last known size instead of
	// spawning a new shell.
	if existing, ok := h.sessions[id]; ok {
		h.mu.Unlock()
		data := existing.snapshot()
		if len(data) > 0 {
			h.send(map[string]any{
				"type":    "stdout",
				"session": id,
				"data":    base64.StdEncoding.EncodeToString(data),
			})
		}
		if existing.cols > 0 && existing.rows > 0 {
			h.resize(id, existing.cols, existing.rows)
		}
		return
	}

	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "/bin/bash"
	}

	cmd := exec.Command(shell, "-l")
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")

	if homeDir, err := os.UserHomeDir(); err == nil {
		cmd.Dir = homeDir
	}

	ptmx, err := pty.Start(cmd)
	if err != nil {
		h.mu.Unlock()
		log.Println("pty.Start:", err)
		h.sendError("could not spawn PTY: " + err.Error())
		return
	}

	s := &session{id: id, ptmx: ptmx, cmd: cmd}
	h.sessions[id] = s
	h.mu.Unlock()

	// Stream PTY output → rolling buffer + WebSocket.
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := ptmx.Read(buf)
			if n > 0 {
				s.appendOutput(buf[:n])
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
	// Remember the size so a reattaching client can be restored to it.
	s.cols = cols
	s.rows = rows
	ws := struct{ Row, Col, Xpixel, Ypixel uint16 }{rows, cols, 0, 0}

	syscall.Syscall(
		syscall.SYS_IOCTL,
		s.ptmx.Fd(),
		uintptr(syscall.TIOCSWINSZ),
		uintptr(unsafe.Pointer(&ws)),
	)
}

// ─────────────── wordlist discovery ───────────────────────────────────────

// Bounds that keep a scan featherweight even on huge trees like full SecLists.
const (
	wordlistMaxDepth = 6    // how deep to descend under each root
	wordlistMaxItems = 2000 // total files returned across all roots
)

// wordlistExts are the file kinds we treat as wordlists.
var wordlistExts = map[string]bool{
	".txt": true, ".lst": true, ".dic": true, ".dict": true,
	".words": true, ".wordlist": true, ".list": true,
}

type wordlistItem struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// listWordlists scans the given root folders for wordlist files and sends the
// result back to the browser. It is depth- and count-bounded, skips folders it
// cannot read, and never follows directory symlinks (so it cannot loop). It
// retains nothing after replying — the work is fully on-demand.
func (h *hub) listWordlists(roots []string) {
	items := make([]wordlistItem, 0, 64)
	seen := make(map[string]bool)
	truncated := false

	for _, root := range roots {
		root = strings.TrimSpace(root)
		if root == "" {
			continue
		}
		info, err := os.Stat(root)
		if err != nil || !info.IsDir() {
			continue // missing/!dir roots are skipped silently
		}
		rootDepth := strings.Count(filepath.Clean(root), string(os.PathSeparator))

		_ = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
			if err != nil {
				if d != nil && d.IsDir() {
					return filepath.SkipDir // unreadable dir → skip its subtree
				}
				return nil
			}
			if len(items) >= wordlistMaxItems {
				truncated = true
				return filepath.SkipAll
			}
			if d.IsDir() {
				// Do not descend into symlinked directories (avoids loops) and
				// respect the depth cap.
				if d.Type()&os.ModeSymlink != 0 {
					return filepath.SkipDir
				}
				depth := strings.Count(filepath.Clean(path), string(os.PathSeparator)) - rootDepth
				if depth >= wordlistMaxDepth {
					return filepath.SkipDir
				}
				return nil
			}
			if wordlistExts[strings.ToLower(filepath.Ext(path))] && !seen[path] {
				seen[path] = true
				items = append(items, wordlistItem{Name: filepath.Base(path), Path: path})
			}
			return nil
		})
		if len(items) >= wordlistMaxItems {
			break
		}
	}

	h.send(map[string]any{"type": "wordlists", "items": items, "truncated": truncated})
}

// ─────────────── entry point ──────────────────────────────────────────────


func main() {
	args := os.Args[1:]

	// Handle install / uninstall flags before starting the server.
	for _, a := range args {
		switch a {
		case "--install":
			if err := installService(); err != nil {
				log.Fatal(err)
			}
			return
		case "--uninstall":
			if err := uninstallService(); err != nil {
				log.Fatal(err)
			}
			return
		}
	}

	addr := defaultAddr
	for _, a := range args {
		if !strings.HasPrefix(a, "--") {
			addr = a
			break
		}
	}

	// Load (or create on first run) the permanent token.
	token, err := loadOrCreateToken()
	if err != nil {
		log.Fatal("could not load token:", err)
	}

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
