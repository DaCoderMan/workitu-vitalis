"""Vault API routes — thin wrappers around obsidian_tool functions."""

import sys
from pathlib import Path
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

# Ensure agent dir is on path so we can import tools
AGENT_DIR = Path(__file__).parent.parent
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))

from tools import obsidian_tool

router = APIRouter()


# ─── Request Models ───────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: Optional[str] = ""
    tag: Optional[str] = ""
    folder: Optional[str] = ""
    frontmatter_field: Optional[str] = ""
    frontmatter_value: Optional[str] = ""


class ReadRequest(BaseModel):
    path: str


class CreateRequest(BaseModel):
    path: str
    content: str
    title: Optional[str] = ""
    tags: Optional[list[str]] = None
    note_type: Optional[str] = ""
    extra_frontmatter: Optional[dict] = None


class UpdateRequest(BaseModel):
    path: str
    content: Optional[str] = ""
    mode: Optional[str] = "append"
    update_frontmatter: Optional[dict] = None


class ListRequest(BaseModel):
    folder: Optional[str] = ""
    tag: Optional[str] = ""
    recursive: Optional[bool] = True


class DailyNoteRequest(BaseModel):
    date: Optional[str] = ""
    append_content: Optional[str] = ""


class LinkRequest(BaseModel):
    source_path: str
    target_path: str
    context: Optional[str] = ""
    section: Optional[str] = ""


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    """Health check — no auth required."""
    return {"status": "ok", "service": "bee-vault-api", "tools": 7}


@router.post("/search")
async def search(body: SearchRequest):
    return obsidian_tool.vault_search(**body.model_dump(exclude_none=True))


@router.post("/read")
async def read(body: ReadRequest):
    return obsidian_tool.vault_read(**body.model_dump())


@router.post("/create")
async def create(body: CreateRequest):
    return obsidian_tool.vault_create(**body.model_dump(exclude_none=True))


@router.post("/update")
async def update(body: UpdateRequest):
    return obsidian_tool.vault_update(**body.model_dump(exclude_none=True))


@router.post("/list")
async def list_notes(body: ListRequest):
    return obsidian_tool.vault_list(**body.model_dump(exclude_none=True))


@router.post("/daily")
async def daily_note(body: DailyNoteRequest):
    return obsidian_tool.vault_daily_note(**body.model_dump(exclude_none=True))


@router.post("/link")
async def link(body: LinkRequest):
    return obsidian_tool.vault_link(**body.model_dump(exclude_none=True))
