"""ClickUp cleanup tool — maintain list hygiene.

Archives completed tasks, deduplicates, and provides list summaries.
"""

import os
import json
import logging
from datetime import datetime, timedelta

import requests

log = logging.getLogger("bee-agent")

BASE_URL = "https://api.clickup.com/api/v2"
_TIMEOUT = 30


def _headers():
    return {"Authorization": os.environ.get("CLICKUP_API_TOKEN", "")}


# ─── Tool Definitions ────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "clickup_cleanup_list_summary",
        "description": "Get a clean summary of a ClickUp list: counts of open, overdue, completed, and archived tasks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "list_id": {
                    "type": "string",
                    "description": "The ClickUp list ID to summarize",
                },
            },
            "required": ["list_id"],
        },
    },
    {
        "name": "clickup_cleanup_archive_completed",
        "description": "Archive all tasks in a list that have been completed for more than 7 days. Keeps the list clean.",
        "input_schema": {
            "type": "object",
            "properties": {
                "list_id": {
                    "type": "string",
                    "description": "The ClickUp list ID to clean up",
                },
                "days_old": {
                    "type": "integer",
                    "description": "Only archive tasks completed more than N days ago (default 7)",
                },
            },
            "required": ["list_id"],
        },
    },
    {
        "name": "clickup_cleanup_find_duplicates",
        "description": "Find tasks with identical or very similar names in a ClickUp list.",
        "input_schema": {
            "type": "object",
            "properties": {
                "list_id": {
                    "type": "string",
                    "description": "The ClickUp list ID to check for duplicates",
                },
            },
            "required": ["list_id"],
        },
    },
]

# ─── Implementation ──────────────────────────────────────────────────────────


def clickup_cleanup_list_summary(list_id: str, **kwargs) -> dict:
    """Get task count summary for a list."""
    try:
        # Get all tasks including closed
        tasks = _get_all_tasks(list_id, include_closed=True)

        now_ms = int(datetime.now().timestamp() * 1000)
        open_tasks = [t for t in tasks if t.get("status", {}).get("type") != "closed"]
        closed_tasks = [t for t in tasks if t.get("status", {}).get("type") == "closed"]
        overdue = [
            t for t in open_tasks
            if t.get("due_date") and int(t["due_date"]) < now_ms
        ]

        return {
            "success": True,
            "list_id": list_id,
            "total": len(tasks),
            "open": len(open_tasks),
            "closed": len(closed_tasks),
            "overdue": len(overdue),
            "overdue_tasks": [
                {"id": t["id"], "name": t["name"], "due_date": t.get("due_date")}
                for t in overdue[:10]
            ],
        }
    except Exception as e:
        return {"error": str(e)}


def clickup_cleanup_archive_completed(list_id: str, days_old: int = 7, **kwargs) -> dict:
    """Archive tasks completed more than N days ago."""
    try:
        tasks = _get_all_tasks(list_id, include_closed=True)
        cutoff_ms = int((datetime.now() - timedelta(days=days_old)).timestamp() * 1000)

        archived = []
        for task in tasks:
            status_type = task.get("status", {}).get("type", "")
            date_closed = task.get("date_closed")

            if status_type == "closed" and date_closed and int(date_closed) < cutoff_ms:
                # Archive by updating status
                try:
                    resp = requests.put(
                        f"{BASE_URL}/task/{task['id']}",
                        headers={**_headers(), "Content-Type": "application/json"},
                        json={"archived": True},
                        timeout=_TIMEOUT,
                    )
                    if resp.status_code == 200:
                        archived.append({"id": task["id"], "name": task["name"]})
                except Exception as e:
                    log.warning(f"Failed to archive task {task['id']}: {e}")

        return {
            "success": True,
            "list_id": list_id,
            "archived_count": len(archived),
            "archived_tasks": archived[:20],
        }
    except Exception as e:
        return {"error": str(e)}


def clickup_cleanup_find_duplicates(list_id: str, **kwargs) -> dict:
    """Find tasks with similar names in a list."""
    try:
        tasks = _get_all_tasks(list_id, include_closed=False)

        # Group by normalized name
        name_groups = {}
        for task in tasks:
            normalized = task["name"].strip().lower()
            if normalized not in name_groups:
                name_groups[normalized] = []
            name_groups[normalized].append({
                "id": task["id"],
                "name": task["name"],
                "status": task.get("status", {}).get("status", ""),
            })

        duplicates = {
            name: group for name, group in name_groups.items()
            if len(group) > 1
        }

        return {
            "success": True,
            "list_id": list_id,
            "total_tasks": len(tasks),
            "duplicate_groups": len(duplicates),
            "duplicates": duplicates,
        }
    except Exception as e:
        return {"error": str(e)}


def _get_all_tasks(list_id: str, include_closed: bool = False) -> list:
    """Fetch all tasks from a list with pagination."""
    all_tasks = []
    page = 0

    while True:
        params = {"page": page, "include_closed": str(include_closed).lower()}
        resp = requests.get(
            f"{BASE_URL}/list/{list_id}/task",
            headers=_headers(),
            params=params,
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        tasks = resp.json().get("tasks", [])
        if not tasks:
            break
        all_tasks.extend(tasks)
        if len(tasks) < 100:
            break
        page += 1

    return all_tasks


# ─── Dispatch ─────────────────────────────────────────────────────────────────

TOOL_HANDLERS = {
    "clickup_cleanup_list_summary": clickup_cleanup_list_summary,
    "clickup_cleanup_archive_completed": clickup_cleanup_archive_completed,
    "clickup_cleanup_find_duplicates": clickup_cleanup_find_duplicates,
}


def execute(tool_name: str, args: dict) -> dict:
    """Route tool execution."""
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return {"error": f"Unknown tool: {tool_name}"}
    return handler(**args)
