import { getUser } from "@/lib/auth";

const CLICKUP_API = "https://api.clickup.com/api/v2";
const LEADS_LIST_ID = "901816199661";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    return Response.json({ error: "ClickUp not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `${CLICKUP_API}/list/${LEADS_LIST_ID}/task?include_closed=false&subtasks=true`,
      { headers: { Authorization: token } }
    );

    if (!res.ok) {
      return Response.json(
        { error: `ClickUp API error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const leads = (data.tasks || []).map(
      (t: {
        id: string;
        name: string;
        status: { status: string; color: string };
        priority: { priority: string } | null;
        due_date: string | null;
        url: string;
        description?: string;
        custom_fields?: Array<{ name: string; value: unknown }>;
      }) => ({
        id: t.id,
        name: t.name,
        status: t.status?.status || "open",
        statusColor: t.status?.color || "#808080",
        priority: t.priority?.priority || null,
        dueDate: t.due_date ? parseInt(t.due_date) : null,
        url: t.url,
        description: t.description?.slice(0, 200) || "",
      })
    );

    return Response.json({ leads });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
