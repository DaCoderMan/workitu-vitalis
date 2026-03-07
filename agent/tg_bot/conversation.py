"""In-memory conversation state with TTL for Bee Telegram bot."""

import time
import threading


class ConversationManager:
    def __init__(self, max_messages: int = 20, ttl_seconds: int = 1800):
        self.max_messages = max_messages
        self.ttl_seconds = ttl_seconds
        self._conversations = {}
        self._lock = threading.Lock()

    def get_history(self, chat_id: int) -> list:
        """Get conversation history for a chat_id."""
        with self._lock:
            conv = self._conversations.get(chat_id)
            if conv is None:
                return []
            if time.time() - conv["last_active"] > self.ttl_seconds:
                del self._conversations[chat_id]
                return []
            return list(conv["messages"])

    def add_exchange(self, chat_id: int, user_message: str, assistant_response: str):
        """Record a user message and assistant response."""
        with self._lock:
            if chat_id not in self._conversations:
                self._conversations[chat_id] = {"messages": [], "last_active": 0}

            conv = self._conversations[chat_id]
            conv["messages"].append({"role": "user", "content": user_message})
            conv["messages"].append({"role": "assistant", "content": assistant_response})
            conv["last_active"] = time.time()

            if len(conv["messages"]) > self.max_messages:
                conv["messages"] = conv["messages"][-self.max_messages:]

    def clear(self, chat_id: int):
        """Clear conversation history for a chat_id."""
        with self._lock:
            self._conversations.pop(chat_id, None)
