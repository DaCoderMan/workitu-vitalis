#!/usr/bin/env python3
"""Bee v4.0 Multi-Agent Orchestrator.

Runs specialist agents in priority order, compiles reports into a daily briefing.
Replaces bee_agent.py as the primary cron entry point.

Usage:
    python multi_agent.py              # Full run
    python multi_agent.py --dry-run    # Generate but don't commit/push
    python multi_agent.py --test       # Test tool connections only
    python multi_agent.py --single btl # Run only one specialist
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path

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

# Imports
import specialist_runner
from tool_registry import get_all_tools, execute_tool
from tools import github_tool, obsidian_tool

AGENT_DIR = Path(__file__).parent
CONFIG = json.loads((AGENT_DIR / "config.json").read_text())
TODAY = datetime.now().strftime("%Y-%m-%d")
DAY_NAME = datetime.now().strftime("%A")


# ─── Tool Filtering ──────────────────────────────────────────────────────────

def filter_tools(all_tools: list, tool_prefixes: list) -> list:
    """Filter tools by name prefix patterns.

    tool_prefixes like ["clickup_*", "vault_*", "gmail_*"] will include
    all tools whose name starts with "clickup_", "vault_", or "gmail_".
    """
    filtered = []
    for tool in all_tools:
        name = tool["function"]["name"]
        for prefix in tool_prefixes:
            pattern = prefix.rstrip("*")
            if name.startswith(pattern) or name == prefix:
                filtered.append(tool)
                break
    return filtered


# ─── Orchestrator ─────────────────────────────────────────────────────────────

def run_orchestrator(dry_run: bool = False, single: str = None):
    """Run all specialists in priority order, compile briefing."""

    log.info(f"=== Bee Multi-Agent Orchestrator — {TODAY} ({DAY_NAME}) ===")

    # Step 1: Pull latest (non-fatal if it fails)
    if not dry_run:
        try:
            result = github_tool.pull()
            if result.get("success"):
                log.info(f"Git pull: OK")
            else:
                log.warning(f"Git pull failed (non-fatal): {result.get('error', 'unknown')}")
        except Exception as e:
            log.warning(f"Git pull error (non-fatal): {e}")

    # Step 2: Check if briefing already exists
    brain_path = os.environ.get("BEE_BRAIN_PATH", CONFIG.get("brain_repo_path", "."))
    briefing_dir = os.path.join(brain_path, "context", "daily")
    briefing_path = os.path.join(briefing_dir, f"{TODAY}.md")

    if os.path.exists(briefing_path) and not single:
        log.info(f"Briefing already exists for {TODAY}. Skipping.")
        return

    # Step 3: Load specialist configs
    multi_config = CONFIG.get("multi_agent", {})
    if not multi_config.get("enabled", False):
        log.info("Multi-agent system disabled in config. Falling back to legacy agent.")
        return

    specialists = multi_config.get("specialists", {})
    all_tools = get_all_tools()

    # Step 4: Sort by priority and run
    sorted_specs = sorted(specialists.items(), key=lambda x: x[1].get("priority", 99))

    # Filter to single specialist if requested
    if single:
        sorted_specs = [(k, v) for k, v in sorted_specs if k == single]
        if not sorted_specs:
            log.error(f"Unknown specialist: {single}")
            return

    reports = []
    total_calls = 0
    max_daily = multi_config.get("max_daily_calls", 30)

    for name, spec in sorted_specs:
        if total_calls >= max_daily:
            log.warning(f"Daily call limit reached ({max_daily}). Skipping remaining specialists.")
            break

        log.info(f"--- Running specialist: {name} (priority {spec.get('priority', '?')}) ---")

        # Filter tools for this specialist
        tool_prefixes = spec.get("tools", [])
        specialist_tools = filter_tools(all_tools, tool_prefixes)
        log.info(f"  Tools available: {len(specialist_tools)}")

        max_calls = spec.get("max_calls", 3)

        try:
            report = specialist_runner.run(
                prompt_file=spec["prompt"],
                tools=specialist_tools,
                max_calls=max_calls,
                specialist_name=name,
            )
            reports.append(report)
            total_calls += max_calls  # Approximate
            log.info(f"  Status: {report.get('status', '?')} | Urgent: {len(report.get('urgent', []))}")
        except Exception as e:
            log.error(f"  Specialist {name} failed: {e}")
            reports.append({
                "domain": name,
                "status": "error",
                "notes": str(e),
                "urgent": [],
                "actions_taken": [],
                "recommendations": [],
            })

    # Step 5: Compile briefing
    briefing = compile_briefing(reports)
    log.info(f"Briefing compiled: {len(briefing)} chars, {len(reports)} specialists")

    # Step 6: Save
    os.makedirs(briefing_dir, exist_ok=True)
    Path(briefing_path).write_text(briefing, encoding="utf-8")
    log.info(f"Briefing saved to {briefing_path}")

    # Also save to vault
    try:
        obsidian_tool.vault_daily_note(
            date=TODAY,
            append_content=f"\n## Multi-Agent Briefing\n\n{briefing}",
        )
    except Exception as e:
        log.warning(f"Vault daily note failed: {e}")

    # Step 7: Commit and push
    if not dry_run:
        try:
            result = github_tool.commit_and_push(
                files=[f"context/daily/{TODAY}.md"],
                message=f"briefing: {TODAY} multi-agent daily report",
            )
            log.info(f"Git commit: {result}")
        except Exception as e:
            log.warning(f"Git commit failed: {e}")

        # Telegram notification
        _send_telegram_notification(briefing, reports)

    log.info(f"=== Orchestrator complete — {len(reports)} specialists, ~{total_calls} API calls ===")


# ─── Briefing Compiler ───────────────────────────────────────────────────────

def compile_briefing(reports: list) -> str:
    """Compile specialist reports into a single daily briefing."""
    lines = [
        f"# Daily Briefing — {TODAY} ({DAY_NAME})",
        "",
    ]

    # Collect all urgent items across specialists
    all_urgent = []
    for r in reports:
        for item in r.get("urgent", []):
            all_urgent.append(f"[{r['domain'].upper()}] {item}")

    # Urgent section
    lines.append("## Urgent")
    if all_urgent:
        for item in all_urgent:
            lines.append(f"- 🔴 {item}")
    else:
        lines.append("- Nothing urgent today.")
    lines.append("")

    # Specialist reports
    for r in reports:
        domain = r.get("domain", "unknown").upper()
        status = r.get("status", "?")
        status_icon = {"ok": "🟢", "warning": "🟡", "critical": "🔴", "error": "⚠️"}.get(status, "❓")

        lines.append(f"## {status_icon} {domain}")

        if r.get("notes"):
            lines.append(f"{r['notes']}")

        if r.get("actions_taken"):
            lines.append("")
            lines.append("**Actions taken:**")
            for a in r["actions_taken"]:
                lines.append(f"- {a}")

        if r.get("recommendations"):
            lines.append("")
            lines.append("**Recommendations:**")
            for rec in r["recommendations"]:
                lines.append(f"- {rec}")

        lines.append("")

    # Footer
    now = datetime.now().strftime("%H:%M")
    lines.append("---")
    lines.append(f"*Generated by Bee v4.0 multi-agent orchestrator at {now} IST*")

    return "\n".join(lines)


# ─── Notifications ────────────────────────────────────────────────────────────

def _send_telegram_notification(briefing: str, reports: list):
    """Send a summary to Telegram."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return

    # Build short summary
    urgent_count = sum(len(r.get("urgent", [])) for r in reports)
    summary = f"☀️ Bee Daily Briefing — {TODAY}\n"
    summary += f"Specialists: {len(reports)} | Urgent: {urgent_count}\n\n"

    for r in reports:
        status_icon = {"ok": "🟢", "warning": "🟡", "critical": "🔴", "error": "⚠️"}.get(r.get("status", "?"), "❓")
        summary += f"{status_icon} {r['domain'].upper()}"
        if r.get("urgent"):
            summary += f" — {', '.join(r['urgent'][:2])}"
        summary += "\n"

    try:
        import requests as req
        for cid in chat_id.split(","):
            req.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": cid.strip(), "text": summary[:4000], "parse_mode": "HTML"},
                timeout=10,
            )
    except Exception as e:
        log.warning(f"Telegram notification failed: {e}")


# ─── Test Mode ────────────────────────────────────────────────────────────────

def test_connections():
    """Test all tool connections."""
    log.info("=== Testing tool connections ===")

    from tools import clickup_tool, gmail_tool, gcal_tool

    # ClickUp
    try:
        result = clickup_tool.get_overdue_tasks()
        log.info(f"✓ ClickUp: {len(result)} overdue tasks")
    except Exception as e:
        log.error(f"✗ ClickUp: {e}")

    # Gmail
    try:
        result = gmail_tool.search_messages("is:unread", max_results=1)
        log.info(f"✓ Gmail: {len(result)} unread messages")
    except Exception as e:
        log.error(f"✗ Gmail: {e}")

    # Calendar
    try:
        result = gcal_tool.list_events_today()
        log.info(f"✓ Calendar: {len(result)} events today")
    except Exception as e:
        log.error(f"✗ Calendar: {e}")

    # Google Drive
    try:
        from tools import gdrive_tool
        result = gdrive_tool.gdrive_list_files(max_results=1)
        if result.get("success"):
            log.info(f"✓ Google Drive: {result.get('count', 0)} files in root")
        else:
            log.warning(f"⚠ Google Drive: {result.get('error', 'unknown')}")
    except Exception as e:
        log.warning(f"⚠ Google Drive: {e}")

    # Web search
    try:
        from tools import web_search_tool
        result = web_search_tool.web_search("test", max_results=1)
        if result.get("success"):
            log.info(f"✓ Web search: {result.get('count', 0)} results")
        else:
            log.warning(f"⚠ Web search: {result.get('error', 'unknown')}")
    except Exception as e:
        log.warning(f"⚠ Web search: {e}")

    # Vault
    try:
        result = obsidian_tool.vault_list()
        log.info(f"✓ Vault: {result.get('count', 0)} notes")
    except Exception as e:
        log.error(f"✗ Vault: {e}")

    log.info("=== Connection tests complete ===")


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if "--test" in sys.argv:
        test_connections()
    elif "--single" in sys.argv:
        idx = sys.argv.index("--single")
        if idx + 1 < len(sys.argv):
            run_orchestrator(dry_run="--dry-run" in sys.argv, single=sys.argv[idx + 1])
        else:
            print("Usage: python multi_agent.py --single <specialist_name>")
    else:
        run_orchestrator(dry_run="--dry-run" in sys.argv)
