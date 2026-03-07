import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

// POST /api/whatsapp/send — Send a WhatsApp message
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
    return NextResponse.json(
      { error: "WhatsApp not configured. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_ID." },
      { status: 500 }
    );
  }

  try {
    const { to, message, template } = await req.json();

    if (!to || (!message && !template)) {
      return NextResponse.json(
        { error: "Missing 'to' phone number and 'message' text" },
        { status: 400 }
      );
    }

    const body: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to,
    };

    if (template) {
      body.type = "template";
      body.template = {
        name: template,
        language: { code: "en" },
      };
    } else {
      body.type = "text";
      body.text = { body: message };
    }

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || "WhatsApp API error", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({
      status: "sent",
      messageId: data.messages?.[0]?.id,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send error" },
      { status: 500 }
    );
  }
}
