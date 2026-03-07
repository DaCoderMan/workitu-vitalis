#!/bin/bash
# Bee Agent — One-time VPS setup script
# Run this on the Hetzner VPS to set up the autonomous agent
#
# Usage: ssh root@65.109.230.136 'bash -s' < agent/setup.sh

set -e

echo "=== Bee Agent VPS Setup ==="

# 1. Install Python3 and pip if not present
echo "[1/7] Checking Python..."
if ! command -v python3 &> /dev/null; then
    apt-get update && apt-get install -y python3 python3-pip python3-venv
fi
python3 --version

# 2. Clone or pull the brain repo
echo "[2/7] Setting up brain repo..."
REPO_DIR="/var/www/bee-brain"
if [ -d "$REPO_DIR" ]; then
    cd "$REPO_DIR"
    git pull origin main
else
    mkdir -p /var/www
    cd /var/www
    git clone https://github.com/DaCoderMan/workitu-bee-brain.git bee-brain
    cd bee-brain
fi

# 3. Create virtual environment
echo "[3/7] Setting up Python venv..."
python3 -m venv agent/venv
source agent/venv/bin/activate

# 4. Install dependencies
echo "[4/7] Installing Python dependencies..."
pip install -r agent/requirements.txt

# 5. Create .env template
echo "[5/7] Creating .env template..."
if [ ! -f agent/.env ]; then
    cat > agent/.env << 'ENVEOF'
# Bee Agent Environment — Fill in your API keys
DEEPSEEK_API_KEY=your_deepseek_key_here
CLICKUP_API_TOKEN=your_clickup_token_here
BEE_BRAIN_PATH=/var/www/bee-brain

# Google API (optional — agent works without these)
# GOOGLE_TOKEN_PATH=agent/token.json
ENVEOF
    echo "  Created agent/.env — EDIT THIS FILE with your API keys!"
else
    echo "  agent/.env already exists, skipping."
fi

# 6. Make run.sh executable
echo "[6/7] Setting permissions..."
chmod +x agent/run.sh

# 7. Set up cron job
echo "[7/7] Setting up cron..."
CRON_JOB="0 8 * * * /var/www/bee-brain/agent/venv/bin/python3 /var/www/bee-brain/agent/bee_agent.py >> /var/log/bee-agent.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "bee_agent.py"; then
    echo "  Cron job already exists."
else
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "  Cron job added: daily at 08:00 IST"
fi

# Create log file
touch /var/log/bee-agent.log

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit agent/.env with your API keys:"
echo "   nano /var/www/bee-brain/agent/.env"
echo ""
echo "2. Test the agent:"
echo "   cd /var/www/bee-brain"
echo "   source agent/venv/bin/activate"
echo "   python3 agent/bee_agent.py --test"
echo ""
echo "3. Do a dry run:"
echo "   python3 agent/bee_agent.py --dry-run"
echo ""
echo "4. Check cron is set:"
echo "   crontab -l"
echo ""
echo "5. Monitor logs:"
echo "   tail -f /var/log/bee-agent.log"
