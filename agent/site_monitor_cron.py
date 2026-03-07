#!/usr/bin/env python3
"""Standalone site monitoring cron — runs hourly on VPS.

Checks site health, sends Telegram alert if down.
Runs broken link detection weekly (Sundays).

Crontab entries:
  0 * * * *  cd /var/www/bee-brain && python3 agent/site_monitor_cron.py
  0 9 * * 0  cd /var/www/bee-brain && python3 agent/site_monitor_cron.py --weekly
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path

# Add agent dir to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from tools.site_monitor import check_site_health, check_broken_links, send_alert
from tools.content_manager import list_blog_drafts, publish_blog_post, trigger_revalidation
from tools.performance_reporter import generate_weekly_report, send_performance_report

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("bee-monitor")

STATUS_FILE = Path(__file__).parent / ".site_status.json"


def load_last_status() -> dict:
    if STATUS_FILE.exists():
        return json.loads(STATUS_FILE.read_text())
    return {"status": "unknown", "consecutive_failures": 0}


def save_status(status: dict):
    STATUS_FILE.write_text(json.dumps(status, indent=2))


def run_health_check():
    """Hourly health check with escalating alerts."""
    log.info("Running health check...")
    result = check_site_health()
    last = load_last_status()

    current_status = result.get("status", "error")
    log.info(f"Site status: {current_status} (response: {result.get('response_time_ms', '?')}ms)")

    if current_status != "ok":
        failures = last.get("consecutive_failures", 0) + 1
        save_status({"status": current_status, "consecutive_failures": failures, **result})

        # Escalating alerts
        if failures == 1:
            send_alert(
                f"Site is {current_status}!\n{result.get('error', 'Check /api/health')}",
                severity="warning",
            )
        elif failures >= 3:
            send_alert(
                f"CRITICAL: Site has been down for {failures} consecutive checks!\n{result.get('error', '')}",
                severity="critical",
            )
        log.warning(f"Site down — consecutive failures: {failures}")
    else:
        # Recovery alert
        if last.get("status") != "ok" and last.get("status") != "unknown":
            send_alert(
                f"Site recovered! Response time: {result.get('response_time_ms', '?')}ms",
                severity="info",
            )
        save_status({"status": "ok", "consecutive_failures": 0, **result})
        log.info("Site healthy")


def run_weekly_tasks():
    """Weekly tasks: broken links, performance report, auto-publish."""
    log.info("Running weekly tasks...")

    # 1. Broken link detection
    log.info("Checking for broken links...")
    links_result = check_broken_links(max_pages=30)
    if links_result.get("broken_count", 0) > 0:
        broken_list = "\n".join(
            f"- {b.get('url', '?')} ({b.get('status', b.get('error', '?'))})"
            for b in links_result["broken_links"][:10]
        )
        send_alert(
            f"Found {links_result['broken_count']} broken links:\n{broken_list}",
            severity="warning",
        )
    log.info(f"Broken links: {links_result.get('broken_count', 0)}")

    # 2. Auto-publish ready blog posts
    log.info("Checking for publishable blog drafts...")
    drafts = list_blog_drafts()
    ready_posts = [d for d in drafts.get("drafts", []) if d.get("status") == "ready"]
    for post in ready_posts:
        log.info(f"Auto-publishing: {post['name']}")
        publish_blog_post(post["id"])
        send_alert(f"Auto-published blog post: {post['name']}", severity="info")

    # 3. Generate and send performance report
    log.info("Generating weekly performance report...")
    report_data = generate_weekly_report()
    report_md = report_data.get("report", "")
    if report_md:
        send_result = send_performance_report(report_md)
        log.info(f"Report sent: {send_result.get('sent', False)}")

    # 4. Trigger revalidation to pick up any content changes
    log.info("Triggering site revalidation...")
    trigger_revalidation()

    log.info("Weekly tasks complete")


if __name__ == "__main__":
    if "--weekly" in sys.argv:
        run_health_check()
        run_weekly_tasks()
    elif "--test" in sys.argv:
        result = check_site_health()
        print(json.dumps(result, indent=2))
    else:
        run_health_check()
