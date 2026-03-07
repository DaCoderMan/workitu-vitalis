"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { RIA_AGENT } from "@/lib/agents/meta";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { Bot, Plus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConversationMeta {
  _id: string;
  title: string;
  updatedAt: string;
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function ChatSession({
  initialMsgs,
  conversationId: initialConversationId,
  onConversationCreated,
}: {
  initialMsgs: UIMessage[];
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}) {
  const [input, setInput] = useState("");
  const conversationIdRef = useRef(initialConversationId);
  const lastSavedCountRef = useRef(initialMsgs.length);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    messages: initialMsgs,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Save messages after each complete exchange
  useEffect(() => {
    if (status !== "ready" || messages.length === 0) return;
    if (messages.length <= lastSavedCountRef.current) return;

    lastSavedCountRef.current = messages.length;

    const textMessages = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: getMessageText(m),
    }));

    fetch("/api/conversations/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: conversationIdRef.current,
        agentSlug: "ria",
        messages: textMessages,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.conversationId && !conversationIdRef.current) {
          conversationIdRef.current = data.conversationId;
          onConversationCreated?.(data.conversationId);
        }
      })
      .catch(() => {});
  }, [status, messages, onConversationCreated]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleVoiceInput = useCallback((text: string) => {
    setInput((prev) => (prev ? prev + " " + text : text));
  }, []);

  const handlePromptClick = useCallback((text: string) => {
    if (isLoading) return;
    sendMessage({ text });
  }, [isLoading, sendMessage]);

  return (
    <>
      {error && (
        <div className="mx-4 mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error.message.includes("429")
            ? "Rate limit reached. Please wait a moment and try again."
            : `Error: ${error.message}`}
        </div>
      )}

      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        agentColor={RIA_AGENT.color}
        agentName={RIA_AGENT.name}
        onPromptClick={handlePromptClick}
      />

      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onVoiceInput={handleVoiceInput}
      />
    </>
  );
}

export default function ChatPage() {
  const [loaded, setLoaded] = useState(false);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [sessionKey, setSessionKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const convRes = await fetch("/api/conversations?agentSlug=ria");
        const convs: ConversationMeta[] = await convRes.json();
        setConversations(convs);

        const targetId = convs[0]?._id;
        if (targetId) {
          const msgRes = await fetch(
            `/api/conversations/${targetId}/messages`
          );
          const msgs = await msgRes.json();
          setConversationId(targetId);
          setInitialMessages(
            msgs.map((m: { _id: string; role: string; content: string }) => ({
              id: m._id,
              role: m.role as "user" | "assistant",
              parts: [{ type: "text" as const, text: m.content }],
            }))
          );
        }
      } catch {
        // Start fresh
      }
      setLoaded(true);
    };

    load();
  }, [sessionKey]);

  const handleNewChat = () => {
    setConversationId(null);
    setInitialMessages([]);
    setShowHistory(false);
    setSessionKey((k) => k + 1);
  };

  const handleSelectConversation = async (id: string) => {
    try {
      const msgRes = await fetch(`/api/conversations/${id}/messages`);
      const msgs = await msgRes.json();
      setConversationId(id);
      setInitialMessages(
        msgs.map((m: { _id: string; role: string; content: string }) => ({
          id: m._id,
          role: m.role as "user" | "assistant",
          parts: [{ type: "text" as const, text: m.content }],
        }))
      );
      setShowHistory(false);
      setSessionKey((k) => k + 1);
    } catch {
      // ignore
    }
  };

  const handleConversationCreated = useCallback((id: string) => {
    setConversationId(id);
    fetch("/api/conversations?agentSlug=ria")
      .then((r) => r.json())
      .then(setConversations)
      .catch(() => {});
  }, []);

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              backgroundColor: `${RIA_AGENT.color}20`,
              color: RIA_AGENT.color,
            }}
          >
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">{RIA_AGENT.name}</h1>
            <p className="text-xs text-muted-foreground">
              {RIA_AGENT.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            title="Conversation history"
            className="h-8 w-8"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            title="New conversation"
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showHistory && conversations.length > 0 && (
        <div className="border-b border-border bg-card/50 px-4 py-2 max-h-48 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Recent conversations
          </p>
          {conversations.map((conv) => (
            <button
              key={conv._id}
              onClick={() => handleSelectConversation(conv._id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                conv._id === conversationId && "bg-accent"
              )}
            >
              <span className="truncate flex-1">{conv.title}</span>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {new Date(conv.updatedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}

      <ChatSession
        key={sessionKey}
        initialMsgs={initialMessages}
        conversationId={conversationId}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
