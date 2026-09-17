/**
 * Template resolution.
 *
 * Templates may reference the field's own value as `{value}` and any session
 * variable by name, e.g. "http://{value}/FUZZ" or "http://{RHOST}/FUZZ". Unknown
 * tokens are left intact so a half-filled preview never silently drops text.
 */

import type { SessionKey } from "../types";
import { SESSION_VARS } from "../config";

/** Names that are real Context bar variables. Anything else (e.g. bash's ${IFS}) is not a token. */
const SESSION_KEYS = new Set<string>(SESSION_VARS.map((v) => v.key));

export type SessionValues = Partial<Record<SessionKey, string>>;

const TOKEN = /\{([A-Za-z_]+)\}/g;

/**
 * Resolve `{value}` and `{SESSION_KEY}` tokens inside a template.
 * @param template the raw template string
 * @param value the current field value (for `{value}`)
 * @param session the current session variables
 */
export function resolveTemplate(
  template: string,
  value: string,
  session: SessionValues,
): string {
  return template.replace(TOKEN, (whole, name: string) => {
    if (name === "value") return value;
    const key = name as SessionKey;
    const fromSession = session[key];
    return fromSession !== undefined && fromSession !== "" ? fromSession : whole;
  });
}

/** Resolve a snippet/command string using only session variables. */
export function resolveSession(command: string, session: SessionValues): string {
  return command.replace(TOKEN, (whole, name: string) => {
    const key = name as SessionKey;
    const fromSession = session[key];
    return fromSession !== undefined && fromSession !== "" ? fromSession : whole;
  });
}

/** List the session tokens still unresolved in a string (empty or missing). */
export function unresolvedTokens(command: string, session: SessionValues): string[] {
  const missing: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(TOKEN);
  while ((match = re.exec(command)) !== null) {
    const name = match[1];
    if (name === "value") continue;
    // Only flag real session keys — other {words} (shell syntax like ${IFS}) are left alone.
    if (!SESSION_KEYS.has(name)) continue;
    const key = name as SessionKey;
    const v = session[key];
    if ((v === undefined || v === "") && !missing.includes(name)) missing.push(name);
  }
  return missing;
}
