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
/*  Default empty state values                                         */
/* ------------------------------------------------------------------ */

const EMPTY_SCORES = {
  mood: 0,
  moodLabel: "No Data",
  moodState: "" as string,
  bodyBattery: 0,
  bodyBatteryTrend: "draining",
  hrvRecovery: 0,
  sleepScore: 0,
  readiness: 0,
};

const EMPTY_READINGS = {
  hrv: 0,
  rhr: 0,
  sleepScore: 0,
  steps: 0,
};

const EMPTY_INSIGHT = {
  text: "",
  confidence: 0,
};

const EMPTY_STREAKS = {
  sleep: 0,
  mood: 0,
  recovery: 0,
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
/*  Mood State Banner                                                  */
/* ------------------------------------------------------------------ */

function MoodStateBanner({ moodState, score }: { moodState: string; score: number }) {
  if (!moodState) return null;

  const config: Record<string, { label: string; description: string; bg: string; border: string; text: string; icon: string }> = {
    depression_risk: {
      label: "Depression Risk",
      description: "Your biometric data indicates significantly low mood markers. Consider reaching out to a healthcare provider.",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      icon: "!",
    },
    low: {
      label: "Low Mood",
      description: "Your mood indicators are below baseline. Focus on sleep, movement, and social connection.",
      bg: "bg-sky-500/10",
      border: "border-sky-500/30",
      text: "text-sky-400",
      icon: "~",
    },
    euthymic: {
      label: "Normal / Stable",
      description: "Your mood markers are within healthy range. Keep up your current routine.",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      icon: "\u2713",
    },
    elevated: {
      label: "Elevated Mood",
      description: "Your mood indicators are above baseline. Monitor for sustained elevation.",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      icon: "\u2191",
    },
    mania_risk: {
      label: "Mania Risk",
      description: "Your biometric data indicates unusually elevated mood markers. Consider consulting your healthcare provider.",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-400",
      icon: "!!",
    },
  };

  const c = config[moodState] || config.euthymic;

  return (
    <div className={cn("rounded-xl border-2 p-4", c.bg, c.border)}>
      <div className="flex items-center gap-3">
        <div className={cn("flex size-12 items-center justify-center rounded-full text-xl font-bold", c.bg, c.text)}>
          {c.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-lg font-bold", c.text)}>{c.label}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
              Score: {score > 0 ? "+" : ""}{score.toFixed(2)}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{c.description}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 py-16 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-500/15">
        <Heart className="size-8 text-emerald-400" />
      </div>
      <h3 className="text-lg font-semibold">No health data yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Connect your WHOOP band or seed demo data from Settings to start seeing your health dashboard.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [scores, setScores] = useState(EMPTY_SCORES);
  const [readings, setReadings] = useState(EMPTY_READINGS);
  const [insight, setInsight] = useState(EMPTY_INSIGHT);
  const [streaks, setStreaks] = useState(EMPTY_STREAKS);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [scoresRes, readingsRes, insightsRes] = await Promise.allSettled([
          fetch("/api/scores?days=1"),
          fetch("/api/readings?days=1"),
          fetch("/api/insights"),
        ]);

        let gotData = false;

        if (scoresRes.status === "fulfilled" && scoresRes.value.ok) {
          const d = await scoresRes.value.json();
          if (d?.scores?.length > 0) {
            gotData = true;
            const s = d.scores[0];
            const moodState = s.mood_state || "euthymic";
            const labelMap: Record<string, string> = {
              euthymic: "Normal",
              elevated: "Elevated",
              low: "Low",
              depression_risk: "Depression Risk",
              mania_risk: "Mania Risk",
            };
            setScores({
              mood: s.mood_score ?? 0,
              moodLabel: labelMap[moodState] || "Normal",
              moodState,
              bodyBattery: s.body_battery ?? 0,
              bodyBatteryTrend: (s.body_battery ?? 0) > 60 ? "charging" : "draining",
              hrvRecovery: 0,
              sleepScore: s.sleep_gpa ? Math.round(s.sleep_gpa * 25) : 0,
              readiness: s.body_battery ?? 0,
            });
          }
        }

        if (readingsRes.status === "fulfilled" && readingsRes.value.ok) {
          const d = await readingsRes.value.json();
          if (d?.readings?.length > 0) {
            gotData = true;
            const r = d.readings[0];
            const m = r.metrics || r;
            setReadings({
              hrv: m.hrv_rmssd ?? m.hrv_sdnn ?? 0,
              rhr: m.resting_hr ?? 0,
              sleepScore: m.sleep_efficiency ?? 0,
              steps: m.steps ?? 0,
            });
          }
        }

        if (insightsRes.status === "fulfilled" && insightsRes.value.ok) {
          const d = await insightsRes.value.json();
          if (d?.insight?.ai_insight) {
            setInsight({ text: d.insight.ai_insight, confidence: 0.85 });
          }
        }

        setHasData(gotData);
      } catch {
        // no data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your health at a glance. Updated in real time.
          </p>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your health at a glance. Updated in real time.
        </p>
      </div>

      {/* Mood State Classification Banner */}
      <MoodStateBanner moodState={scores.moodState} score={scores.mood} />

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
      {insight.text && <AIInsight text={insight.text} confidence={insight.confidence} />}

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
