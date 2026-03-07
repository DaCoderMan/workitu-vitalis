"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  ListChecks,
  Target,
  Clock,
  ExternalLink,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string;
  htmlLink: string;
  allDay?: boolean;
}

interface ClickUpTask {
  id: string;
  name: string;
  status: string;
  statusColor: string;
  priority: string | null;
  dueDate: number | null;
  url: string;
  listName: string;
}

function formatTime(dateStr: string) {
  if (!dateStr) return "";
  if (dateStr.length === 10) return "All day";
  return new Date(dateStr).toLocaleTimeString("en-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(timestamp: number | null): boolean {
  if (!timestamp) return false;
  return timestamp < Date.now();
}

export function TodaysFocus() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<ClickUpTask[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    // Fetch today's calendar events
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    fetch(
      `/api/calendar?timeMin=${encodeURIComponent(startOfDay.toISOString())}&timeMax=${encodeURIComponent(endOfDay.toISOString())}`
    )
      .then((r) => r.json())
      .then((data) => {
        // Filter to only future events or currently happening
        const allEvents: CalendarEvent[] = data.events ?? [];
        setEvents(allEvents.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoadingEvents(false));

    // Fetch overdue + due-today tasks
    Promise.all([
      fetch("/api/clickup/tasks?filter=overdue")
        .then((r) => r.json())
        .catch(() => ({ tasks: [] })),
      fetch("/api/clickup/tasks?filter=due_today")
        .then((r) => r.json())
        .catch(() => ({ tasks: [] })),
    ])
      .then(([overdueData, todayData]) => {
        const overdue: ClickUpTask[] = (overdueData.tasks ?? []).map(
          (t: ClickUpTask) => ({ ...t, _overdue: true })
        );
        const today: ClickUpTask[] = todayData.tasks ?? [];
        // Combine, deduplicate by id, take top 3
        const seen = new Set<string>();
        const combined: ClickUpTask[] = [];
        for (const t of [...overdue, ...today]) {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            combined.push(t);
          }
          if (combined.length >= 3) break;
        }
        setTasks(combined);
      })
      .finally(() => setLoadingTasks(false));
  }, []);

  const isLoading = loadingEvents || loadingTasks;
  const isEmpty = !isLoading && events.length === 0 && tasks.length === 0;

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Today&apos;s Focus</h3>
      </div>

      {isEmpty ? (
        <p className="py-3 text-center text-sm text-muted-foreground">
          Nothing urgent today — focus on revenue!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Calendar Events */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Events Today
            </div>
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">
                No events scheduled
              </p>
            ) : (
              <div className="space-y-1.5">
                {events.map((event) => (
                  <a
                    key={event.id}
                    href={event.htmlLink || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
                  >
                    <Clock className="h-3 w-3 shrink-0 text-primary/70" />
                    <span className="shrink-0 font-medium text-primary">
                      {formatTime(event.start)}
                    </span>
                    <span className="truncate">{event.summary}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Tasks Due */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" />
              Tasks Due
            </div>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">
                No tasks due today
              </p>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <a
                    key={task.id}
                    href={task.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
                  >
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: task.statusColor }}
                    />
                    <span className="truncate">{task.name}</span>
                    {isOverdue(task.dueDate) && (
                      <Badge
                        variant="destructive"
                        className="ml-auto shrink-0 px-1.5 py-0 text-[10px]"
                      >
                        overdue
                      </Badge>
                    )}
                    <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/50" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
