#!/usr/bin/env python3
"""Bee v4.0 — System Health Check.

Validates all connections, configs, and services.

Usage:
    py scripts/health-check.py
"""

import os
import sys
import json
import socket
import subprocess

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AGENT_DIR = os.path.join(REPO_DIR, "agent")

VPS_HOST = "65.109.230.136"
BEE_SITE_URL = "https://blaze-post.com"
VERCEL_URL = "https://workitu-bee-site.vercel.app"

results = []


def check(name, fn):
    """Run a check and record result."""
    try:
        status, detail = fn()
        results.append((name, status, detail))
    except Exception as e:
        results.append((name, "FAIL", str(e)[:100]))


def check_clickup():
    """Validate ClickUp API token."""
    import requests
    token = os.environ.get("CLICKUP_API_TOKEN", "")
    if not token:
        # Try loading from agent .env
        env_path = os.path.join(AGENT_DIR, ".env")
        if os.path.exists(env_path):
            for line in open(env_path):
                if line.startswith("CLICKUP_API_TOKEN="):
                    token = line.split("=", 1)[1].strip()
    if not token:
        return "WARN", "No CLICKUP_API_TOKEN found in env or agent/.env"
    r = requests.get(
        "https://api.clickup.com/api/v2/team",
        headers={"Authorization": token},
        timeout=10,
    )
    if r.status_code == 200:
        teams = r.json().get("teams", [])
        return "OK", f"Token valid, {len(teams)} team(s)"
    return "FAIL", f"HTTP {r.status_code}: {r.text[:100]}"


def check_google_token():
    """Check if Google OAuth token exists and is valid."""
    token_path = os.path.join(AGENT_DIR, "token.json")
    if not os.path.exists(token_path):
        return "FAIL", "token.json not found at agent/token.json"
    try:
        data = json.load(open(token_path))
        has_refresh = bool(data.get("refresh_token"))
        expiry = data.get("expiry", "unknown")
        return "OK" if has_refresh else "WARN", f"Expiry: {expiry}, refresh_token: {'yes' if has_refresh else 'NO'}"
    except json.JSONDecodeError:
        return "FAIL", "token.json is not valid JSON"


def check_vps_ssh():
    """Check if VPS is reachable via SSH."""
    try:
        import paramiko
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(VPS_HOST, username="root", timeout=10)
        _, stdout, _ = ssh.exec_command("uptime")
        uptime = stdout.read().decode().strip()
        ssh.close()
        return "OK", uptime
    except ImportError:
        # Fallback: just check port
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(5)
        try:
            s.connect((VPS_HOST, 22))
            s.close()
            return "OK", "Port 22 open (paramiko not installed for full check)"
        except Exception:
            return "FAIL", "Port 22 unreachable"


def check_vps_pm2():
    """Check PM2 process status on VPS."""
    try:
        import paramiko
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(VPS_HOST, username="root", timeout=10)
        _, stdout, _ = ssh.exec_command("pm2 jlist 2>/dev/null")
        raw = stdout.read().decode().strip()
        ssh.close()
        if not raw:
            return "WARN", "PM2 not running or no processes"
        procs = json.loads(raw)
        summary = ", ".join(f"{p['name']}: {p['pm2_env']['status']}" for p in procs)
        return "OK", summary
    except ImportError:
        return "WARN", "paramiko not installed — can't check PM2"
    except Exception as e:
        return "FAIL", str(e)[:100]


def check_vault_api():
    """Check vault REST API on VPS."""
    try:
        import paramiko
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(VPS_HOST, username="root", timeout=10)
        _, stdout, _ = ssh.exec_command("curl -s http://localhost:3003/api/vault/health 2>/dev/null")
        raw = stdout.read().decode().strip()
        ssh.close()
        if not raw:
            return "FAIL", "No response from vault API"
        data = json.loads(raw)
        return "OK", f"status: {data.get('status')}, tools: {data.get('tools', '?')}"
    except ImportError:
        return "WARN", "paramiko not installed"
    except Exception as e:
        return "FAIL", str(e)[:100]


def check_dns():
    """Check if blaze-post.com resolves correctly."""
    try:
        ips = socket.getaddrinfo("blaze-post.com", 443, socket.AF_INET)
        resolved = set(ip[4][0] for ip in ips)
        if "76.76.21.21" in resolved:
            return "OK", f"Resolves to {resolved}"
        return "WARN", f"Resolves to {resolved} (expected 76.76.21.21)"
    except socket.gaierror:
        return "FAIL", "DNS resolution failed — A record not configured"


def check_bee_site():
    """Check if Bee site is reachable."""
    import requests
    for url in [BEE_SITE_URL, VERCEL_URL]:
        try:
            r = requests.get(f"{url}/api/health", timeout=10)
            if r.status_code == 200:
                return "OK", f"{url} -> HTTP 200"
        except Exception:
            continue
    return "FAIL", f"Neither {BEE_SITE_URL} nor {VERCEL_URL} reachable"


def check_env_completeness():
    """Check if agent/.env has all required vars."""
    env_path = os.path.join(AGENT_DIR, ".env")
    if not os.path.exists(env_path):
        return "WARN", "agent/.env not found locally (expected on VPS only)"
    vars_found = set()
    for line in open(env_path):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            vars_found.add(line.split("=", 1)[0])
    required = {"DEEPSEEK_API_KEY", "CLICKUP_API_TOKEN", "BEE_BRAIN_PATH"}
    missing = required - vars_found
    if missing:
        return "FAIL", f"Missing required: {', '.join(missing)}"
    return "OK", f"{len(vars_found)} vars configured"


def check_github_access():
    """Check if we can access the private repo."""
    try:
        result = subprocess.run(
            ["git", "ls-remote", "--exit-code", "origin"],
            capture_output=True, text=True, timeout=15, cwd=REPO_DIR
        )
        if result.returncode == 0:
            return "OK", "Can access remote origin"
        return "FAIL", f"Exit code {result.returncode}"
    except Exception as e:
        return "FAIL", str(e)[:100]


def main():
    print("=" * 60)
    print("  Bee v4.0 — System Health Check")
    print("=" * 60)
    print()

    check("ClickUp API", check_clickup)
    check("Google OAuth Token", check_google_token)
    check("VPS SSH", check_vps_ssh)
    check("VPS PM2 Status", check_vps_pm2)
    check("VPS Vault API", check_vault_api)
    check("DNS blaze-post.com", check_dns)
    check("Bee Site", check_bee_site)
    check("Env Vars", check_env_completeness)
    check("GitHub Access", check_github_access)

    # Print results
    print(f"  {'Check':<22} {'Status':<8} {'Details'}")
    print(f"  {'-'*22} {'-'*8} {'-'*40}")
    for name, status, detail in results:
        icon = {"OK": "+", "WARN": "!", "FAIL": "X"}.get(status, "?")
        print(f"  [{icon}] {name:<20} {status:<8} {detail}")

    print()
    ok = sum(1 for _, s, _ in results if s == "OK")
    warn = sum(1 for _, s, _ in results if s == "WARN")
    fail = sum(1 for _, s, _ in results if s == "FAIL")
    print(f"  Summary: {ok} OK / {warn} WARN / {fail} FAIL")
    print("=" * 60)

    sys.exit(1 if fail > 0 else 0)


if __name__ == "__main__":
    main()
