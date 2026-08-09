/**
 * A single xterm.js instance bound to one PTY session on the agent.
 *
 * Kept mounted even when its tab is inactive (hidden via CSS) so scrollback and
 * running processes survive tab switches. Output from the agent is written in;
 * user keystrokes and resize events are sent back out.
 */

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useConnection } from "../state/connection";

const THEME = {
  background: "#06070a",
  foreground: "#e7eaf0",
  cursor: "#5b8cff",
  cursorAccent: "#06070a",
  selectionBackground: "rgba(91,140,255,0.28)",
  black: "#12151b",
  red: "#f2698a",
  green: "#46d29a",
  yellow: "#e0b341",
  blue: "#5b8cff",
  magenta: "#b98cff",
  cyan: "#4fd0d6",
  white: "#e7eaf0",
  brightBlack: "#7c8695",
};

export function TerminalView({ sessionId, active }: { sessionId: string; active: boolean }) {
  const { client } = useConnection();
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal>();
  const fitRef = useRef<FitAddon>();

  // Create the terminal once and wire it to the agent session.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new Terminal({
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      theme: THEME,
      scrollback: 5000,
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    termRef.current = term;
    fitRef.current = fit;

    try {
      fit.fit();
    } catch {
      /* host not measured yet */
    }
    client.resize(sessionId, term.cols, term.rows);

    const dataSub = term.onData((d) => client.input(sessionId, d));
    const resizeSub = term.onResize(({ cols, rows }) =>
      client.resize(sessionId, cols, rows),
    );
    const unsubscribe = client.subscribeOutput(sessionId, (chunk) => term.write(chunk));
    const unsubExit = client.subscribeExit(sessionId, () => {
      term.write("\r\n\x1b[38;5;244m[process exited]\x1b[0m\r\n");
    });
    // On reattach the agent replays this session's buffer; clear first so the
    // replayed screen replaces stale content instead of stacking on top of it.
    const unsubReset = client.subscribeReset(sessionId, () => term.reset());

    return () => {
      dataSub.dispose();
      resizeSub.dispose();
      unsubscribe();
      unsubExit();
      unsubReset();
      term.dispose();
    };

  }, [client, sessionId]);

  // Refit whenever this view becomes active or the window resizes.
  useEffect(() => {
    if (!active) return;
    const refit = () => {
      try {
        fitRef.current?.fit();
        termRef.current?.focus();
      } catch {
        /* ignore */
      }
    };
    const id = window.setTimeout(refit, 30);
    window.addEventListener("resize", refit);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", refit);
    };
  }, [active]);

  // Observe container size so pane-drag resizes reflow the PTY.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(() => {
      try {
        fitRef.current?.fit();
      } catch {
        /* ignore */
      }
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  return <div className={`term-view ${active ? "" : "hidden"}`} ref={hostRef} />;
}
