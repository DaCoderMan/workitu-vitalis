"use client";

import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flame } from "lucide-react";

interface StreakData {
  current: number;
  target: number;
}

export function StreakIndicator() {
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    fetch("/api/xp")
      .then((r) => r.json())
      .then((d) => {
        if (d?.streak) {
          setStreak(d.streak);
        }
      })
      .catch(() => {});
  }, []);

  if (!streak || streak.current === 0) return null;

  const isActive = streak.current > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 cursor-default">
          <Flame
            className={`h-3 w-3 ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <span className="text-[10px] font-medium text-primary">
            {streak.current}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          Revenue streak: {streak.current}/{streak.target} sessions
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
