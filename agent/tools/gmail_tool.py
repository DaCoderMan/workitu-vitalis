"""Gmail API client for Bee autonomous agent.

Requires Google API credentials (OAuth2 with Gmail scope).
If credentials are not available, tools return empty results gracefully.
"""

import json
import logging

from tools._google_auth import get_google_service

log = logging.getLogger("bee-agent")


def _get_service():
    """Initialize Gmail API service. Returns None if not configured."""
    return get_google_service("gmail", "v1")


def search_messages(query: str = "is:unread is:important", max_results: int = 5) -> list:
    """Search Gmail messages."""
    service = _get_service()
    if service is None:
        return []

    try:
        log.info(f"Gmail search: query='{query}', max={max_results}")
        result = (
            service.users()
            .messages()
            .list(userId="me", q=query, maxResults=max_results)
            .execute()
        )
        messages = result.get("messages", [])

        detailed = []
        for msg in messages[:max_results]:
            detail = (
                service.users()
                .messages()
                .get(userId="me", id=msg["id"], format="metadata", metadataHeaders=["From", "Subject", "Date"])
                .execute()
            )
            headers = {h["name"]: h["value"] for h in detail.get("payload", {}).get("headers", [])}
            detailed.append(
                {
                    "id": msg["id"],
                    "from": headers.get("From", "Unknown"),
                    "subject": headers.get("Subject", "No subject"),
                    "date": headers.get("Date", ""),
                    "snippet": detail.get("snippet", "")[:200],
                }
            )
        log.info(f"Gmail search returned {len(detailed)} messages")
        return detailed
    except Exception as e:
        log.error(f"Gmail search failed: {e}")
        return []


# Tool definitions for Claude API
TOOL_DEFINITIONS = [
    {
        "name": "gmail_search_unread_important",
        "description": "Search for important unread emails. Returns sender, subject, date, and snippet.",
        "input_schema": {
            "type": "object",
            "properties": {
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of emails to return (default 5)",
                    "default": 5,
                }
            },
            "required": [],
        },
    },
]


def execute_tool(name: str, args: dict) -> str:
    """Execute a Gmail tool by name. Returns JSON string."""
    try:
        if name == "gmail_search_unread_important":
            max_results = args.get("max_results", 5)
            messages = search_messages(max_results=max_results)
            if not messages:
                return json.dumps({"messages": [], "note": "No important unread emails or Gmail not configured."})
            return json.dumps({"messages": messages})
        else:
            return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})
