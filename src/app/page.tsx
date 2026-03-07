import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Wallet,
  HeartPulse,
  CheckSquare,
  Newspaper,
  Zap,
  Shield,
  Clock,
} from "lucide-react";

export default async function HomePage() {
  const user = await getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" />
          Powered by Claude AI
        </div>

        <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Your AI{" "}
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Chief of Staff
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Not another chatbot. Ria is a team of specialist AI agents — finance,
          health, marketing, tasks — in one chat. She connects to your real
          tools and takes real action.
        </p>

        <div className="mt-8 flex gap-4">
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/sign-in">Start Free</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="text-lg px-8">
            <Link href="#pricing">See Pricing</Link>
          </Button>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          One AI. Every Domain.
        </h2>
        <p className="mb-10 text-center text-2xl font-bold">
          Ria handles everything — with a knowledge base that makes her smarter over time.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Bot,
              name: "Strategy & Business",
              desc: "Revenue planning, client acquisition, decision-making",
              color: "#F59E0B",
            },
            {
              icon: Wallet,
              name: "Finance",
              desc: "Budgeting, BTL, taxes, Israeli financial context",
              color: "#10B981",
            },
            {
              icon: HeartPulse,
              name: "Health & Wellness",
              desc: "Fitness, nutrition, ADHD management, mental health",
              color: "#EF4444",
            },
            {
              icon: Newspaper,
              name: "Marketing & Growth",
              desc: "Outreach, content, lead gen, personal branding",
              color: "#8B5CF6",
            },
            {
              icon: CheckSquare,
              name: "Task Management",
              desc: "Prioritization, daily planning, accountability",
              color: "#3B82F6",
            },
            {
              icon: Shield,
              name: "Knowledge Base",
              desc: "Learns about you. Gets smarter with every fact you add.",
              color: "#EC4899",
            },
          ].map((cap) => (
            <div
              key={cap.name}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${cap.color}20`,
                  color: cap.color,
                }}
              >
                <cap.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{cap.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {cap.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Ria */}
      <section className="border-y border-border bg-card/50 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold">
            Why Ria, not ChatGPT?
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "Specialist, Not Generic",
                desc: "Five domain experts that understand context, not one generic chatbot trying to do everything.",
              },
              {
                icon: Shield,
                title: "Action, Not Just Answers",
                desc: "Ria doesn't just tell you what to do — she helps you actually do it with connected tools.",
              },
              {
                icon: Clock,
                title: "Always Available",
                desc: "Browser-based. Works on phone, tablet, desktop. Your AI chief of staff, anywhere you go.",
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <item.icon className="mx-auto mb-3 h-8 w-8 text-primary" />
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pricing
        </h2>
        <p className="mb-10 text-center text-2xl font-bold">
          Start free. Upgrade when you can&apos;t live without her.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold">Free</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground"> / forever</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>20 messages per day</li>
              <li>3 AI agents</li>
              <li>7-day chat history</li>
            </ul>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link href="/sign-in">Get Started</Link>
            </Button>
          </div>

          {/* Pro */}
          <div className="rounded-xl border-2 border-blue-500 p-6 shadow-lg shadow-blue-500/10">
            <div className="mb-2 inline-block rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-medium text-white">
              Most Popular
            </div>
            <h3 className="text-lg font-semibold">Pro</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold">$19.99</span>
              <span className="text-muted-foreground"> / month</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>Unlimited messages</li>
              <li>All 5 AI agents</li>
              <li>Unlimited chat history</li>
              <li>Priority responses</li>
            </ul>
            <Button asChild className="mt-6 w-full">
              <Link href="/sign-in">Start Free, Upgrade Later</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto max-w-5xl text-center text-sm text-muted-foreground">
          <p>
            Ria AI — Your AI Chief of Staff.
            Built by{" "}
            <a
              href="https://workitu.com"
              className="underline hover:text-foreground"
            >
              Workitu Tech
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
