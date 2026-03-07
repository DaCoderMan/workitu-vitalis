import { getUser } from "@/lib/auth";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Jerusalem",
  });

  // Try today, then yesterday
  for (const date of [today, getPreviousDate(today)]) {
    const url = `https://raw.githubusercontent.com/DaCoderMan/workitu-bee-brain/main/context/daily/${date}.md`;
    try {
      const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5min
      if (res.ok) {
        const content = await res.text();
        return Response.json({ date, content, isToday: date === today });
      }
    } catch {
      // try next date
    }
  }

  return Response.json({
    date: today,
    content: null,
    message: "No recent briefing available",
  });
}

function getPreviousDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
