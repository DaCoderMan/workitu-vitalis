#!/usr/bin/env python3
"""Bee v4.0 Autonomous Agent — Daily self-running AI Chief of Staff.

Runs via cron on Hetzner VPS. Uses DeepSeek API (OpenAI-compatible) with
tool use to gather data from ClickUp, Gmail, Calendar, and repo files,
then generates a daily briefing.

Usage:
    python bee_agent.py              # Full run (gather data, generate, commit, push)
    python bee_agent.py --dry-run    # Generate briefing but don't commit/push
    python bee_agent.py --test       # Test tool connections only
"""

import os
import sys
import json
import logging
import requests as _requests
from datetime import datetime
from pathlib import Path

from openai import OpenAI
from dotenv import load_dotenv

# Load environment
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("bee-agent")

# Import tool modules
from tools import clickup_tool, gmail_tool, gcal_tool, github_tool
from tool_registry import get_all_tools, execute_tool

# ─── Configuration ───────────────────────────────────────────────────────────

AGENT_DIR = Path(__file__).parent
CONFIG = json.loads((AGENT_DIR / "config.json").read_text())
SYSTEM_PROMPT = (AGENT_DIR / "system_prompt.txt").read_text()

TODAY = datetime.now().strftime("%Y-%m-%d")
DAY_NAME = datetime.now().strftime("%A")
BRIEFING_PATH = f"{CONFIG['briefing_output_dir']}/{TODAY}.md"


# ─── Agent Loop ──────────────────────────────────────────────────────────────

def run_agent(dry_run: bool = False) -> str:
    """Run the Bee agent. Returns the generated briefing content."""

    log.info(f"=== Bee Agent Starting — {TODAY} ({DAY_NAME}) ===")

    # Step 1: Pull latest repo (may fail if no git remote — not fatal)
    if not dry_run:
        log.info("Pulling latest brain repo...")
        try:
            result = github_tool.pull()
            if result.get("success"):
                log.info(f"Git pull: {result.get('output', 'OK')}")
            else:
                log.warning(f"Git pull failed (non-fatal): {result.get('error', 'unknown')}. Continuing with local files.")
        except Exception as e:
            log.warning(f"Git pull error (non-fatal): {e}. Continuing with local files.")

    # Step 2: Check if briefing already exists
    brain_path = os.environ.get("BEE_BRAIN_PATH", CONFIG.get("brain_repo_path", "."))
    existing = os.path.join(brain_path, BRIEFING_PATH)
    if os.path.exists(existing):
        log.info(f"Briefing already exists for {TODAY}. Skipping generation.")
        return Path(existing).read_text()

    # Step 3: Initialize DeepSeek client (OpenAI-compatible)
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        log.error("DEEPSEEK_API_KEY not set!")
        return ""

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com",
    )
    model = CONFIG.get("daily_model", "deepseek-chat")
    max_tokens = CONFIG.get("max_tokens", 2048)

    log.info(f"Using model: {model} (DeepSeek API)")

    # Step 4: Build initial message
    user_message = f"""Today is {TODAY} ({DAY_NAME}). Timezone: {CONFIG['timezone']}.

Please generate today's daily briefing by:
1. First, read context/current-state.md to get carry-forward items and financial alerts
2. Then use ClickUp tools to find overdue and due-today tasks
3. Check Gmail for important unread emails
4. Check Google Calendar for today's events
5. Generate the briefing and save it to {BRIEFING_PATH}

Start by reading the current state file."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]
    tools = get_all_tools()

    # Step 5: Agentic tool-use loop
    briefing_content = None
    max_iterations = CONFIG.get("cost_guard", {}).get("max_daily_calls", 5)

    for iteration in range(max_iterations):
        log.info(f"API call {iteration + 1}/{max_iterations}...")

        response = client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            tools=tools,
            messages=messages,
        )

        choice = response.choices[0]
        message = choice.message
        finish_reason = choice.finish_reason

        log.info(f"Finish reason: {finish_reason}")

        # Append assistant message to conversation
        messages.append(message)

        # Check if we're done (no more tool use)
        if finish_reason == "stop":
            briefing_content = message.content
            break

        # Handle tool calls
        if finish_reason == "tool_calls" and message.tool_calls:
            for tool_call in message.tool_calls:
                fn = tool_call.function
                tool_name = fn.name
                try:
                    tool_args = json.loads(fn.arguments) if fn.arguments else {}
                except json.JSONDecodeError:
                    tool_args = {}

                log.info(f"Executing tool: {tool_name}({json.dumps(tool_args)[:200]})")
                result = execute_tool(tool_name, tool_args)
                log.info(f"Tool result: {result[:300]}")

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result,
                })
        else:
            # Could be a normal stop or unexpected state
            if message.content:
                briefing_content = message.content
            log.warning(f"Unexpected finish reason: {finish_reason}")
            break

    if not briefing_content:
        log.error("No briefing generated!")
        return ""

    # Step 6: Save briefing
    log.info(f"Saving briefing to {BRIEFING_PATH}")
    github_tool.write_file(BRIEFING_PATH, briefing_content)

    # Step 7: Commit and push (unless dry run)
    if not dry_run:
        log.info("Committing and pushing...")
        commit_result = github_tool.commit_and_push(
            f"context: daily briefing {TODAY} (autonomous agent)",
            files=[BRIEFING_PATH],
        )
        log.info(f"Git push: {commit_result}")

        # Step 8: Send notification via ClickUp comment
        try:
            notify_task = CONFIG.get("notifications", {}).get("task_id")
            if notify_task:
                clickup_tool.create_comment(
                    notify_task,
                    f"🐝 Daily Briefing generated for {TODAY}. Check context/daily/{TODAY}.md",
                )
                log.info(f"Notification sent to task {notify_task}")
        except Exception as e:
            log.warning(f"Notification failed: {e}")

        # Step 9: Send Telegram notification
        _send_telegram_briefing(briefing_content)

    log.info(f"=== Bee Agent Complete — {TODAY} ===")
    return briefing_content


def _send_telegram_briefing(briefing: str):
    """Send briefing summary to Telegram."""
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not bot_token or not chat_id:
        log.info("Telegram not configured, skipping notification.")
        return

    # Truncate to Telegram's 4096 char limit, keep the top summary
    max_len = 4000
    header = f"🐝 Daily Briefing — {TODAY}\n\n"
    body = briefing[:max_len - len(header)] if len(briefing) > max_len - len(header) else briefing
    text = header + body

    try:
        resp = _requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
            timeout=10,
        )
        if resp.ok:
            log.info("Telegram notification sent.")
        else:
            # Retry without Markdown if it fails (Markdown can be finicky)
            resp2 = _requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": text},
                timeout=10,
            )
            if resp2.ok:
                log.info("Telegram notification sent (plain text).")
            else:
                log.warning(f"Telegram send failed: {resp2.text[:200]}")
    except Exception as e:
        log.warning(f"Telegram notification error: {e}")


# ─── Test Mode ───────────────────────────────────────────────────────────────

def test_connections():
    """Test all tool connections."""
    log.info("Testing tool connections...")

    # DeepSeek API
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if api_key:
        try:
            client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
            resp = client.chat.completions.create(
                model="deepseek-chat",
                max_tokens=10,
                messages=[{"role": "user", "content": "Say OK"}],
            )
            log.info(f"✓ DeepSeek API: {resp.choices[0].message.content}")
        except Exception as e:
            log.error(f"✗ DeepSeek API: {e}")
    else:
        log.error("✗ DeepSeek API: DEEPSEEK_API_KEY not set")

    # ClickUp
    try:
        tasks = clickup_tool.get_overdue_tasks()
        log.info(f"✓ ClickUp: {len(tasks)} overdue tasks found")
    except Exception as e:
        log.error(f"✗ ClickUp: {e}")

    # Gmail
    try:
        messages = gmail_tool.search_messages(max_results=1)
        log.info(f"✓ Gmail: {len(messages)} messages found")
    except Exception as e:
        log.warning(f"⚠ Gmail: {e} (may not be configured yet)")

    # Calendar
    try:
        events = gcal_tool.list_events_today()
        log.info(f"✓ Calendar: {len(events)} events found")
    except Exception as e:
        log.warning(f"⚠ Calendar: {e} (may not be configured yet)")

    # File read
    try:
        content = github_tool.read_file("context/current-state.md")
        log.info(f"✓ File read: {len(content)} chars from current-state.md")
    except Exception as e:
        log.error(f"✗ File read: {e}")

    log.info("Connection test complete.")


# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]

    if "--test" in args:
        test_connections()
    elif "--dry-run" in args:
        briefing = run_agent(dry_run=True)
        if briefing:
            print("\n" + "=" * 60)
            print("DRY RUN — Generated briefing (not committed):")
            print("=" * 60)
            print(briefing)
    else:
        run_agent(dry_run=False)
