"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function DailyBriefing() {
  const [briefing, setBriefing] = useState<{
    date: string;
    content: string | null;
    isToday: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBriefing = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/briefing");
      if (res.ok) {
        const data = await res.json();
        setBriefing(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading briefing...
        </div>
      </Card>
    );
  }

  if (!briefing?.content) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          No briefing available yet. The VPS agent runs daily at 08:00 IST.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-yellow-500" />
          <h3 className="text-sm font-semibold">
            {briefing.isToday ? "Today's" : "Latest"} Briefing — {briefing.date}
          </h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchBriefing}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="max-h-64 overflow-y-auto text-xs text-muted-foreground prose prose-invert prose-xs max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {briefing.content.substring(0, 3000)}
        </ReactMarkdown>
      </div>
    </Card>
  );
}
