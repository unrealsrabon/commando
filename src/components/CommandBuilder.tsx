/**
 * The command builder panel for one tool.
 *
 * Holds the field values, assembles the live command through the engine, and
 * offers Copy/Run. Everything above the dock is generated from the tool's field
 * definitions, so this component never needs to know which tool it is showing.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Tool } from "../types";
import {
  assemble,
  defaultValues,
  SUBCOMMAND_KEY,
  type FieldValue,
  type FieldValues,
} from "../engine/assemble";
import { useSession } from "../state/session";
import { useConnection } from "../state/connection";
import { useTerminals } from "../state/terminals";
import { FieldControl } from "./FieldControl";
import { useCopy } from "./useCopy";

/** Resolve what a hero/text field currently shows, honoring session binding. */
function boundValue(
  ownValue: FieldValue | undefined,
  sessionValue: string | undefined,
): string {
  if (ownValue !== undefined && String(ownValue) !== "") return String(ownValue);
  return sessionValue ?? "";
}


/** Highlight <placeholders> and {TOKENS} so gaps are obvious in the preview. */
function renderPreview(command: string): ReactNode {
  const parts = command.split(/(<[^>]+>|\{[A-Z_]+\})/g);
  return parts.map((part, i) =>
    /^(<[^>]+>|\{[A-Z_]+\})$/.test(part) ? (
      <span className="ph" key={i}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function CommandBuilder({
  tool,
  onRequestConnect,
}: {
  tool: Tool;
  onRequestConnect: () => void;
}) {
  const { values: session, set: setSession } = useSession();
  const { status } = useConnection();

  const { runInActive } = useTerminals();
  const [values, setValues] = useState<FieldValues>(() => defaultValues(tool));
  const [copied, copy] = useCopy();

  // Reset field values whenever the selected tool changes.
  useEffect(() => {
    setValues(defaultValues(tool));
  }, [tool]);

  const setValue = (id: string, v: FieldValue) => setValues((prev) => ({ ...prev, [id]: v }));

  const applyPreset = (set: Record<string, string | number | boolean>) => {
    setValues((prev) => ({ ...defaultValues(tool), ...prev, ...set }));
  };

  const assembled = useMemo(() => assemble(tool, values, session), [tool, values, session]);
  const connected = status === "connected";
  const ready = assembled.missing.length === 0;

  const hero = tool.fields.find((f) => f.hero);
  const rest = tool.fields.filter((f) => !f.hero);

  // Group non-hero fields by their optional group label, preserving array order.
  const groups: { name: string | undefined; fields: typeof rest }[] = [];
  for (const field of rest) {
    const last = groups[groups.length - 1];
    if (last && last.name === field.group) last.fields.push(field);
    else groups.push({ name: field.group, fields: [field] });
  }

  const run = () => {
    if (!connected) {
      onRequestConnect();
      return;
    }
    runInActive(assembled.command);
  };

  return (
    <div className="rp">
      <div className="rp-head">
        <div className="rp-eyebrow">{tool.category}</div>
        <div className="rp-title">
          <h1>{tool.name}</h1>
          <span className="bin">{tool.binary}</span>
        </div>
        <div className="rp-summary">{tool.summary}</div>
        {tool.docsUrl && (
          <a className="rp-docs" href={tool.docsUrl} target="_blank" rel="noreferrer">
            Documentation ↗
          </a>
        )}
      </div>

      <div className="rp-body">
        {tool.presets && tool.presets.length > 0 && (
          <div className="presets">
            {tool.presets.map((p) => (
              <button key={p.id} className="preset" title={p.description} onClick={() => applyPreset(p.set)}>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {tool.subcommand && (
          <div className="field">
            <div className="field-row">
              <span className="field-label">{tool.subcommand.label}</span>
            </div>
            <div className="seg">
              {tool.subcommand.options.map((opt) => (
                <button
                  key={opt.id}
                  className={values[SUBCOMMAND_KEY] === opt.id ? "on" : ""}
                  onClick={() => setValue(SUBCOMMAND_KEY, opt.id)}
                  title={opt.explain}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {hero && (
          <div className="hero">
            <label>
              {hero.label}
              {hero.contextKey && <span className="bound">↔ {hero.contextKey}</span>}
            </label>
            <input
              value={boundValue(values[hero.id], hero.contextKey ? session[hero.contextKey] : undefined)}
              placeholder={hero.placeholder}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => {
                setValue(hero.id, e.target.value);
                if (hero.contextKey) setSession(hero.contextKey, e.target.value);
              }}
            />
            {hero.help && <div className="field-help" style={{ marginTop: 8 }}>{hero.help}</div>}
          </div>
        )}


        {groups.map((g, i) => (
          <div className="group" key={g.name ?? `g${i}`}>
            {g.name && <div className="group-title">{g.name}</div>}
            {g.fields.map((field) => (
              <FieldControl
                key={field.id}
                field={field}
                value={values[field.id]}
                onChange={(v) => setValue(field.id, v)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="dock">
        <div className="dock-cmd">{renderPreview(assembled.command)}</div>
        <div className="dock-actions">
          <button className="btn" onClick={() => copy(assembled.command)}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button className="btn primary" onClick={run} disabled={connected && !ready}>
            {connected ? "Run" : "Connect to run"}
          </button>
        </div>
        {!ready && <div className="dock-note">Fill in: {assembled.missing.join(", ")}</div>}
      </div>
    </div>
  );
}

