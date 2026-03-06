"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  Pill,
  Salad,
  MessageSquare,
  CheckCircle2,
  Clock,
  Beaker,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_DAILY_INSIGHT = {
  text: "Your autonomic nervous system shows strong parasympathetic dominance this morning, with HRV 15% above your 30-day baseline. This is an excellent window for high-intensity training. Your sleep efficiency was 93% last night with above-average deep sleep, which likely contributed to this recovery state.",
  actions: [
    "Consider a challenging workout today -- your body is primed for it",
    "Maintain your current 10:30 PM bedtime; it's driving excellent recovery",
    "Increase protein intake slightly to support muscle recovery",
    "Take a 20-minute afternoon walk to sustain today's elevated mood",
  ],
  generatedAt: new Date().toLocaleTimeString(),
};

const MOCK_WEEKLY_REPORT = {
  grades: [
    {
      category: "Sleep Quality",
      grade: "A-",
      score: 88,
      trend: "up",
      delta: "+3%",
    },
    {
      category: "Recovery",
      grade: "B+",
      score: 84,
      trend: "up",
      delta: "+7%",
    },
    {
      category: "Mood Stability",
      grade: "A",
      score: 91,
      trend: "stable",
      delta: "+1%",
    },
    {
      category: "Activity",
      grade: "B",
      score: 78,
      trend: "down",
      delta: "-5%",
    },
  ],
};

const MOCK_SUPPLEMENTS = [
  {
    name: "Magnesium Glycinate",
    dosage: "400 mg",
    timing: "Before bed",
    evidence: "strong",
    reason:
      "Your HRV data suggests suboptimal parasympathetic activation during early sleep. Magnesium glycinate may improve deep sleep onset.",
  },
  {
    name: "Vitamin D3",
    dosage: "4,000 IU",
    timing: "Morning with food",
    evidence: "strong",
    reason:
      "Circadian rhythm data shows slight phase delay. Vitamin D receptor activation in the morning supports circadian entrainment.",
  },
  {
    name: "Ashwagandha (KSM-66)",
    dosage: "600 mg",
    timing: "Evening",
    evidence: "moderate",
    reason:
      "Your stress proxy biomarkers are elevated on weekdays. Adaptogenic support may help modulate cortisol response.",
  },
  {
    name: "Omega-3 (EPA/DHA)",
    dosage: "2g EPA + 1g DHA",
    timing: "With meals",
    evidence: "strong",
    reason:
      "Resting heart rate variability improvements correlate with omega-3 intake in recent meta-analyses.",
  },
  {
    name: "L-Theanine",
    dosage: "200 mg",
    timing: "Afternoon",
    evidence: "emerging",
    reason:
      "Mood dip patterns in your afternoon data may benefit from L-theanine's anxiolytic effects.",
  },
];

const MOCK_DIET_TIPS = [
  "Increase tryptophan-rich foods (turkey, eggs, cheese) in the evening to support serotonin/melatonin synthesis.",
  "Your elevated afternoon HR suggests caffeine sensitivity -- consider switching to green tea after 12 PM.",
  "Add fermented foods (kimchi, kefir) daily. Gut-brain axis optimization may stabilize your mood scores.",
  "Front-load carbohydrate intake to the first half of the day for better glycemic control and sleep quality.",
  "Increase potassium intake (bananas, avocado, sweet potato) to support your heart rate recovery.",
];

/* ------------------------------------------------------------------ */
/*  AI Coach Card                                                      */
/* ------------------------------------------------------------------ */

function AICoachCard({
  insight,
}: {
  insight: { text: string; actions: string[]; generatedAt: string };
}) {
  return (
    <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-cyan-500/5 to-blue-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-emerald-400" />
          AI Health Coach
        </CardTitle>
        <CardDescription>
          Generated at {insight.generatedAt} from your latest data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {insight.text}
        </p>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-foreground">
            Action Items
          </h4>
          <ul className="space-y-2">
            {insight.actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <span className="text-muted-foreground">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Weekly Report Card                                                 */
/* ------------------------------------------------------------------ */

function WeeklyReportCard({
  grades,
}: {
  grades: {
    category: string;
    grade: string;
    score: number;
    trend: string;
    delta: string;
  }[];
}) {
  const gradeColor = (score: number) =>
    score >= 90
      ? "text-emerald-400"
      : score >= 80
      ? "text-blue-400"
      : score >= 70
      ? "text-amber-400"
      : "text-red-400";

  const trendIcon = (trend: string) => {
    if (trend === "up")
      return <TrendingUp className="size-3.5 text-emerald-400" />;
    if (trend === "down")
      return (
        <TrendingUp className="size-3.5 rotate-180 text-red-400" />
      );
    return <span className="text-xs text-muted-foreground">--</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-5 text-blue-400" />
          Weekly Report Card
        </CardTitle>
        <CardDescription>Performance grades for the past 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {grades.map((g) => (
            <div
              key={g.category}
              className="rounded-xl border border-border/50 bg-muted/30 p-4"
            >
              <p className="text-xs text-muted-foreground">{g.category}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className={cn("text-3xl font-bold", gradeColor(g.score))}
                >
                  {g.grade}
                </span>
                <div className="flex items-center gap-1">
                  {trendIcon(g.trend)}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      g.trend === "up"
                        ? "text-emerald-400"
                        : g.trend === "down"
                        ? "text-red-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {g.delta}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    g.score >= 90
                      ? "bg-emerald-500"
                      : g.score >= 80
                      ? "bg-blue-500"
                      : g.score >= 70
                      ? "bg-amber-500"
                      : "bg-red-500"
                  )}
                  style={{ width: `${g.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Supplement Recommendations                                         */
/* ------------------------------------------------------------------ */

function SupplementRecommendations({
  supplements,
}: {
  supplements: {
    name: string;
    dosage: string;
    timing: string;
    evidence: string;
    reason: string;
  }[];
}) {
  const evidenceColor = (e: string) =>
    e === "strong"
      ? "bg-emerald-500/15 text-emerald-400"
      : e === "moderate"
      ? "bg-blue-500/15 text-blue-400"
      : "bg-amber-500/15 text-amber-400";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="size-5 text-violet-400" />
          Supplement Recommendations
        </CardTitle>
        <CardDescription>
          Evidence-based suggestions from your biomarker data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {supplements.map((s) => (
          <div
            key={s.name}
            className="rounded-xl border border-border/50 bg-muted/20 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold">{s.name}</h4>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Beaker className="size-3" />
                    {s.dosage}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {s.timing}
                  </span>
                </div>
              </div>
              <Badge
                className={cn(
                  "shrink-0 text-[10px] capitalize",
                  evidenceColor(s.evidence)
                )}
              >
                {s.evidence}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {s.reason}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Diet Suggestions                                                   */
/* ------------------------------------------------------------------ */

function DietSuggestions({ tips }: { tips: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Salad className="size-5 text-emerald-400" />
          Diet Suggestions
        </CardTitle>
        <CardDescription>Nutrition optimizations for your profile</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-3 text-sm text-muted-foreground">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Ask Vitalis (coming soon)                                          */
/* ------------------------------------------------------------------ */

function AskVitalis() {
  return (
    <Card className="border-dashed border-border/60 bg-muted/10">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
          <MessageSquare className="size-8 text-violet-400" />
        </div>
        <h3 className="text-lg font-semibold">Ask Vitalis</h3>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Chat with your AI health assistant about your data, trends, and
          personalized recommendations.
        </p>
        <Badge
          variant="secondary"
          className="mt-4 bg-violet-500/15 text-violet-400"
        >
          Coming Soon
        </Badge>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Insights Page                                                      */
/* ------------------------------------------------------------------ */

export default function InsightsPage() {
  const [insight, setInsight] = useState(MOCK_DAILY_INSIGHT);
  const [report, setReport] = useState(MOCK_WEEKLY_REPORT);
  const [loading, setLoading] = useState(true);

  const [supplements, setSupplements] = useState(MOCK_SUPPLEMENTS);
  const [dietTips, setDietTips] = useState(MOCK_DIET_TIPS);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/insights");
        if (res.ok) {
          const d = await res.json();
          const rec = d?.insight;
          if (rec?.ai_insight) {
            setInsight({
              text: rec.ai_insight,
              actions: rec.action_items || MOCK_DAILY_INSIGHT.actions,
              generatedAt: rec.created_at
                ? new Date(rec.created_at).toLocaleTimeString()
                : new Date().toLocaleTimeString(),
            });
          }
          if (rec?.supplements?.length) {
            setSupplements(
              rec.supplements.map((s: { name: string; dosage: string; timing: string; evidence_level?: string; reason?: string }) => ({
                name: s.name,
                dosage: s.dosage,
                timing: s.timing,
                evidence: s.evidence_level || "moderate",
                reason: s.reason || "",
              }))
            );
          }
          if (rec?.dietTips?.length) {
            setDietTips(rec.dietTips);
          }
        }
      } catch {
        // use mock
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Insights</h1>
        <p className="text-sm text-muted-foreground">
          Personalized recommendations powered by your biometric data.
        </p>
      </div>

      <AICoachCard insight={insight} />

      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklyReportCard grades={report.grades} />
        <AskVitalis />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SupplementRecommendations supplements={supplements} />
        <DietSuggestions tips={dietTips} />
      </div>
    </div>
  );
}
