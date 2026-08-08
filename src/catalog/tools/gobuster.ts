import type { Tool } from "../../types";

const gobuster: Tool = {
  id: "gobuster",
  name: "Gobuster",
  binary: "gobuster",
  category: "Web",
  summary: "Directory, file and virtual-host brute forcing.",
  docsUrl: "https://github.com/OJ/gobuster",
  install: "sudo apt install gobuster",
  subcommand: {
    label: "Mode",
    defaultOption: "dir",
    options: [
      { id: "dir", label: "dir", tokens: ["dir"], explain: "Brute force directories and files." },
      { id: "vhost", label: "vhost", tokens: ["vhost"], explain: "Brute force virtual hosts." },
      { id: "dns", label: "dns", tokens: ["dns"], explain: "Brute force DNS subdomains (uses -d domain)." },
    ],
  },
  fields: [
    {
      id: "url",
      label: "URL / Domain",
      kind: "text",
      hero: true,
      contextKey: "RHOST",
      valueFlag: "-u",
      template: "http://{value}",
      required: true,
      placeholder: "10.10.10.5",
      help: "For dns mode switch the flag to -d in the preview by editing, or use a domain.",
    },
    {
      id: "wordlist",
      label: "Wordlist",
      kind: "text",
      contextKey: "WORDLIST",
      valueFlag: "-w",
      required: true,
      placeholder: "/usr/share/wordlists/dirb/common.txt",
    },
    {
      id: "extensions",
      label: "Extensions (-x)",
      kind: "text",
      group: "Discovery",
      valueFlag: "-x",
      placeholder: "php,html,txt",
    },
    {
      id: "statusBlacklist",
      label: "Hide status (-b)",
      kind: "text",
      group: "Filters",
      valueFlag: "-b",
      placeholder: "404",
    },
    {
      id: "threads",
      label: "Threads (-t)",
      kind: "number",
      group: "Performance",
      valueFlag: "-t",
      placeholder: "10",
    },
    {
      id: "expanded",
      label: "Expanded URLs (-e)",
      kind: "toggle",
      group: "Output",
      onTokens: ["-e"],
    },
    {
      id: "noTls",
      label: "Skip TLS verify (-k)",
      kind: "toggle",
      group: "Behaviour",
      onTokens: ["-k"],
    },
    {
      id: "followRedirect",
      label: "Follow redirects (-r)",
      kind: "toggle",
      group: "Behaviour",
      onTokens: ["-r"],
    },
  ],
  presets: [
    { id: "dirs", label: "Directories", set: { __subcommand: "dir", threads: "10" } },
    { id: "ext", label: "With extensions", set: { __subcommand: "dir", extensions: "php,html,txt" } },
  ],
};

export default gobuster;
