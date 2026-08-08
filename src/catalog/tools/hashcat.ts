import type { Tool } from "../../types";

const hashcat: Tool = {
  id: "hashcat",
  name: "Hashcat",
  binary: "hashcat",
  category: "Passwords",
  summary: "GPU-accelerated offline password recovery.",
  docsUrl: "https://hashcat.net/wiki/",
  install: "sudo apt install hashcat",
  fields: [
    {
      id: "mode",
      label: "Hash type (-m)",
      kind: "select",
      group: "Attack",
      defaultOption: "md5",
      options: [
        { id: "md5", label: "MD5", tokens: ["-m", "0"] },
        { id: "sha1", label: "SHA1", tokens: ["-m", "100"] },
        { id: "sha256", label: "SHA-256", tokens: ["-m", "1400"] },
        { id: "sha512", label: "SHA-512", tokens: ["-m", "1700"] },
        { id: "ntlm", label: "NTLM", tokens: ["-m", "1000"] },
        { id: "netntlmv2", label: "NetNTLMv2", tokens: ["-m", "5600"] },
        { id: "bcrypt", label: "bcrypt", tokens: ["-m", "3200"] },
        { id: "sha512crypt", label: "sha512crypt", tokens: ["-m", "1800"] },
      ],
    },
    {
      id: "attack",
      label: "Attack mode (-a)",
      kind: "select",
      group: "Attack",
      defaultOption: "straight",
      options: [
        { id: "straight", label: "Straight (wordlist)", tokens: ["-a", "0"] },
        { id: "combo", label: "Combination", tokens: ["-a", "1"] },
        { id: "brute", label: "Brute force / mask", tokens: ["-a", "3"] },
      ],
    },
    {
      id: "rules",
      label: "Rules file (-r)",
      kind: "text",
      group: "Attack",
      valueFlag: "-r",
      placeholder: "/usr/share/hashcat/rules/best64.rule",
    },
    {
      id: "optimized",
      label: "Optimized kernel (-O)",
      kind: "toggle",
      group: "Behaviour",
      onTokens: ["-O"],
    },
    {
      id: "force",
      label: "Force (--force)",
      kind: "toggle",
      group: "Behaviour",
      onTokens: ["--force"],
    },
    {
      id: "showCracked",
      label: "Show cracked (--show)",
      kind: "toggle",
      group: "Behaviour",
      onTokens: ["--show"],
    },
    {
      id: "hashFile",
      label: "Hash file",
      kind: "text",
      hero: true,
      positional: true,
      required: true,
      placeholder: "hashes.txt",
    },
    {
      id: "wordlist",
      label: "Wordlist / mask",
      kind: "text",
      positional: true,
      contextKey: "WORDLIST",
      placeholder: "/usr/share/wordlists/rockyou.txt",
    },
  ],
  presets: [
    {
      id: "ntlm",
      label: "NTLM + rockyou",
      set: { mode: "ntlm", attack: "straight", wordlist: "/usr/share/wordlists/rockyou.txt" },
    },
    {
      id: "md5",
      label: "MD5 + rockyou",
      set: { mode: "md5", attack: "straight", wordlist: "/usr/share/wordlists/rockyou.txt" },
    },
  ],
};

export default hashcat;
