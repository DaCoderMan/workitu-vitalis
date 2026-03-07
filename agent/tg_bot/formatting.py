"""Telegram message formatting utilities."""

MAX_MESSAGE_LENGTH = 4096


def chunk_message(text: str, max_len: int = MAX_MESSAGE_LENGTH) -> list:
    """Split text into chunks that fit Telegram's message length limit."""
    if len(text) <= max_len:
        return [text]

    chunks = []
    while text:
        if len(text) <= max_len:
            chunks.append(text)
            break
        split_pos = text.rfind("\n", 0, max_len)
        if split_pos == -1 or split_pos < max_len // 2:
            split_pos = max_len
        chunks.append(text[:split_pos])
        text = text[split_pos:].lstrip("\n")
    return chunks


async def send_long_message(bot, chat_id: int, text: str, parse_mode: str = "Markdown"):
    """Send a message, splitting into chunks if needed. Falls back to plain text."""
    chunks = chunk_message(text)
    for chunk in chunks:
        try:
            await bot.send_message(chat_id=chat_id, text=chunk, parse_mode=parse_mode)
        except Exception:
            try:
                await bot.send_message(chat_id=chat_id, text=chunk)
            except Exception:
                await bot.send_message(chat_id=chat_id, text=chunk[:MAX_MESSAGE_LENGTH])
