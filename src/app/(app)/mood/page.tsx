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
import { Brain, AlertTriangle, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_MOOD_HISTORY = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - 29 + i);
  const base = Math.sin(i / 7) * 0.8;
  const noise = (Math.random() - 0.5) * 0.6;
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: parseFloat((base + noise).toFixed(2)),
  };
});

const MOCK_COMPASS_HISTORY = Array.from({ length: 7 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - 6 + i);
  const score = parseFloat(((Math.random() - 0.5) * 2).toFixed(2));
  const labels = ["Depressed", "Low", "Balanced", "Elevated", "Manic"];
  const idx = Math.min(4, Math.max(0, Math.round((score + 2) * 1.25)));
  return {
    day: date.toLocaleDateString("en-US", { weekday: "short" }),
    score,
    label: labels[idx],
  };
});

const MOCK_BIOMARKERS = [
  { name: "HRV Trend", value: 0.35, impact: "positive" },
  { name: "Sleep Quality", value: 0.25, impact: "positive" },
  { name: "Activity Level", value: 0.15, impact: "positive" },
  { name: "Resting HR", value: -0.1, impact: "negative" },
  { name: "Sleep Consistency", value: 0.2, impact: "positive" },
  { name: "Stress Proxy", value: -0.15, impact: "negative" },
];

const MOCK_PATTERNS = [
  {
    text: "Mood drops detected 2 days after poor sleep nights",
    severity: "warning",
  },
  {
    text: "Positive mood correlated with 8,000+ daily steps",
    severity: "info",
  },
  {
    text: "Weekend mood scores consistently higher by 0.3 points",
    severity: "info",
  },
  {
    text: "Low HRV mornings predict afternoon mood dips (r=0.72)",
    severity: "warning",
  },
];

const MOCK_DISTRIBUTION = [
  { name: "Depressed", value: 5, color: "oklch(0.55 0.2 250)" },
  { name: "Low", value: 15, color: "oklch(0.65 0.15 230)" },
  { name: "Balanced", value: 50, color: "oklch(0.7 0.18 155)" },
  { name: "Elevated", value: 22, color: "oklch(0.75 0.15 80)" },
  { name: "Manic", value: 8, color: "oklch(0.65 0.2 25)" },
];

/* ------------------------------------------------------------------ */
/*  Mood Timeline                                                      */
/* ------------------------------------------------------------------ */

function MoodTimeline({
  data,
}: {
  data: { date: string; score: number }[];
}) {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-5 text-violet-400" />
          Mood Timeline
        </CardTitle>
        <CardDescription>30-day mood score with colored zones</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.2 310)" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="oklch(0.7 0.18 155)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.55 0.2 250)" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "oklch(0.7 0 0)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                domain={[-2, 2]}
                tick={{ fill: "oklch(0.7 0 0)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                ticks={[-2, -1, 0, 1, 2]}
              />
              {/* Zone reference areas via horizontal lines */}
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.2 0 0)",
                  border: "1px solid oklch(1 0 0 / 0.1)",
                  borderRadius: "8px",
                  color: "oklch(0.9 0 0)",
                  fontSize: "12px",
                }}
                formatter={(v: number | undefined) => {
                  const val = v ?? 0;
                  const label =
                    val > 1.5
                      ? "Manic"
                      : val > 0.5
                      ? "Elevated"
                      : val > -0.5
                      ? "Balanced"
                      : val > -1.5
                      ? "Low"
                      : "Depressed";
                  return [`${val.toFixed(2)} (${label})`, "Mood"];
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="oklch(0.7 0.2 270)"
                strokeWidth={2}
                fill="url(#moodGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Zone legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
          {[
            { label: "Depressed (<-1.5)", color: "bg-blue-600" },
            { label: "Low (-1.5 to -0.5)", color: "bg-sky-500" },
            { label: "Balanced (-0.5 to 0.5)", color: "bg-emerald-500" },
            { label: "Elevated (0.5 to 1.5)", color: "bg-amber-500" },
            { label: "Manic (>1.5)", color: "bg-red-500" },
          ].map((z) => (
            <div key={z.label} className="flex items-center gap-1.5">
              <div className={cn("size-2.5 rounded-full", z.color)} />
              <span className="text-muted-foreground">{z.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini Compass                                                       */
/* ------------------------------------------------------------------ */

function MiniCompass({ score, label, day }: { score: number; label: string; day: string }) {
  const angle = (score / 2) * 90;
  const needleRad = ((angle - 90) * Math.PI) / 180;
  const nl = 18;
  const cx = 25, cy = 25;
  const nx = cx + nl * Math.cos(needleRad);
  const ny = cy + nl * Math.sin(needleRad);

  const zoneColor =
    score > 1.5
      ? "text-red-400"
      : score > 0.5
      ? "text-amber-400"
      : score > -0.5
      ? "text-emerald-400"
      : score > -1.5
      ? "text-sky-400"
      : "text-blue-400";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 50 50" className="size-12">
        <circle cx="25" cy="25" r="22" fill="oklch(1 0 0 / 0.04)" stroke="oklch(1 0 0 / 0.08)" strokeWidth="0.5" />
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="oklch(0.7 0.18 155)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="2.5" fill="oklch(0.7 0.18 155)" />
      </svg>
      <span className="text-[10px] text-muted-foreground">{day}</span>
      <span className={cn("text-[10px] font-semibold", zoneColor)}>{label}</span>
    </div>
  );
}

function CompassHistory({
  data,
}: {
  data: { day: string; score: number; label: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-5 text-indigo-400" />
          Compass History
        </CardTitle>
        <CardDescription>Last 7 days at a glance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          {data.map((d) => (
            <MiniCompass key={d.day} score={d.score} label={d.label} day={d.day} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Biomarker Breakdown                                                */
/* ------------------------------------------------------------------ */

function BiomarkerBreakdown({
  data,
}: {
  data: { name: string; value: number; impact: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-5 text-cyan-400" />
          Biomarker Breakdown
        </CardTitle>
        <CardDescription>Factor contribution to mood score</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item) => (
          <div key={item.name}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.name}</span>
              <span
                className={cn(
                  "font-mono text-xs font-semibold",
                  item.impact === "positive"
                    ? "text-emerald-400"
                    : "text-red-400"
                )}
              >
                {item.value > 0 ? "+" : ""}
                {item.value.toFixed(2)}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted">
              <div
                className={cn(
                  "absolute top-0 h-full rounded-full transition-all duration-700",
                  item.impact === "positive"
                    ? "left-1/2 bg-emerald-500"
                    : "right-1/2 bg-red-500"
                )}
                style={{
                  width: `${Math.abs(item.value) * 50}%`,
                  ...(item.impact === "negative"
                    ? { right: "50%", left: "auto" }
                    : { left: "50%" }),
                }}
              />
              {/* Center line */}
              <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Pattern Alerts                                                     */
/* ------------------------------------------------------------------ */

function PatternAlerts({
  patterns,
}: {
  patterns: { text: string; severity: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-400" />
          Pattern Alerts
        </CardTitle>
        <CardDescription>Detected behavioral patterns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {patterns.map((p, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-3"
          >
            <Badge
              variant={p.severity === "warning" ? "destructive" : "secondary"}
              className={cn(
                "mt-0.5 shrink-0 text-[10px]",
                p.severity === "warning"
                  ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/15"
                  : "bg-blue-500/15 text-blue-400 hover:bg-blue-500/15"
              )}
            >
              {p.severity === "warning" ? "Warning" : "Info"}
            </Badge>
            <p className="text-sm text-muted-foreground">{p.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Weekly Distribution                                                */
/* ------------------------------------------------------------------ */

function WeeklyDistribution({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="size-5 text-purple-400" />
          Weekly Distribution
        </CardTitle>
        <CardDescription>Time spent in each mood zone</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="size-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.2 0 0)",
                  border: "1px solid oklch(1 0 0 / 0.1)",
                  borderRadius: "8px",
                  color: "oklch(0.9 0 0)",
                  fontSize: "12px",
                }}
                formatter={(v: number | undefined) => [`${v ?? 0}%`, "Time"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div
                className="size-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">
                {item.name} {item.value}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Mood Page                                                          */
/* ------------------------------------------------------------------ */

export default function MoodPage() {
  const [history, setHistory] = useState(MOCK_MOOD_HISTORY);
  const [compass, setCompass] = useState(MOCK_COMPASS_HISTORY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [historyRes, scoresRes] = await Promise.allSettled([
          fetch("/api/mood/history?days=30"),
          fetch("/api/scores?days=7"),
        ]);
        if (historyRes.status === "fulfilled" && historyRes.value.ok) {
          const d = await historyRes.value.json();
          if (d && Array.isArray(d) && d.length > 0) setHistory(d);
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
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mood Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Track emotional patterns and discover what drives your mood.
        </p>
      </div>

      <MoodTimeline data={history} />

      <div className="grid gap-6 md:grid-cols-2">
        <CompassHistory data={compass} />
        <WeeklyDistribution data={MOCK_DISTRIBUTION} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <BiomarkerBreakdown data={MOCK_BIOMARKERS} />
        <PatternAlerts patterns={MOCK_PATTERNS} />
      </div>
    </div>
  );
}
