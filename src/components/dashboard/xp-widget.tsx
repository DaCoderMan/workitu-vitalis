"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap } from "lucide-react";

interface XPData {
  level: {
    level: number;
    name: string;
    totalXP: number;
    toNextLevel: number;
    nextLevelName: string;
    progress: number;
  };
  todayXP: number;
  weekXP: number;
}

export function XPWidget() {
  const [data, setData] = useState<XPData | null>(null);

  useEffect(() => {
    fetch("/api/xp")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Level {data.level.level} — {data.level.name}
        </h3>
        <span className="text-xs font-medium text-primary">
          {data.level.totalXP.toLocaleString()} XP
        </span>
      </div>

      <div className="space-y-1">
        <Progress value={Math.min(data.level.progress, 100)} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{Math.round(data.level.progress)}%</span>
          <span>
            {data.level.toNextLevel > 0
              ? `${data.level.toNextLevel} XP to ${data.level.nextLevelName}`
              : "MAX LEVEL"}
          </span>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-muted-foreground">Today:</span>
          <span className="font-medium">+{data.todayXP}</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-primary/70" />
          <span className="text-muted-foreground">Week:</span>
          <span className="font-medium">+{data.weekXP}</span>
        </div>
      </div>
    </Card>
  );
}
