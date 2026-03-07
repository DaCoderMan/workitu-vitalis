import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { getCalendarClient } from "@/lib/google-api";

/**
 * GET /api/calendar?timeMin=...&timeMax=...
 * Reads live from Google Calendar API (always fresh).
 *
 * POST /api/calendar
 * Creates a new calendar event.
 */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");

  if (!timeMin || !timeMax) {
    return Response.json(
      { error: "timeMin and timeMax query params are required" },
      { status: 400 }
    );
  }

  try {
    const calendar = await getCalendarClient();
    if (!calendar) {
      return Response.json({
        events: [],
        count: 0,
        error: "Google Calendar not connected",
      });
    }

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    const events = (res.data.items ?? []).map((e) => ({
      id: e.id,
      summary: e.summary ?? "(No title)",
      description: e.description ?? "",
      location: e.location ?? "",
      start: e.start?.dateTime ?? e.start?.date ?? "",
      end: e.end?.dateTime ?? e.end?.date ?? "",
      allDay: !e.start?.dateTime,
      htmlLink: e.htmlLink ?? "",
      status: e.status ?? "confirmed",
      colorId: e.colorId ?? null,
      attendees: (e.attendees ?? []).map((a) => ({
        email: a.email,
        displayName: a.displayName ?? a.email,
        responseStatus: a.responseStatus ?? "needsAction",
      })),
      organizer: e.organizer
        ? { email: e.organizer.email, displayName: e.organizer.displayName }
        : null,
    }));

    return Response.json({
      events,
      count: events.length,
    });
  } catch (err) {
    console.error("[api/calendar] GET error:", err);
    const message = err instanceof Error ? err.message : "Calendar API failed";
    return Response.json({ error: message, events: [], count: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { summary, description, location, start, end, allDay } = body;

    if (!summary || !start || !end) {
      return Response.json(
        { error: "summary, start, and end are required" },
        { status: 400 }
      );
    }

    const calendar = await getCalendarClient();
    if (!calendar) {
      return Response.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
      );
    }

    const event: Record<string, unknown> = {
      summary,
      description: description ?? "",
      location: location ?? "",
    };

    if (allDay) {
      event.start = { date: start };
      event.end = { date: end };
    } else {
      event.start = { dateTime: start, timeZone: "Asia/Jerusalem" };
      event.end = { dateTime: end, timeZone: "Asia/Jerusalem" };
    }

    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return Response.json(
      {
        event: {
          id: res.data.id,
          summary: res.data.summary,
          start: res.data.start?.dateTime ?? res.data.start?.date,
          end: res.data.end?.dateTime ?? res.data.end?.date,
          htmlLink: res.data.htmlLink,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api/calendar] POST error:", err);
    const message = err instanceof Error ? err.message : "Failed to create event";
    return Response.json({ error: message }, { status: 500 });
  }
}
