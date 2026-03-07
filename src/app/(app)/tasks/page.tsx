"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskItem } from "@/components/dashboard/task-item";
import { ListChecks, RefreshCw, AlertTriangle, Clock, List } from "lucide-react";

interface Task {
  id: string;
  name: string;
  status: string;
  statusColor: string;
  priority: string | null;
  dueDate: number | null;
  url: string;
  listName: string;
}

type Filter = "overdue" | "due_today" | "recent";

export default function TasksPage() {
  const [filter, setFilter] = useState<Filter>("due_today");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTasks = async (f: Filter) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clickup/tasks?filter=${f}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch tasks");
      }
      const data = await res.json();
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(filter);
  }, [filter]);

  const FILTERS: { key: Filter; label: string; icon: typeof AlertTriangle }[] = [
    { key: "overdue", label: "Overdue", icon: AlertTriangle },
    { key: "due_today", label: "Due Today", icon: Clock },
    { key: "recent", label: "Recent", icon: List },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-blue-500" />
            <h1 className="text-2xl font-bold">Tasks</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            ClickUp tasks synced in real-time
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchTasks(filter)}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
            className="gap-1.5"
          >
            <f.icon className="h-3.5 w-3.5" />
            {f.label}
          </Button>
        ))}
      </div>

      <Card className="divide-y divide-border">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading tasks...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-400">{error}</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No tasks found for this filter.
          </div>
        ) : (
          tasks.map((task) => <TaskItem key={task.id} task={task} />)
        )}
      </Card>
    </div>
  );
}
