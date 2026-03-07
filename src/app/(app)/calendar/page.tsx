"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Users,
  ExternalLink,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  location: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink: string;
  status: string;
  colorId: string | null;
  attendees: {
    email: string;
    displayName: string;
    responseStatus: string;
  }[];
  organizer: {
    email: string;
    displayName: string;
  } | null;
}

// Color palette for events
const EVENT_COLORS = [
  "bg-blue-500/20 border-blue-500/50 text-blue-300",
  "bg-green-500/20 border-green-500/50 text-green-300",
  "bg-purple-500/20 border-purple-500/50 text-purple-300",
  "bg-orange-500/20 border-orange-500/50 text-orange-300",
  "bg-pink-500/20 border-pink-500/50 text-pink-300",
  "bg-teal-500/20 border-teal-500/50 text-teal-300",
  "bg-indigo-500/20 border-indigo-500/50 text-indigo-300",
  "bg-rose-500/20 border-rose-500/50 text-rose-300",
];

function getEventColor(event: CalendarEvent): string {
  if (event.colorId) {
    const idx = parseInt(event.colorId) % EVENT_COLORS.length;
    return EVENT_COLORS[idx];
  }
  // Hash the event summary for consistent color
  let hash = 0;
  for (let i = 0; i < event.summary.length; i++) {
    hash = event.summary.charCodeAt(i) + ((hash << 5) - hash);
  }
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Start from Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [error, setError] = useState<string | null>(null);

  // Event detail dialog
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Create event dialog
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    summary: "",
    description: "",
    location: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
  });

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const today = useMemo(() => new Date(), []);

  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = 8; i <= 20; i++) h.push(i);
    return h;
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        timeMin: weekStart.toISOString(),
        timeMax: weekEnd.toISOString(),
      });
      const res = await fetch(`/api/calendar?${params}`);
      const data = await res.json();
      if (data.error && !data.events) {
        setError(data.error);
        setEvents([]);
      } else {
        setEvents(data.events ?? []);
        if (data.error) setError(data.error);
      }
    } catch {
      setError("Failed to fetch calendar events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const navigateWeek = (direction: -1 | 1) => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + direction * 7);
      return d;
    });
  };

  const goToThisWeek = () => {
    setWeekStart(getStartOfWeek(new Date()));
  };

  const getEventsForDay = (day: Date) => {
    return events.filter((e) => {
      const eventStart = new Date(e.start);
      return isSameDay(eventStart, day);
    });
  };

  const getEventPosition = (event: CalendarEvent) => {
    if (event.allDay) return null;
    const start = new Date(event.start);
    const end = new Date(event.end);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = Math.max(0, (startHour - 8) * 60); // 60px per hour
    const height = Math.max(20, (endHour - startHour) * 60);
    return { top, height };
  };

  // Upcoming events: next 10 events from now
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.start) >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 10);
  }, [events]);

  const handleCreateEvent = async () => {
    if (!newEvent.summary || !newEvent.date) return;

    setCreating(true);
    try {
      let start: string;
      let end: string;

      if (newEvent.allDay) {
        start = newEvent.date;
        // For all-day events, end date is exclusive in Google Calendar
        const endDate = new Date(newEvent.date);
        endDate.setDate(endDate.getDate() + 1);
        end = endDate.toISOString().split("T")[0];
      } else {
        start = `${newEvent.date}T${newEvent.startTime}:00`;
        end = `${newEvent.date}T${newEvent.endTime}:00`;
      }

      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: newEvent.summary,
          description: newEvent.description,
          location: newEvent.location,
          start,
          end,
          allDay: newEvent.allDay,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create event");
      }

      setShowCreate(false);
      setNewEvent({
        summary: "",
        description: "",
        location: "",
        date: "",
        startTime: "09:00",
        endTime: "10:00",
        allDay: false,
      });
      await fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your schedule for the week
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToThisWeek}>
            This Week
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {weekStart.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
          })}{" "}
          -{" "}
          {new Date(weekEnd.getTime() - 86400000).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Error */}
      {error && !loading && (
        <Card className="border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-300">{error}</p>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state (no Google connection) */}
      {!loading && events.length === 0 && error?.includes("not connected") && (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No calendar connected</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Connect your Google account to view your calendar events.
          </p>
        </Card>
      )}

      {/* Week View */}
      {!loading && (
        <Card className="overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
            <div className="p-2" />
            {weekDays.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  className={`p-2 text-center border-l border-border ${
                    isToday ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="text-xs text-muted-foreground">
                    {day.toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      isToday ? "text-primary" : ""
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  {/* All-day events */}
                  {getEventsForDay(day)
                    .filter((e) => e.allDay)
                    .map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setSelectedEvent(e)}
                        className={`mt-1 w-full text-left text-[10px] rounded px-1 py-0.5 truncate border ${getEventColor(e)}`}
                      >
                        {e.summary}
                      </button>
                    ))}
                </div>
              );
            })}
          </div>

          {/* Time Grid */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[600px] overflow-y-auto">
            {hours.map((hour) => (
              <div key={hour} className="contents">
                {/* Time label */}
                <div className="h-[60px] border-b border-border/50 pr-2 flex items-start justify-end">
                  <span className="text-[10px] text-muted-foreground -mt-1.5">
                    {hour === 12
                      ? "12 PM"
                      : hour > 12
                        ? `${hour - 12} PM`
                        : `${hour} AM`}
                  </span>
                </div>
                {/* Day columns */}
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, today);
                  const dayEvents = getEventsForDay(day).filter((e) => {
                    if (e.allDay) return false;
                    const pos = getEventPosition(e);
                    if (!pos) return false;
                    const eventHourStart = Math.floor(pos.top / 60) + 8;
                    return eventHourStart === hour;
                  });

                  return (
                    <div
                      key={`${hour}-${day.toISOString()}`}
                      className={`relative h-[60px] border-b border-l border-border/50 ${
                        isToday ? "bg-primary/5" : ""
                      }`}
                    >
                      {dayEvents.map((e) => {
                        const pos = getEventPosition(e);
                        if (!pos) return null;
                        const topInCell = (pos.top % 60);
                        return (
                          <button
                            key={e.id}
                            onClick={() => setSelectedEvent(e)}
                            className={`absolute left-0.5 right-0.5 rounded px-1 text-[10px] leading-tight overflow-hidden border z-10 text-left ${getEventColor(e)}`}
                            style={{
                              top: `${topInCell}px`,
                              height: `${Math.min(pos.height, 60 - topInCell)}px`,
                              minHeight: "16px",
                            }}
                          >
                            <span className="font-medium truncate block">
                              {e.summary}
                            </span>
                            {pos.height > 25 && (
                              <span className="opacity-70 truncate block">
                                {formatTime(e.start)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Upcoming Events */}
      {!loading && upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Upcoming Events</h2>
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <Card
                key={event.id}
                className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedEvent(event)}
              >
                <div
                  className={`w-1 self-stretch rounded-full ${
                    getEventColor(event).includes("blue")
                      ? "bg-blue-500"
                      : getEventColor(event).includes("green")
                        ? "bg-green-500"
                        : getEventColor(event).includes("purple")
                          ? "bg-purple-500"
                          : getEventColor(event).includes("orange")
                            ? "bg-orange-500"
                            : "bg-primary"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{event.summary}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {event.allDay
                        ? formatDate(new Date(event.start))
                        : `${formatDate(new Date(event.start))} ${formatTime(event.start)} - ${formatTime(event.end)}`}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
                {event.attendees.length > 0 && (
                  <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                    <Users className="h-2.5 w-2.5" />
                    {event.attendees.length}
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Event Detail Dialog */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.summary}</DialogTitle>
            <DialogDescription>
              {selectedEvent &&
                (selectedEvent.allDay
                  ? formatDate(new Date(selectedEvent.start))
                  : `${formatDate(new Date(selectedEvent.start))} ${formatTime(selectedEvent.start)} - ${formatTime(selectedEvent.end)}`)}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-3">
              {selectedEvent.location && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.description && (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-3">
                  {selectedEvent.description}
                </div>
              )}

              {selectedEvent.attendees.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                    <Users className="h-4 w-4" />
                    Attendees ({selectedEvent.attendees.length})
                  </div>
                  <div className="space-y-1.5">
                    {selectedEvent.attendees.map((a) => (
                      <div
                        key={a.email}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{a.displayName}</span>
                        <Badge
                          variant={
                            a.responseStatus === "accepted"
                              ? "default"
                              : a.responseStatus === "declined"
                                ? "destructive"
                                : "outline"
                          }
                          className="text-[10px]"
                        >
                          {a.responseStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.organizer && (
                <div className="text-xs text-muted-foreground border-t border-border pt-3">
                  Organized by {selectedEvent.organizer.displayName || selectedEvent.organizer.email}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedEvent?.htmlLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(selectedEvent.htmlLink, "_blank", "noopener")
                }
                className="gap-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Google Calendar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Add a new event to your Google Calendar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title</label>
              <Input
                placeholder="Event title"
                value={newEvent.summary}
                onChange={(e) =>
                  setNewEvent((prev) => ({ ...prev, summary: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Date</label>
              <Input
                type="date"
                value={newEvent.date}
                onChange={(e) =>
                  setNewEvent((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={newEvent.allDay}
                onChange={(e) =>
                  setNewEvent((prev) => ({ ...prev, allDay: e.target.checked }))
                }
                className="rounded border-border"
              />
              <label htmlFor="allDay" className="text-sm">
                All day event
              </label>
            </div>

            {!newEvent.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block">Location</label>
              <Input
                placeholder="Add location"
                value={newEvent.location}
                onChange={(e) =>
                  setNewEvent((prev) => ({ ...prev, location: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Description
              </label>
              <textarea
                placeholder="Add description"
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none dark:bg-input/30"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={creating || !newEvent.summary || !newEvent.date}
              className="gap-2"
            >
              {creating ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Event
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
