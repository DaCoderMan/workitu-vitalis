"""DeepSeek agentic tool-use loop for interactive Telegram conversations."""

import os
import json
import logging
from datetime import datetime
from pathlib import Path

from openai import OpenAI

# Import shared tool infrastructure
import sys

AGENT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(AGENT_DIR))
from tool_registry import get_all_tools, execute_tool

log = logging.getLogger("bee-telegram")


def _get_config():
    return json.loads((AGENT_DIR / "config.json").read_text())


def _get_system_prompt():
    prompt_path = AGENT_DIR / "telegram_system_prompt.txt"
    if prompt_path.exists():
        template = prompt_path.read_text()
    else:
        template = (AGENT_DIR / "system_prompt.txt").read_text()

    now = datetime.now()
    return template.replace("{date}", now.strftime("%Y-%m-%d")).replace(
        "{day}", now.strftime("%A")
    )


def process_message(user_message: str, conversation_history: list) -> str:
    """Process a user message through DeepSeek with tool use.

    Args:
        user_message: The new user message text
        conversation_history: List of previous {"role": ..., "content": ...} messages

    Returns:
        The assistant's final text response
    """
    config = _get_config()
    tg_config = config.get("telegram", {})

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return "DeepSeek API key not configured."

    client = OpenAI(
        api_key=api_key,
        base_url=config.get("api", {}).get("base_url", "https://api.deepseek.com"),
    )

    messages = [
        {"role": "system", "content": _get_system_prompt()},
        *conversation_history,
        {"role": "user", "content": user_message},
    ]

    tools = get_all_tools()
    max_iterations = tg_config.get("max_tool_calls_per_message", 8)
    max_tokens = tg_config.get("max_tokens_per_response", 2048)
    model = config.get("daily_model", "deepseek-chat")

    for iteration in range(max_iterations):
        try:
            response = client.chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                tools=tools,
                messages=messages,
            )
        except Exception as e:
            log.error(f"DeepSeek API error: {e}")
            return f"API error: {e}"

        choice = response.choices[0]
        message = choice.message
        messages.append(message)

        if choice.finish_reason == "stop":
            return message.content or "(No response generated)"

        if choice.finish_reason == "tool_calls" and message.tool_calls:
            for tool_call in message.tool_calls:
                fn = tool_call.function
                try:
                    tool_args = json.loads(fn.arguments) if fn.arguments else {}
                except json.JSONDecodeError:
                    tool_args = {}

                log.info(f"Tool: {fn.name}({json.dumps(tool_args)[:200]})")

                try:
                    result = execute_tool(fn.name, tool_args)
                except Exception as e:
                    result = json.dumps({"error": str(e)})

                log.info(f"Result: {result[:300]}")

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result,
                })
        else:
            return message.content or "(Unexpected response)"

    return "Reached tool call limit. Please try a simpler request."
