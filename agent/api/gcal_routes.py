"""Google Calendar API routes — expose Calendar tools over HTTP."""

import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

AGENT_DIR = Path(__file__).parent.parent
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))

from tools import gcal_tool

gcal_router = APIRouter()


class EventsRequest(BaseModel):
    days_ahead: Optional[int] = 1


class CreateEventRequest(BaseModel):
    title: str
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    description: Optional[str] = ""
    attendees: Optional[list[str]] = None


@gcal_router.post("/events")
async def list_events(body: EventsRequest):
    days = body.days_ahead or 1
    if days == 1:
        events = gcal_tool.list_events_today()
    elif hasattr(gcal_tool, "list_events_range"):
        events = gcal_tool.list_events_range(days_ahead=days)
    else:
        # Fallback: just use today's events
        events = gcal_tool.list_events_today()

    formatted = []
    for ev in events:
        start = ev.get("start", {})
        end = ev.get("end", {})
        formatted.append({
            "title": ev.get("summary", "Untitled"),
            "start": start.get("dateTime") or start.get("date", ""),
            "end": end.get("dateTime") or end.get("date", ""),
            "location": ev.get("location", ""),
            "description": ev.get("description", "")[:200],
            "link": ev.get("htmlLink", ""),
        })

    return {"events": formatted, "count": len(formatted)}


@gcal_router.post("/create")
async def create_event(body: CreateEventRequest):
    service = gcal_tool._get_service()
    if service is None:
        return {"status": "error", "message": "Google Calendar not configured"}

    try:
        start_dt = f"{body.date}T{body.start_time}:00"
        end_dt = f"{body.date}T{body.end_time}:00"

        event_body = {
            "summary": body.title,
            "start": {"dateTime": start_dt, "timeZone": "Asia/Jerusalem"},
            "end": {"dateTime": end_dt, "timeZone": "Asia/Jerusalem"},
        }

        if body.description:
            event_body["description"] = body.description
        if body.attendees:
            event_body["attendees"] = [{"email": e} for e in body.attendees]

        event = service.events().insert(calendarId="primary", body=event_body).execute()

        return {
            "status": "created",
            "event": {
                "title": event.get("summary"),
                "start": event.get("start", {}).get("dateTime"),
                "link": event.get("htmlLink"),
            },
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
