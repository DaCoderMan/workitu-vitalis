import { getUser } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import { Message } from "@/lib/db/models/message";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await connectDB();
  const messages = await Message.find({ conversationId: id })
    .sort({ createdAt: 1 })
    .lean();

  return Response.json(messages);
}
