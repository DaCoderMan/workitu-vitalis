"use client";

import { useEffect, useState } from "react";

interface XPLevel {
  level: number;
  name: string;
  totalXP: number;
  progress: number;
}

export function SidebarXPBar() {
  const [data, setData] = useState<XPLevel | null>(null);

  useEffect(() => {
    const load = () => {
      fetch("/api/xp")
        .then((r) => r.json())
        .then((d) => setData(d?.level ?? null))
        .catch(() => {});
    };

    load();

    // Refresh on window focus
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (!data) return null;

  return (
    <div className="px-3 py-1.5">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
        <span>
          Lv.{data.level}{" "}
          <span className="font-medium text-foreground">{data.name}</span>
        </span>
        <span>{data.totalXP.toLocaleString()} XP</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(data.progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
