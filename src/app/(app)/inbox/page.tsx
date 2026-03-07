"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Mail,
  RefreshCw,
  Star,
  Inbox,
  Clock,
  ChevronDown,
  ChevronUp,
  MailOpen,
} from "lucide-react";

interface Email {
  messageId: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  snippet: string;
  date: string;
  isRead: boolean;
  labels: string[];
}

type FilterTab = "all" | "unread" | "starred";

function parseEmailSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return { name: match[1].replace(/"/g, "").trim(), email: match[2] };
  return { name: from, email: from };
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 365) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Consistent color per sender based on name hash
function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-600",
    "bg-green-600",
    "bg-purple-600",
    "bg-orange-600",
    "bg-pink-600",
    "bg-teal-600",
    "bg-indigo-600",
    "bg-rose-600",
    "bg-amber-600",
    "bg-cyan-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedBody, setExpandedBody] = useState<string | null>(null);
  const [loadingBody, setLoadingBody] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (activeFilter === "unread") params.set("unread", "true");
      if (activeFilter === "starred") params.set("starred", "true");
      params.set("limit", "30");

      const res = await fetch(`/api/gmail?${params}`);
      const data = await res.json();

      if (data.error && !data.emails) {
        setError(data.error);
        setEmails([]);
      } else {
        setEmails(data.emails ?? []);
        if (data.lastSyncedAt) setLastSynced(data.lastSyncedAt);
      }
    } catch {
      setError("Failed to fetch emails");
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/google/sync?type=gmail", { method: "POST" });
      await fetchEmails();
    } catch {
      setError("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  const toggleExpand = async (messageId: string) => {
    if (expandedId === messageId) {
      setExpandedId(null);
      setExpandedBody(null);
      return;
    }

    setExpandedId(messageId);
    setExpandedBody(null);
    setLoadingBody(true);

    try {
      const res = await fetch(`/api/gmail/${messageId}`);
      const data = await res.json();
      setExpandedBody(data.body || "(No body content)");
    } catch {
      setExpandedBody("Failed to load email body.");
    } finally {
      setLoadingBody(false);
    }
  };

  const filterTabs: { key: FilterTab; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "All", icon: Inbox },
    { key: "unread", label: "Unread", icon: Mail },
    { key: "starred", label: "Starred", icon: Star },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Inbox
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your Gmail inbox at a glance
          </p>
        </div>
      </div>

      {/* Sync Banner */}
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {lastSynced ? (
            <span>
              Last synced:{" "}
              {formatRelativeDate(lastSynced)}
            </span>
          ) : (
            <span>Not synced yet</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {searchQuery && (
          <Button type="button" variant="ghost" onClick={handleClearSearch}>
            Clear
          </Button>
        )}
      </form>

      {/* Filter Tabs */}
      <div className="flex gap-1">
        {filterTabs.map(({ key, label, icon: TabIcon }) => (
          <Button
            key={key}
            variant={activeFilter === key ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilter(key)}
            className="gap-1.5"
          >
            <TabIcon className="h-3.5 w-3.5" />
            {label}
          </Button>
        ))}
      </div>

      {/* Error */}
      {error && !loading && (
        <Card className="border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-300">{error}</p>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && emails.length === 0 && !error && (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No emails found</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            {searchQuery
              ? `No emails match "${searchQuery}". Try a different search.`
              : activeFilter !== "all"
                ? `No ${activeFilter} emails. Try switching to "All".`
                : "Connect your Google account to see your inbox. Use the Sync button to pull your emails."}
          </p>
          {!searchQuery && activeFilter === "all" && (
            <Button onClick={handleSync} className="mt-4 gap-2" disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync Gmail
            </Button>
          )}
        </Card>
      )}

      {/* Email List */}
      {!loading && emails.length > 0 && (
        <div className="space-y-1">
          {emails.map((email) => {
            const sender = parseEmailSender(email.from);
            const isExpanded = expandedId === email.messageId;
            const isStarred = email.labels.includes("STARRED");

            return (
              <div key={email.messageId}>
                <Card
                  className={`p-4 transition-colors cursor-pointer hover:bg-accent/50 ${
                    !email.isRead ? "border-l-2 border-l-primary" : ""
                  } ${isExpanded ? "bg-accent/30" : ""}`}
                  onClick={() => toggleExpand(email.messageId)}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${getAvatarColor(
                        sender.name
                      )}`}
                    >
                      {getInitials(sender.name)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm truncate ${
                            !email.isRead ? "font-semibold" : "text-muted-foreground"
                          }`}
                        >
                          {sender.name}
                        </span>
                        {isStarred && (
                          <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
                        )}
                        {!email.isRead && (
                          <Badge variant="default" className="text-[10px] py-0 shrink-0">
                            New
                          </Badge>
                        )}
                      </div>
                      <p
                        className={`text-sm truncate ${
                          !email.isRead ? "font-medium" : ""
                        }`}
                      >
                        {email.subject}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {email.snippet}
                      </p>
                    </div>

                    {/* Date & Expand */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(email.date)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </Card>

                {/* Expanded Body */}
                {isExpanded && (
                  <Card className="mx-4 mt-0 rounded-t-none border-t-0 p-5">
                    <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <MailOpen className="h-3.5 w-3.5" />
                      <span>From: {email.from}</span>
                      <span>|</span>
                      <span>
                        {new Date(email.date).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {email.labels.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {email.labels
                          .filter((l) => !["INBOX", "UNREAD", "CATEGORY_UPDATES", "CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL", "CATEGORY_FORUMS"].includes(l))
                          .map((label) => (
                            <Badge key={label} variant="outline" className="text-[10px]">
                              {label}
                            </Badge>
                          ))}
                      </div>
                    )}
                    {loadingBody ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90 max-h-96 overflow-y-auto">
                        {expandedBody}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
