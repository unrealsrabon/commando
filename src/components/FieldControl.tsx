/**
 * Renders one Field definition as the appropriate control.
 *
 * The panel is pure presentation over the tool's declared fields — the engine
 * decides what a value means, this decides how it looks. Text/number fields that
 * bind to a session key stay in lock-step with the Context bar.
 */

import { useState } from "react";
import type { Field } from "../types";
import type { FieldValue } from "../engine/assemble";
import { useSession } from "../state/session";
import { WordlistPicker } from "./WordlistPicker";


interface Props {
  field: Field;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
}

export function FieldControl({ field, value, onChange }: Props) {
  const { values: session, set: setSession } = useSession();
  const [showExplain, setShowExplain] = useState(false);

  if (field.kind === "toggle") {
    const on = Boolean(value);
    return (
      <div className="field">
        <div className="field-row">
          <div>
            <span className="field-label">{field.label}</span>
            {field.help && <div className="field-help">{field.help}</div>}
          </div>
          <label className="switch">
            <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
            <span className="track">
              <span className="thumb" />
            </span>
          </label>
        </div>
      </div>
    );
  }

  if (field.kind === "select") {
    const current = (value as string) ?? "";
    const activeOption = field.options?.find((o) => o.id === current);
    return (
      <div className="field">
        <div className="field-row">
          <span className="field-label">{field.label}</span>
          {activeOption?.explain && (
            <button className="explain-btn" onClick={() => setShowExplain((s) => !s)}>
              {showExplain ? "Hide" : "Explain"}
            </button>
          )}
        </div>
        <div className="seg">
          {field.clearable && (
            <button className={current === "" ? "on" : ""} onClick={() => onChange("")}>
              none
            </button>
          )}
          {field.options?.map((opt) => (
            <button
              key={opt.id}
              className={current === opt.id ? "on" : ""}
              onClick={() => onChange(opt.id)}
              title={opt.explain}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {showExplain && activeOption?.explain && <div className="explain">{activeOption.explain}</div>}
        {field.help && <div className="field-help">{field.help}</div>}
      </div>
    );
  }

  // Wordlist fields get the Browse assist (defaults + saved folders), while
  // still behaving as a plain text box for typing/pasting a path.
  if (field.kind === "text" && field.contextKey === "WORDLIST") {
    return <WordlistPicker field={field} value={value} onChange={onChange} />;
  }

  // text / number
  const bound = field.contextKey ? session[field.contextKey] ?? "" : undefined;

  const shown = value !== undefined && value !== "" ? String(value) : bound ?? "";

  const handle = (raw: string) => {
    onChange(raw);
    // Two-way: typing into a bound field updates the shared session variable.
    if (field.contextKey) setSession(field.contextKey, raw);
  };

  return (
    <div className="field">
      <div className="field-row">
        <span className="field-label">{field.label}</span>
        {field.contextKey && <span className="bound">↔ {field.contextKey}</span>}
      </div>
      <input
        type={field.kind === "number" ? "number" : "text"}
        value={shown}
        placeholder={field.placeholder}
        onChange={(e) => handle(e.target.value)}
      />
      {field.help && <div className="field-help">{field.help}</div>}
    </div>
  );
}
