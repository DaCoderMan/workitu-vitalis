import { getUser } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import { Conversation } from "@/lib/db/models/conversation";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const agentSlug = searchParams.get("agentSlug");

  await connectDB();

  const filter: Record<string, string> = { userId: user.id };
  if (agentSlug) filter.agentSlug = agentSlug;

  const conversations = await Conversation.find(filter)
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  return Response.json(conversations);
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentSlug, title } = await req.json();

  await connectDB();
  const conversation = await Conversation.create({
    userId: user.id,
    agentSlug,
    title: title || "New conversation",
  });

  return Response.json(conversation);
}
