"""ClickUp API client for Bee autonomous agent.

Direct API calls — MCP is only available inside Claude Code sessions.
Docs: https://clickup.com/api
"""

import os
import json
import logging
import requests
from datetime import datetime, timedelta

log = logging.getLogger("bee-agent")

BASE_URL = "https://api.clickup.com/api/v2"
TEAM_ID = os.environ.get("CLICKUP_TEAM_ID", "90182449313")
_TIMEOUT = 30


def _headers():
    token = os.environ.get("CLICKUP_API_TOKEN")
    if not token:
        raise RuntimeError("CLICKUP_API_TOKEN not set")
    return {"Authorization": token, "Content-Type": "application/json"}


def search_tasks(query: str = "", team_id: str = TEAM_ID, **filters) -> dict:
    """Search tasks across the workspace."""
    url = f"{BASE_URL}/team/{team_id}/task"
    params = {"page": 0, "include_closed": "false"}

    if query:
        params["query"] = query

    # Date filters
    if "due_date_lt" in filters:
        params["due_date_lt"] = filters["due_date_lt"]
    if "due_date_gt" in filters:
        params["due_date_gt"] = filters["due_date_gt"]

    # Status filter — build list for requests to send as repeated query params
    if "statuses" in filters:
        params["statuses[]"] = list(filters["statuses"])

    try:
        resp = requests.get(url, headers=_headers(), params=params, timeout=_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        return {"tasks": [], "error": str(e)}


def get_tasks_by_list(list_id: str, include_closed: bool = False) -> dict:
    """Get all tasks in a specific list."""
    url = f"{BASE_URL}/list/{list_id}/task"
    params = {"include_closed": str(include_closed).lower()}
    try:
        resp = requests.get(url, headers=_headers(), params=params, timeout=_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        return {"tasks": [], "error": str(e)}


def get_overdue_tasks(team_id: str = TEAM_ID) -> list:
    """Get tasks that are overdue (due date before today). Paginates through all results."""
    now_ms = int(datetime.now().timestamp() * 1000)
    url = f"{BASE_URL}/team/{team_id}/task"
    all_tasks = []
    page = 0

    while True:
        params = {
            "page": page,
            "due_date_lt": str(now_ms),
            "include_closed": "false",
            "order_by": "due_date",
        }
        try:
            resp = requests.get(url, headers=_headers(), params=params, timeout=_TIMEOUT)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            if all_tasks:
                return all_tasks
            raise RuntimeError(f"ClickUp API error fetching overdue tasks: {e}") from e

        tasks = data.get("tasks", [])
        if not tasks:
            break
        all_tasks.extend(tasks)
        if len(tasks) < 100:  # ClickUp default page size — no more pages
            break
        page += 1

    return all_tasks


def get_tasks_due_today(team_id: str = TEAM_ID) -> list:
    """Get tasks due today. Paginates through all results."""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    start_ms = int(today_start.timestamp() * 1000)
    end_ms = int(today_end.timestamp() * 1000)

    url = f"{BASE_URL}/team/{team_id}/task"
    all_tasks = []
    page = 0

    while True:
        params = {
            "page": page,
            "due_date_gt": str(start_ms),
            "due_date_lt": str(end_ms),
            "include_closed": "false",
            "order_by": "due_date",
        }
        try:
            resp = requests.get(url, headers=_headers(), params=params, timeout=_TIMEOUT)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            if all_tasks:
                return all_tasks
            raise RuntimeError(f"ClickUp API error fetching today's tasks: {e}") from e

        tasks = data.get("tasks", [])
        if not tasks:
            break
        all_tasks.extend(tasks)
        if len(tasks) < 100:  # ClickUp default page size — no more pages
            break
        page += 1

    return all_tasks


def get_task(task_id: str) -> dict:
    """Get a single task's details."""
    url = f"{BASE_URL}/task/{task_id}"
    try:
        resp = requests.get(url, headers=_headers(), timeout=_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        return {"error": f"Failed to get task {task_id}: {e}"}


def update_task(task_id: str, **data) -> dict:
    """Update a task (status, name, priority, etc)."""
    url = f"{BASE_URL}/task/{task_id}"
    try:
        resp = requests.put(url, headers=_headers(), json=data, timeout=_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        return {"error": f"Failed to update task {task_id}: {e}"}


def create_comment(task_id: str, text: str) -> dict:
    """Add a comment to a task."""
    url = f"{BASE_URL}/task/{task_id}/comment"
    try:
        resp = requests.post(url, headers=_headers(), json={"comment_text": text}, timeout=_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        return {"error": f"Failed to create comment on {task_id}: {e}"}


# Tool definitions for Claude API
TOOL_DEFINITIONS = [
    {
        "name": "clickup_get_overdue_tasks",
        "description": "Get all tasks that are past their due date and still open.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "clickup_get_tasks_due_today",
        "description": "Get all tasks that are due today.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "clickup_get_task",
        "description": "Get details of a specific task by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "string",
                    "description": "The ClickUp task ID",
                }
            },
            "required": ["task_id"],
        },
    },
    {
        "name": "clickup_create_comment",
        "description": "Add a comment to a ClickUp task.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "string",
                    "description": "The ClickUp task ID",
                },
                "text": {
                    "type": "string",
                    "description": "The comment text",
                },
            },
            "required": ["task_id", "text"],
        },
    },
]


def execute_tool(name: str, args: dict) -> str:
    """Execute a ClickUp tool by name. Returns JSON string."""
    try:
        if name == "clickup_get_overdue_tasks":
            tasks = get_overdue_tasks()
            return json.dumps(
                [
                    {
                        "id": t["id"],
                        "name": t["name"],
                        "status": t["status"]["status"],
                        "due_date": t.get("due_date"),
                        "priority": t.get("priority", {}).get("priority") if t.get("priority") else None,
                        "list": t.get("list", {}).get("name"),
                        "url": t.get("url"),
                    }
                    for t in tasks
                ]
            )
        elif name == "clickup_get_tasks_due_today":
            tasks = get_tasks_due_today()
            return json.dumps(
                [
                    {
                        "id": t["id"],
                        "name": t["name"],
                        "status": t["status"]["status"],
                        "due_date": t.get("due_date"),
                        "priority": t.get("priority", {}).get("priority") if t.get("priority") else None,
                        "list": t.get("list", {}).get("name"),
                        "url": t.get("url"),
                    }
                    for t in tasks
                ]
            )
        elif name == "clickup_get_task":
            task = get_task(args["task_id"])
            return json.dumps(
                {
                    "id": task["id"],
                    "name": task["name"],
                    "status": task["status"]["status"],
                    "description": task.get("description", "")[:500],
                    "due_date": task.get("due_date"),
                    "priority": task.get("priority", {}).get("priority") if task.get("priority") else None,
                    "url": task.get("url"),
                }
            )
        elif name == "clickup_create_comment":
            result = create_comment(args["task_id"], args["text"])
            return json.dumps({"success": True, "comment_id": result.get("id")})
        else:
            return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})
