"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Heart,
  Footprints,
  Moon,
  Activity,
  Brain,
  Flame,
  Zap,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_SCORES = {
  mood: 0.25,
  moodLabel: "Balanced",
  bodyBattery: 72,
  bodyBatteryTrend: "charging",
  hrvRecovery: 78,
  sleepScore: 85,
  readiness: 81,
};

const MOCK_READINGS = {
  hrv: 48,
  rhr: 58,
  sleepScore: 85,
  steps: 8432,
};

const MOCK_INSIGHT = {
  text: "Your HRV has increased 12% over the past week, suggesting improved autonomic recovery. Consider maintaining your current sleep schedule and moderate exercise intensity. Your circadian rhythm alignment has been excellent -- keep your wake time consistent to preserve this gain.",
  confidence: 0.87,
};

const MOCK_STREAKS = {
  sleep: 7,
  mood: 5,
  recovery: 3,
};

/* ------------------------------------------------------------------ */
/*  Mood Compass                                                       */
/* ------------------------------------------------------------------ */

function MoodCompass({ moodScore, label }: { moodScore: number; label: string }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  // moodScore is -2 to 2; map to angle: -90 (south/depression) to 90 (north/mania)
  const angle = (moodScore / 2) * 90;
  const needleRad = ((angle - 90) * Math.PI) / 180;
  const needleLength = 60;
  const cx = 100,
    cy = 100;
  const nx = cx + needleLength * Math.cos(needleRad);
  const ny = cy + needleLength * Math.sin(needleRad);

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-5 text-violet-400" />
          Mood Compass
        </CardTitle>
        <CardDescription>Current emotional state</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <svg viewBox="0 0 200 200" className="size-48">
          {/* Colored zones */}
          {/* Depression (south / blue) */}
          <path
            d="M100,100 L40,160 A84.85,84.85 0 0,1 160,160 Z"
            fill="oklch(0.6 0.15 250 / 0.3)"
          />
          {/* Mania (north / red) */}
          <path
            d="M100,100 L40,40 A84.85,84.85 0 0,0 160,40 Z"
            fill="oklch(0.6 0.2 25 / 0.25)"
          />
          {/* Calm (west / teal) */}
          <path
            d="M100,100 L40,40 A84.85,84.85 0 0,0 40,160 Z"
            fill="oklch(0.7 0.12 180 / 0.2)"
          />
          {/* Anxious (east / amber) */}
          <path
            d="M100,100 L160,40 A84.85,84.85 0 0,1 160,160 Z"
            fill="oklch(0.7 0.15 80 / 0.2)"
          />
          {/* Center balanced (green) */}
          <circle cx="100" cy="100" r="30" fill="oklch(0.7 0.17 155 / 0.25)" />

          {/* Labels */}
          <text x="100" y="25" textAnchor="middle" className="fill-red-400 text-[9px] font-medium">
            Mania
          </text>
          <text x="100" y="188" textAnchor="middle" className="fill-blue-400 text-[9px] font-medium">
            Low
          </text>
          <text x="14" y="104" textAnchor="middle" className="fill-teal-400 text-[9px] font-medium">
            Calm
          </text>
          <text x="186" y="104" textAnchor="middle" className="fill-amber-400 text-[9px] font-medium">
            Anxious
          </text>

          {/* Outer ring */}
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="oklch(1 0 0 / 0.08)"
            strokeWidth="1"
          />

          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={animated ? nx : cx}
            y2={animated ? ny : cy}
            stroke="oklch(0.8 0.18 155)"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ transition: "all 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          />
          <circle cx={cx} cy={cy} r="6" fill="oklch(0.8 0.18 155)" />
          <circle cx={cx} cy={cy} r="3" fill="oklch(0.2 0 0)" />
        </svg>
        <div className="mt-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{label}</p>
          <p className="text-sm text-muted-foreground">
            Score: {moodScore > 0 ? "+" : ""}
            {moodScore.toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Body Battery                                                       */
/* ------------------------------------------------------------------ */

function BodyBattery({ level, trend }: { level: number; trend: string }) {
  const color =
    level > 70
      ? "from-emerald-500 to-emerald-400"
      : level > 40
      ? "from-amber-500 to-yellow-400"
      : "from-red-500 to-red-400";

  const textColor =
    level > 70 ? "text-emerald-400" : level > 40 ? "text-amber-400" : "text-red-400";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-5 text-amber-400" />
          Body Battery
        </CardTitle>
        <CardDescription>Energy reserve estimate</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {/* Battery shape */}
        <div className="relative h-40 w-20">
          {/* Battery cap */}
          <div className="mx-auto h-3 w-8 rounded-t-md border border-b-0 border-border/60 bg-muted" />
          {/* Battery body */}
          <div className="relative h-36 w-20 overflow-hidden rounded-lg border-2 border-border/60">
            <div
              className={cn(
                "absolute inset-x-0.5 bottom-0.5 rounded-b-md bg-gradient-to-t transition-all duration-1000 ease-out",
                color
              )}
              style={{ height: `${level}%` }}
            />
            {/* Level lines */}
            {[25, 50, 75].map((l) => (
              <div
                key={l}
                className="absolute inset-x-0 border-t border-dashed border-border/30"
                style={{ bottom: `${l}%` }}
              />
            ))}
          </div>
        </div>
        <div className="text-center">
          <p className={cn("text-3xl font-bold", textColor)}>{level}%</p>
          {trend === "charging" && (
            <p className="flex items-center gap-1 text-sm text-emerald-400">
              <TrendingUp className="size-3.5" />
              Charging
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Recovery Ring                                                      */
/* ------------------------------------------------------------------ */

function RecoveryRing({
  hrv,
  sleep,
  readiness,
}: {
  hrv: number;
  sleep: number;
  readiness: number;
}) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  const rings = [
    { value: readiness, radius: 70, color: "oklch(0.7 0.2 155)", label: "Readiness", width: 10 },
    { value: sleep, radius: 55, color: "oklch(0.6 0.2 260)", label: "Sleep", width: 10 },
    { value: hrv, radius: 40, color: "oklch(0.7 0.2 310)", label: "HRV", width: 10 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-5 text-emerald-400" />
          Recovery Ring
        </CardTitle>
        <CardDescription>Three pillars of recovery</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <svg viewBox="0 0 180 180" className="size-44">
          {rings.map((ring) => {
            const circumference = 2 * Math.PI * ring.radius;
            const offset = circumference - (ring.value / 100) * circumference;
            return (
              <g key={ring.label}>
                {/* Background track */}
                <circle
                  cx="90"
                  cy="90"
                  r={ring.radius}
                  fill="none"
                  stroke="oklch(1 0 0 / 0.06)"
                  strokeWidth={ring.width}
                />
                {/* Value arc */}
                <circle
                  cx="90"
                  cy="90"
                  r={ring.radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={ring.width}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={animated ? offset : circumference}
                  transform="rotate(-90 90 90)"
                  style={{
                    transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </g>
            );
          })}
          {/* Center text */}
          <text
            x="90"
            y="85"
            textAnchor="middle"
            className="fill-foreground text-2xl font-bold"
          >
            {readiness}%
          </text>
          <text
            x="90"
            y="102"
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            Readiness
          </text>
        </svg>
        <div className="mt-2 flex gap-4 text-xs">
          {rings.map((ring) => (
            <div key={ring.label} className="flex items-center gap-1.5">
              <div
                className="size-2.5 rounded-full"
                style={{ backgroundColor: ring.color }}
              />
              <span className="text-muted-foreground">
                {ring.label} {ring.value}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Stats                                                        */
/* ------------------------------------------------------------------ */

function QuickStats({
  hrv,
  rhr,
  sleepScore,
  steps,
}: {
  hrv: number;
  rhr: number;
  sleepScore: number;
  steps: number;
}) {
  const stats = [
    {
      label: "HRV",
      value: `${hrv} ms`,
      icon: Heart,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      label: "Resting HR",
      value: `${rhr} bpm`,
      icon: Activity,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      label: "Sleep Score",
      value: `${sleepScore}`,
      icon: Moon,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Steps",
      value: steps.toLocaleString(),
      icon: Footprints,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                s.bg
              )}
            >
              <s.icon className={cn("size-5", s.color)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Insight                                                         */
/* ------------------------------------------------------------------ */

function AIInsight({ text, confidence }: { text: string; confidence: number }) {
  return (
    <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-emerald-400" />
          Today&apos;s AI Insight
        </CardTitle>
        <CardDescription>
          Confidence: {(confidence * 100).toFixed(0)}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Streak Trackers                                                    */
/* ------------------------------------------------------------------ */

function StreakTrackers({
  sleep,
  mood,
  recovery,
}: {
  sleep: number;
  mood: number;
  recovery: number;
}) {
  const streaks = [
    {
      label: "Sleep Streak",
      value: sleep,
      icon: Moon,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Mood Streak",
      value: mood,
      icon: Brain,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      label: "Recovery Streak",
      value: recovery,
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {streaks.map((s) => (
        <Card key={s.label} className="py-4">
          <CardContent className="flex flex-col items-center gap-2 px-3 text-center">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-xl",
                s.bg
              )}
            >
              <s.icon className={cn("size-5", s.color)} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-[10px] text-muted-foreground/60">
              consecutive days
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [scores, setScores] = useState(MOCK_SCORES);
  const [readings, setReadings] = useState(MOCK_READINGS);
  const [insight, setInsight] = useState(MOCK_INSIGHT);
  const [streaks, setStreaks] = useState(MOCK_STREAKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to fetch from real APIs, fall back to mock data
    async function load() {
      try {
        const [scoresRes, readingsRes, insightsRes] = await Promise.allSettled([
          fetch("/api/scores?days=1"),
          fetch("/api/readings?days=1"),
          fetch("/api/insights"),
        ]);
        if (scoresRes.status === "fulfilled" && scoresRes.value.ok) {
          const d = await scoresRes.value.json();
          if (d && d.mood !== undefined) setScores(d);
        }
        if (readingsRes.status === "fulfilled" && readingsRes.value.ok) {
          const d = await readingsRes.value.json();
          if (d && d.hrv !== undefined) setReadings(d);
        }
        if (insightsRes.status === "fulfilled" && insightsRes.value.ok) {
          const d = await insightsRes.value.json();
          if (d && d.text) setInsight(d);
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
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your health at a glance. Updated in real time.
        </p>
      </div>

      {/* Quick Stats */}
      <QuickStats
        hrv={readings.hrv}
        rhr={readings.rhr}
        sleepScore={readings.sleepScore}
        steps={readings.steps}
      />

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <MoodCompass moodScore={scores.mood} label={scores.moodLabel} />
        <BodyBattery level={scores.bodyBattery} trend={scores.bodyBatteryTrend} />
        <RecoveryRing
          hrv={scores.hrvRecovery}
          sleep={scores.sleepScore}
          readiness={scores.readiness}
        />
      </div>

      {/* AI Insight */}
      <AIInsight text={insight.text} confidence={insight.confidence} />

      {/* Streaks */}
      <StreakTrackers
        sleep={streaks.sleep}
        mood={streaks.mood}
        recovery={streaks.recovery}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
