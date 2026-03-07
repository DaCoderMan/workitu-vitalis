import { getUser } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import { Knowledge } from "@/lib/db/models/knowledge";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (category) filter.category = category;
  if (q) filter.$text = { $search: q };

  const entries = await Knowledge.find(filter)
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  return Response.json(entries);
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { category, title, content, tags } = await req.json();

  if (!category || !title || !content) {
    return Response.json(
      { error: "category, title, and content are required" },
      { status: 400 }
    );
  }

  await connectDB();
  const entry = await Knowledge.create({
    category,
    title,
    content,
    tags: tags || [],
  });

  return Response.json(entry);
}
