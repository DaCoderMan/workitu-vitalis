"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail } from "lucide-react";

interface Email {
  messageId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isRead: boolean;
}

function extractSenderName(from: string) {
  // "John Doe <john@example.com>" -> "John Doe"
  const match = from.match(/^(.+?)\s*<.+>$/);
  return match ? match[1].replace(/"/g, "") : from.split("@")[0];
}

function relativeTime(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-IL", { month: "short", day: "numeric" });
}

export function EmailWidget() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gmail?unread=true&limit=3")
      .then((r) => r.json())
      .then((data) => {
        if (data.error || (data.count === 0 && data.emails?.length === 0 && !data.lastSyncedAt)) {
          // If never synced, likely not connected
          if (!data.lastSyncedAt && data.count === 0) {
            setConnected(false);
          }
        }
        setEmails(data.emails ?? []);
      })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Unread Emails</h3>
      </div>

      {!connected ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Mail className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Connect Google to see your inbox
          </p>
        </div>
      ) : emails.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Inbox zero -- nice work!
        </p>
      ) : (
        <div className="space-y-1">
          {emails.map((email) => (
            <a
              key={email.messageId}
              href={`https://mail.google.com/mail/u/0/#inbox/${email.messageId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {extractSenderName(email.from)}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {relativeTime(email.date)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {email.subject}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
