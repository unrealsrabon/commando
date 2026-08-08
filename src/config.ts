/** App-wide constants and content that is not tool-specific. */

import type { SessionVarSpec } from "./types";

/** Default port the Commando agent listens on (127.0.0.1). */
export const DEFAULT_AGENT_PORT = 8787;

export function defaultAgentUrl(): string {
  return `ws://127.0.0.1:${DEFAULT_AGENT_PORT}`;
}

/** Variables shown in the top Context bar and bound to tool fields. */
export const SESSION_VARS: SessionVarSpec[] = [
  { key: "RHOST", label: "RHOST", placeholder: "10.10.10.5", primary: true, help: "Target host or IP" },
  { key: "LHOST", label: "LHOST", placeholder: "10.10.14.7", primary: true, help: "Your attack IP (for callbacks)" },
  { key: "LPORT", label: "LPORT", placeholder: "4444", primary: true, help: "Your listener port" },
  { key: "URL", label: "URL", placeholder: "https://target/", primary: true, help: "Full target URL" },
  { key: "RPORT", label: "RPORT", placeholder: "80", help: "Target port" },
  { key: "DOMAIN", label: "DOMAIN", placeholder: "target.tld", help: "Domain name" },
  { key: "WORDLIST", label: "WORDLIST", placeholder: "/usr/share/wordlists/...", help: "Path to a wordlist" },
  { key: "USER", label: "USER", placeholder: "admin", help: "Username" },
  { key: "PASS", label: "PASS", placeholder: "password", help: "Password" },
];

/** One-click wordlist paths (common Kali / SecLists locations). */
export const WORDLIST_PRESETS: { label: string; value: string }[] = [
  { label: "dirb common", value: "/usr/share/wordlists/dirb/common.txt" },
  { label: "dirbuster medium", value: "/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt" },
  { label: "SecLists directories", value: "/usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt" },
  { label: "SecLists raft files", value: "/usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt" },
  { label: "subdomains top 5k", value: "/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt" },
  { label: "rockyou", value: "/usr/share/wordlists/rockyou.txt" },
];

/** localStorage keys. */
export const LS = {
  session: "commando.session.v1",
  agentUrl: "commando.agentUrl.v1",
  authAck: "commando.authAck.v1",
  layout: "commando.layout.v1",
  selection: "commando.selection.v1",
} as const;

