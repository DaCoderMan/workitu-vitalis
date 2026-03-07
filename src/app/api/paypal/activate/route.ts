import { getUser } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import { Subscription } from "@/lib/db/models/subscription";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscriptionId } = await req.json();
  if (!subscriptionId) {
    return Response.json({ error: "Missing subscriptionId" }, { status: 400 });
  }

  // Verify subscription with PayPal API
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !secret) {
    return Response.json(
      { error: "PayPal not configured" },
      { status: 500 }
    );
  }

  try {
    // Get access token
    const tokenRes = await fetch(
      "https://api-m.paypal.com/v1/oauth2/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      }
    );
    const { access_token } = await tokenRes.json();

    // Verify subscription
    const subRes = await fetch(
      `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    const subData = await subRes.json();

    if (subData.status !== "ACTIVE") {
      return Response.json(
        { error: "Subscription is not active" },
        { status: 400 }
      );
    }

    // Save to database
    await connectDB();
    await Subscription.findOneAndUpdate(
      { userId: user.id },
      {
        plan: "pro",
        status: "active",
        paypalSubscriptionId: subscriptionId,
        currentPeriodEnd: subData.billing_info?.next_billing_time
          ? new Date(subData.billing_info.next_billing_time)
          : undefined,
      },
      { upsert: true }
    );

    return Response.json({ success: true, plan: "pro" });
  } catch (error) {
    console.error("PayPal activation error:", error);
    return Response.json(
      { error: "Failed to verify subscription" },
      { status: 500 }
    );
  }
}
