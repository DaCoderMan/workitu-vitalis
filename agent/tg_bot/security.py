"""Security middleware for Bee Telegram bot.

Provides chat_id authorization and rate limiting.
"""

import os
import time
import logging
from functools import wraps

log = logging.getLogger("bee-telegram")

AUTHORIZED_CHAT_IDS = set()


def _load_authorized_ids():
    global AUTHORIZED_CHAT_IDS
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if chat_id:
        AUTHORIZED_CHAT_IDS = {int(cid.strip()) for cid in chat_id.split(",")}


_load_authorized_ids()

# Rate limiter state
_rate_tracker = {}
RATE_LIMIT = 10  # messages per minute


def _check_rate_limit(chat_id: int) -> bool:
    now = time.time()
    if chat_id not in _rate_tracker:
        _rate_tracker[chat_id] = []
    _rate_tracker[chat_id] = [t for t in _rate_tracker[chat_id] if now - t < 60]
    if len(_rate_tracker[chat_id]) >= RATE_LIMIT:
        return False
    _rate_tracker[chat_id].append(now)
    return True


def auth_required(handler_func):
    """Decorator that checks chat_id authorization and rate limiting."""

    @wraps(handler_func)
    async def wrapper(update, context):
        chat_id = update.effective_chat.id

        if chat_id not in AUTHORIZED_CHAT_IDS:
            log.warning(f"Unauthorized access attempt from chat_id: {chat_id}")
            await update.message.reply_text("Unauthorized. This bot is private.")
            return

        if not _check_rate_limit(chat_id):
            await update.message.reply_text("Rate limit exceeded. Please wait a moment.")
            return

        return await handler_func(update, context)

    return wrapper
