import type { Tool } from "../../types";

const amass: Tool = {
  id: "amass",
  name: "Amass",
  binary: "amass",
  category: "Reconnaissance",
  summary: "In-depth subdomain enumeration and attack-surface mapping.",
  docsUrl: "https://github.com/owasp-amass/amass",
  install: "sudo apt install amass",
  subcommand: {
    label: "Mode",
    defaultOption: "enum",
    options: [
      { id: "enum", label: "enum", tokens: ["enum"], explain: "Perform subdomain enumeration." },
      { id: "intel", label: "intel", tokens: ["intel"], explain: "Collect intelligence about an organization." },
    ],
  },
  fields: [
    {
      id: "domain",
      label: "Domain",
      kind: "text",
      hero: true,
      contextKey: "DOMAIN",
      valueFlag: "-d",
      required: true,
      placeholder: "target.tld",
    },
    {
      id: "passive",
      label: "Passive (-passive)",
      kind: "toggle",
      group: "Mode",
      onTokens: ["-passive"],
      help: "No direct contact with the target's hosts.",
    },
    {
      id: "active",
      label: "Active (-active)",
      kind: "toggle",
      group: "Mode",
      onTokens: ["-active"],
      help: "Includes zone transfers and certificate grabbing.",
    },
    {
      id: "brute",
      label: "Brute force (-brute)",
      kind: "toggle",
      group: "Mode",
      onTokens: ["-brute"],
    },
    {
      id: "wordlist",
      label: "Wordlist (-w)",
      kind: "text",
      group: "Mode",
      contextKey: "WORDLIST",
      valueFlag: "-w",
      placeholder: "/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt",
    },
    {
      id: "output",
      label: "Output file (-o)",
      kind: "text",
      group: "Output",
      valueFlag: "-o",
      placeholder: "amass.txt",
    },
    {
      id: "verbose",
      label: "Verbose (-v)",
      kind: "toggle",
      group: "Output",
      onTokens: ["-v"],
    },
  ],
  presets: [
    { id: "passive", label: "Passive", set: { __subcommand: "enum", passive: true } },
    { id: "active", label: "Active + brute", set: { __subcommand: "enum", active: true, brute: true } },
  ],
};

export default amass;
