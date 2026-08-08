/**
 * App shell.
 *
 * Composes the providers and lays out the three panes:
 *   Sidebar (catalog)  |  Terminals (live shells)  |  Builder / Workstation
 * The Context bar spans the top; the Connect modal floats above everything.
 */

import { useCallback, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { SessionProvider } from "./state/session";
import { ConnectionProvider } from "./state/connection";
import { TerminalsProvider } from "./state/terminals";
import { ContextBar } from "./components/ContextBar";
import { Sidebar, type Selection } from "./components/Sidebar";
import { TerminalPane } from "./components/TerminalPane";
import { CommandBuilder } from "./components/CommandBuilder";
import { WorkstationPanel } from "./components/WorkstationPanel";
import { ConnectModal } from "./components/ConnectModal";
import { getTool, TOOLS } from "./catalog";
import { getWorkstationItem } from "./workstation";

import { LS } from "./config";

/** Restore the last selection, falling back to the first tool. */
function initialSelection(): Selection {
  try {
    const raw = localStorage.getItem(LS.selection);
    if (raw) {
      const parsed = JSON.parse(raw) as Selection;
      const exists =
        parsed.section === "tools" ? getTool(parsed.id) : getWorkstationItem(parsed.id);

      if (exists) return parsed;
    }
  } catch {
    /* ignore malformed storage */
  }
  return { section: "tools", id: TOOLS[0].id };
}

function Workbench() {
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [showConnect, setShowConnect] = useState(false);


  // Persist last selection so a refresh returns you to where you were.
  const select = useCallback((s: Selection) => {
    setSelection(s);
    localStorage.setItem(LS.selection, JSON.stringify(s));
  }, []);

  const openConnect = useCallback(() => setShowConnect(true), []);

  const tool = selection.section === "tools" ? getTool(selection.id) : undefined;
  const wsItem = selection.section === "workstation" ? getWorkstationItem(selection.id) : undefined;

  return (
    <div className="app">
      <ContextBar onConnect={openConnect} />

      <div className="body">
        <PanelGroup direction="horizontal" autoSaveId="commando-layout">
          <Panel defaultSize={22} minSize={15} maxSize={34}>
            <Sidebar selection={selection} onSelect={select} />
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          <Panel defaultSize={45} minSize={25}>
            <div className="pane">
              <TerminalPane onConnect={openConnect} />
            </div>
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          <Panel defaultSize={33} minSize={24} maxSize={46}>
            <div className="pane right">
              {tool && <CommandBuilder tool={tool} onRequestConnect={openConnect} />}
              {wsItem && <WorkstationPanel item={wsItem} onRequestConnect={openConnect} />}
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {showConnect && <ConnectModal onClose={() => setShowConnect(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <ConnectionProvider>
        <TerminalsProvider>
          <Workbench />
        </TerminalsProvider>
      </ConnectionProvider>
    </SessionProvider>
  );
}
