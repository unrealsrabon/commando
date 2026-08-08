/**
 * Workstation registry: payloads, privilege escalation and cheat-sheets.
 * Like tools, each item is data — add a definition and it appears automatically.
 */

import type { WorkstationItem } from "../types";
import { PAYLOADS } from "./payloads";
import { PRIVESC } from "./privesc";
import { CHEATSHEETS } from "./cheatsheets";

export const WORKSTATION: WorkstationItem[] = [...PAYLOADS, ...PRIVESC, ...CHEATSHEETS];

/** Display order for workstation categories in the sidebar. */
export const WORKSTATION_CATEGORY_ORDER = [
  "Payloads",
  "Privilege Escalation",
  "Cheat-sheets",
] as const;

export function getWorkstationItem(id: string): WorkstationItem | undefined {
  return WORKSTATION.find((w) => w.id === id);
}
