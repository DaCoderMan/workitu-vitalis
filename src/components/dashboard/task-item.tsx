import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface TaskItemProps {
  task: {
    id: string;
    name: string;
    status: string;
    statusColor: string;
    priority: string | null;
    dueDate: number | null;
    url: string;
    listName: string;
  };
}

function formatDueDate(timestamp: number | null): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < -1) return `${Math.abs(days)}d overdue`;
  if (days === -1) return "Yesterday";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return date.toLocaleDateString("en-IL", { month: "short", day: "numeric" });
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-500",
  high: "text-orange-500",
  normal: "text-blue-500",
  low: "text-gray-400",
};

export function TaskItem({ task }: TaskItemProps) {
  const isOverdue = task.dueDate && task.dueDate < Date.now();

  return (
    <a
      href={task.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent group"
    >
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: task.statusColor }}
        title={task.status}
      />
      <div className="flex-1 min-w-0">
        <p className="truncate">{task.name}</p>
        <p className="text-xs text-muted-foreground">{task.listName}</p>
      </div>
      {task.priority && (
        <span
          className={`text-[10px] uppercase font-medium ${PRIORITY_COLORS[task.priority] ?? ""}`}
        >
          {task.priority}
        </span>
      )}
      {task.dueDate && (
        <Badge
          variant="secondary"
          className={`text-[10px] shrink-0 ${isOverdue ? "border-red-500/30 text-red-400" : ""}`}
        >
          {formatDueDate(task.dueDate)}
        </Badge>
      )}
      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
    </a>
  );
}
