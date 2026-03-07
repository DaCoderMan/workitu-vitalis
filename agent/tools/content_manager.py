"""Content management tool — auto-publish blog, update portfolio, revalidate ISR.

Used by the VPS agent to autonomously manage site content via ClickUp + Vercel.
"""

import os
import requests
import logging
from datetime import datetime

log = logging.getLogger("bee-agent")

SITE_URL = os.getenv("BEE_SITE_URL", "https://blaze-post.com")
CLICKUP_TOKEN = os.getenv("CLICKUP_API_TOKEN", "")
CRON_SECRET = os.getenv("CRON_SECRET", "")

# ClickUp list IDs
PORTFOLIO_LIST_ID = os.getenv("CLICKUP_PORTFOLIO_LIST_ID", "")
BLOG_LIST_ID = os.getenv("CLICKUP_BLOG_LIST_ID", "")

CLICKUP_API = "https://api.clickup.com/api/v2"

# ─── Tool Definitions ────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "list_blog_drafts",
        "description": "List blog post drafts in ClickUp that are ready to publish (status = 'ready').",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "publish_blog_post",
        "description": "Move a blog post from draft to published status in ClickUp, triggering ISR revalidation.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "string",
                    "description": "ClickUp task ID of the blog post to publish",
                }
            },
            "required": ["task_id"],
        },
    },
    {
        "name": "add_portfolio_item",
        "description": "Create a new portfolio item in ClickUp from a deployed project.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Project name"},
                "description": {"type": "string", "description": "Project description"},
                "tech_stack": {"type": "string", "description": "Comma-separated tech stack"},
                "live_url": {"type": "string", "description": "Live URL of the project"},
                "github_url": {"type": "string", "description": "GitHub repo URL"},
            },
            "required": ["name", "description"],
        },
    },
    {
        "name": "trigger_revalidation",
        "description": "Trigger ISR revalidation on the site to pick up new content from ClickUp.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_content_stats",
        "description": "Get current content stats — number of portfolio items, blog posts, last update time.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]


# ─── Tool Implementations ────────────────────────────────────────────────────

def _clickup_headers():
    return {"Authorization": CLICKUP_TOKEN, "Content-Type": "application/json"}


def list_blog_drafts(**kwargs) -> dict:
    """List blog posts with 'ready' or 'draft' status."""
    if not CLICKUP_TOKEN or not BLOG_LIST_ID:
        return {"error": "ClickUp token or Blog list ID not configured"}

    try:
        resp = requests.get(
            f"{CLICKUP_API}/list/{BLOG_LIST_ID}/task",
            headers=_clickup_headers(),
            params={"statuses[]": ["ready", "draft"]},
            timeout=10,
        )
        if resp.status_code != 200:
            return {"error": f"ClickUp API returned {resp.status_code}"}

        tasks = resp.json().get("tasks", [])
        drafts = []
        for t in tasks:
            drafts.append({
                "id": t["id"],
                "name": t["name"],
                "status": t["status"]["status"],
                "created": t.get("date_created", ""),
            })
        return {"drafts": drafts, "count": len(drafts)}
    except Exception as e:
        return {"error": str(e)}


def publish_blog_post(task_id: str, **kwargs) -> dict:
    """Move blog post to 'published' status and trigger revalidation."""
    if not CLICKUP_TOKEN:
        return {"error": "ClickUp token not configured"}

    try:
        # Update status to published
        resp = requests.put(
            f"{CLICKUP_API}/task/{task_id}",
            headers=_clickup_headers(),
            json={"status": "published"},
            timeout=10,
        )
        if resp.status_code != 200:
            return {"error": f"Failed to update task: {resp.status_code}"}

        # Trigger ISR revalidation
        revalidate_result = trigger_revalidation()

        return {
            "published": True,
            "task_id": task_id,
            "revalidated": revalidate_result.get("success", False),
            "published_at": datetime.now().isoformat(),
        }
    except Exception as e:
        return {"error": str(e)}


def add_portfolio_item(name: str, description: str, tech_stack: str = "",
                       live_url: str = "", github_url: str = "", **kwargs) -> dict:
    """Create a portfolio item in ClickUp."""
    if not CLICKUP_TOKEN or not PORTFOLIO_LIST_ID:
        return {"error": "ClickUp token or Portfolio list ID not configured"}

    full_desc = description
    if tech_stack:
        full_desc += f"\n\nTech Stack: {tech_stack}"
    if live_url:
        full_desc += f"\nLive: {live_url}"
    if github_url:
        full_desc += f"\nGitHub: {github_url}"

    try:
        resp = requests.post(
            f"{CLICKUP_API}/list/{PORTFOLIO_LIST_ID}/task",
            headers=_clickup_headers(),
            json={
                "name": name,
                "description": full_desc,
                "status": "live",
                "tags": ["auto-added"],
            },
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            return {"error": f"Failed to create task: {resp.status_code}"}

        task = resp.json()
        # Trigger revalidation so the site picks it up
        trigger_revalidation()

        return {
            "created": True,
            "task_id": task.get("id"),
            "name": name,
        }
    except Exception as e:
        return {"error": str(e)}


def trigger_revalidation(**kwargs) -> dict:
    """Hit the site's cron endpoint to trigger ISR revalidation."""
    try:
        headers = {}
        if CRON_SECRET:
            headers["Authorization"] = f"Bearer {CRON_SECRET}"

        resp = requests.get(
            f"{SITE_URL}/api/cron/site-update",
            headers=headers,
            timeout=15,
        )
        return {
            "success": resp.status_code == 200,
            "status_code": resp.status_code,
            "triggered_at": datetime.now().isoformat(),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_content_stats(**kwargs) -> dict:
    """Get content counts from ClickUp lists."""
    stats = {"checked_at": datetime.now().isoformat()}

    if not CLICKUP_TOKEN:
        return {"error": "ClickUp token not configured"}

    for label, list_id in [("portfolio", PORTFOLIO_LIST_ID), ("blog", BLOG_LIST_ID)]:
        if not list_id:
            stats[label] = {"count": 0, "error": "list ID not configured"}
            continue
        try:
            resp = requests.get(
                f"{CLICKUP_API}/list/{list_id}/task",
                headers=_clickup_headers(),
                timeout=10,
            )
            if resp.status_code == 200:
                tasks = resp.json().get("tasks", [])
                stats[label] = {"count": len(tasks)}
            else:
                stats[label] = {"count": 0, "error": f"HTTP {resp.status_code}"}
        except Exception as e:
            stats[label] = {"count": 0, "error": str(e)}

    return stats


# ─── Dispatch ─────────────────────────────────────────────────────────────────

TOOL_HANDLERS = {
    "list_blog_drafts": list_blog_drafts,
    "publish_blog_post": publish_blog_post,
    "add_portfolio_item": add_portfolio_item,
    "trigger_revalidation": trigger_revalidation,
    "get_content_stats": get_content_stats,
}

def execute(tool_name: str, args: dict) -> dict:
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return {"error": f"Unknown tool: {tool_name}"}
    return handler(**args)
