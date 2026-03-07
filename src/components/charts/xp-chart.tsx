"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap } from "lucide-react";

interface XPPoint {
  date: string;
  daily: number;
  cumulative: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IL", { month: "short", day: "numeric" });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="mb-1 text-xs text-muted-foreground">
        {label ? formatDate(label) : ""}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm font-medium text-primary">
          {entry.dataKey === "cumulative" ? "Total XP" : "Daily"}: {entry.value.toLocaleString()} XP
        </p>
      ))}
    </div>
  );
}

export function XPChart({ days = 30 }: { days?: number }) {
  const [data, setData] = useState<XPPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/charts?type=xp&days=${days}`)
      .then((r) => r.json())
      .then((res) => setData(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <Card className="p-4">
        <Skeleton className="mb-4 h-5 w-36" />
        <Skeleton className="h-[250px] w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">XP Progression</h3>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
          No XP data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              className="text-xs"
              tick={{ fill: "oklch(0.556 0 0)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "oklch(0.556 0 0)" }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="oklch(0.646 0.222 41.116)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "oklch(0.646 0.222 41.116)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
