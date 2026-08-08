/**
 * Terminal sessions store.
 *
 * Owns the list of terminal tabs and the imperative "run" bus that the command
 * builder and workstation cards use. Each tab is one PTY session on the agent;
 * running a command just writes a line to that session's stdin, and the PTY's
 * own echo shows it in the terminal — exactly like typing it yourself.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useConnection } from "./connection";

export interface TermTab {
  id: string;
  title: string;
}

interface TerminalsStore {
  tabs: TermTab[];
  activeId: string | null;
  create: (title?: string) => string;
  close: (id: string) => void;
  setActive: (id: string) => void;
  rename: (id: string, title: string) => void;
  /** Run a command in the active tab (creating one if none exists). */
  runInActive: (command: string) => void;
  /** Run a command in a brand-new tab (e.g. a listener). */
  runInNewTab: (command: string, title: string) => void;
}

const TerminalsCtx = createContext<TerminalsStore | null>(null);

let counter = 0;
function nextId(): string {
  counter += 1;
  return `t${counter}-${Date.now().toString(36)}`;
}

export function TerminalsProvider({ children }: { children: ReactNode }) {
  const { client } = useConnection();
  const [tabs, setTabs] = useState<TermTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  const create = useCallback(
    (title?: string): string => {
      const id = nextId();
      const tab: TermTab = { id, title: title ?? `shell ${tabs.length + 1}` };
      client.open(id);
      setTabs((prev) => [...prev, tab]);
      setActiveId(id);
      activeRef.current = id;
      return id;
    },
    [client, tabs.length],
  );

  const close = useCallback(
    (id: string) => {
      client.closeSession(id);
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeRef.current === id) {
          const fallback = next.length ? next[next.length - 1].id : null;
          setActiveId(fallback);
          activeRef.current = fallback;
        }
        return next;
      });
    },
    [client],
  );

  const setActive = useCallback((id: string) => setActiveId(id), []);

  const rename = useCallback((id: string, title: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
  }, []);

  const runInActive = useCallback(
    (command: string) => {
      const id = activeRef.current;
      if (!id) {
        const newId = create("shell 1");
        // Give the PTY a beat to spawn before feeding it a line.
        window.setTimeout(() => client.run(newId, command), 160);
        return;
      }
      client.run(id, command);
    },
    [client, create],
  );

  const runInNewTab = useCallback(
    (command: string, title: string) => {
      const id = create(title);
      window.setTimeout(() => client.run(id, command), 160);
    },
    [client, create],
  );

  const store = useMemo<TerminalsStore>(
    () => ({ tabs, activeId, create, close, setActive, rename, runInActive, runInNewTab }),
    [tabs, activeId, create, close, setActive, rename, runInActive, runInNewTab],
  );

  return <TerminalsCtx.Provider value={store}>{children}</TerminalsCtx.Provider>;
}

export function useTerminals(): TerminalsStore {
  const ctx = useContext(TerminalsCtx);
  if (!ctx) throw new Error("useTerminals must be used within a TerminalsProvider");
  return ctx;
}
