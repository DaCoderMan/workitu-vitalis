"""Obsidian vault tool — persistent markdown-based memory/storage for the Bee agent.

Read, write, search, and link Obsidian-compatible markdown notes with YAML
frontmatter and [[wikilinks]]. Vault lives at vault/ inside the brain repo.
"""

import os
import re
import glob
import json
import logging
from datetime import datetime
from pathlib import Path

log = logging.getLogger("bee-agent")

BRAIN_REPO = os.environ.get("BEE_BRAIN_PATH", "/var/www/bee-brain")
VAULT_DIR = os.path.join(BRAIN_REPO, "vault")

# ─── Helpers ──────────────────────────────────────────────────────────────────


def _validate_vault_path(path: str) -> str:
    """Validate path stays within the vault. Returns resolved absolute path."""
    vault_real = os.path.realpath(VAULT_DIR)
    full_path = os.path.realpath(os.path.join(vault_real, path))
    if not full_path.startswith(vault_real + os.sep) and full_path != vault_real:
        raise ValueError(f"Path traversal blocked: '{path}' resolves outside vault")
    return full_path


def _parse_frontmatter(content: str) -> tuple:
    """Parse YAML frontmatter from note content. Returns (metadata_dict, body)."""
    if not content.startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content
    meta = {}
    for line in parts[1].strip().splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()
            if value.startswith("[") and value.endswith("]"):
                value = [v.strip().strip('"').strip("'") for v in value[1:-1].split(",") if v.strip()]
            elif value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            meta[key] = value
    body = parts[2].lstrip("\n")
    return meta, body


def _build_frontmatter(meta: dict) -> str:
    """Build YAML frontmatter string from dict."""
    lines = ["---"]
    for key, value in meta.items():
        if isinstance(value, list):
            lines.append(f"{key}: [{', '.join(str(v) for v in value)}]")
        else:
            lines.append(f"{key}: {value}")
    lines.append("---")
    return "\n".join(lines)


def _ensure_vault():
    """Create vault directory structure if it doesn't exist."""
    dirs = ["daily", "templates", "inbox", "projects", "people", "decisions"]
    for d in dirs:
        os.makedirs(os.path.join(VAULT_DIR, d), exist_ok=True)
    obsidian_dir = os.path.join(VAULT_DIR, ".obsidian")
    os.makedirs(obsidian_dir, exist_ok=True)
    app_json = os.path.join(obsidian_dir, "app.json")
    if not os.path.exists(app_json):
        with open(app_json, "w", encoding="utf-8") as f:
            f.write('{"livePreview": true}\n')


# ─── Tool Handlers ───────────────────────────────────────────────────────────


def vault_search(query: str = "", tag: str = "", folder: str = "",
                 frontmatter_field: str = "", frontmatter_value: str = "",
                 **kwargs) -> dict:
    """Search notes in the vault by content, tags, or frontmatter."""
    _ensure_vault()
    search_dir = VAULT_DIR
    if folder:
        search_dir = _validate_vault_path(folder)

    pattern = os.path.join(search_dir, "**", "*.md")
    results = []

    for filepath in glob.glob(pattern, recursive=True):
        rel_path = os.path.relpath(filepath, VAULT_DIR).replace("\\", "/")
        if rel_path.startswith(".obsidian"):
            continue
        try:
            content = Path(filepath).read_text(encoding="utf-8")
        except Exception:
            continue

        meta, body = _parse_frontmatter(content)

        if tag:
            fm_tags = meta.get("tags", [])
            if isinstance(fm_tags, str):
                fm_tags = [fm_tags]
            if tag not in fm_tags and f"#{tag}" not in body:
                continue

        if frontmatter_field and frontmatter_value:
            fm_val = str(meta.get(frontmatter_field, ""))
            if frontmatter_value.lower() not in fm_val.lower():
                continue

        if query:
            if query.lower() not in content.lower():
                continue
            idx = content.lower().index(query.lower())
            start = max(0, idx - 80)
            end = min(len(content), idx + len(query) + 80)
            snippet = content[start:end].replace("\n", " ")
        else:
            snippet = body[:150].replace("\n", " ") if body else ""

        results.append({
            "path": rel_path,
            "title": meta.get("title", Path(filepath).stem),
            "tags": meta.get("tags", []),
            "snippet": snippet,
        })

    return {"results": results, "count": len(results)}


def vault_read(path: str, **kwargs) -> dict:
    """Read a note from the vault."""
    _ensure_vault()
    if not path.endswith(".md"):
        path += ".md"
    try:
        full_path = _validate_vault_path(path)
    except ValueError as e:
        return {"error": str(e)}

    if not os.path.exists(full_path):
        return {"error": f"Note not found: {path}"}

    content = Path(full_path).read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(content)
    return {
        "path": path,
        "frontmatter": meta,
        "content": body,
        "full_content": content,
        "size_chars": len(content),
    }


def vault_create(path: str, content: str, title: str = "", tags: list = None,
                 note_type: str = "", extra_frontmatter: dict = None,
                 **kwargs) -> dict:
    """Create a new note with YAML frontmatter."""
    _ensure_vault()
    if not path.endswith(".md"):
        path += ".md"
    try:
        full_path = _validate_vault_path(path)
    except ValueError as e:
        return {"error": str(e)}

    if os.path.exists(full_path):
        return {"error": f"Note already exists: {path}. Use vault_update to modify."}

    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    meta = {
        "title": title or Path(path).stem,
        "created": now,
        "updated": now,
    }
    if tags:
        meta["tags"] = tags
    if note_type:
        meta["type"] = note_type
    if extra_frontmatter:
        meta.update(extra_frontmatter)

    fm = _build_frontmatter(meta)
    heading = f"# {meta['title']}\n\n" if title else ""
    full_content = f"{fm}\n\n{heading}{content}\n"

    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    Path(full_path).write_text(full_content, encoding="utf-8")

    return {"created": True, "path": path, "title": meta["title"], "size_chars": len(full_content)}


def vault_update(path: str, content: str = "", mode: str = "append",
                 update_frontmatter: dict = None, **kwargs) -> dict:
    """Update an existing note — append, replace, or prepend content."""
    _ensure_vault()
    if not path.endswith(".md"):
        path += ".md"
    try:
        full_path = _validate_vault_path(path)
    except ValueError as e:
        return {"error": str(e)}

    if not os.path.exists(full_path):
        return {"error": f"Note not found: {path}. Use vault_create first."}

    existing = Path(full_path).read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(existing)

    if update_frontmatter:
        meta.update(update_frontmatter)
    meta["updated"] = datetime.now().strftime("%Y-%m-%d %H:%M")

    if content:
        if mode == "append":
            body = body.rstrip("\n") + "\n\n" + content + "\n"
        elif mode == "replace":
            body = content + "\n"
        elif mode == "prepend_body":
            body = content + "\n\n" + body

    full_content = _build_frontmatter(meta) + "\n\n" + body
    Path(full_path).write_text(full_content, encoding="utf-8")

    return {"updated": True, "path": path, "mode": mode, "size_chars": len(full_content)}


def vault_list(folder: str = "", tag: str = "", recursive: bool = True,
               **kwargs) -> dict:
    """List notes in the vault, optionally filtered by folder or tag."""
    _ensure_vault()
    search_dir = VAULT_DIR
    if folder:
        search_dir = _validate_vault_path(folder)
        if not os.path.isdir(search_dir):
            return {"error": f"Folder not found: {folder}"}

    if recursive:
        pattern = os.path.join(search_dir, "**", "*.md")
    else:
        pattern = os.path.join(search_dir, "*.md")

    notes = []
    for filepath in glob.glob(pattern, recursive=recursive):
        rel_path = os.path.relpath(filepath, VAULT_DIR).replace("\\", "/")
        if rel_path.startswith(".obsidian"):
            continue

        if tag:
            try:
                file_content = Path(filepath).read_text(encoding="utf-8")
            except Exception:
                continue
            meta, body = _parse_frontmatter(file_content)
            fm_tags = meta.get("tags", [])
            if isinstance(fm_tags, str):
                fm_tags = [fm_tags]
            if tag not in fm_tags and f"#{tag}" not in body:
                continue
            notes.append({
                "path": rel_path,
                "title": meta.get("title", Path(filepath).stem),
                "tags": fm_tags,
                "modified": datetime.fromtimestamp(os.path.getmtime(filepath)).strftime("%Y-%m-%d %H:%M"),
            })
        else:
            stat = os.stat(filepath)
            notes.append({
                "path": rel_path,
                "title": Path(filepath).stem,
                "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
                "size_bytes": stat.st_size,
            })

    notes.sort(key=lambda n: n.get("modified", ""), reverse=True)
    return {"notes": notes, "count": len(notes), "folder": folder or "(root)"}


def vault_daily_note(date: str = "", append_content: str = "", **kwargs) -> dict:
    """Get or create today's daily note."""
    _ensure_vault()
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d")
        day_name = parsed_date.strftime("%A")
    except ValueError:
        return {"error": f"Invalid date format: {date}. Use YYYY-MM-DD."}

    note_path = f"daily/{date}.md"
    full_path = os.path.join(VAULT_DIR, note_path)

    if os.path.exists(full_path):
        content = Path(full_path).read_text(encoding="utf-8")
        meta, body = _parse_frontmatter(content)

        if append_content:
            timestamp = datetime.now().strftime("%H:%M")
            body = body.rstrip("\n") + f"\n\n### {timestamp}\n{append_content}\n"
            meta["updated"] = datetime.now().strftime("%Y-%m-%d %H:%M")
            full_content = _build_frontmatter(meta) + "\n\n" + body
            Path(full_path).write_text(full_content, encoding="utf-8")
            return {"existed": True, "appended": True, "path": note_path}

        return {
            "existed": True,
            "path": note_path,
            "frontmatter": meta,
            "content": body,
        }

    # Create new daily note
    meta = {
        "title": f"Daily Note — {date} ({day_name})",
        "date": date,
        "type": "daily",
        "tags": ["daily"],
        "created": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }

    body = f"# {date} ({day_name})\n\n"
    body += "## Tasks\n\n- \n\n"
    body += "## Notes\n\n\n\n"
    body += "## Log\n\n"

    if append_content:
        timestamp = datetime.now().strftime("%H:%M")
        body += f"### {timestamp}\n{append_content}\n"

    full_content = _build_frontmatter(meta) + "\n\n" + body
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    Path(full_path).write_text(full_content, encoding="utf-8")

    return {"created": True, "path": note_path, "date": date, "day": day_name}


def vault_link(source_path: str, target_path: str, context: str = "",
               section: str = "", **kwargs) -> dict:
    """Add a [[wikilink]] from one note to another."""
    _ensure_vault()
    if not source_path.endswith(".md"):
        source_path += ".md"
    if not target_path.endswith(".md"):
        target_path += ".md"

    try:
        source_full = _validate_vault_path(source_path)
        _validate_vault_path(target_path)
    except ValueError as e:
        return {"error": str(e)}

    if not os.path.exists(source_full):
        return {"error": f"Source note not found: {source_path}"}

    target_name = Path(target_path).stem
    wikilink = f"[[{target_name}]]"

    if context:
        link_text = context.replace("[[target]]", wikilink)
    else:
        link_text = f"- {wikilink}"

    existing = Path(source_full).read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(existing)

    if section:
        section_pattern = re.compile(rf"^{re.escape(section)}\s*$", re.MULTILINE)
        match = section_pattern.search(body)
        if match:
            insert_pos = match.end()
            body = body[:insert_pos] + f"\n{link_text}" + body[insert_pos:]
        else:
            body = body.rstrip("\n") + f"\n\n{section}\n{link_text}\n"
    else:
        body = body.rstrip("\n") + f"\n\n{link_text}\n"

    meta["updated"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    full_content = _build_frontmatter(meta) + "\n\n" + body
    Path(source_full).write_text(full_content, encoding="utf-8")

    return {"linked": True, "source": source_path, "target": target_path, "wikilink": wikilink}


# ─── Tool Definitions (Anthropic format, converted to OpenAI by registry) ────

TOOL_DEFINITIONS = [
    {
        "name": "vault_search",
        "description": "Search notes in the Obsidian vault by content, tags, or frontmatter fields. Returns matching note paths and snippets.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Text to search for in note content",
                },
                "tag": {
                    "type": "string",
                    "description": "Filter by tag (e.g. 'revenue', 'client'). Searches both frontmatter tags and inline #tags.",
                },
                "folder": {
                    "type": "string",
                    "description": "Limit search to a specific folder (e.g. 'daily', 'projects')",
                },
                "frontmatter_field": {
                    "type": "string",
                    "description": "Frontmatter field name to filter by (e.g. 'type')",
                },
                "frontmatter_value": {
                    "type": "string",
                    "description": "Value the frontmatter field should match",
                },
            },
            "required": [],
        },
    },
    {
        "name": "vault_read",
        "description": "Read the full content of a note from the Obsidian vault by path.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path relative to vault root (e.g. 'projects/workitu-site.md'). .md appended if missing.",
                },
            },
            "required": ["path"],
        },
    },
    {
        "name": "vault_create",
        "description": "Create a new note in the Obsidian vault with YAML frontmatter and markdown content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path relative to vault root (e.g. 'projects/new-project.md'). Parent dirs created automatically.",
                },
                "title": {
                    "type": "string",
                    "description": "Note title (used in frontmatter and as H1 heading)",
                },
                "content": {
                    "type": "string",
                    "description": "Markdown body content (below the frontmatter and title)",
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Tags for frontmatter (e.g. ['revenue', 'client'])",
                },
                "note_type": {
                    "type": "string",
                    "description": "Note type for frontmatter (e.g. 'meeting', 'decision', 'daily', 'project')",
                },
                "extra_frontmatter": {
                    "type": "object",
                    "description": "Additional frontmatter key-value pairs",
                },
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "vault_update",
        "description": "Update an existing note — append content, replace content, or update frontmatter fields.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path relative to vault root",
                },
                "content": {
                    "type": "string",
                    "description": "Content to append or replace with",
                },
                "mode": {
                    "type": "string",
                    "enum": ["append", "replace", "prepend_body"],
                    "description": "How to update: 'append' (default), 'replace' overwrites body, 'prepend_body' adds before existing body",
                },
                "update_frontmatter": {
                    "type": "object",
                    "description": "Frontmatter fields to add/update (merged with existing)",
                },
            },
            "required": ["path"],
        },
    },
    {
        "name": "vault_list",
        "description": "List notes in the vault, optionally filtered by folder or tag.",
        "input_schema": {
            "type": "object",
            "properties": {
                "folder": {
                    "type": "string",
                    "description": "Folder to list (e.g. 'daily', 'projects'). Omit for vault root.",
                },
                "tag": {
                    "type": "string",
                    "description": "Filter to notes containing this tag",
                },
                "recursive": {
                    "type": "boolean",
                    "description": "Include subdirectories (default true)",
                },
            },
            "required": [],
        },
    },
    {
        "name": "vault_daily_note",
        "description": "Get or create today's daily note. Returns content if exists, creates from template if not. Can append timestamped entries.",
        "input_schema": {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format. Defaults to today.",
                },
                "append_content": {
                    "type": "string",
                    "description": "Content to append to the daily note with timestamp",
                },
            },
            "required": [],
        },
    },
    {
        "name": "vault_link",
        "description": "Add a [[wikilink]] from one note to another. Inserts at end of note or under a specific section heading.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source_path": {
                    "type": "string",
                    "description": "Path of the note to add the link in",
                },
                "target_path": {
                    "type": "string",
                    "description": "Path of the note being linked to",
                },
                "context": {
                    "type": "string",
                    "description": "Text around the link. Use [[target]] as placeholder (e.g. 'Related to [[target]]').",
                },
                "section": {
                    "type": "string",
                    "description": "Section heading to insert under (e.g. '## Related Notes'). Created if missing.",
                },
            },
            "required": ["source_path", "target_path"],
        },
    },
]

TOOL_HANDLERS = {
    "vault_search": vault_search,
    "vault_read": vault_read,
    "vault_create": vault_create,
    "vault_update": vault_update,
    "vault_list": vault_list,
    "vault_daily_note": vault_daily_note,
    "vault_link": vault_link,
}


def execute(tool_name: str, args: dict) -> dict:
    """Route tool execution to the correct handler."""
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return {"error": f"Unknown tool: {tool_name}"}
    return handler(**args)
