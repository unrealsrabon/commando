/**
 * Session Context store.
 *
 * A single, persisted source of truth for the shared variables (RHOST, LHOST,
 * LPORT, ...). Tool fields bind to it two-way: set a value once, anywhere, and it
 * flows to every panel that uses it. Values survive reloads via localStorage.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LS } from "../config";
import type { SessionKey } from "../types";
import type { SessionValues } from "../engine/template";

interface SessionStore {
  values: SessionValues;
  get: (key: SessionKey) => string;
  set: (key: SessionKey, value: string) => void;
  setMany: (patch: SessionValues) => void;
  reset: () => void;
}

const SessionCtx = createContext<SessionStore | null>(null);

function load(): SessionValues {
  try {
    const raw = localStorage.getItem(LS.session);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SessionValues;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<SessionValues>(load);

  useEffect(() => {
    try {
      localStorage.setItem(LS.session, JSON.stringify(values));
    } catch {
      /* storage may be unavailable; not fatal */
    }
  }, [values]);

  const set = useCallback((key: SessionKey, value: string) => {
    setValues((prev) => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const setMany = useCallback((patch: SessionValues) => {
    setValues((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setValues({}), []);

  const get = useCallback((key: SessionKey) => values[key] ?? "", [values]);

  const store = useMemo<SessionStore>(
    () => ({ values, get, set, setMany, reset }),
    [values, get, set, setMany, reset],
  );

  return <SessionCtx.Provider value={store}>{children}</SessionCtx.Provider>;
}

export function useSession(): SessionStore {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
