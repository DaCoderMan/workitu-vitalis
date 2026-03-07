"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Bot, User, Volume2, VolumeX, Copy, Check, Wrench, Loader2, CheckCircle2, ThumbsUp, ThumbsDown, CalendarDays, Mail, TrendingUp, CheckSquare, DollarSign, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOOL_LABELS } from "@/lib/tools/labels";
import { AGENT_META } from "@/lib/agents/meta";

function AgentBadge({ agentSlug }: { agentSlug: string }) {
  const meta = AGENT_META[agentSlug];
  if (!meta) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.name}
    </span>
  );
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function TTSButton({ text }: { text: string }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async () => {
    if (isSpeaking) {
      stop();
      return;
    }
    setIsSpeaking(true);

    try {
      // Try API TTS first
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.substring(0, 3000) }),
      });

      if (res.ok && res.headers.get("content-type")?.includes("audio")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
        audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
        audio.play();
        return;
      }
    } catch {
      // Fall through to browser TTS
    }

    // Fallback: browser speech synthesis
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  }, [text, isSpeaking, stop]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={speak}
      title={isSpeaking ? "Stop speaking" : "Read aloud"}
    >
      {isSpeaking ? (
        <VolumeX className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

function FeedbackButtons({ messageId, text }: { messageId: string; text: string }) {
  const [submitted, setSubmitted] = useState<"positive" | "negative" | null>(null);

  const submit = useCallback(async (rating: "positive" | "negative") => {
    setSubmitted(rating);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          rating,
          assistantResponse: text.substring(0, 500),
        }),
      });
    } catch {
      // Silent fail
    }
  }, [messageId, text]);

  if (submitted) {
    return (
      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        {submitted === "positive" ? "Thanks!" : "Noted"}
      </span>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => submit("positive")}
        title="Good response"
      >
        <ThumbsUp className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => submit("negative")}
        title="Bad response"
      >
        <ThumbsDown className="h-3 w-3" />
      </Button>
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={handleCopy}
      title="Copy message"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

interface ToolPart {
  type: string;
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

function isToolPart(part: { type: string }): part is ToolPart {
  return part.type.startsWith("tool-") && "toolCallId" in part;
}

function getToolName(type: string): string {
  return type.replace(/^tool-/, "");
}

function ToolInvocationDisplay({ part }: { part: ToolPart }) {
  const toolName = getToolName(part.type);
  const label = TOOL_LABELS[toolName] || toolName;
  const isDone = part.state === "output-available";
  const isError = part.state === "output-error";

  return (
    <div className="my-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        {isDone ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
        ) : isError ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-red-500 shrink-0" />
        ) : (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500 shrink-0" />
        )}
        <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="font-medium">{label}</span>
      </div>
      {isDone && part.output != null && (
        <div className="mt-1.5 pl-6 text-muted-foreground">
          <pre className="whitespace-pre-wrap break-words text-[11px]">
            {typeof part.output === "string" ? part.output : JSON.stringify(part.output, null, 2)}
          </pre>
        </div>
      )}
      {isError && part.errorText && (
        <div className="mt-1.5 pl-6 text-red-400 text-[11px]">{part.errorText}</div>
      )}
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  { text: "What's on my calendar today?", icon: CalendarDays, color: "#3B82F6" },
  { text: "Summarize my recent emails", icon: Mail, color: "#F59E0B" },
  { text: "Revenue update", icon: TrendingUp, color: "#10B981" },
  { text: "Create a task", icon: CheckSquare, color: "#3B82F6" },
  { text: "Log an expense", icon: DollarSign, color: "#10B981" },
  { text: "What do you know about me?", icon: Brain, color: "#8B5CF6" },
];

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  agentColor: string;
  agentName?: string;
  onPromptClick?: (text: string) => void;
}

export function ChatMessages({
  messages,
  isLoading,
  agentColor,
  agentName,
  onPromptClick,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <div className="text-center text-muted-foreground mb-8">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: `${agentColor}15`, color: agentColor }}
            >
              <Bot className="h-8 w-8" />
            </div>
            <p className="text-lg font-medium">{agentName || "Start a conversation"}</p>
            <p className="mt-1 text-sm">
              Type a message, use the mic, or try one of these:
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SUGGESTED_PROMPTS.map((prompt) => {
              const Icon = prompt.icon;
              return (
                <button
                  key={prompt.text}
                  onClick={() => onPromptClick?.(prompt.text)}
                  className="group/card flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left text-sm transition-all duration-200 hover:border-border/80 hover:bg-accent/50 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover/card:scale-110"
                    style={{ backgroundColor: `${prompt.color}15`, color: prompt.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs leading-snug text-muted-foreground group-hover/card:text-foreground transition-colors duration-200">
                    {prompt.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((message) => {
          const text = getMessageText(message);
          const toolParts = message.parts
            .filter((p) => p.type.startsWith("tool-") && "toolCallId" in p) as ToolPart[];
          const hasToolCalls = toolParts.length > 0;
          const agentSlug = message.role === "assistant"
            ? ((message.metadata as Record<string, unknown> | undefined)?.agentSlug as string | undefined)
            : undefined;

          return (
            <div
              key={message.id}
              className={cn(
                "group flex gap-3",
                message.role === "user" ? "flex-row-reverse" : ""
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  message.role === "user"
                    ? "bg-foreground text-background"
                    : "border border-border"
                )}
                style={
                  message.role === "assistant"
                    ? { backgroundColor: `${agentColor}20`, color: agentColor }
                    : undefined
                }
              >
                {message.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0 max-w-[85%]">
                {/* Agent badge for assistant messages */}
                {agentSlug && (
                  <AgentBadge agentSlug={agentSlug} />
                )}

                {/* Tool invocations */}
                {hasToolCalls && (
                  <div>
                    {toolParts.map((part) => (
                      <ToolInvocationDisplay key={part.toolCallId} part={part} />
                    ))}
                  </div>
                )}

                {/* Text content */}
                {text && (
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-foreground text-background"
                        : "bg-card border border-border"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-2 list-disc pl-4">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-2 list-decimal pl-4">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="mb-1">{children}</li>
                          ),
                          code: ({ children, className }) => {
                            const isBlock = className?.includes("language-");
                            if (isBlock) {
                              return (
                                <pre className="my-2 overflow-x-auto rounded-lg bg-muted p-3">
                                  <code className="text-xs">{children}</code>
                                </pre>
                              );
                            }
                            return (
                              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                {children}
                              </code>
                            );
                          },
                          h1: ({ children }) => (
                            <h1 className="mb-2 text-lg font-bold">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="mb-2 text-base font-bold">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="mb-1 text-sm font-bold">{children}</h3>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold">{children}</strong>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 underline hover:text-blue-300"
                            >
                              {children}
                            </a>
                          ),
                          table: ({ children }) => (
                            <div className="my-2 overflow-x-auto">
                              <table className="min-w-full text-xs border border-border">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="border border-border bg-muted px-2 py-1 text-left font-semibold">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-border px-2 py-1">
                              {children}
                            </td>
                          ),
                        }}
                      >
                        {text}
                      </ReactMarkdown>
                    ) : (
                      <p>{text}</p>
                    )}
                  </div>
                )}

                {/* Action buttons for assistant messages */}
                {message.role === "assistant" && text && (
                  <div className="flex gap-1 ml-1">
                    <TTSButton text={text} />
                    <CopyButton text={text} />
                    <FeedbackButtons messageId={message.id} text={text} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 items-start">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border"
              style={{
                backgroundColor: `${agentColor}20`,
                color: agentColor,
              }}
            >
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-card border border-border px-4 py-3">
              <span
                className="inline-block h-2 w-2 rounded-full animate-pulse"
                style={{ backgroundColor: agentColor }}
              />
              <span className="text-sm text-muted-foreground">
                {agentName || "Ria"} is thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
