#!/bin/bash
# Bee Agent — Daily cron entry point
# Crontab: 0 8 * * * /var/www/bee-brain/agent/run.sh

set -e

AGENT_DIR="/var/www/bee-brain/agent"
LOG="/var/log/bee-agent.log"

echo "" >> "$LOG"
echo "$(date '+%Y-%m-%d %H:%M:%S') [CRON] Starting Bee Agent..." >> "$LOG"

cd /var/www/bee-brain

# Load environment
if [ -f "$AGENT_DIR/.env" ]; then
    export $(grep -v '^#' "$AGENT_DIR/.env" | xargs)
fi

# Set brain path
export BEE_BRAIN_PATH="/var/www/bee-brain"

# Try multi-agent orchestrator first, fall back to legacy briefing
"$AGENT_DIR/venv/bin/python" "$AGENT_DIR/multi_agent.py" "$@" >> "$LOG" 2>&1 || {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [CRON] Multi-agent failed, falling back to legacy agent..." >> "$LOG"
    "$AGENT_DIR/venv/bin/python" "$AGENT_DIR/bee_agent.py" "$@" >> "$LOG" 2>&1
}

echo "$(date '+%Y-%m-%d %H:%M:%S') [CRON] Bee Agent finished." >> "$LOG"
