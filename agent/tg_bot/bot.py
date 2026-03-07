#!/usr/bin/env python3
"""Bee v4.0 Interactive Telegram Bot.

Always-on service that lets Yonatan chat with Bee via Telegram.
Runs via PM2 on the VPS alongside the daily cron agent.

Usage:
    cd /var/www/bee-brain/agent
    python -m tg_bot.bot
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

# Setup paths
AGENT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(AGENT_DIR))

load_dotenv(AGENT_DIR / ".env")

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

from tg_bot.security import auth_required
from tg_bot.conversation import ConversationManager
from tg_bot.ai_engine import process_message
from tg_bot.formatting import send_long_message

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("bee-telegram")

# Global conversation manager
conversations = ConversationManager(max_messages=20, ttl_seconds=1800)


# ─── Command Handlers ────────────────────────────────────────────────────────

async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Hey! I'm Bee, your AI Chief of Staff.\n\n"
        "Commands:\n"
        "/tasks — Overdue + due today\n"
        "/calendar — Today's events\n"
        "/status — Current state\n"
        "/briefing — Today's briefing\n"
        "/clear — Clear conversation\n"
        "/help — This message\n\n"
        "Or just type anything to chat!"
    )


async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await start_handler(update, context)


async def tasks_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)

    from tools import clickup_tool

    try:
        overdue = clickup_tool.get_overdue_tasks()
        due_today = clickup_tool.get_tasks_due_today()

        lines = []
        if overdue:
            lines.append("*Overdue:*")
            for t in overdue[:10]:
                priority = t.get("priority", {})
                p = priority.get("priority", "") if priority else ""
                lines.append(f"  - {t['name']} ({t.get('list', {}).get('name', '?')}) {p}")

        if due_today:
            lines.append("\n*Due Today:*")
            for t in due_today[:10]:
                status = t.get("status", {}).get("status", "?")
                lines.append(f"  - {t['name']} [{status}]")

        if not overdue and not due_today:
            lines.append("No overdue or due-today tasks!")

        await send_long_message(context.bot, update.effective_chat.id, "\n".join(lines))
    except Exception as e:
        await update.message.reply_text(f"ClickUp error: {e}")


async def calendar_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)

    from tools import gcal_tool

    try:
        events = gcal_tool.list_events_today()
        if not events:
            await update.message.reply_text("No calendar events today (or Calendar not configured).")
            return

        formatted = gcal_tool.format_events(events)
        lines = ["*Today's Events:*"]
        for e in formatted:
            time_str = e["start"]
            if "T" in time_str:
                time_str = time_str.split("T")[1][:5]
            loc = f" ({e['location']})" if e.get("location") else ""
            lines.append(f"  - {time_str} — {e['summary']}{loc}")

        await send_long_message(context.bot, update.effective_chat.id, "\n".join(lines))
    except Exception as e:
        await update.message.reply_text(f"Calendar error: {e}")


async def status_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)

    from tools import github_tool

    try:
        content = github_tool.read_file("context/current-state.md")
        if content.startswith("File not found"):
            await update.message.reply_text("current-state.md not found.")
        else:
            await send_long_message(context.bot, update.effective_chat.id, content[:3500])
    except Exception as e:
        await update.message.reply_text(f"Error reading status: {e}")


async def briefing_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)

    from tools import github_tool

    today = datetime.now().strftime("%Y-%m-%d")
    path = f"context/daily/{today}.md"

    try:
        content = github_tool.read_file(path)
        if content.startswith("File not found"):
            await update.message.reply_text(f"No briefing for {today} yet.")
        else:
            await send_long_message(context.bot, update.effective_chat.id, content[:3500])
    except Exception as e:
        await update.message.reply_text(f"Error reading briefing: {e}")


async def clear_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    conversations.clear(update.effective_chat.id)
    await update.message.reply_text("Conversation history cleared.")


# ─── Free-form Message Handler ───────────────────────────────────────────────

async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user_text = update.message.text

    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)

    history = conversations.get_history(chat_id)

    try:
        response = process_message(user_text, history)
    except Exception as e:
        log.error(f"AI engine error: {e}")
        response = f"Something went wrong: {e}"

    conversations.add_exchange(chat_id, user_text, response)

    await send_long_message(context.bot, chat_id, response)


# ─── Error Handler ────────────────────────────────────────────────────────────

async def error_handler(update, context: ContextTypes.DEFAULT_TYPE):
    log.error(f"Update {update} caused error: {context.error}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        log.error("TELEGRAM_BOT_TOKEN not set!")
        sys.exit(1)

    log.info("Starting Bee Telegram bot...")

    app = Application.builder().token(token).build()

    app.add_handler(CommandHandler("start", auth_required(start_handler)))
    app.add_handler(CommandHandler("help", auth_required(help_handler)))
    app.add_handler(CommandHandler("tasks", auth_required(tasks_handler)))
    app.add_handler(CommandHandler("calendar", auth_required(calendar_handler)))
    app.add_handler(CommandHandler("status", auth_required(status_handler)))
    app.add_handler(CommandHandler("briefing", auth_required(briefing_handler)))
    app.add_handler(CommandHandler("clear", auth_required(clear_handler)))

    app.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND,
        auth_required(message_handler),
    ))

    app.add_error_handler(error_handler)

    log.info("Bot started. Polling for messages...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
