#!/usr/bin/env python3
"""Deploy Bee Telegram bot to VPS.

Uploads agent files via SFTP, installs deps, starts PM2 process.
"""

import paramiko
import tarfile
import io
import os
import sys

# Fix Windows encoding
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

VPS_HOST = "65.109.230.136"
VPS_USER = "root"
VPS_PATH = "/var/www/bee-brain/agent"

# Files to upload (relative to agent/)
AGENT_DIR = os.path.join(os.path.dirname(__file__), "agent")

FILES = [
    "tool_registry.py",
    "telegram_system_prompt.txt",
    "ecosystem.config.js",
    "config.json",
    "requirements.txt",
    "bee_agent.py",
    "tg_bot/__init__.py",
    "tg_bot/security.py",
    "tg_bot/conversation.py",
    "tg_bot/formatting.py",
    "tg_bot/ai_engine.py",
    "tg_bot/bot.py",
]


def main():
    print("Connecting to VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    # Try key-based auth first
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, timeout=10)
    except Exception as e:
        print(f"SSH key auth failed: {e}")
        pwd = input("Enter VPS root password: ")
        ssh.connect(VPS_HOST, username=VPS_USER, password=pwd, timeout=10)

    print("Connected!")

    # Create tar in memory
    print("Creating archive...")
    tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode="w:gz") as tar:
        for f in FILES:
            local_path = os.path.join(AGENT_DIR, f)
            if not os.path.exists(local_path):
                print(f"  SKIP (not found): {f}")
                continue
            tar.add(local_path, arcname=f)
            print(f"  Added: {f}")

    tar_buffer.seek(0)

    # Upload via SFTP
    print("Uploading to VPS...")
    sftp = ssh.open_sftp()
    remote_tar = "/tmp/bee-telegram-deploy.tar.gz"
    sftp.putfo(tar_buffer, remote_tar)
    print(f"Uploaded to {remote_tar}")

    # Extract on VPS
    print("Extracting on VPS...")
    stdin, stdout, stderr = ssh.exec_command(
        f"cd {VPS_PATH} && tar xzf {remote_tar} && rm {remote_tar}"
    )
    exit_code = stdout.channel.recv_exit_status()
    if exit_code != 0:
        print(f"Extract error: {stderr.read().decode()}")
        return

    # Install new dependency
    print("Installing python-telegram-bot...")
    stdin, stdout, stderr = ssh.exec_command(
        f"source {VPS_PATH}/venv/bin/activate && pip install 'python-telegram-bot>=21.0'"
    )
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(out[-500:] if len(out) > 500 else out)
    if "ERROR" in err.upper():
        print(f"pip error: {err[-300:]}")

    # Create tg_bot directory if needed
    ssh.exec_command(f"mkdir -p {VPS_PATH}/tg_bot")

    # Test import
    print("\nTesting import...")
    stdin, stdout, stderr = ssh.exec_command(
        f"cd {VPS_PATH} && source venv/bin/activate && python3 -c 'from tg_bot.bot import main; print(\"Import OK\")'"
    )
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    print(f"  stdout: {out}")
    if err:
        print(f"  stderr: {err[:500]}")

    # Start with PM2
    print("\nStarting bot with PM2...")
    stdin, stdout, stderr = ssh.exec_command(
        f"cd {VPS_PATH} && pm2 delete bee-telegram 2>/dev/null; pm2 start ecosystem.config.js && pm2 save"
    )
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(out[-500:] if len(out) > 500 else out)

    # Check PM2 status
    print("\nPM2 status:")
    stdin, stdout, stderr = ssh.exec_command("pm2 status")
    print(stdout.read().decode())

    # Show initial logs
    print("Initial logs:")
    stdin, stdout, stderr = ssh.exec_command("pm2 logs bee-telegram --lines 10 --nostream")
    print(stdout.read().decode())
    print(stderr.read().decode())

    sftp.close()
    ssh.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
