import { getUser } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import { Conversation } from "@/lib/db/models/conversation";
import { Message } from "@/lib/db/models/message";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, agentSlug, messages } = await req.json();

  await connectDB();

  let convId = conversationId;

  if (!convId) {
    const firstUserMsg = messages.find(
      (m: { role: string }) => m.role === "user"
    );
    const title =
      firstUserMsg?.content?.substring(0, 100) || "New conversation";
    const conv = await Conversation.create({
      userId: user.id,
      agentSlug,
      title,
    });
    convId = conv._id.toString();
  }

  // Replace all messages for this conversation
  await Message.deleteMany({ conversationId: convId });

  if (messages.length > 0) {
    await Message.insertMany(
      messages.map((m: { role: string; content: string }) => ({
        conversationId: convId,
        role: m.role,
        content: m.content,
      }))
    );
  }

  // Touch conversation timestamp
  await Conversation.findByIdAndUpdate(convId, { updatedAt: new Date() });

  return Response.json({ conversationId: convId });
}
