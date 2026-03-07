"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

interface Insight {
  text: string;
  type: "positive" | "warning" | "neutral";
}

const TYPE_CONFIG = {
  positive: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  neutral: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
};

export function InsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((data) => setInsights(data.insights ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">AI Insights</h3>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Not enough data to generate insights yet.
        </p>
      ) : (
        <div className="space-y-2">
          {insights.map((insight, i) => {
            const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.neutral;
            const Icon = config.icon;

            return (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${config.bg}`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
                <p className="text-sm leading-snug">{insight.text}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
