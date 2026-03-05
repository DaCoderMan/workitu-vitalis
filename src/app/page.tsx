import Link from "next/link";
import {
  Activity,
  Brain,
  Zap,
  ArrowRight,
  Shield,
  BookOpen,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Activity,
    title: "Connect",
    description:
      "Sync your Apple Watch or WHOOP band in seconds. We pull HRV, sleep stages, heart rate, and more.",
    gradient: "from-emerald-500 to-emerald-600",
  },
  {
    icon: Brain,
    title: "Analyze",
    description:
      "Our AI engine cross-references your biometrics with peer-reviewed research to find hidden patterns.",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Zap,
    title: "Optimize",
    description:
      "Receive personalized, actionable insights: sleep timing, recovery protocols, mood predictions.",
    gradient: "from-violet-500 to-purple-500",
  },
];

const research = [
  {
    journal: "Nature",
    title: "Digital biomarkers for mood prediction",
    year: "2024",
    icon: FlaskConical,
  },
  {
    journal: "The Lancet",
    title: "Wearable-derived HRV & cardiovascular risk",
    year: "2023",
    icon: BookOpen,
  },
  {
    journal: "npj Digital Medicine",
    title: "Sleep architecture & cognitive performance",
    year: "2024",
    icon: Shield,
  },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-transparent blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-bl from-violet-500/15 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[500px] rounded-full bg-gradient-to-tr from-emerald-500/10 to-transparent blur-3xl" />
      </div>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 sm:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Now in Public Beta
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Your wearables collect data.{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Vitalis tells you what it means.
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
            AI-powered health insights from Apple Watch &amp; WHOOP. Understand
            your sleep, mood, recovery, and performance like never before.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
            >
              <Link href="/dashboard">
                Get Started
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-full px-8 text-base"
            >
              <Link href="#how-it-works">Learn More</Link>
            </Button>
          </div>

          {/* Hero visual: animated pulse rings */}
          <div className="relative mx-auto mt-16 flex h-48 w-48 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full border border-emerald-500/20 [animation-duration:3s]" />
            <div className="absolute inset-4 animate-ping rounded-full border border-cyan-500/25 [animation-duration:2.5s] [animation-delay:0.5s]" />
            <div className="absolute inset-8 animate-ping rounded-full border border-blue-500/30 [animation-duration:2s] [animation-delay:1s]" />
            <div className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-2xl shadow-emerald-500/30">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-10 text-white"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative border-t border-border/40 bg-muted/20 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three steps from raw data to actionable health intelligence.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((step, idx) => (
              <div
                key={step.title}
                className="group relative rounded-2xl border border-border/50 bg-card p-8 transition-all hover:border-border hover:shadow-lg"
              >
                <div className="absolute -top-4 left-8 flex size-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  {idx + 1}
                </div>
                <div
                  className={`mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.gradient} shadow-lg`}
                >
                  <step.icon className="size-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Science section */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built on{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                peer-reviewed research
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Every insight is grounded in published studies from leading
              medical journals.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {research.map((item) => (
              <div
                key={item.journal}
                className="flex flex-col items-start rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-md"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
                  <item.icon className="size-5 text-muted-foreground" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  {item.journal} &middot; {item.year}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-border/40 py-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute bottom-0 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-t from-emerald-500/15 to-transparent blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to understand your body?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start getting AI-powered health insights today. Free during beta.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 h-12 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
          >
            <Link href="/dashboard">
              Get Started Free
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
