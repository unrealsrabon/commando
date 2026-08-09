/**
 * Agent connection.
 *
 * Speaks the JSON/WebSocket protocol to the local Commando agent, manages PTY
 * sessions, and streams output to subscribers (the terminal component). All
 * payloads are base64 so binary terminal output survives transport intact.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LS, defaultAgentUrl } from "../config";

export type ConnStatus = "disconnected" | "connecting" | "connected" | "error";

/** One wordlist file discovered by the agent under a configured folder. */
export interface WordlistItem {
  name: string;
  path: string;
}

/** Result of a wordlist scan: the files found plus whether the list was capped. */
export interface WordlistResult {
  items: WordlistItem[];
  truncated: boolean;
  error?: string;
}

type OutputHandler = (data: string) => void;
type ExitHandler = (code: number) => void;
type StatusHandler = (status: ConnStatus, message?: string) => void;
type SessionsHandler = (ids: string[]) => void;
type WordlistsHandler = (result: WordlistResult) => void;


function toB64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export class AgentClient {
  private ws: WebSocket | null = null;
  private token = "";
  private outputs = new Map<string, Set<OutputHandler>>();
  private exits = new Map<string, Set<ExitHandler>>();
  private resets = new Map<string, Set<() => void>>();
  private statusHandlers = new Set<StatusHandler>();
  private sessionsHandlers = new Set<SessionsHandler>();
  private wordlistsHandlers = new Set<WordlistsHandler>();


  status: ConnStatus = "disconnected";
  lastError = "";

  onStatus(cb: StatusHandler): () => void {
    this.statusHandlers.add(cb);
    return () => this.statusHandlers.delete(cb);
  }

  /** Fires after every (re)connect with the list of shells still alive on the agent. */
  onSessions(cb: SessionsHandler): () => void {
    this.sessionsHandlers.add(cb);
    return () => this.sessionsHandlers.delete(cb);
  }

  /** Fires when the agent returns the result of a wordlist scan. */
  onWordlists(cb: WordlistsHandler): () => void {
    this.wordlistsHandlers.add(cb);
    return () => this.wordlistsHandlers.delete(cb);
  }


  private setStatus(status: ConnStatus, message = ""): void {
    this.status = status;
    this.lastError = message;
    this.statusHandlers.forEach((cb) => cb(status, message));
  }

  connect(url: string, token: string): void {
    this.disconnect();
    this.token = token;
    this.setStatus("connecting");
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.setStatus("error", "Invalid agent address");
      return;
    }
    this.ws = ws;

    ws.onopen = () => this.send({ type: "hello", token: this.token });

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      switch (msg.type) {
        case "ready":
          this.setStatus("connected");
          break;
        case "sessions": {
          const ids = Array.isArray(msg.ids) ? msg.ids.map((x) => String(x)) : [];
          this.sessionsHandlers.forEach((cb) => cb(ids));
          break;
        }
        case "stdout": {
          const session = String(msg.session ?? "");
          const data = typeof msg.data === "string" ? fromB64(msg.data) : "";
          this.outputs.get(session)?.forEach((cb) => cb(data));
          break;
        }
        case "exit": {
          const session = String(msg.session ?? "");
          const code = Number(msg.code ?? 0);
          this.exits.get(session)?.forEach((cb) => cb(code));
          break;
        }
        case "wordlists": {
          const rawItems = Array.isArray(msg.items) ? msg.items : [];
          const items: WordlistItem[] = rawItems
            .map((x) => x as Record<string, unknown>)
            .filter((x) => typeof x?.path === "string")
            .map((x) => ({ name: String(x.name ?? ""), path: String(x.path) }));
          const result: WordlistResult = {
            items,
            truncated: Boolean(msg.truncated),
            error: typeof msg.error === "string" ? msg.error : undefined,
          };
          this.wordlistsHandlers.forEach((cb) => cb(result));
          break;
        }
        case "error":
          this.setStatus("error", String(msg.message ?? "Agent error"));
          break;
        default:
          break;

      }
    };

    ws.onerror = () => {
      this.setStatus("error", "Could not reach the agent on this machine");
    };

    ws.onclose = () => {
      if (this.status !== "error") this.setStatus("disconnected");
      this.ws = null;
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
    if (this.status !== "error") this.setStatus("disconnected");
  }

  private send(obj: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  get connected(): boolean {
    return this.status === "connected";
  }

  open(session: string): void {
    this.send({ type: "open", session });
  }

  /**
   * Reattach to a shell that survived a disconnect. Clears the on-screen
   * scrollback first (so the agent's replayed buffer does not stack on top of
   * stale content) then asks the agent to reopen — which replays the buffer.
   */
  reattach(session: string): void {
    this.resets.get(session)?.forEach((cb) => cb());
    this.send({ type: "open", session });
  }

  closeSession(session: string): void {
    this.send({ type: "close", session });
  }

  input(session: string, data: string): void {
    this.send({ type: "stdin", session, data: toB64(data) });
  }

  /** Send a full command line (adds the trailing newline). */
  run(session: string, commandLine: string): void {
    this.input(session, commandLine + "\n");
  }

  resize(session: string, cols: number, rows: number): void {
    this.send({ type: "resize", session, cols, rows });
  }

  /** Ask the agent to scan the given folders for wordlist files. */
  listWordlists(roots: string[]): void {
    this.send({ type: "listwordlists", roots });
  }


  subscribeOutput(session: string, cb: OutputHandler): () => void {
    let set = this.outputs.get(session);
    if (!set) {
      set = new Set();
      this.outputs.set(session, set);
    }
    set.add(cb);
    return () => set?.delete(cb);
  }

  subscribeExit(session: string, cb: ExitHandler): () => void {
    let set = this.exits.get(session);
    if (!set) {
      set = new Set();
      this.exits.set(session, set);
    }
    set.add(cb);
    return () => set?.delete(cb);
  }

  /** Fired right before a reattach replay so the view can clear stale output. */
  subscribeReset(session: string, cb: () => void): () => void {
    let set = this.resets.get(session);
    if (!set) {
      set = new Set();
      this.resets.set(session, set);
    }
    set.add(cb);
    return () => set?.delete(cb);
  }
}

interface ConnectionStore {
  client: AgentClient;
  status: ConnStatus;
  error: string;
  connect: (url: string, token: string) => void;
  disconnect: () => void;
}

const ConnectionCtx = createContext<ConnectionStore | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<AgentClient>();
  if (!clientRef.current) clientRef.current = new AgentClient();
  const client = clientRef.current;

  const [status, setStatus] = useState<ConnStatus>(client.status);
  const [error, setError] = useState<string>(client.lastError);

  useEffect(() => {
    return client.onStatus((s, message) => {
      setStatus(s);
      setError(message ?? "");
    });
  }, [client]);

  // Auto-reconnect on page load using credentials saved from the last session.
  useEffect(() => {
    const savedUrl = localStorage.getItem(LS.agentUrl) ?? defaultAgentUrl();
    const savedToken = localStorage.getItem(LS.token);
    if (savedToken) {
      client.connect(savedUrl, savedToken);
    }
    // Run once on mount only. client ref is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const store = useMemo<ConnectionStore>(
    () => ({
      client,
      status,
      error,
      connect: (url, token) => {
        // Persist credentials so the next page load reconnects automatically.
        localStorage.setItem(LS.agentUrl, url);
        localStorage.setItem(LS.token, token);
        client.connect(url, token);
      },
      disconnect: () => {
        // Clear saved credentials so auto-reconnect does not fire next time.
        localStorage.removeItem(LS.token);
        client.disconnect();
      },
    }),
    [client, status, error],
  );

  return <ConnectionCtx.Provider value={store}>{children}</ConnectionCtx.Provider>;
}

export function useConnection(): ConnectionStore {
  const ctx = useContext(ConnectionCtx);
  if (!ctx) throw new Error("useConnection must be used within a ConnectionProvider");
  return ctx;
}
