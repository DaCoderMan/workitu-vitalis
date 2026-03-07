"""Gmail API routes — expose Gmail tools over HTTP."""

import sys
from pathlib import Path
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

AGENT_DIR = Path(__file__).parent.parent
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))

from tools import gmail_tool

gmail_router = APIRouter()


class SearchRequest(BaseModel):
    query: Optional[str] = "is:unread"
    max_results: Optional[int] = 5


class SendRequest(BaseModel):
    to: str
    subject: str
    body: str
    draft_only: Optional[bool] = False


@gmail_router.post("/search")
async def search_emails(body: SearchRequest):
    results = gmail_tool.search_messages(
        query=body.query or "is:unread",
        max_results=body.max_results or 5,
    )
    return {"emails": results, "count": len(results)}


@gmail_router.post("/send")
async def send_email(body: SendRequest):
    if body.draft_only:
        # Create draft instead of sending
        if hasattr(gmail_tool, "create_draft"):
            result = gmail_tool.create_draft(
                to=body.to, subject=body.subject, body=body.body
            )
            return {"status": "draft_created", "result": result}
        return {"status": "error", "message": "Draft creation not supported"}

    if hasattr(gmail_tool, "send_message"):
        result = gmail_tool.send_message(
            to=body.to, subject=body.subject, body=body.body
        )
        return {"status": "sent", "result": result}
    return {"status": "error", "message": "Sending not supported yet"}
