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

const INSTALL_CMD = "cd commando/agent && go build -o commando-agent . && ./commando-agent --install";
const TOKEN_CMD = "cat ~/.commando/token";

export function ConnectModal({ onClose }: { onClose: () => void }) {
  const { connect, status, error } = useConnection();
  const [url, setUrl] = useState(() => localStorage.getItem(LS.agentUrl) || defaultAgentUrl());
  const [token, setToken] = useState("");
  const [copiedInstall, copyInstall] = useCopy();
  const [copiedToken, copyToken] = useCopy();

  // Close automatically once the connection is live.
  useEffect(() => {
    if (status === "connected") onClose();
  }, [status, onClose]);

  const submit = () => {
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
            agent. Do this setup once — after that, the connection is automatic on every visit.
          </p>
        </div>

        <div className="modal-body">
          <div className="step">
            <h3>
              <span className="step-n">1</span>Install the agent (one time, ever)
            </h3>
            <p className="field-help" style={{ marginBottom: 8 }}>
              Clone the repo if you have not already, then build and install the agent as a
              background service. It will start automatically on every login from now on.
            </p>
            <div className="codeblock">
              <code>git clone https://github.com/unrealsrabon/commando</code>
            </div>
            <div className="codeblock" style={{ marginTop: 8 }}>
              <code>{INSTALL_CMD}</code>
              <button className="chip" onClick={() => copyInstall(INSTALL_CMD)}>
                {copiedInstall ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="step">
            <h3>
              <span className="step-n">2</span>Copy your permanent token
            </h3>
            <p className="field-help" style={{ marginBottom: 8 }}>
              Your token is stored permanently on your machine. Run this command to see it.
            </p>
            <div className="codeblock">
              <code>{TOKEN_CMD}</code>
              <button className="chip" onClick={() => copyToken(TOKEN_CMD)}>
                {copiedToken ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="step">
            <h3>
              <span className="step-n">3</span>Paste token and connect (only this once)
            </h3>
            <p className="field-help" style={{ marginBottom: 8 }}>
              After this, every visit reconnects automatically. You will never see this
              dialog again unless you manually disconnect.
            </p>
            <div className="modal-field">
              <label>Token</label>
              <input
                autoFocus
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="paste your token here"
                onKeyDown={(e) => e.key === "Enter" && token.trim() && submit()}
              />
            </div>
            <div className="modal-field" style={{ marginTop: 12 }}>
              <label>Agent address</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
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
