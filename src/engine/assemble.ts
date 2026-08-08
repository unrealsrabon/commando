/**
 * Command-assembly core.
 *
 * Turns a tool definition plus the current field values and session variables
 * into a real command line. Each field declares how it maps to tokens, so this
 * one function assembles tools whose targets sit in completely different places
 * (positional, behind a flag, inside a URL template, after a subcommand).
 *
 * Assembly order:
 *   binary -> subcommand -> non-positional fields (array order)
 *          -> positional fields (array order)
 */

import type { Field, Tool } from "../types";
import { shellQuote } from "./shell";
import { resolveTemplate, type SessionValues } from "./template";

export const SUBCOMMAND_KEY = "__subcommand";

export type FieldValue = string | number | boolean;
export type FieldValues = Record<string, FieldValue | undefined>;

export interface Assembled {
  tokens: string[];
  command: string;
  /** Labels of required fields that are still empty (gates Run). */
  missing: string[];
}

function slug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Resolve the effective raw value of a text/number field before templating. */
function rawValue(field: Field, values: FieldValues, session: SessionValues): string {
  const own = values[field.id];
  if (own !== undefined && String(own) !== "") return String(own);
  if (field.contextKey) {
    const fromSession = session[field.contextKey];
    if (fromSession !== undefined && fromSession !== "") return fromSession;
  }
  if (field.defaultValue !== undefined) return field.defaultValue;
  return "";
}

function emitValueTokens(field: Field, resolved: string): string[] {
  const quoted = field.quote === false ? resolved : shellQuote(resolved);
  if (field.positional || !field.valueFlag) return [quoted];
  if (field.assign === "equals") return [`${field.valueFlag}=${quoted}`];
  return [field.valueFlag, quoted];
}

/** Default field values for a freshly opened tool panel. */
export function defaultValues(tool: Tool): FieldValues {
  const values: FieldValues = {};
  if (tool.subcommand) values[SUBCOMMAND_KEY] = tool.subcommand.defaultOption;
  for (const field of tool.fields) {
    if (field.kind === "toggle") values[field.id] = field.defaultOn ?? false;
    else if (field.kind === "select") values[field.id] = field.defaultOption ?? "";
    else if (field.defaultValue !== undefined) values[field.id] = field.defaultValue;
  }
  return values;
}

export function assemble(
  tool: Tool,
  values: FieldValues,
  session: SessionValues,
): Assembled {
  const pre: string[] = [];
  const post: string[] = [];
  const missing: string[] = [];

  for (const field of tool.fields) {
    switch (field.kind) {
      case "toggle": {
        const on = values[field.id];
        const isOn = on === undefined ? Boolean(field.defaultOn) : Boolean(on);
        if (isOn && field.onTokens) pre.push(...field.onTokens);
        break;
      }
      case "select": {
        const chosen = (values[field.id] as string) ?? field.defaultOption ?? "";
        if (!chosen) break;
        const option = field.options?.find((o) => o.id === chosen);
        if (option) (field.positional ? post : pre).push(...option.tokens);
        break;
      }

      case "text":
      case "number": {
        const raw = rawValue(field, values, session);
        const bucket = field.positional ? post : pre;
        if (raw === "") {
          if (field.required) {
            const placeholder = `<${slug(field.label)}>`;
            bucket.push(...emitValueTokens(field, placeholder));
            missing.push(field.label);
          }
          break;
        }
        const resolved = field.template
          ? resolveTemplate(field.template, raw, session)
          : raw;
        bucket.push(...emitValueTokens(field, resolved));
        break;
      }
    }
  }

  const tokens: string[] = [tool.binary];
  if (tool.subcommand) {
    const chosen = (values[SUBCOMMAND_KEY] as string) ?? tool.subcommand.defaultOption;
    const option = tool.subcommand.options.find((o) => o.id === chosen);
    if (option) tokens.push(...option.tokens);
  }
  tokens.push(...pre, ...post);

  return { tokens, command: tokens.join(" "), missing };
}
