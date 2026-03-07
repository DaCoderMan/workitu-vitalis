#!/usr/bin/env python3
"""Bee v4.0 — Deploy agent to VPS.

Uploads ALL agent files via SFTP, installs deps, restarts PM2 services.
Replaces the old deploy_telegram_bot.py with a complete deployment.

Usage:
    py scripts/deploy-to-vps.py               # Deploy all agent files
    py scripts/deploy-to-vps.py --with-token   # Also upload token.json
    py scripts/deploy-to-vps.py --dry-run      # Show what would be uploaded
"""

import paramiko
import tarfile
import io
import os
import sys
import stat

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

VPS_HOST = "65.109.230.136"
VPS_USER = "root"
VPS_PATH = "/var/www/bee-brain/agent"

AGENT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "agent")

# Skip these when walking agent/ directory
SKIP_DIRS = {"__pycache__", "venv", ".git", "node_modules"}
SKIP_FILES = {".env", ".env.example"}
# token.json only uploaded with --with-token flag
SENSITIVE_FILES = {"token.json"}
# Windows special files that break tarfile
SPECIAL_NAMES = {"NUL", "CON", "PRN", "AUX", "COM1", "LPT1"}


def collect_files(include_token=False):
    """Walk agent/ dir and collect all deployable files."""
    files = []
    for root, dirs, filenames in os.walk(AGENT_DIR):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in filenames:
            if f in SKIP_FILES:
                continue
            if f in SENSITIVE_FILES and not include_token:
                continue
            # Skip Windows special files
            name_upper = os.path.splitext(f)[0].upper()
            if name_upper in SPECIAL_NAMES:
                continue
            # Skip compiled Python files
            if f.endswith((".pyc", ".pyo")):
                continue
            full_path = os.path.join(root, f)
            # Skip non-regular files (device files, sockets, etc.)
            try:
                if not stat.S_ISREG(os.stat(full_path).st_mode):
                    continue
            except OSError:
                continue
            rel_path = os.path.relpath(full_path, AGENT_DIR)
            files.append((full_path, rel_path.replace("\\", "/")))
    return files


def main():
    dry_run = "--dry-run" in sys.argv
    with_token = "--with-token" in sys.argv

    files = collect_files(include_token=with_token)

    print(f"{'[DRY RUN] ' if dry_run else ''}Bee v4.0 VPS Deployment")
    print(f"Target: {VPS_USER}@{VPS_HOST}:{VPS_PATH}")
    print(f"Files: {len(files)} | Token: {'yes' if with_token else 'no'}")
    print("-" * 50)

    for _, rel in files:
        print(f"  {rel}")

    if dry_run:
        print(f"\n[DRY RUN] Would upload {len(files)} files. Exiting.")
        return

    # Connect
    print("\nConnecting to VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, timeout=15)
    except Exception as e:
        print(f"SSH key auth failed: {e}")
        pwd = input("Enter VPS root password: ")
        ssh.connect(VPS_HOST, username=VPS_USER, password=pwd, timeout=15)
    print("Connected!")

    # Backup current agent dir
    print("Backing up current agent dir...")
    ssh.exec_command(f"cp -r {VPS_PATH} {VPS_PATH}.bak.$(date +%Y%m%d%H%M)")

    # Create tar
    print("Creating archive...")
    tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode="w:gz") as tar:
        for full_path, rel_path in files:
            try:
                tar.add(full_path, arcname=rel_path)
            except Exception as e:
                print(f"  SKIP ({e}): {rel_path}")
                continue
    tar_buffer.seek(0)
    size_kb = tar_buffer.getbuffer().nbytes / 1024
    print(f"Archive: {size_kb:.1f} KB, {len(files)} files")

    # Upload
    print("Uploading...")
    sftp = ssh.open_sftp()
    remote_tar = "/tmp/bee-agent-deploy.tar.gz"
    sftp.putfo(tar_buffer, remote_tar)

    # Ensure target dirs exist
    ssh.exec_command(f"mkdir -p {VPS_PATH}/tools {VPS_PATH}/tg_bot {VPS_PATH}/api")

    # Extract
    print("Extracting on VPS...")
    _, stdout, stderr = ssh.exec_command(
        f"cd {VPS_PATH} && tar xzf {remote_tar} && rm {remote_tar}"
    )
    exit_code = stdout.channel.recv_exit_status()
    if exit_code != 0:
        print(f"Extract error: {stderr.read().decode()}")
        sftp.close()
        ssh.close()
        return

    # Install requirements
    print("Installing dependencies...")
    _, stdout, stderr = ssh.exec_command(
        f"cd {VPS_PATH} && source venv/bin/activate && pip install -r requirements.txt -q"
    )
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip():
        print(f"  {out.strip()[-300:]}")
    if "ERROR" in err.upper():
        print(f"  pip error: {err[-300:]}")

    # Restart PM2
    print("Restarting PM2 services...")
    _, stdout, _ = ssh.exec_command(
        f"cd {VPS_PATH} && pm2 restart ecosystem.config.js 2>/dev/null || pm2 start ecosystem.config.js && pm2 save"
    )
    print(stdout.read().decode()[-500:])

    # Show PM2 status
    print("PM2 status:")
    _, stdout, _ = ssh.exec_command("pm2 status")
    print(stdout.read().decode())

    # Quick health check
    print("Health checks:")
    checks = [
        ("Vault API", "curl -s http://localhost:3003/api/vault/health"),
        ("Agent test", f"cd {VPS_PATH} && source venv/bin/activate && python3 bee_agent.py --test 2>&1 | tail -5"),
    ]
    for name, cmd in checks:
        _, stdout, stderr = ssh.exec_command(cmd)
        result = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        status = result if result else err[:200]
        print(f"  {name}: {status[:200]}")

    sftp.close()
    ssh.close()
    print("\nDeployment complete!")


if __name__ == "__main__":
    main()
