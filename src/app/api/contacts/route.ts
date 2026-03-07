import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Contact } from "@/lib/db/models/contact";
import { logActivity } from "@/lib/activity";

// GET /api/contacts — list contacts
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const search = searchParams.get("q");

  const filter: Record<string, unknown> = { userId: "admin" };
  if (type) filter.type = type;
  if (status) filter.status = status;

  let contacts;
  if (search) {
    contacts = await Contact.find({
      ...filter,
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ],
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
  } else {
    contacts = await Contact.find(filter)
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
  }

  return NextResponse.json({ contacts, count: contacts.length });
}

// POST /api/contacts — create contact
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const body = await req.json();
    const contact = await Contact.create({
      userId: "admin",
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      role: body.role,
      type: body.type || "other",
      status: body.status || "active",
      notes: body.notes || "",
      tags: body.tags || [],
      source: body.source,
      socialLinks: body.socialLinks || {},
    });

    logActivity({
      userId: "admin",
      type: "contact_added",
      title: `New contact: ${body.name}`,
      description: body.company || body.type,
    }).catch(() => {});

    return NextResponse.json({ contact }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create contact" },
      { status: 400 }
    );
  }
}
