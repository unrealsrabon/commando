/**
 * Connect flow.
 *
 * Explains the model in three steps and collects the agent address + token.
 * The token defends the local WebSocket against other pages in the browser,
 * so it is required. Values persist for next time.
 */

import { useEffect, useState } from "react";
import { useConnection } from "../state/connection";
import { LS, defaultAgentUrl } from "../config";
import { useCopy } from "./useCopy";

const AGENT_CMD = "curl -fsSL https://commando.sh/agent | sh";

export function ConnectModal({ onClose }: { onClose: () => void }) {
  const { connect, status, error } = useConnection();
  const [url, setUrl] = useState(() => localStorage.getItem(LS.agentUrl) || defaultAgentUrl());
  const [token, setToken] = useState("");
  const [copied, copy] = useCopy();

  // Close automatically once the connection is live.
  useEffect(() => {
    if (status === "connected") onClose();
  }, [status, onClose]);

  const submit = () => {
    localStorage.setItem(LS.agentUrl, url);
    connect(url, token.trim());
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ position: "relative" }}>
        <button className="x-close" onClick={onClose} title="Close">
          ×
        </button>
        <div className="modal-head">
          <h2>Connect your machine</h2>
          <p>
            Commando runs tools in a real terminal on your computer through a small local
            agent. This keeps everything on your machine — the website only sends the
            commands you build.
          </p>
        </div>

        <div className="modal-body">
          <div className="step">
            <h3>
              <span className="step-n">1</span>Start the agent (once)
            </h3>
            <div className="codeblock">
              <code>{AGENT_CMD}</code>
              <button className="chip" onClick={() => copy(AGENT_CMD)}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="field-help" style={{ marginTop: 8 }}>
              The agent prints a one-time token when it starts. It listens only on
              127.0.0.1, so nothing is exposed to your network.
            </p>
          </div>

          <div className="step">
            <h3>
              <span className="step-n">2</span>Paste the token
            </h3>
            <div className="modal-field">
              <label>Token from the agent output</label>
              <input
                autoFocus
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="e.g. 6f2a9c1e…"
                onKeyDown={(e) => e.key === "Enter" && token.trim() && submit()}
              />
            </div>
            <div className="modal-field" style={{ marginTop: 12 }}>
              <label>Agent address</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          </div>

          <div className="step">
            <h3>
              <span className="step-n">3</span>Connect
            </h3>
            <p className="field-help">
              Once connected, pick any tool, shape the command with clicks, and press Run.
            </p>
          </div>

          {status === "error" && error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn primary"
              style={{ flex: "none" }}
              disabled={!token.trim() || status === "connecting"}
              onClick={submit}
            >
              {status === "connecting" ? "Connecting…" : "Connect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
