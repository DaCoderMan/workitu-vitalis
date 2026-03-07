"""Generic specialist runner — loads a system prompt and runs DeepSeek agentic loop.

Used by multi_agent.py to run each specialist with its own prompt and tool subset.
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path

from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

log = logging.getLogger("bee-agent")

AGENT_DIR = Path(__file__).parent
TODAY = datetime.now().strftime("%Y-%m-%d")
DAY_NAME = datetime.now().strftime("%A")


def run(
    prompt_file: str,
    tools: list,
    max_calls: int = 3,
    specialist_name: str = "specialist",
) -> dict:
    """Run a specialist agent with the given prompt and tools.

    Args:
        prompt_file: Path to system prompt .txt file (relative to agent/)
        tools: List of OpenAI-format tool definitions (already filtered)
        max_calls: Maximum API calls for this specialist
        specialist_name: Name for logging

    Returns:
        dict with keys: domain, status, urgent, actions_taken, recommendations, notes
    """
    from tool_registry import execute_tool

    # Load system prompt
    prompt_path = AGENT_DIR / prompt_file
    if not prompt_path.exists():
        return {"domain": specialist_name, "status": "error", "notes": f"Prompt file not found: {prompt_file}"}

    system_prompt = prompt_path.read_text(encoding="utf-8")

    # Initialize DeepSeek client
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return {"domain": specialist_name, "status": "error", "notes": "DEEPSEEK_API_KEY not set"}

    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")

    config = json.loads((AGENT_DIR / "config.json").read_text())
    model = config.get("model", "deepseek-chat")
    max_tokens = config.get("cost_guard", {}).get("max_tokens_per_call", 4096)

    # Build conversation
    user_message = (
        f"Today is {TODAY} ({DAY_NAME}). "
        f"Run your daily check. Use your tools to gather data, then return your report as JSON. "
        f"Be thorough but concise."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    # Agentic loop
    total_calls = 0
    for iteration in range(max_calls):
        try:
            response = client.chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                tools=tools if tools else None,
                messages=messages,
            )
            total_calls += 1
        except Exception as e:
            log.error(f"[{specialist_name}] API error: {e}")
            return {"domain": specialist_name, "status": "error", "notes": str(e)}

        choice = response.choices[0]
        message = choice.message
        messages.append(message)

        # If model is done talking
        if choice.finish_reason == "stop":
            return _parse_report(message.content, specialist_name)

        # Handle tool calls
        if choice.finish_reason == "tool_calls" and message.tool_calls:
            for tool_call in message.tool_calls:
                fn = tool_call.function
                tool_name = fn.name
                try:
                    tool_args = json.loads(fn.arguments) if fn.arguments else {}
                except json.JSONDecodeError:
                    tool_args = {}

                log.info(f"[{specialist_name}] Tool: {tool_name}({json.dumps(tool_args)[:150]})")
                result = execute_tool(tool_name, tool_args)
                log.info(f"[{specialist_name}] Result: {result[:200]}")

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result,
                })

    # If we exhausted iterations, return whatever we have
    last_content = messages[-1].content if hasattr(messages[-1], "content") and messages[-1].content else ""
    if last_content:
        return _parse_report(last_content, specialist_name)

    return {
        "domain": specialist_name,
        "status": "warning",
        "notes": f"Exhausted {max_calls} API calls without completing",
        "urgent": [],
        "actions_taken": [],
        "recommendations": [],
    }


def _parse_report(content: str, specialist_name: str) -> dict:
    """Parse the specialist's response into a structured report."""
    if not content:
        return {"domain": specialist_name, "status": "error", "notes": "Empty response"}

    # Try to extract JSON from the response
    try:
        # Look for JSON block in the response
        if "```json" in content:
            json_str = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            json_str = content.split("```")[1].split("```")[0].strip()
        elif content.strip().startswith("{"):
            json_str = content.strip()
        else:
            # No JSON found, return as plain text report
            return {
                "domain": specialist_name,
                "status": "ok",
                "notes": content[:500],
                "urgent": [],
                "actions_taken": [],
                "recommendations": [],
            }

        report = json.loads(json_str)
        # Ensure required fields
        report.setdefault("domain", specialist_name)
        report.setdefault("status", "ok")
        report.setdefault("urgent", [])
        report.setdefault("actions_taken", [])
        report.setdefault("recommendations", [])
        report.setdefault("notes", "")
        return report

    except (json.JSONDecodeError, IndexError):
        return {
            "domain": specialist_name,
            "status": "ok",
            "notes": content[:500],
            "urgent": [],
            "actions_taken": [],
            "recommendations": [],
        }
