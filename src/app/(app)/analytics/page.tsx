"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  RefreshCw,
  MessageSquare,
  Users,
  DollarSign,
  Zap,
  Receipt,
  Heart,
  ThumbsUp,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface AnalyticsData {
  conversations: { total: number; thisMonth: number };
  contacts: { total: number; byType: Record<string, number> };
  finance: {
    monthlyIncome: number;
    lastMonthIncome: number;
    monthlyExpenses: number;
    net: number;
    incomeGrowth: number;
  };
  invoices: { totalPaid: number; totalPending: number };
  xp: { total: number; thisWeek: number };
  health: { entriesThisWeek: number };
  feedback: { total: number; positive: number; satisfactionRate: number };
}

function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  trend?: number;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4`} style={{ color }} />
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-2xl font-bold">{value}</p>
        {trend !== undefined && trend !== 0 && (
          <span className={`flex items-center text-xs ${trend > 0 ? "text-green-500" : "text-red-500"}`}>
            {trend > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </Card>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics");
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Cross-system insights and metrics</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchAnalytics}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Monthly Income"
          value={`₪${data.finance.monthlyIncome.toLocaleString()}`}
          subtitle={`Expenses: ₪${data.finance.monthlyExpenses.toLocaleString()}`}
          icon={DollarSign}
          color="#10B981"
          trend={data.finance.incomeGrowth}
        />
        <MetricCard
          label="Conversations"
          value={String(data.conversations.total)}
          subtitle={`${data.conversations.thisMonth} this month`}
          icon={MessageSquare}
          color="#F59E0B"
        />
        <MetricCard
          label="Contacts"
          value={String(data.contacts.total)}
          subtitle={`${data.contacts.byType.client || 0} clients, ${data.contacts.byType.lead || 0} leads`}
          icon={Users}
          color="#3B82F6"
        />
        <MetricCard
          label="Total XP"
          value={String(data.xp.total)}
          subtitle={`+${data.xp.thisWeek} this week`}
          icon={Zap}
          color="#F59E0B"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Invoices Paid"
          value={`₪${data.invoices.totalPaid.toLocaleString()}`}
          subtitle={`₪${data.invoices.totalPending.toLocaleString()} pending`}
          icon={Receipt}
          color="#8B5CF6"
        />
        <MetricCard
          label="Health Entries"
          value={String(data.health.entriesThisWeek)}
          subtitle="This week"
          icon={Heart}
          color="#EF4444"
        />
        <MetricCard
          label="Satisfaction"
          value={`${data.feedback.satisfactionRate}%`}
          subtitle={`${data.feedback.positive}/${data.feedback.total} positive`}
          icon={ThumbsUp}
          color="#10B981"
        />
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Contact Breakdown</h3>
        <div className="flex gap-4 flex-wrap">
          {Object.entries(data.contacts.byType).map(([type, count]) => (
            <div key={type} className="text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{type}s</p>
            </div>
          ))}
          {Object.keys(data.contacts.byType).length === 0 && (
            <p className="text-sm text-muted-foreground">No contacts yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
