import { connectDB } from "@/lib/db/connect";
import { Subscription } from "@/lib/db/models/subscription";

export async function POST(req: Request) {
  const body = await req.json();
  const eventType = body.event_type;

  // Verify webhook (in production, verify the webhook signature)
  // For now, we process known event types

  await connectDB();

  const subscriptionId =
    body.resource?.id || body.resource?.billing_agreement_id;

  if (!subscriptionId) {
    return Response.json({ received: true });
  }

  switch (eventType) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.RENEWED":
      await Subscription.findOneAndUpdate(
        { paypalSubscriptionId: subscriptionId },
        {
          status: "active",
          plan: "pro",
          currentPeriodEnd: body.resource?.billing_info?.next_billing_time
            ? new Date(body.resource.billing_info.next_billing_time)
            : undefined,
        }
      );
      break;

    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED":
      await Subscription.findOneAndUpdate(
        { paypalSubscriptionId: subscriptionId },
        { status: "cancelled", plan: "free" }
      );
      break;

    case "BILLING.SUBSCRIPTION.SUSPENDED":
      await Subscription.findOneAndUpdate(
        { paypalSubscriptionId: subscriptionId },
        { status: "expired" }
      );
      break;
  }

  return Response.json({ received: true });
}
