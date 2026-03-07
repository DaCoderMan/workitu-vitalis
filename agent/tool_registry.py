"""Shared tool registry for both daily agent and telegram bot.

Provides tool definitions (OpenAI format) and execution routing.
Both bee_agent.py and telegram/ai_engine.py import from here.
"""

import json
from pathlib import Path

AGENT_DIR = Path(__file__).parent
_config = None


def _get_config():
    global _config
    if _config is None:
        _config = json.loads((AGENT_DIR / "config.json").read_text())
    return _config


def _convert_to_openai_tools(tool_defs: list) -> list:
    """Convert Anthropic-style tool definitions to OpenAI function calling format."""
    openai_tools = []
    for t in tool_defs:
        openai_tools.append({
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["input_schema"],
            },
        })
    return openai_tools


def get_all_tools() -> list:
    """Collect tool definitions from all enabled modules (OpenAI format)."""
    from tools import clickup_tool, gmail_tool, gcal_tool, github_tool
    from tools import site_monitor, content_manager, performance_reporter, pricing_manager
    from tools import obsidian_tool
    from tools import gdrive_tool, web_search_tool, clickup_cleanup_tool

    config = _get_config()
    anthropic_tools = []
    anthropic_tools.extend(clickup_tool.TOOL_DEFINITIONS)
    if config["tools_enabled"].get("gmail", False):
        anthropic_tools.extend(gmail_tool.TOOL_DEFINITIONS)
    if config["tools_enabled"].get("gcal", False):
        anthropic_tools.extend(gcal_tool.TOOL_DEFINITIONS)
    anthropic_tools.extend(github_tool.TOOL_DEFINITIONS)
    if config["tools_enabled"].get("site_monitor", False):
        anthropic_tools.extend(site_monitor.TOOL_DEFINITIONS)
    if config["tools_enabled"].get("content_manager", False):
        anthropic_tools.extend(content_manager.TOOL_DEFINITIONS)
    if config["tools_enabled"].get("performance_reporter", False):
        anthropic_tools.extend(performance_reporter.TOOL_DEFINITIONS)
    if config["tools_enabled"].get("pricing_manager", False):
        anthropic_tools.extend(pricing_manager.TOOL_DEFINITIONS)
    if config["tools_enabled"].get("obsidian", False):
        anthropic_tools.extend(obsidian_tool.TOOL_DEFINITIONS)
    if config["tools_enabled"].get("gdrive", False):
        anthropic_tools.extend(gdrive_tool.TOOL_DEFINITIONS)
    if config["tools_enabled"].get("web_search", False):
        anthropic_tools.extend(web_search_tool.TOOL_DEFINITIONS)
    if config["tools_enabled"].get("clickup_cleanup", False):
        anthropic_tools.extend(clickup_cleanup_tool.TOOL_DEFINITIONS)
    return _convert_to_openai_tools(anthropic_tools)


def execute_tool(name: str, args: dict) -> str:
    """Route tool execution to the correct module."""
    from tools import clickup_tool, gmail_tool, gcal_tool, github_tool
    from tools import site_monitor, content_manager, performance_reporter, pricing_manager
    from tools import obsidian_tool
    from tools import gdrive_tool, web_search_tool, clickup_cleanup_tool

    if name.startswith("clickup_cleanup_"):
        return json.dumps(clickup_cleanup_tool.execute(name, args))
    elif name.startswith("clickup_"):
        return clickup_tool.execute_tool(name, args)
    elif name.startswith("gmail_"):
        return gmail_tool.execute_tool(name, args)
    elif name.startswith("gcal_"):
        return gcal_tool.execute_tool(name, args)
    elif name in ("read_file", "write_file"):
        return github_tool.execute_tool(name, args)
    elif name in site_monitor.TOOL_HANDLERS:
        return json.dumps(site_monitor.execute(name, args))
    elif name in content_manager.TOOL_HANDLERS:
        return json.dumps(content_manager.execute(name, args))
    elif name in performance_reporter.TOOL_HANDLERS:
        return json.dumps(performance_reporter.execute(name, args))
    elif name in pricing_manager.TOOL_HANDLERS:
        return json.dumps(pricing_manager.execute(name, args))
    elif name in obsidian_tool.TOOL_HANDLERS:
        return json.dumps(obsidian_tool.execute(name, args))
    elif name.startswith("gdrive_"):
        return json.dumps(gdrive_tool.execute(name, args))
    elif name.startswith("web_"):
        return json.dumps(web_search_tool.execute(name, args))
    else:
        return json.dumps({"error": f"Unknown tool: {name}"})
