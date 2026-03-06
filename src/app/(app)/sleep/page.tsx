"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Moon, Star, Sun, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MOCK_SLEEP_STAGES = DAYS.map((day, i) => ({
  day,
  awake: 15 + Math.round(Math.random() * 20),
  light: 160 + Math.round(Math.random() * 40),
  deep: 60 + Math.round(Math.random() * 30),
  rem: 70 + Math.round(Math.random() * 25),
}));

const MOCK_CIRCADIAN = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - 29 + i);
  const midpoint = 3.5 + Math.sin(i / 5) * 0.5 + (Math.random() - 0.5) * 0.3;
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    midpoint: parseFloat(midpoint.toFixed(2)),
  };
});

const MOCK_ANALYSIS = {
  gpa: "A-",
  gpaNumeric: 3.7,
  breakdown: [
    { metric: "Duration", grade: "A", score: 92 },
    { metric: "Efficiency", grade: "A-", score: 88 },
    { metric: "Latency", grade: "B+", score: 84 },
    { metric: "Deep Sleep", grade: "A", score: 91 },
    { metric: "REM", grade: "B", score: 78 },
    { metric: "Consistency", grade: "A-", score: 87 },
  ],
  consistency: 87,
  tips: [
    "Your deep sleep has increased 15% this week. Maintain your current pre-bed routine.",
    "Sleep midpoint drifted 23 minutes later on weekends. Try to keep within 30 minutes of weekday timing.",
    "Consider dimming screens 90 minutes before bed to boost melatonin onset.",
    "Your REM percentage is slightly below optimal. Avoid alcohol within 3 hours of bedtime.",
  ],
};

/* ------------------------------------------------------------------ */
/*  Sleep GPA Card                                                     */
/* ------------------------------------------------------------------ */

function SleepGPA({
  gpa,
  breakdown,
}: {
  gpa: string;
  breakdown: { metric: string; grade: string; score: number }[];
}) {
  const gradeColor = (score: number) =>
    score >= 90
      ? "text-emerald-400"
      : score >= 80
      ? "text-blue-400"
      : score >= 70
      ? "text-amber-400"
      : "text-red-400";

  const barColor = (score: number) =>
    score >= 90
      ? "bg-emerald-500"
      : score >= 80
      ? "bg-blue-500"
      : score >= 70
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="size-5 text-amber-400" />
          Sleep GPA
        </CardTitle>
        <CardDescription>Overall sleep quality grade</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex items-baseline gap-2">
          <span className="text-5xl font-bold text-emerald-400">{gpa}</span>
          <span className="text-sm text-muted-foreground">/ A+</span>
        </div>
        <div className="space-y-3">
          {breakdown.map((item) => (
            <div key={item.metric}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.metric}</span>
                <span className={cn("font-semibold", gradeColor(item.score))}>
                  {item.grade}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    barColor(item.score)
                  )}
                  style={{ width: `${item.score}%` }}
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
/*  Sleep Stages Chart                                                 */
/* ------------------------------------------------------------------ */

function SleepStagesChart({
  data,
}: {
  data: { day: string; awake: number; light: number; deep: number; rem: number }[];
}) {
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="size-5 text-blue-400" />
          Sleep Stages
        </CardTitle>
        <CardDescription>
          Weekly breakdown of sleep architecture (minutes)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gAwake" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.15 25)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.7 0.15 25)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="gLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.15 220)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.7 0.15 220)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="gDeep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.55 0.2 260)" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="oklch(0.55 0.2 260)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="gRem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.22 310)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.65 0.22 310)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
              <XAxis
                dataKey="day"
                tick={{ fill: "oklch(0.7 0 0)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "oklch(0.7 0 0)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.2 0 0)",
                  border: "1px solid oklch(1 0 0 / 0.1)",
                  borderRadius: "8px",
                  color: "oklch(0.9 0 0)",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="deep"
                stackId="1"
                stroke="oklch(0.55 0.2 260)"
                fill="url(#gDeep)"
              />
              <Area
                type="monotone"
                dataKey="rem"
                stackId="1"
                stroke="oklch(0.65 0.22 310)"
                fill="url(#gRem)"
              />
              <Area
                type="monotone"
                dataKey="light"
                stackId="1"
                stroke="oklch(0.7 0.15 220)"
                fill="url(#gLight)"
              />
              <Area
                type="monotone"
                dataKey="awake"
                stackId="1"
                stroke="oklch(0.7 0.15 25)"
                fill="url(#gAwake)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          {[
            { label: "Deep", color: "bg-indigo-500" },
            { label: "REM", color: "bg-purple-500" },
            { label: "Light", color: "bg-sky-500" },
            { label: "Awake", color: "bg-orange-500" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={cn("size-2.5 rounded-full", item.color)} />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Circadian Rhythm Chart                                             */
/* ------------------------------------------------------------------ */

function CircadianChart({
  data,
}: {
  data: { date: string; midpoint: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="size-5 text-amber-400" />
          Circadian Rhythm
        </CardTitle>
        <CardDescription>Sleep midpoint over 30 days (hours)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "oklch(0.7 0 0)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={6}
              />
              <YAxis
                domain={[2.5, 5]}
                tick={{ fill: "oklch(0.7 0 0)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number | string) => {
                  const n = typeof v === "string" ? parseFloat(v) : v;
                  return `${Math.floor(n)}:${String(Math.round((n % 1) * 60)).padStart(2, "0")}`;
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.2 0 0)",
                  border: "1px solid oklch(1 0 0 / 0.1)",
                  borderRadius: "8px",
                  color: "oklch(0.9 0 0)",
                  fontSize: "12px",
                }}
                formatter={(v: number | undefined) => {
                  const n = v ?? 0;
                  return [
                    `${Math.floor(n)}:${String(Math.round((n % 1) * 60)).padStart(2, "0")} AM`,
                    "Midpoint",
                  ];
                }}
              />
              <Line
                type="monotone"
                dataKey="midpoint"
                stroke="oklch(0.7 0.2 270)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "oklch(0.7 0.2 270)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Sleep Consistency                                                   */
/* ------------------------------------------------------------------ */

function SleepConsistency({ score }: { score: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="size-5 text-indigo-400" />
          Sleep Consistency
        </CardTitle>
        <CardDescription>How regular is your sleep schedule</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="relative size-32">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="oklch(1 0 0 / 0.06)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="oklch(0.6 0.2 260)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - score / 100)}
              style={{
                transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{score}%</span>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {score >= 85
            ? "Excellent consistency. Your body clock is well-calibrated."
            : score >= 70
            ? "Good consistency. Minor weekend drift detected."
            : "Irregular sleep pattern. Try setting a consistent alarm."}
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Sleep Tips                                                      */
/* ------------------------------------------------------------------ */

function SleepTips({ tips }: { tips: string[] }) {
  return (
    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="size-5 text-blue-400" />
          AI Sleep Tips
        </CardTitle>
        <CardDescription>
          Personalized recommendations from your data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-3 text-sm text-muted-foreground">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[10px] font-bold text-blue-400">
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
/*  Sleep Page                                                         */
/* ------------------------------------------------------------------ */

export default function SleepPage() {
  const [analysis, setAnalysis] = useState(MOCK_ANALYSIS);
  const [stages, setStages] = useState(MOCK_SLEEP_STAGES);
  const [circadian, setCircadian] = useState(MOCK_CIRCADIAN);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [analysisRes, readingsRes] = await Promise.allSettled([
          fetch("/api/sleep/analysis?days=7"),
          fetch("/api/readings?days=30"),
        ]);

        // Parse sleep analysis summary
        if (analysisRes.status === "fulfilled" && analysisRes.value.ok) {
          const d = await analysisRes.value.json();
          if (d?.summary) {
            const s = d.summary;
            setAnalysis((prev) => ({
              ...prev,
              gpa: s.avg_grade || prev.gpa,
              gpaNumeric: s.avg_gpa || prev.gpaNumeric,
              consistency: s.avg_efficiency ? Math.round(s.avg_efficiency) : prev.consistency,
            }));
          }
          // Parse nightly data into stages chart
          if (d?.nights?.length > 0) {
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            setStages(
              d.nights.slice(0, 7).reverse().map((n: { date: string; sleep_stages?: { awake: number; light: number; deep: number; rem: number } }) => ({
                day: dayNames[new Date(n.date).getDay()],
                awake: n.sleep_stages?.awake ?? 15,
                light: n.sleep_stages?.light ?? 160,
                deep: n.sleep_stages?.deep ?? 60,
                rem: n.sleep_stages?.rem ?? 70,
              }))
            );
          }
        }

        // Parse readings for circadian midpoint data
        if (readingsRes.status === "fulfilled" && readingsRes.value.ok) {
          const d = await readingsRes.value.json();
          const raw = d?.readings;
          if (Array.isArray(raw) && raw.length > 0) {
            const circadianData = raw
              .filter((r: Record<string, unknown>) => {
                const m = (r.metrics || r) as Record<string, unknown>;
                return m.sleep_midpoint != null;
              })
              .map((r: Record<string, unknown>) => {
                const m = (r.metrics || r) as Record<string, unknown>;
                const mp = new Date(m.sleep_midpoint as string);
                const hours = mp.getHours() + mp.getMinutes() / 60;
                return {
                  date: new Date(r.date as string).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  }),
                  midpoint: parseFloat(hours.toFixed(2)),
                };
              })
              .reverse();
            if (circadianData.length > 0) setCircadian(circadianData);
          }
        }
      } catch {
        // use mock data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-72 animate-pulse rounded-xl bg-muted",
                i === 1 && "lg:col-span-2"
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sleep Lab</h1>
        <p className="text-sm text-muted-foreground">
          Deep dive into your sleep architecture and circadian rhythm.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SleepGPA gpa={analysis.gpa} breakdown={analysis.breakdown} />
        <SleepStagesChart data={stages} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CircadianChart data={circadian} />
        <SleepConsistency score={analysis.consistency} />
      </div>

      <SleepTips tips={analysis.tips} />
    </div>
  );
}
