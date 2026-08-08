# Commando — Blueprint

> The offensive workstation you command instead of memorize.
> A production-grade web UI that drives a real terminal on your own machine, with a
> click-to-build catalog of security tools, payloads, privilege-escalation checks
> and cheat-sheets for ethical hackers and CTF players.

This document is the single source of truth for the project. It is design
documentation, not code.

---

## 1. What Commando is

A beginner lands a shell in a CTF and normally opens five browser tabs: revshells.com,
GTFOBins, HackTricks, a wordlist reference, and a flag cheat-sheet. Commando puts all of
that *inside one clean workstation*, wired to a **real terminal**. You do not memorize
commands — you compose them by clicking, and you still have a full interactive shell for
everything else.

Two audiences, one tool:

- **Beginners** lean on the catalog: pick a tool, fill the target, toggle a flag, hit Run.
- **Pros** type freely in the real terminal and dip into the catalog only when they do
  not remember a flag.

---

## 2. Hard constraint that shapes the architecture

GitHub Pages serves **static files only**. A browser **cannot** execute commands or touch
a terminal — that is an OS/browser sandbox rule, not something code can bypass. Therefore
execution happens in a small program the user runs once on their own machine: the
**Commando Agent**. The website is the cockpit; the agent is the engine.

```
+-------------------------+        WebSocket         +---------------------------+
|  Commando Web (Pages)   |  <-------------------->   |   Commando Agent (Go)     |
|  Static SPA             |   keystrokes / commands   |   Local server 127.0.0.1  |
|  - Tool + Workstation   |   PTY output (live)       |   Spawns a real shell in  |
|    catalog UI           |                           |   a PTY per session       |
|  - xterm.js terminal    |                           |                           |
|  - Session Context      |                           |   nmap / ssh / nc / ...   |
+-------------------------+                           +-------------+-------------+
                                                                    | runs
                                                            +-------v--------+
                                                            | Real terminal  |
                                                            | on attack box  |
                                                            +----------------+
```

Because the agent allocates a **PTY** (pseudo-terminal, exactly what a real terminal
emulator uses), everything interactive works: SSH sessions, caught reverse shells,
msfconsole, vim, `sudo` prompts, TTY upgrades, tab-completion, arrow-key history.

The agent runs on your **attack box** (Kali / Parrot / Linux / WSL). Reverse shells come
back to that machine, which is correct.

---

## 3. Layout

```
+---------------------------------------------------------------------------------+
|  Commando        RHOST [ ] LHOST [ ] LPORT [ ] URL [ ]  +vars   [ Connected ]    |  Session Context bar
+------------+--------------------------------------------------+-----------------+
| TOOLS      |  Session 1  Listener  +                          |  Nmap    docs   |
|  Nmap      |  +--------------------------------------------+  |  Target         |
|  Ffuf      |  |                                            |  |  [10.10.10.5 ]  |
|  Gobuster  |  |   the terminal fills this entire pane      |  |  Presets        |
|  Katana    |  |   edge to edge, no dead space              |  |  (Quick)(Full)  |
|  ...       |  |                                            |  |  Options        |
|            |  |                                            |  |  (SYN)(TCP)(UDP)|
| WORKSTATION|  |                                            |  |  Preview        |
|  Rev Shell |  |                                            |  |  nmap 10.10...  |
|  Privesc   |  |                                            |  |  [Copy] [Run]   |
|  Cheats    |  +--------------------------------------------+  |                 |
+------------+--------------------------------------------------+-----------------+
   resizable                    resizable                          resizable
```

- **Three panes, horizontally resizable** via draggable handles (`react-resizable-panels`),
  each with min/max sizes and persisted widths so the layout can never break.
- **Middle pane is the terminal**, filling 100% of its width and height.
- Terminal supports **multiple tabs**, each its own PTY session (e.g. a listener tab plus
  a work tab).

---

## 4. Left sidebar: two sections

- **Tools** — the security tools. Selecting one renders its command builder on the right.
- **Workstation** — everything else that makes it a full cockpit: reverse/bind shells,
  MSFVenom, TTY upgrades, file transfer, Linux/Windows privilege escalation, enumeration,
  situational-awareness cheat-sheets. Selecting an item renders its snippet cards on the
  right.

A single search box filters both sections.

---

## 5. Session Context (the workstation glue)

A shared, persisted pool of variables that every panel reads from and writes to:

`RHOST RPORT LHOST LPORT URL DOMAIN WORDLIST USER PASS`

- **Binding:** each tool field / target declares which variable feeds it. Set `RHOST`
  once and nmap's target, ffuf's URL template, gobuster's `-u`, etc. all auto-fill.
- **Two-way:** typing a value into any tool's field also updates the global, so the next
  tool is ready. Fill once, anywhere, it flows everywhere.
- **Per-field link toggle:** unlink a field for a one-off value that will not overwrite the
  global.
- **Only relevant fields appear.** A tool renders only the fields it declares; unused
  variables are silently ignored. A required-but-empty field (e.g. ffuf wordlist) shows a
  soft "Not set" hint, gates the Run button, and offers quick-picks — it never errors.
- Values are **persisted** to `localStorage` and survive reloads.

---

## 6. Command-assembly engine (where the target actually goes)

Every command is `binary [subcommand] [flags] [target] [trailing positionals]`, but each
tool places the target differently:

| Tool     | Command                                   | Target placement                 |
|----------|-------------------------------------------|----------------------------------|
| nmap     | `nmap -sS -p- 10.10.10.5`                  | positional, at the end           |
| ffuf     | `ffuf -u http://10.10.10.5/FUZZ -w list`  | inside a URL template, flag `-u` |
| gobuster | `gobuster dir -u http://10.10.10.5 -w l`  | after a subcommand, flag `-u`    |
| hydra    | `hydra -l admin -P list 10.10.10.5 ssh`   | positional host + trailing svc   |

So each argument in a tool definition declares **its own nature**: positional vs flagged,
its order, whether it is a plain value or a template (`http://{value}/FUZZ`,
`ssh://{value}`), whether the tool has a subcommand, and which session variable feeds it.

The engine walks the grammar in a fixed order:

```
binary -> subcommand -> flag-target (if any) -> flags (field order)
       -> positional target -> trailing positional fields
```

and emits a token array, then a shell command line. The user never thinks about placement.

**Execution model & safety.** The terminal is a real interactive PTY shell, so Run writes
a **command line** to the shell (not an isolated argv exec) — this is what makes SSH,
reverse shells and free typing work. Values are therefore **shell-quoted** during assembly
so spaces / special characters cannot break or inject. Safety comes from: quoting, an
always-visible **preview** the user reviews before Run, the agent **printing every command
it runs**, and dangerous-flag warnings. This is the honest trade-off of "it is a real
terminal": we quote rather than sandbox, because the user owns the shell anyway.

### On-load state ("minimal valid command")

When a tool loads, the panel shows the simplest runnable command: `binary + target +
mandatory flags`, everything optional off. Chips append as the user clicks. The panel is
never blank or confusing.

### Panel anatomy (identical for every tool)

```
Header:   tool name (fixed label) + docs + reset
Target:   hero field, pinned at top, bound to a session var, link toggle
Presets:  rounded quick-pick buttons
Options:  rounded flag chips / segmented selects / labeled inputs
Preview:  live command line, updates on every click, copy button
Actions:  Copy | Run   (Run gated by missing required fields / no connection)
```

---

## 7. Worked example (covers every feature)

Target `10.10.10.55`, attack box `10.10.14.7`.

1. Run `commando-agent` on Kali; it prints a pairing code.
2. Open the site, paste the code -> **Connected**; the middle terminal is a live shell.
3. Top bar: set `RHOST=10.10.10.55`, `LHOST=10.10.14.7`, `LPORT=4444` (only time you type them).
4. Tools -> nmap: target pre-filled; click preset **Full + versions**; Run; find 22 and 80.
5. Tools -> ffuf: URL auto-templated to `http://10.10.10.55/FUZZ`; pick a wordlist quick-pick; Run; find `/admin`.
6. Workstation -> Reverse Shell (Bash): `LHOST/LPORT` pre-filled; click **Start listener**
   -> new terminal tab runs `nc -lvnp 4444`; Copy payload, paste on target; shell catches.
7. Workstation -> TTY Upgrade: click **Spawn PTY**; two more clicks stabilize it.
8. Workstation -> Linux Privesc: click `sudo -l`, `find / -perm -4000`, or **Download
   linpeas** (uses `LHOST` to build the `wget` + a one-click `python3 -m http.server`).
9. Never left the app.

---

## 8. Content is data, engine is code

Everything catalog-shaped is a **definition object** validated by a shared schema:

- **Tools** -> command builder.
- **Payloads** -> the same model with `{LHOST}/{LPORT}` templates + language variants.
- **Privesc / Enumeration / Cheat-sheets** -> snippet cards with Copy / Run / Explain.

One rendering engine turns any definition into a panel; one assembly core builds the
command; one context store is the single source of truth. Adding a tool or payload = adding
a file, never touching engine code. This is what lets the catalog grow to hundreds of
entries without growing complexity, and lets the community contribute via pull request.

---

## 9. Agent protocol (WebSocket, JSON)

Client -> Agent:

- `{ type: "hello", token }` — authenticate with the pairing token.
- `{ type: "open", session }` — spawn a shell in a new PTY session.
- `{ type: "stdin", session, data }` — base64 keystrokes / command line.
- `{ type: "resize", session, cols, rows }` — resize the PTY.
- `{ type: "close", session }` — kill a session.

Agent -> Client:

- `{ type: "ready" }` — auth accepted.
- `{ type: "stdout", session, data }` — base64 PTY output.
- `{ type: "exit", session, code }` — session ended.
- `{ type: "error", message }`.

Agent rules: bind to `127.0.0.1` only; require the pairing token; check the `Origin`
header against an allowlist; base64 both directions (binary-safe); log every command;
one PTY per session.

---

## 10. Tech stack

- **Web:** Vite + React + TypeScript. `xterm.js` terminal, `react-resizable-panels`,
  hand-written CSS design system (light/off-white, one accent, soft rounded corners).
  Static build -> GitHub Pages via Actions.
- **Agent:** Go single static binary (`creack/pty` + `gorilla/websocket`), one per OS,
  no runtime to install.

---

## 11. Design language

Light, quiet, spacious, production-grade — the Linear / Vercel / Stripe school. Warm
off-white surfaces, one indigo accent, soft rounded corners, subtle depth, monospace only
inside the terminal and previews. No emoji, no neon, no retro, no clutter. It must feel
like a tool people trust, not a toy.

---

## 12. Ethics & safety

Commando drives real offensive tools. A first-run authorization notice ("only test systems
you own or are explicitly authorized to test"), scope framing around labs / CTFs, and
dangerous-command warnings are built in. This is correct and it is what makes the tool
credible for organizations to hand to newcomers.

---

## 13. Repository layout

```
commando/
  BLUEPRINT.md               # this document
  README.md                  # quick start
  index.html                 # SPA entry
  package.json / tsconfig    # web build
  vite.config.ts
  .github/workflows/deploy.yml
  src/
    main.tsx  App.tsx
    styles/global.css        # the design system
    types.ts                 # catalog + workstation schema
    engine/                  # shell quoting, template resolve, command assembly
    state/                   # SessionContext (vars), Connection (agent WS)
    catalog/tools/*.ts       # one file per tool
    workstation/*.ts         # payloads / privesc / cheatsheets
    components/              # TopBar, Sidebar, TerminalPane, CommandPanel, ...
  agent/
    go.mod  main.go  README.md
```

---

## 14. Roadmap after v1

Notes / loot tracking, target profiles, saved sessions, report export, `wss://` via mkcert
for full cross-browser support, a community catalog with PR-based contributions, and a
growing library of tools and payloads.
