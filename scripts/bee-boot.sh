#!/bin/bash
# bee-boot.sh — Generate a boot paste for a new Bee Tu thread on claude.ai
# Usage: bash scripts/bee-boot.sh | clip   (copies to clipboard on Windows)
# Or:    bash scripts/bee-boot.sh           (prints to terminal, copy manually)

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_FILE="$REPO_DIR/context/current-state.md"
TODAY=$(date +%Y-%m-%d)
DAY=$(date +%A)

cat <<HEADER
Bee, new thread. Today is $TODAY ($DAY). Here's where we are:

HEADER

# Include the full current-state.md — it's already well-structured
if [ -f "$STATE_FILE" ]; then
    cat "$STATE_FILE"
else
    echo "[current-state.md not found — update me manually]"
fi

cat <<FOOTER

---
Quick ref — Key ClickUp list IDs:
- Leads: 901816199661
- Active Clients: 901816199662
- Revenue Tracker: 901816199664
- Daily Tasks: 901816199648
- PRDs: 901816203465
- Medical: 901816199668
- BTL: 901816199675

Let's go.
FOOTER
