/**
 * Right pane for a Workstation item (payloads / privesc / cheat-sheets).
 *
 * Payloads offer selectable variants plus a one-click listener; snippet packs
 * render as command cards. Every command resolves {LHOST}/{LPORT}/... from the
 * Context bar before Copy or Run, and unresolved tokens are called out.
 */

import { Fragment, useMemo, useState } from "react";
import type { Snippet, WorkstationItem } from "../types";
import { resolveSession, unresolvedTokens } from "../engine/template";
import { useSession } from "../state/session";
import { useConnection } from "../state/connection";
import { useTerminals } from "../state/terminals";
import { useCopy } from "./useCopy";

function CommandCard({
  label,
  command,
  explain,
  runInNewTab,
  runnable,
  onRequestConnect,
}: {
  label: string;
  command: string;
  explain?: string;
  runInNewTab?: boolean;
  runnable?: boolean;
  onRequestConnect: () => void;
}) {
  const { values: session } = useSession();
  const { status } = useConnection();
  const { runInActive, runInNewTab: openTab } = useTerminals();
  const [copied, copy] = useCopy();

  const resolved = useMemo(() => resolveSession(command, session), [command, session]);
  const missing = useMemo(() => unresolvedTokens(command, session), [command, session]);
  const connected = status === "connected";
  // Undefined defaults to runnable; only an explicit false hides Run (web shells,
  // reverse/bind shell bodies, placeholder templates that run elsewhere).
  const canRun = runnable !== false;

  const run = () => {
    if (!connected) {
      onRequestConnect();
      return;
    }
    if (runInNewTab) openTab(resolved, label);
    else runInActive(resolved);
  };

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-label">{label}</span>
        <div className="card-actions">
          <button className="chip" onClick={() => copy(resolved)}>
            {copied ? "Copied" : "Copy"}
          </button>
          {canRun && (
            <button className="chip run" onClick={run}>
              {connected ? (runInNewTab ? "Run in new tab" : "Run") : "Connect"}
            </button>
          )}
        </div>
      </div>
      <div className="card-cmd">{resolved}</div>
      {explain && <div className="field-help" style={{ marginTop: 8 }}>{explain}</div>}
      {missing.length > 0 && (
        <div className="dock-note" style={{ marginTop: 8 }}>
          Set {missing.join(", ")} in the Context bar to fill this in.
        </div>
      )}
    </div>
  );
}

export function WorkstationPanel({
  item,
  onRequestConnect,
}: {
  item: WorkstationItem;
  onRequestConnect: () => void;
}) {
  const [variantId, setVariantId] = useState(() => item.variants?.[0]?.id ?? "");
  const activeVariant = item.variants?.find((v) => v.id === variantId) ?? item.variants?.[0];
  // A variant-specific listener (e.g. matching MSFVenom payload) overrides the item one.
  const listener = activeVariant?.listener ?? item.listener;

  return (
    <div className="rp">
      <div className="rp-head">
        <div className="rp-eyebrow">{item.category}</div>
        <div className="rp-title">
          <h1>{item.name}</h1>
        </div>
        <div className="rp-summary">{item.summary}</div>
      </div>

      <div className="rp-body" style={{ paddingBottom: 24 }}>
        {item.kind === "payload" && item.variants && (
          <>
            {listener && (
              <div className="ws-listener">
                <div className="group-title">Listener</div>
                <CommandCard
                  label={listener.label}
                  command={listener.command}
                  explain={listener.explain}
                  runInNewTab={listener.newTab}
                  onRequestConnect={onRequestConnect}
                />
              </div>
            )}

            <div className="group-title">Payload</div>
            <div className="seg" style={{ marginBottom: 14 }}>
              {item.variants.map((v) => (
                <button
                  key={v.id}
                  className={v.id === variantId ? "on" : ""}
                  onClick={() => setVariantId(v.id)}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {activeVariant && (
              <CommandCard
                label={activeVariant.label}
                command={activeVariant.command}
                explain={activeVariant.explain}
                runnable={activeVariant.runnable}
                onRequestConnect={onRequestConnect}
              />
            )}
          </>
        )}

        {item.kind === "snippets" && item.snippets && (
          <SnippetList snippets={item.snippets} onRequestConnect={onRequestConnect} />
        )}
      </div>
    </div>
  );
}

function SnippetList({
  snippets,
  onRequestConnect,
}: {
  snippets: Snippet[];
  onRequestConnect: () => void;
}) {
  let lastGroup: string | undefined;
  return (
    <>
      {snippets.map((s) => {
        // Optional section headings: rendered whenever the group value changes.
        const heading = s.group !== lastGroup ? s.group : undefined;
        lastGroup = s.group;
        return (
          <Fragment key={s.id}>
            {heading && <div className="group-title ws-group">{heading}</div>}
            <CommandCard
              label={s.label}
              command={s.command}
              explain={s.explain}
              runInNewTab={s.newTab}
              runnable={s.runnable}
              onRequestConnect={onRequestConnect}
            />
          </Fragment>
        );
      })}
    </>
  );
}
