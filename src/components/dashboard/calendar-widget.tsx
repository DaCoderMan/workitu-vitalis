"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, MapPin } from "lucide-react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string;
  htmlLink: string;
}

function formatEventTime(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  // Check if it's an all-day event (date-only, no time component)
  if (dateStr.length === 10) {
    return d.toLocaleDateString("en-IL", { month: "short", day: "numeric" });
  }
  return d.toLocaleTimeString("en-IL", { hour: "2-digit", minute: "2-digit" });
}

export function CalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const timeMin = now.toISOString();
    // Look 7 days ahead to find next 3 events
    const future = new Date(now);
    future.setDate(future.getDate() + 7);
    const timeMax = future.toISOString();

    fetch(`/api/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === "Google Calendar not connected" || data.events?.length === 0 && data.error) {
          setConnected(false);
        }
        setEvents((data.events ?? []).slice(0, 3));
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
        <CalendarDays className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Upcoming Events</h3>
      </div>

      {!connected ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Connect Google to see your calendar
          </p>
        </div>
      ) : events.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No upcoming events this week
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <a
              key={event.id}
              href={event.htmlLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 text-primary">
                <span className="text-[10px] font-medium leading-none">
                  {formatEventTime(event.start)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{event.summary}</p>
                {event.location && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {event.location}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
