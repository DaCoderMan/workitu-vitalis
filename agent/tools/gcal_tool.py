"""Google Calendar API client for Bee autonomous agent.

Requires Google API credentials (OAuth2 or service account).
If credentials are not available, tools return empty results gracefully.
"""

import json
import logging
from datetime import datetime, timedelta

from tools._google_auth import get_google_service

log = logging.getLogger("bee-agent")


def _get_service():
    """Initialize Google Calendar API service. Returns None if not configured."""
    return get_google_service("calendar", "v3")


def list_events_today(timezone: str = "Asia/Jerusalem") -> list:
    """Get today's calendar events."""
    service = _get_service()
    if service is None:
        return []

    now = datetime.now()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + "Z"
    end = (now.replace(hour=23, minute=59, second=59, microsecond=0)).isoformat() + "Z"

    try:
        log.info(f"Calendar: fetching events for today ({timezone})")
        result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=start,
                timeMax=end,
                singleEvents=True,
                orderBy="startTime",
                timeZone=timezone,
            )
            .execute()
        )
        items = result.get("items", [])
        log.info(f"Calendar: found {len(items)} events today")
        return items
    except Exception as e:
        log.error(f"Calendar fetch failed: {e}")
        return []


def format_events(events: list) -> list:
    """Format calendar events into simple dicts."""
    formatted = []
    for event in events:
        start = event.get("start", {})
        start_time = start.get("dateTime", start.get("date", ""))
        formatted.append(
            {
                "summary": event.get("summary", "Untitled"),
                "start": start_time,
                "location": event.get("location", ""),
                "all_day": "date" in start and "dateTime" not in start,
            }
        )
    return formatted


# Tool definitions for Claude API
TOOL_DEFINITIONS = [
    {
        "name": "gcal_list_events_today",
        "description": "Get today's calendar events. Returns events with time, title, and location.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]


def execute_tool(name: str, args: dict) -> str:
    """Execute a Calendar tool by name. Returns JSON string."""
    try:
        if name == "gcal_list_events_today":
            events = list_events_today()
            if not events:
                return json.dumps({"events": [], "note": "No calendar events today or Google Calendar not configured."})
            return json.dumps({"events": format_events(events)})
        else:
            return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})
