/**
 * Terminal sessions store.
 *
 * Owns the list of terminal tabs and the imperative "run" bus that the command
 * builder and workstation cards use. Each tab is one PTY session on the agent;
 * running a command just writes a line to that session's stdin, and the PTY's
 * own echo shows it in the terminal — exactly like typing it yourself.
 *
 * Tabs are persisted to localStorage so a page refresh restores them. Because
 * the agent keeps shells alive across a disconnect, on reconnect we reattach to
 * the survivors (which replays their output) and prune any whose shell has died.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LS } from "../config";
import { useConnection } from "./connection";

export interface TermTab {
  id: string;
  title: string;
}

/** Read the saved tab list, tolerating any malformed/legacy data. */
function loadTabs(): TermTab[] {
  try {
    const raw = localStorage.getItem(LS.tabs);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.id === "string" && typeof x.title === "string")
      .map((x) => ({ id: x.id, title: x.title }));
  } catch {
    return [];
  }
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
  const [tabs, setTabs] = useState<TermTab[]>(() => loadTabs());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const restored = loadTabs();
    return restored.length ? restored[restored.length - 1].id : null;
  });
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;
  // Mirror of tabs so async agent callbacks read the latest list, not a stale closure.
  const tabsRef = useRef<TermTab[]>(tabs);
  tabsRef.current = tabs;

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

  // Persist the tab list so a page refresh can restore it.
  useEffect(() => {
    try {
      localStorage.setItem(LS.tabs, JSON.stringify(tabs));
    } catch {
      /* ignore storage quota / privacy mode */
    }
  }, [tabs]);

  // On every (re)connect the agent reports which shells are still alive. We:
  //   - prune tabs whose shell has died (agent restart, `exit`, etc.),
  //   - adopt any orphaned shells the agent still holds but this browser forgot
  //     (e.g. localStorage was cleared), and
  //   - reattach to survivors, which replays their buffered output.
  //
  // Survivors were restored from localStorage on the initial render, so their
  // terminal views are already mounted and subscribed — safe to replay at once.
  // Orphans are added to the tab list first and need a render pass to mount
  // before their replayed output can land, so those reattach after a short beat.
  useEffect(() => {
    return client.onSessions((aliveIds) => {
      const alive = new Set(aliveIds);
      const current = tabsRef.current;
      const known = new Set(current.map((t) => t.id));

      const survivors = current.filter((t) => alive.has(t.id));
      const orphans = aliveIds
        .filter((id) => !known.has(id))
        .map((id, i) => ({ id, title: `recovered ${i + 1}` }));
      const next = [...survivors, ...orphans];

      if (next.length !== current.length || orphans.length > 0) {
        setTabs(next);
        if (!next.some((t) => t.id === activeRef.current)) {
          const fallback = next.length ? next[next.length - 1].id : null;
          setActiveId(fallback);
          activeRef.current = fallback;
        }
      }

      survivors.forEach((t) => client.reattach(t.id));
      if (orphans.length) {
        window.setTimeout(() => orphans.forEach((t) => client.reattach(t.id)), 200);
      }
    });
  }, [client]);

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
