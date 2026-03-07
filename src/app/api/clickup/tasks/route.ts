import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const CLICKUP_API = "https://api.clickup.com/api/v2";
const TOKEN = process.env.CLICKUP_API_TOKEN;
const TEAM_ID = "90182449313";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!TOKEN) {
    return NextResponse.json(
      { error: "ClickUp API token not configured" },
      { status: 500 }
    );
  }

  const filter = req.nextUrl.searchParams.get("filter") ?? "due_today";

  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  let url = `${CLICKUP_API}/team/${TEAM_ID}/task?subtasks=true&include_closed=false&order_by=due_date&reverse=true`;

  if (filter === "overdue") {
    url += `&due_date_lt=${startOfDay.getTime()}&statuses[]=open&statuses[]=in%20progress`;
  } else if (filter === "due_today") {
    url += `&due_date_gt=${startOfDay.getTime()}&due_date_lt=${endOfDay.getTime()}`;
  } else {
    url += `&order_by=updated&page=0`;
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: TOKEN },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `ClickUp API error: ${err}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const tasks = (data.tasks ?? []).slice(0, 25).map(
      (t: Record<string, unknown>) => ({
        id: t.id,
        name: t.name,
        status: (t.status as Record<string, unknown>)?.status ?? "unknown",
        statusColor: (t.status as Record<string, unknown>)?.color ?? "#666",
        priority: (t.priority as Record<string, unknown>)?.priority ?? null,
        dueDate: t.due_date ? Number(t.due_date) : null,
        url: t.url,
        listName:
          (t.list as Record<string, unknown>)?.name ?? "Unknown",
      })
    );

    return NextResponse.json({ tasks });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch: ${err}` },
      { status: 500 }
    );
  }
}
