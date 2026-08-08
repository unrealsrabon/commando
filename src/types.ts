/**
 * Commando type system.
 *
 * Everything catalog-shaped (tools, payloads, cheat-sheets) is data that conforms
 * to these types. One rendering engine turns any definition into a panel and one
 * assembly core turns field values into a real command line. Adding content means
 * adding a definition object, never touching engine code.
 */

/** Shared session variables that live in the top Context bar. */
export type SessionKey =
  | "RHOST"
  | "RPORT"
  | "LHOST"
  | "LPORT"
  | "URL"
  | "DOMAIN"
  | "WORDLIST"
  | "USER"
  | "PASS";

export interface SessionVarSpec {
  key: SessionKey;
  label: string;
  placeholder: string;
  /** Show this variable in the compact top bar (others live in the expander). */
  primary?: boolean;
  help?: string;
}

/** How a text/number value is attached to its flag. */
export type Assign = "space" | "equals";

/** A single choice inside a `select` field. */
export interface OptionDef {
  id: string;
  label: string;
  /** Tokens contributed to the command when this option is chosen. */
  tokens: string[];
  /** Short plain-English explanation for the Explain affordance. */
  explain?: string;
}

export type FieldKind = "toggle" | "select" | "text" | "number";

/**
 * A single control in a tool panel. Its declaration encodes exactly how it maps
 * into command tokens, which is what lets one engine assemble very different tools.
 */
export interface Field {
  id: string;
  label: string;
  kind: FieldKind;
  help?: string;
  /** Optional visual grouping heading in the panel. */
  group?: string;
  /** Render this field as the pinned hero control at the very top of the panel. */
  hero?: boolean;

  // --- toggle ---
  /** Tokens added when a toggle is on (e.g. ["-sV"] or ["-sC","-sV"]). */
  onTokens?: string[];
  /** Default on/off for a toggle. */
  defaultOn?: boolean;

  // --- select ---
  options?: OptionDef[];
  /** Allow the select to be cleared back to "none". */
  clearable?: boolean;
  /** Default option id for a select. */
  defaultOption?: string;

  // --- text / number ---
  /** Bind this field to a session variable (two-way). */
  contextKey?: SessionKey;
  placeholder?: string;
  /** Flag that precedes the value, e.g. "-p", "--max-rate", "-w". */
  valueFlag?: string;
  /** space -> `-w list`, equals -> `--wordlist=list`. Defaults to space. */
  assign?: Assign;
  /** Transform the value; `{value}` is the raw value, session keys also resolve. */
  template?: string;
  /** Emit the value with no flag (positional). */
  positional?: boolean;
  /** Gate Run until this field has a value. */
  required?: boolean;
  /** Default literal value. */
  defaultValue?: string;
  /** Shell-quote the value (default true for text, false for number). */
  quote?: boolean;
}

/** A one-click bundle of field values. */
export interface Preset {
  id: string;
  label: string;
  /** Map of field id -> value. Toggles use true/false, selects use option id. */
  set: Record<string, string | number | boolean>;
  description?: string;
}

/** An optional required mode selector rendered before everything else. */
export interface SubcommandSpec {
  label: string;
  options: OptionDef[];
  defaultOption: string;
}

export interface Tool {
  id: string;
  name: string;
  binary: string;
  category: string;
  summary: string;
  docsUrl?: string;
  /** Optional leading subcommand (e.g. gobuster dir / amass enum). */
  subcommand?: SubcommandSpec;
  fields: Field[];
  presets?: Preset[];
  /** Optional install hint shown when the binary may be missing. */
  install?: string;
}

// --- Workstation (payloads / privesc / cheat-sheets) ---

/**
 * A ready command snippet. `command` may contain session tokens like {LHOST}
 * and {LPORT}; they are resolved from the Context bar before Run/Copy.
 */
export interface Snippet {
  id: string;
  label: string;
  command: string;
  explain?: string;
  /** Run this snippet in a fresh terminal tab (e.g. a listener). */
  newTab?: boolean;
}

/** A payload with per-language variants (reverse shells, etc.). */
export interface PayloadVariant {
  id: string;
  label: string;
  command: string;
  explain?: string;
}

export type WorkstationKind = "payload" | "snippets";

export interface WorkstationItem {
  id: string;
  name: string;
  category: string;
  summary: string;
  kind: WorkstationKind;
  /** For kind === "payload": selectable variants plus an optional listener. */
  variants?: PayloadVariant[];
  listener?: Snippet;
  /** For kind === "snippets": grouped command cards. */
  snippets?: Snippet[];
}

/** Left sidebar entry, unified across Tools and Workstation. */
export interface CatalogEntry {
  id: string;
  name: string;
  category: string;
  summary: string;
  section: "tools" | "workstation";
}
