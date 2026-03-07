import { NextRequest, NextResponse } from "next/server";

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

// GET — WhatsApp webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST — Incoming WhatsApp messages
export async function POST(req: NextRequest) {
  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
    return NextResponse.json({ status: "not_configured" });
  }

  try {
    const body = await req.json();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) {
      // Status update or other non-message event
      return NextResponse.json({ status: "ok" });
    }

    const message = value.messages[0];
    const from = message.from; // sender phone number
    const messageType = message.type;
    const timestamp = message.timestamp;

    let text = "";
    if (messageType === "text") {
      text = message.text?.body || "";
    } else if (messageType === "audio") {
      text = "[Voice message received — transcription not yet supported]";
    } else {
      text = `[${messageType} message received]`;
    }

    // For now, auto-reply with acknowledgment
    // TODO: Wire to Ria chat API for intelligent responses
    await sendWhatsAppMessage(
      from,
      `Received your message. Ria is processing: "${text.substring(0, 100)}"`
    );

    // Log the message (could be stored in MongoDB later)
    console.log(`[WhatsApp] From: ${from}, Type: ${messageType}, Text: ${text}, Time: ${timestamp}`);

    return NextResponse.json({ status: "received" });
  } catch (e) {
    console.error("[WhatsApp] Webhook error:", e);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

async function sendWhatsAppMessage(to: string, text: string) {
  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) return;

  await fetch(
    `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  );
}
