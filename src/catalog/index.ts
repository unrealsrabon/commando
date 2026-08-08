/**
 * Tool catalog registry.
 *
 * Every tool is a self-contained definition file. Registering a new tool means
 * importing it here — the UI, search and command builder pick it up automatically.
 */

import type { Tool } from "../types";
import nmap from "./tools/nmap";
import ffuf from "./tools/ffuf";
import gobuster from "./tools/gobuster";
import katana from "./tools/katana";
import amass from "./tools/amass";
import nuclei from "./tools/nuclei";
import hydra from "./tools/hydra";
import hashcat from "./tools/hashcat";
import john from "./tools/john";
import secretfinder from "./tools/secretfinder";
import curl from "./tools/curl";

export const TOOLS: Tool[] = [
  nmap,
  amass,
  katana,
  ffuf,
  gobuster,
  nuclei,
  secretfinder,
  hydra,
  hashcat,
  john,
  curl,
];

/** Display order for tool categories in the sidebar. */
export const CATEGORY_ORDER = [
  "Reconnaissance",
  "Web",
  "Passwords",
  "Utility",
] as const;

export function getTool(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id);
}
