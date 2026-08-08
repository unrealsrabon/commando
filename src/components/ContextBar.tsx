/**
 * Top Context bar.
 *
 * The shared session variables live here. Editing RHOST/LHOST/etc. once updates
 * every tool field and payload bound to that key. Primary variables sit inline;
 * the rest live in a drawer to keep the bar calm.
 */

import { useState } from "react";
import { SESSION_VARS } from "../config";
import { useSession } from "../state/session";
import { useConnection } from "../state/connection";

const STATUS_LABEL: Record<string, string> = {
  disconnected: "Not connected",
  connecting: "Connecting…",
  connected: "Connected",
  error: "Connection failed",
};

export function ContextBar({ onConnect }: { onConnect: () => void }) {
  const { values, set, reset } = useSession();
  const { status, disconnect } = useConnection();
  const [open, setOpen] = useState(false);

  const primary = SESSION_VARS.filter((v) => v.primary);
  const extra = SESSION_VARS.filter((v) => !v.primary);

  return (
    <div className="contextbar">
      <div className="brand">
        <span className="name">Commando</span>
        <span className="tag">command, don't memorize</span>
      </div>

      <div className="ctx-vars">
        {primary.map((v) => (
          <div className="ctx-var" key={v.key}>
            <label htmlFor={`ctx-${v.key}`}>{v.label}</label>
            <input
              id={`ctx-${v.key}`}
              className="ctx-input"
              value={values[v.key] ?? ""}
              placeholder={v.placeholder}
              title={v.help}
              onChange={(e) => set(v.key, e.target.value)}
            />
          </div>
        ))}
        <button className="ctx-more" onClick={() => setOpen((o) => !o)}>
          {open ? "Less" : "More"}
        </button>
        <button className="ctx-reset" title="Clear all session variables" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="conn">
        <span className={`conn-dot ${status}`} />
        <span className="conn-label">{STATUS_LABEL[status]}</span>
        {status === "connected" ? (
          <button className="btn-connect ghost" onClick={disconnect}>
            Disconnect
          </button>
        ) : (
          <button className="btn-connect" onClick={onConnect}>
            Connect
          </button>
        )}
      </div>

      {open && (
        <div className="ctx-drawer">
          {extra.map((v) => (
            <div className="ctx-var" key={v.key}>
              <label htmlFor={`ctx-${v.key}`}>{v.label}</label>
              <input
                id={`ctx-${v.key}`}
                className="ctx-input"
                value={values[v.key] ?? ""}
                placeholder={v.placeholder}
                title={v.help}
                onChange={(e) => set(v.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
