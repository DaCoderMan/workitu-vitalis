import { Card } from "@/components/ui/card";
import { CheckCircle2, Pin, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarryForwardItem {
  text: string;
  status: "done" | "pending" | "urgent";
  link?: string;
}

interface CarryForwardListProps {
  items: CarryForwardItem[];
}

const STATUS_CONFIG = {
  done: {
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  pending: {
    icon: Pin,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  urgent: {
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
};

export function CarryForwardList({ items }: CarryForwardListProps) {
  if (items.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Active Carry-Forward</h3>
      <div className="space-y-2">
        {items.map((item, i) => {
          const config = STATUS_CONFIG[item.status];
          const Icon = config.icon;
          return (
            <div key={i} className="flex items-start gap-2">
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  config.bg
                )}
              >
                <Icon className={cn("h-3 w-3", config.color)} />
              </div>
              <p className="text-sm leading-snug">
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {item.text}
                  </a>
                ) : (
                  item.text
                )}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
