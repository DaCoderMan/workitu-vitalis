import { getUser } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import { Knowledge } from "@/lib/db/models/knowledge";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { category, title, content, tags } = await req.json();

  await connectDB();
  const entry = await Knowledge.findByIdAndUpdate(
    id,
    { category, title, content, tags },
    { new: true }
  );

  if (!entry) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(entry);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await connectDB();
  await Knowledge.findByIdAndDelete(id);

  return Response.json({ ok: true });
}
