"""Site monitoring tool — health checks, broken link detection, uptime tracking.

Used by the VPS agent to monitor the Bee website autonomously.
"""

import os
import requests
import logging
from datetime import datetime
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup

log = logging.getLogger("bee-agent")

SITE_URL = os.getenv("BEE_SITE_URL", "https://blaze-post.com")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# ─── Tool Definitions ────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "check_site_health",
        "description": "Check the Bee website health endpoint. Returns status, uptime, and service connectivity.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "check_broken_links",
        "description": "Crawl the site and find broken links. Returns list of broken URLs.",
        "input_schema": {
            "type": "object",
            "properties": {
                "max_pages": {
                    "type": "integer",
                    "description": "Maximum pages to crawl (default 20)",
                }
            },
            "required": [],
        },
    },
    {
        "name": "send_alert",
        "description": "Send an alert via Telegram about a site issue.",
        "input_schema": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "Alert message to send",
                },
                "severity": {
                    "type": "string",
                    "enum": ["info", "warning", "critical"],
                    "description": "Alert severity level",
                },
            },
            "required": ["message"],
        },
    },
]


# ─── Tool Implementations ────────────────────────────────────────────────────

def check_site_health(**kwargs) -> dict:
    """Ping /api/health and return structured status."""
    try:
        resp = requests.get(f"{SITE_URL}/api/health", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            return {
                "status": "ok",
                "site_url": SITE_URL,
                "response_time_ms": int(resp.elapsed.total_seconds() * 1000),
                "health_data": data,
                "checked_at": datetime.now().isoformat(),
            }
        else:
            return {
                "status": "degraded",
                "site_url": SITE_URL,
                "http_status": resp.status_code,
                "response_time_ms": int(resp.elapsed.total_seconds() * 1000),
                "checked_at": datetime.now().isoformat(),
            }
    except requests.ConnectionError:
        return {
            "status": "down",
            "site_url": SITE_URL,
            "error": "Connection refused — site may be offline",
            "checked_at": datetime.now().isoformat(),
        }
    except requests.Timeout:
        return {
            "status": "down",
            "site_url": SITE_URL,
            "error": "Request timed out (>10s)",
            "checked_at": datetime.now().isoformat(),
        }
    except Exception as e:
        return {
            "status": "error",
            "site_url": SITE_URL,
            "error": str(e),
            "checked_at": datetime.now().isoformat(),
        }


def check_broken_links(max_pages: int = 20, **kwargs) -> dict:
    """Crawl the site looking for broken links."""
    visited = set()
    broken = []
    to_visit = [SITE_URL]
    pages_checked = 0

    while to_visit and pages_checked < max_pages:
        url = to_visit.pop(0)
        if url in visited:
            continue
        visited.add(url)
        pages_checked += 1

        try:
            resp = requests.get(url, timeout=10, allow_redirects=True)
            if resp.status_code >= 400:
                broken.append({"url": url, "status": resp.status_code})
                continue

            # Parse HTML for links using BeautifulSoup
            soup = BeautifulSoup(resp.text, "html.parser")
            links = [a["href"] for a in soup.find_all("a", href=True)]
            for link in links:
                full_url = urljoin(url, link)
                parsed = urlparse(full_url)
                # Only follow same-domain links
                if parsed.netloc == urlparse(SITE_URL).netloc and full_url not in visited:
                    if not any(ext in parsed.path for ext in ['.png', '.jpg', '.svg', '.css', '.js', '.ico']):
                        to_visit.append(full_url)
        except requests.RequestException as e:
            broken.append({"url": url, "error": str(e)})

    return {
        "pages_checked": pages_checked,
        "broken_links": broken,
        "broken_count": len(broken),
        "checked_at": datetime.now().isoformat(),
    }


def send_alert(message: str, severity: str = "info", **kwargs) -> dict:
    """Send alert via Telegram."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        log.warning("Telegram not configured — alert logged only")
        return {"sent": False, "reason": "Telegram not configured", "message": message}

    icons = {"info": "ℹ️", "warning": "⚠️", "critical": "🔴"}
    icon = icons.get(severity, "ℹ️")
    text = f"{icon} *Bee Site Alert*\n\n{message}\n\n_{datetime.now().strftime('%Y-%m-%d %H:%M')}_"

    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": text,
                "parse_mode": "Markdown",
            },
            timeout=10,
        )
        return {"sent": resp.status_code == 200, "severity": severity}
    except Exception as e:
        return {"sent": False, "error": str(e)}


# ─── Dispatch ─────────────────────────────────────────────────────────────────

TOOL_HANDLERS = {
    "check_site_health": check_site_health,
    "check_broken_links": check_broken_links,
    "send_alert": send_alert,
}

def execute(tool_name: str, args: dict) -> dict:
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return {"error": f"Unknown tool: {tool_name}"}
    return handler(**args)
