"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PayPalSubscribeButton } from "@/components/paypal/paypal-button";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "20 messages per day",
      "Ria AI assistant",
      "7-day chat history",
      "Powered by Claude",
    ],
    cta: "Current Plan",
    current: true,
  },
  {
    name: "Pro",
    price: "$19.99",
    period: "per month",
    features: [
      "Unlimited messages",
      "All 5 AI agents",
      "Unlimited chat history",
      "Priority responses",
      "Custom agent prompts (coming soon)",
      "Tool integrations (coming soon)",
    ],
    cta: "Upgrade to Pro",
    current: false,
    highlighted: true,
  },
];

export default function PricingPage() {
  const proPlanId = process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID;

  return (
    <div className="p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <p className="mt-2 text-muted-foreground">
          Start free. Upgrade when you need more.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={
              plan.highlighted
                ? "relative border-2 border-blue-500 shadow-lg shadow-blue-500/10"
                : ""
            }
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white">
                Most Popular
              </div>
            )}
            <CardHeader className="space-y-4">
              <div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    / {plan.period}
                  </span>
                </div>
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.current ? (
                <Button variant="outline" disabled className="w-full">
                  Current Plan
                </Button>
              ) : proPlanId ? (
                <PayPalSubscribeButton planId={proPlanId} />
              ) : (
                <Button variant="default" className="w-full" disabled>
                  Coming Soon
                </Button>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
