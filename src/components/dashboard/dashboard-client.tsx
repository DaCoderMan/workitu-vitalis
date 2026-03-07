"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { CarryForwardList } from "@/components/dashboard/carry-forward-list";
import { DailyBriefing } from "@/components/dashboard/daily-briefing";
import { XPWidget } from "@/components/dashboard/xp-widget";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { CalendarWidget } from "@/components/dashboard/calendar-widget";
import { EmailWidget } from "@/components/dashboard/email-widget";
import { TodaysFocus } from "@/components/dashboard/todays-focus";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { XPChart } from "@/components/charts/xp-chart";
import {
  DollarSign,
  Zap,
  Flame,
  FolderGit2,
  MessageSquare,
  Heart,
  UserPlus,
  TrendingUp,
  ListChecks,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { RiaState } from "@/lib/parse-state";

const MOTIVATIONAL_LINES = [
  "Every session is a step closer to the prize.",
  "Revenue waits for no one — let's move.",
  "You didn't come this far to only come this far.",
  "The empire isn't going to build itself, habibi.",
  "Ship fast, learn faster, earn fastest.",
  "Today's grind is tomorrow's empire.",
  "One more conquest and we're on fire.",
  "Focus is your superpower. Use it.",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning, habibi";
  if (hour < 17) return "Good afternoon, habibi";
  return "Good evening, habibi";
}

function getMotivationalLine(): string {
  return MOTIVATIONAL_LINES[Math.floor(Math.random() * MOTIVATIONAL_LINES.length)];
}

function getDashboardDateString(): string {
  return new Date().toLocaleDateString("en-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type QuickAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  iconClassName: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { href: "/chat", label: "New Chat", icon: MessageSquare, iconClassName: "text-primary" },
  { href: "/finance", label: "Log Expense", icon: DollarSign, iconClassName: "text-emerald-500" },
  { href: "/contacts", label: "Add Contact", icon: UserPlus, iconClassName: "text-blue-500" },
  { href: "/health", label: "Log Health", icon: Heart, iconClassName: "text-rose-500" },
];

const QUICK_CARD_ACTIONS: QuickAction[] = [
  { href: "/chat", label: "Chat", icon: MessageSquare, iconClassName: "text-primary" },
  { href: "/revenue", label: "Revenue", icon: TrendingUp, iconClassName: "text-green-500" },
  { href: "/tasks", label: "Tasks", icon: ListChecks, iconClassName: "text-blue-500" },
];

interface DashboardClientProps {
  state: RiaState;
}

export function DashboardClient({ state }: DashboardClientProps) {
  const [greeting, setGreeting] = useState("Welcome back, habibi");
  const [motivation, setMotivation] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [liveXP, setLiveXP] = useState<{ total: number; level: number; levelName: string } | null>(null);

  useEffect(() => {
    setGreeting(getGreeting());
    setMotivation(getMotivationalLine());
    setDateStr(getDashboardDateString());

    const controller = new AbortController();
    const fetchLiveXP = async () => {
      try {
        const response = await fetch("/api/xp", { signal: controller.signal });
        if (!response.ok) return;

        const data: {
          totalXP?: number;
          level?: number;
          levelName?: string;
        } = await response.json();

        if (data.totalXP !== undefined) {
          setLiveXP({
            total: data.totalXP,
            level: data.level ?? state.xp.level,
            levelName: data.levelName ?? state.xp.levelName,
          });
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          // Fail silently: dashboard can fall back to server-parsed XP.
        }
      }
    };

    void fetchLiveXP();

    return () => controller.abort();
  }, [state.xp.level, state.xp.levelName]);

  const revenueProgress =
    state.revenue.target > 0
      ? (state.revenue.current / state.revenue.target) * 100
      : 0;

  const hasHeatStreak = state.streaks.revenue > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header with dynamic greeting */}
      <div>
        <h1 className="text-2xl font-bold">{greeting}</h1>
        {motivation && (
          <p className="mt-0.5 text-sm italic text-primary/80">
            {motivation}
          </p>
        )}
        {dateStr && (
          <p className="mt-1 text-sm text-muted-foreground">{dateStr}</p>
        )}
      </div>

      {/* Financial alerts */}
      {state.alerts.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">Financial Alert</span>
          </div>
          <ul className="mt-2 space-y-1">
            {state.alerts.map((alert, i) => (
              <li key={i} className="text-sm text-red-300">
                {alert}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Quick-action icon buttons */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.href} href={action.href}>
            <Button variant="outline" size="sm" className="gap-2">
              <action.icon className={`h-4 w-4 ${action.iconClassName}`} />
              {action.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Stat cards with streak animation */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={`₪${state.revenue.current.toLocaleString()}`}
          subtitle={`Target: ₪${state.revenue.target.toLocaleString()}/mo`}
          icon={DollarSign}
          color="#10B981"
          progress={revenueProgress}
        />
        <StatCard
          label="XP"
          value={`${liveXP?.total ?? state.xp.current}`}
          subtitle={`Level ${liveXP?.level ?? state.xp.level} — ${liveXP?.levelName ?? state.xp.levelName}`}
          icon={Zap}
          color="#F59E0B"
        />
        <div className={hasHeatStreak ? "streak-fire-glow" : ""}>
          <StatCard
            label="Heat Streak"
            value={`${state.streaks.revenue}/${state.streaks.target}`}
            subtitle="Revenue sessions"
            icon={Flame}
            color="#EF4444"
            progress={
              (state.streaks.revenue / state.streaks.target) * 100
            }
          />
        </div>
        <StatCard
          label="Projects"
          value={`${state.projectCount}`}
          subtitle="Deployed on Vercel"
          icon={FolderGit2}
          color="#8B5CF6"
        />
      </div>

      {/* Today's Focus — prominent card */}
      <TodaysFocus />

      {/* XP progress */}
      <XPWidget />

      {/* Daily Briefing — moved UP before charts */}
      <DailyBriefing />

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart />
        <XPChart />
      </div>

      {/* Insights + Google Widgets */}
      <div className="grid gap-4 lg:grid-cols-3">
        <InsightsPanel />
        <CalendarWidget />
        <EmailWidget />
      </div>

      {/* Carry-forward + Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CarryForwardList items={state.carryForward} />

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_CARD_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href}>
                <Button
                  variant="outline"
                  className="w-full gap-2 h-auto py-3 flex-col"
                >
                  <action.icon className={`h-5 w-5 ${action.iconClassName}`} />
                  <span className="text-xs">{action.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Sessions */}
      {state.recentSessions.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Recent Sessions</h3>
          <div className="space-y-2">
            {state.recentSessions.map((sess, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 text-xs text-muted-foreground w-36">
                  {sess.date}
                </span>
                <span className="text-muted-foreground">{sess.summary}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}
