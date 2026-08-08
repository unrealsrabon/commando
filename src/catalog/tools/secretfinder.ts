import type { Tool } from "../../types";

const secretfinder: Tool = {
  id: "secretfinder",
  name: "SecretFinder",
  binary: "secretfinder",
  category: "Web",
  summary: "Discover API keys, tokens and secrets inside JavaScript files.",
  docsUrl: "https://github.com/m4ll0k/SecretFinder",
  install: "python3 SecretFinder.py  (or alias `secretfinder`)",
  fields: [
    {
      id: "input",
      label: "Input URL / file",
      kind: "text",
      hero: true,
      contextKey: "URL",
      valueFlag: "-i",
      required: true,
      placeholder: "https://target/main.js",
      help: "A JS URL, a page URL, or a local file.",
    },
    {
      id: "output",
      label: "Output (-o)",
      kind: "select",
      group: "Output",
      defaultOption: "cli",
      options: [
        { id: "cli", label: "cli", tokens: ["-o", "cli"] },
        { id: "html", label: "html report", tokens: ["-o", "results.html"] },
      ],
    },
    {
      id: "extension",
      label: "Extract from all JS (-e)",
      kind: "toggle",
      group: "Behaviour",
      onTokens: ["-e"],
      help: "Crawl the page and pull secrets from every linked JS file.",
    },
    {
      id: "cookie",
      label: "Cookie (-c)",
      kind: "text",
      group: "Behaviour",
      valueFlag: "-c",
      placeholder: "session=...",
    },
  ],
  presets: [
    { id: "crawl", label: "Crawl all JS", set: { extension: true, output: "cli" } },
  ],
};

export default secretfinder;
