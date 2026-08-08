import type { Tool } from "../../types";

const john: Tool = {
  id: "john",
  name: "John the Ripper",
  binary: "john",
  category: "Passwords",
  summary: "Versatile offline password cracker with autodetection.",
  docsUrl: "https://www.openwall.com/john/doc/",
  install: "sudo apt install john",
  fields: [
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
      label: "Wordlist",
      kind: "text",
      contextKey: "WORDLIST",
      valueFlag: "--wordlist",
      assign: "equals",
      placeholder: "/usr/share/wordlists/rockyou.txt",
    },
    {
      id: "rules",
      label: "Rules",
      kind: "toggle",
      group: "Attack",
      onTokens: ["--rules"],
      help: "Apply mangling rules to the wordlist.",
    },
    {
      id: "format",
      label: "Format",
      kind: "select",
      group: "Attack",
      clearable: true,
      options: [
        { id: "raw-md5", label: "raw-md5", tokens: ["--format=raw-md5"] },
        { id: "raw-sha1", label: "raw-sha1", tokens: ["--format=raw-sha1"] },
        { id: "raw-sha256", label: "raw-sha256", tokens: ["--format=raw-sha256"] },
        { id: "nt", label: "nt (NTLM)", tokens: ["--format=nt"] },
        { id: "sha512crypt", label: "sha512crypt", tokens: ["--format=sha512crypt"] },
        { id: "bcrypt", label: "bcrypt", tokens: ["--format=bcrypt"] },
      ],
    },
    {
      id: "incremental",
      label: "Incremental",
      kind: "toggle",
      group: "Attack",
      onTokens: ["--incremental"],
      help: "Brute-force mode. Slow but exhaustive.",
    },
    {
      id: "show",
      label: "Show cracked (--show)",
      kind: "toggle",
      group: "Output",
      onTokens: ["--show"],
    },
  ],
  presets: [
    {
      id: "rockyou",
      label: "Wordlist + rules",
      set: { wordlist: "/usr/share/wordlists/rockyou.txt", rules: true },
    },
  ],
};

export default john;
