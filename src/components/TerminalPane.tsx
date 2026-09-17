/**
 * The middle pane: tab strip plus the stack of live terminals.
 *
 * All terminals stay mounted; only the active one is visible. When disconnected
 * or empty, a calm explainer takes over so the pane is never a blank void.
 */

import { useState } from "react";
import { useConnection } from "../state/connection";
import { useTerminals } from "../state/terminals";
import { TerminalView } from "./TerminalView";

export function TerminalPane({ onConnect }: { onConnect: () => void }) {
  const { status } = useConnection();
  const { tabs, activeId, create, close, setActive, rename } = useTerminals();
  const connected = status === "connected";

  // Which tab (if any) is being renamed inline, and its working draft.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const beginEdit = (id: string, title: string) => {
    setEditingId(id);
    setDraft(title);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const next = draft.trim();
    // Empty input reverts to the previous title — never allow a blank tab.
    if (next) rename(editingId, next);
    setEditingId(null);
    setDraft("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
  };

  return (
    <div className="term-wrap">
      <div className="term-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`term-tab ${tab.id === activeId ? "active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            {editingId === tab.id ? (
              <input
                className="term-tab-edit"
                value={draft}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEdit();
                  }
                }}
              />
            ) : (
              <span
                title="Double-click to rename"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  beginEdit(tab.id, tab.title);
                }}
              >
                {tab.title}
              </span>
            )}
            <button
              className="x"
              title="Close tab"
              onClick={(e) => {
                e.stopPropagation();
                close(tab.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
        {connected && (
          <button className="term-newtab" title="New shell" onClick={() => create()}>
            +
          </button>
        )}
      </div>

      <div className="term-stage">
        {tabs.map((tab) => (
          <TerminalView key={tab.id} sessionId={tab.id} active={tab.id === activeId} />
        ))}

        {tabs.length === 0 && (
          <div className="term-empty">
            {connected ? (
              <>
                <h2>Connected</h2>
                <p>
                  Open a shell to begin, or pick a tool on the right and press Run —
                  Commando will open one for you.
                </p>
                <button className="btn primary" style={{ flex: "none" }} onClick={() => create()}>
                  Open a shell
                </button>
              </>
            ) : (
              <>
                <h2>Connect your machine</h2>
                <p>
                  Commando drives a real terminal on your computer through a small local
                  agent. Start the agent once, connect, and every tool you build here runs
                  on your box — nothing leaves your machine.
                </p>
                <button className="btn primary" style={{ flex: "none" }} onClick={onConnect}>
                  Connect
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
