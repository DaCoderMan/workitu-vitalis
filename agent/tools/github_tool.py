"""Git operations for Bee autonomous agent.

Uses subprocess to run git commands. No API needed — just git CLI on the VPS.
"""

import os
import subprocess
import json


def _run(cmd, cwd: str = None) -> tuple:
    """Run a command. Accepts a list (shell=False, safe) or string (shell=True, legacy).
    Returns (stdout, stderr, returncode).
    """
    if cwd is None:
        cwd = os.environ.get("BEE_BRAIN_PATH", "/var/www/bee-brain")

    use_shell = isinstance(cmd, str)
    result = subprocess.run(
        cmd,
        shell=use_shell,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=60,
    )
    return result.stdout.strip(), result.stderr.strip(), result.returncode


def pull() -> dict:
    """Git pull latest from origin main."""
    stdout, stderr, rc = _run(["git", "pull", "origin", "main"])
    if rc != 0:
        return {"success": False, "error": stderr or stdout, "returncode": rc}
    return {"success": True, "output": stdout or stderr}


def commit_and_push(message: str, files: list = None) -> dict:
    """Stage files, commit, and push. Uses list-form subprocess to avoid shell injection."""
    if files:
        for f in files:
            _run(["git", "add", f])
    else:
        _run(["git", "add", "context/", "agent/"])

    stdout, stderr, rc = _run(["git", "commit", "-m", message])
    if rc != 0:
        return {"success": False, "error": stderr or stdout}

    stdout, stderr, rc = _run(["git", "push", "origin", "main"])
    return {"success": rc == 0, "output": stdout or stderr}


def _validate_path(path: str) -> str:
    """Validate that path stays within the brain repo. Returns resolved absolute path."""
    brain_path = os.path.realpath(os.environ.get("BEE_BRAIN_PATH", "/var/www/bee-brain"))
    full_path = os.path.realpath(os.path.join(brain_path, path))
    if not full_path.startswith(brain_path + os.sep) and full_path != brain_path:
        raise ValueError(f"Path traversal blocked: '{path}' resolves outside repo")
    return full_path


def read_file(path: str) -> str:
    """Read a file from the brain repo."""
    try:
        full_path = _validate_path(path)
    except ValueError as e:
        return str(e)
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return f"File not found: {path}"


def write_file(path: str, content: str) -> bool:
    """Write a file to the brain repo."""
    full_path = _validate_path(path)  # raises ValueError on traversal
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
    return True


# Tool definitions for Claude API
TOOL_DEFINITIONS = [
    {
        "name": "read_file",
        "description": "Read a file from the Bee brain repo. Path is relative to repo root.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Relative path within the repo (e.g., 'context/current-state.md')",
                }
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": "Write content to a file in the Bee brain repo.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Relative path within the repo",
                },
                "content": {
                    "type": "string",
                    "description": "File content to write",
                },
            },
            "required": ["path", "content"],
        },
    },
]


def execute_tool(name: str, args: dict) -> str:
    """Execute a GitHub/file tool by name. Returns JSON string."""
    try:
        if name == "read_file":
            content = read_file(args["path"])
            return json.dumps({"content": content})
        elif name == "write_file":
            success = write_file(args["path"], args["content"])
            return json.dumps({"success": success})
        else:
            return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})
