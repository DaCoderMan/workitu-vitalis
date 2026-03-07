"""Weekly performance report generator.

Gathers metrics from Vercel Analytics, ClickUp, and PayPal,
then compiles a performance report and emails it to Yonatan.
"""

import os
import re
import requests
import logging
from datetime import datetime, timedelta

log = logging.getLogger("bee-agent")

SITE_URL = os.getenv("BEE_SITE_URL", "https://blaze-post.com")
CLICKUP_TOKEN = os.getenv("CLICKUP_API_TOKEN", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
REPORT_EMAIL = os.getenv("CONTACT_NOTIFICATION_EMAIL", "jonathanperlin@gmail.com")

CLICKUP_API = "https://api.clickup.com/api/v2"

# List IDs
LEADS_LIST_ID = os.getenv("CLICKUP_LEADS_LIST_ID", "901816199661")
ACTIVE_CLIENTS_LIST_ID = os.getenv("CLICKUP_ACTIVE_CLIENTS_LIST_ID", "901816199662")
REVENUE_LIST_ID = os.getenv("CLICKUP_REVENUE_LIST_ID", "901816199664")

# ─── Tool Definitions ────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "generate_weekly_report",
        "description": "Generate a weekly performance report with leads, clients, revenue, and site health data.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "send_performance_report",
        "description": "Email the weekly performance report to Yonatan.",
        "input_schema": {
            "type": "object",
            "properties": {
                "report_markdown": {
                    "type": "string",
                    "description": "The report content in markdown format",
                }
            },
            "required": ["report_markdown"],
        },
    },
]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _clickup_headers():
    return {"Authorization": CLICKUP_TOKEN}


def _get_tasks_since(list_id: str, days: int = 7) -> list:
    """Get tasks created in the last N days from a ClickUp list."""
    if not CLICKUP_TOKEN or not list_id:
        return []
    try:
        since = int((datetime.now() - timedelta(days=days)).timestamp() * 1000)
        resp = requests.get(
            f"{CLICKUP_API}/list/{list_id}/task",
            headers=_clickup_headers(),
            params={"date_created_gt": since},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json().get("tasks", [])
    except Exception as e:
        log.error(f"Failed to fetch tasks from {list_id}: {e}")
    return []


def _check_site_health() -> dict:
    """Quick health check for the report."""
    try:
        resp = requests.get(f"{SITE_URL}/api/health", timeout=10)
        if resp.status_code == 200:
            return resp.json()
        return {"status": "degraded", "http_status": resp.status_code}
    except Exception as e:
        return {"status": "down", "error": str(e)}


# ─── Tool Implementations ────────────────────────────────────────────────────

def generate_weekly_report(**kwargs) -> dict:
    """Compile weekly metrics into a structured report."""
    now = datetime.now()
    week_start = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    week_end = now.strftime("%Y-%m-%d")

    # Gather data
    new_leads = _get_tasks_since(LEADS_LIST_ID, 7)
    new_clients = _get_tasks_since(ACTIVE_CLIENTS_LIST_ID, 7)
    revenue_entries = _get_tasks_since(REVENUE_LIST_ID, 7)
    health = _check_site_health()

    # Calculate revenue from task names (format: "$500 - Client Name")
    total_revenue = 0
    for task in revenue_entries:
        name = task.get("name", "")
        match = re.search(r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)', name)
        if match:
            total_revenue += float(match.group(1).replace(",", ""))

    # Build report
    report = f"""# Bee Weekly Performance Report
**Period:** {week_start} to {week_end}
**Generated:** {now.strftime('%Y-%m-%d %H:%M')} IST

---

## Lead Generation
- **New leads this week:** {len(new_leads)}
- **Lead names:** {', '.join(t.get('name', 'Unknown') for t in new_leads[:10]) or 'None'}

## Clients
- **New clients this week:** {len(new_clients)}
- **Client names:** {', '.join(t.get('name', 'Unknown') for t in new_clients[:10]) or 'None'}

## Revenue
- **New revenue entries:** {len(revenue_entries)}
- **Total new revenue:** ${total_revenue:,.2f}

## Site Health
- **Status:** {health.get('status', 'unknown')}
- **Version:** {health.get('version', 'unknown')}
- **Services:** {', '.join(f"{k}: {v}" for k, v in health.get('services', {}).items()) or 'N/A'}

---

*Report generated automatically by Bee Agent*
"""

    return {
        "report": report,
        "metrics": {
            "new_leads": len(new_leads),
            "new_clients": len(new_clients),
            "revenue_entries": len(revenue_entries),
            "total_revenue": total_revenue,
            "site_status": health.get("status", "unknown"),
        },
        "period": {"start": week_start, "end": week_end},
    }


def send_performance_report(report_markdown: str, **kwargs) -> dict:
    """Email the report via Resend as plain text."""
    if not RESEND_API_KEY:
        log.warning("Resend not configured — report not emailed")
        return {"sent": False, "reason": "Resend API key not configured"}

    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": "Bee Agent <bee@blaze-post.com>",
                "to": [REPORT_EMAIL],
                "subject": f"Bee Weekly Report — {datetime.now().strftime('%Y-%m-%d')}",
                "text": report_markdown,
            },
            timeout=10,
        )
        return {"sent": resp.status_code in (200, 201), "status_code": resp.status_code}
    except Exception as e:
        return {"sent": False, "error": str(e)}


# ─── Dispatch ─────────────────────────────────────────────────────────────────

TOOL_HANDLERS = {
    "generate_weekly_report": generate_weekly_report,
    "send_performance_report": send_performance_report,
}

def execute(tool_name: str, args: dict) -> dict:
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return {"error": f"Unknown tool: {tool_name}"}
    return handler(**args)
