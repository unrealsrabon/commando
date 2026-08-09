/**
 * Wordlist field with a Browse assist.
 *
 * The text input always works on its own — typing or pasting a path is never
 * blocked, so this behaves exactly like a normal bound field when offline or
 * when the agent is older and does not answer scans.
 *
 * Browse asks the agent to scan a set of folders (shipped defaults + the user's
 * own saved folders) and lists the real wordlist files it finds. Picking one
 * drops its absolute path into the field. Custom folders are remembered across
 * sessions, which is how a machine with wordlists outside the usual Linux
 * locations is handled: add the folder once, use it forever.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Field } from "../types";
import type { FieldValue } from "../engine/assemble";
import { useSession } from "../state/session";
import { useConnection } from "../state/connection";
import type { WordlistItem } from "../state/connection";
import {
  DEFAULT_WORDLIST_ROOTS,
  addWordlistRoot,
  getWordlistRoots,
  removeWordlistRoot,
} from "../config";

interface Props {
  field: Field;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
}

export function WordlistPicker({ field, value, onChange }: Props) {
  const { values: session, set: setSession } = useSession();
  const { client, status } = useConnection();
  const connected = status === "connected";

  const bound = field.contextKey ? session[field.contextKey] ?? "" : undefined;
  const shown = value !== undefined && value !== "" ? String(value) : bound ?? "";

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<WordlistItem[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [query, setQuery] = useState("");
  const [roots, setRoots] = useState<string[]>(getWordlistRoots);
  const [newRoot, setNewRoot] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);


  const setBoth = (raw: string) => {
    onChange(raw);
    if (field.contextKey) setSession(field.contextKey, raw);
  };

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scan = () => {
    if (!connected) return;
    setTimedOut(false);
    setLoading(true);
    client.listWordlists([...DEFAULT_WORDLIST_ROOTS, ...roots]);
    // If the agent never answers (e.g. an older agent that predates this
    // feature), stop waiting after a few seconds and say so, instead of
    // spinning on "Scanning folders…" forever.
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setLoading(false);
      setTimedOut(true);
    }, 6000);
  };

  // Receive scan results.
  useEffect(() => {
    return client.onWordlists((result) => {
      clearTimer();
      setItems(result.items);
      setTruncated(result.truncated);
      setTimedOut(false);
      setLoading(false);
    });
  }, [client]);

  // Cancel any pending timeout when the picker unmounts.
  useEffect(() => clearTimer, []);


  // Scan when the popover opens (and whenever the folder set changes while open).
  useEffect(() => {
    if (open) scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roots, connected]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.path.toLowerCase().includes(q));
  }, [items, query]);

  const addRoot = () => {
    const clean = newRoot.trim();
    if (!clean) return;
    setRoots(addWordlistRoot(clean));
    setNewRoot("");
  };

  const dropRoot = (path: string) => setRoots(removeWordlistRoot(path));

  return (
    <div className="field wl" ref={wrapRef}>
      <div className="field-row">
        <span className="field-label">{field.label}</span>
        {field.contextKey && <span className="bound">↔ {field.contextKey}</span>}
      </div>

      <div className="wl-row">
        <input
          type="text"
          value={shown}
          placeholder={field.placeholder}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setBoth(e.target.value)}
        />
        <button className="wl-browse" onClick={() => setOpen((o) => !o)}>
          Browse
        </button>
      </div>

      {field.help && <div className="field-help">{field.help}</div>}

      {open && (
        <div className="wl-pop">
          <input
            className="wl-search"
            placeholder="Filter wordlists"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="wl-items">
            {!connected ? (
              <div className="wl-status">Connect the agent to browse. You can still type a path above.</div>
            ) : loading ? (
              <div className="wl-status">Scanning folders…</div>
            ) : timedOut ? (
              <div className="wl-status">
                No response from the agent. If you just updated Commando, restart the agent so it
                supports browsing. You can still type a path above.
              </div>
            ) : filtered.length === 0 ? (

              <div className="wl-status">No wordlists found. Add the folder that holds yours below.</div>
            ) : (
              filtered.map((it) => (
                <button
                  key={it.path}
                  className="wl-item"
                  onClick={() => {
                    setBoth(it.path);
                    setOpen(false);
                  }}
                >
                  <div className="wl-name">{it.name}</div>
                  <div className="wl-path">{it.path}</div>
                </button>
              ))
            )}
            {truncated && <div className="wl-status">Showing the first {items.length}. Narrow with the filter.</div>}
          </div>

          <div className="wl-foot">
            <input
              placeholder="/home/you/wordlists"
              value={newRoot}
              onChange={(e) => setNewRoot(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRoot()}
            />
            <button className="wl-add" onClick={addRoot}>
              Add folder
            </button>
          </div>

          {roots.length > 0 && (
            <div className="wl-roots">
              {roots.map((r) => (
                <span key={r} className="wl-root">
                  {r}
                  <button title="Remove folder" onClick={() => dropRoot(r)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
