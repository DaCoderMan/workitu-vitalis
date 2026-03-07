"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarBadgeProps {
  /** API endpoint that returns a JSON object with a count or array */
  url: string;
  /** Tailwind color classes for the badge background */
  color?: "red" | "amber";
  /** Refetch interval in milliseconds (default: 60000) */
  interval?: number;
}

/**
 * Small badge that fetches a count from an API and displays it
 * next to a sidebar nav item. Only renders when count > 0.
 */
export function SidebarBadge({
  url,
  color = "red",
  interval = 60_000,
}: SidebarBadgeProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchCount() {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;

        // Support both { count: N } and { emails: [...] } / { tasks: [...] } shapes
        if (typeof data.count === "number") {
          setCount(data.count);
        } else if (Array.isArray(data.emails)) {
          setCount(data.emails.length);
        } else if (Array.isArray(data.tasks)) {
          setCount(data.tasks.length);
        }
      } catch {
        // Silently fail — badge just won't show
      }
    }

    fetchCount();
    const id = setInterval(fetchCount, interval);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [url, interval]);

  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "ml-auto inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white animate-pulse",
        color === "red" && "bg-red-500",
        color === "amber" && "bg-amber-500"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
