/**
 * Left sidebar: a searchable, categorized index of everything Commando offers.
 *
 * Two sections — Tools (command builders) and Workstation (payloads, privesc,
 * cheat-sheets) — share one list style. Selecting an entry drives the right pane.
 */

import { useMemo, useState } from "react";
import { CATEGORY_ORDER, TOOLS } from "../catalog";
import { WORKSTATION, WORKSTATION_CATEGORY_ORDER } from "../workstation";

export interface Selection {
  section: "tools" | "workstation";
  id: string;
}

interface Entry {
  id: string;
  name: string;
  category: string;
  summary: string;
}

function groupByCategory(entries: Entry[], order: readonly string[]): [string, Entry[]][] {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = map.get(e.category) ?? [];
    list.push(e);
    map.set(e.category, list);
  }
  const known = order.filter((c) => map.has(c)).map((c) => [c, map.get(c)!] as [string, Entry[]]);
  const rest = [...map.keys()].filter((c) => !order.includes(c)).map((c) => [c, map.get(c)!] as [string, Entry[]]);
  return [...known, ...rest];
}

export function Sidebar({
  selection,
  onSelect,
}: {
  selection: Selection;
  onSelect: (s: Selection) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const toolEntries = TOOLS as Entry[];
  const wsEntries = WORKSTATION as Entry[];

  const filtered = useMemo(() => {
    if (!q) return { tools: toolEntries, ws: wsEntries };
    const match = (e: Entry) =>
      e.name.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q);
    return { tools: toolEntries.filter(match), ws: wsEntries.filter(match) };
  }, [q, toolEntries, wsEntries]);

  const toolGroups = groupByCategory(filtered.tools, CATEGORY_ORDER);
  const wsGroups = groupByCategory(filtered.ws, WORKSTATION_CATEGORY_ORDER);
  const empty = filtered.tools.length === 0 && filtered.ws.length === 0;

  return (
    <div className="pane sidebar">
      <div className="sb-search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools, payloads, cheat-sheets…"
        />
      </div>

      <div className="sb-list">
        {empty && <div className="sb-empty">Nothing matches “{query}”.</div>}

        {filtered.tools.length > 0 && (
          <>
            {toolGroups.map(([cat, items]) => (
              <div key={`t-${cat}`}>
                <div className="sb-cat">{cat}</div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    className={`sb-item ${
                      selection.section === "tools" && selection.id === item.id ? "active" : ""
                    }`}
                    onClick={() => onSelect({ section: "tools", id: item.id })}
                  >
                    <div className="n">{item.name}</div>
                    <div className="s">{item.summary}</div>
                  </button>
                ))}
              </div>
            ))}
          </>
        )}

        {filtered.ws.length > 0 && (
          <>
            <div className="sb-cat" style={{ marginTop: 8 }}>
              — Workstation —
            </div>
            {wsGroups.map(([cat, items]) => (
              <div key={`w-${cat}`}>
                <div className="sb-cat">{cat}</div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    className={`sb-item ${
                      selection.section === "workstation" && selection.id === item.id ? "active" : ""
                    }`}
                    onClick={() => onSelect({ section: "workstation", id: item.id })}
                  >
                    <div className="n">{item.name}</div>
                    <div className="s">{item.summary}</div>
                  </button>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
