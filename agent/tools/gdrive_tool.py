"""Google Drive integration — list, search, and read files from Drive.

Reuses _google_auth.py for OAuth credentials.
Requires drive.readonly scope in token.json.
"""

import os
import json
import logging
import io

log = logging.getLogger("bee-agent")

# ─── Tool Definitions ────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "gdrive_search",
        "description": "Search Google Drive for files by name or content. Returns file IDs, names, types, and modified dates.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query (supports Drive search operators like name contains, mimeType, etc.)",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results (default 10)",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "gdrive_list_files",
        "description": "List files in a Google Drive folder. If no folder_id, lists root.",
        "input_schema": {
            "type": "object",
            "properties": {
                "folder_id": {
                    "type": "string",
                    "description": "Drive folder ID. Omit for root folder.",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results (default 20)",
                },
            },
            "required": [],
        },
    },
    {
        "name": "gdrive_read_file",
        "description": "Read the content of a file from Google Drive. Supports Google Docs (as text), Sheets (as CSV), and plain text files.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_id": {
                    "type": "string",
                    "description": "The Google Drive file ID to read",
                },
            },
            "required": ["file_id"],
        },
    },
]

# ─── Implementation ──────────────────────────────────────────────────────────

def _get_drive_service():
    """Get authenticated Google Drive service."""
    from tools._google_auth import get_google_service
    return get_google_service("drive", "v3")


def gdrive_search(query: str, max_results: int = 10, **kwargs) -> dict:
    """Search Drive for files matching query."""
    service = _get_drive_service()
    if not service:
        return {"error": "Google Drive not configured (missing OAuth token with drive scope)"}

    try:
        # Build Drive search query
        drive_query = f"fullText contains '{query}' or name contains '{query}'"
        results = service.files().list(
            q=drive_query,
            pageSize=min(max_results, 50),
            fields="files(id, name, mimeType, modifiedTime, size, parents)",
            orderBy="modifiedTime desc",
        ).execute()

        files = results.get("files", [])
        return {
            "success": True,
            "count": len(files),
            "files": [
                {
                    "id": f["id"],
                    "name": f["name"],
                    "type": f["mimeType"],
                    "modified": f.get("modifiedTime", ""),
                    "size": f.get("size", ""),
                }
                for f in files
            ],
        }
    except Exception as e:
        return {"error": str(e)}


def gdrive_list_files(folder_id: str = "", max_results: int = 20, **kwargs) -> dict:
    """List files in a Drive folder."""
    service = _get_drive_service()
    if not service:
        return {"error": "Google Drive not configured"}

    try:
        query = f"'{folder_id}' in parents" if folder_id else "'root' in parents"
        query += " and trashed = false"

        results = service.files().list(
            q=query,
            pageSize=min(max_results, 100),
            fields="files(id, name, mimeType, modifiedTime, size)",
            orderBy="modifiedTime desc",
        ).execute()

        files = results.get("files", [])
        return {
            "success": True,
            "count": len(files),
            "folder_id": folder_id or "root",
            "files": [
                {
                    "id": f["id"],
                    "name": f["name"],
                    "type": f["mimeType"],
                    "modified": f.get("modifiedTime", ""),
                }
                for f in files
            ],
        }
    except Exception as e:
        return {"error": str(e)}


def gdrive_read_file(file_id: str, **kwargs) -> dict:
    """Read file content from Drive. Handles Docs, Sheets, and binary files."""
    service = _get_drive_service()
    if not service:
        return {"error": "Google Drive not configured"}

    try:
        # Get file metadata
        meta = service.files().get(fileId=file_id, fields="name,mimeType,size").execute()
        mime = meta.get("mimeType", "")
        name = meta.get("name", "")

        # Google Docs → export as plain text
        if mime == "application/vnd.google-apps.document":
            content = service.files().export(
                fileId=file_id, mimeType="text/plain"
            ).execute()
            return {
                "success": True,
                "name": name,
                "type": "google_doc",
                "content": content.decode("utf-8") if isinstance(content, bytes) else content,
            }

        # Google Sheets → export as CSV
        elif mime == "application/vnd.google-apps.spreadsheet":
            content = service.files().export(
                fileId=file_id, mimeType="text/csv"
            ).execute()
            return {
                "success": True,
                "name": name,
                "type": "google_sheet",
                "content": content.decode("utf-8") if isinstance(content, bytes) else content,
            }

        # Google Slides → export as plain text
        elif mime == "application/vnd.google-apps.presentation":
            content = service.files().export(
                fileId=file_id, mimeType="text/plain"
            ).execute()
            return {
                "success": True,
                "name": name,
                "type": "google_slides",
                "content": content.decode("utf-8") if isinstance(content, bytes) else content,
            }

        # Plain text files
        elif mime.startswith("text/") or mime in ("application/json", "application/xml"):
            content = service.files().get_media(fileId=file_id).execute()
            return {
                "success": True,
                "name": name,
                "type": "text",
                "content": content.decode("utf-8") if isinstance(content, bytes) else content,
            }

        # PDF — return metadata only (can't extract text without pdfplumber)
        elif mime == "application/pdf":
            return {
                "success": True,
                "name": name,
                "type": "pdf",
                "content": f"[PDF file: {name}, size: {meta.get('size', '?')} bytes. Cannot extract text — use file ID to download.]",
            }

        # Other binary files
        else:
            return {
                "success": True,
                "name": name,
                "type": mime,
                "content": f"[Binary file: {name}, type: {mime}, size: {meta.get('size', '?')} bytes]",
            }

    except Exception as e:
        return {"error": str(e)}


# ─── Dispatch ─────────────────────────────────────────────────────────────────

TOOL_HANDLERS = {
    "gdrive_search": gdrive_search,
    "gdrive_list_files": gdrive_list_files,
    "gdrive_read_file": gdrive_read_file,
}


def execute(tool_name: str, args: dict) -> dict:
    """Route tool execution."""
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return {"error": f"Unknown tool: {tool_name}"}
    return handler(**args)
