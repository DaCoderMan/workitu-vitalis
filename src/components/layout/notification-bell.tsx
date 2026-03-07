"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Zap,
  ListChecks,
  Receipt,
  UserPlus,
  Heart,
  RefreshCcw,
  Info,
  CheckCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Activity {
  _id: string;
  type: string;
  title: string;
  description?: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  xp_earned: Zap,
  task_completed: ListChecks,
  invoice_paid: Receipt,
  contact_added: UserPlus,
  health_logged: Heart,
  google_synced: RefreshCcw,
  system: Info,
};

const TYPE_COLORS: Record<string, string> = {
  xp_earned: "text-amber-500",
  task_completed: "text-blue-500",
  invoice_paid: "text-emerald-500",
  contact_added: "text-violet-500",
  health_logged: "text-rose-500",
  google_synced: "text-cyan-500",
  system: "text-muted-foreground",
};

function relativeTime(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IL", { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(() => {
    fetch("/api/activity?limit=20")
      .then((r) => r.json())
      .then((data) => {
        setActivities(data.activities ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {});
  }, []);

  // Initial load + poll every 30s + on window focus
  useEffect(() => {
    load();

    const interval = setInterval(load, 30_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const markAllRead = async () => {
    try {
      await fetch("/api/activity", { method: "PATCH" });
      setUnreadCount(0);
      setActivities((prev) => prev.map((a) => ({ ...a, read: true })));
    } catch {
      // Silently fail
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={markAllRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {activities.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activities.map((activity) => {
                const Icon = TYPE_ICONS[activity.type] || Info;
                const colorClass = TYPE_COLORS[activity.type] || "text-muted-foreground";

                return (
                  <div
                    key={activity._id}
                    className={`flex items-start gap-3 px-3 py-2.5 ${
                      !activity.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${colorClass}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-tight">{activity.title}</p>
                      {activity.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {activity.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground mt-0.5">
                      {relativeTime(activity.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
