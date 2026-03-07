"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Wallet,
  Newspaper,
  HeartPulse,
  CheckSquare,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bot,
  Wallet,
  Newspaper,
  HeartPulse,
  CheckSquare,
};

interface AgentCardProps {
  agent: {
    slug: string;
    name: string;
    description: string;
    icon: string;
    color: string;
  };
}

export function AgentCard({ agent }: AgentCardProps) {
  const Icon = ICON_MAP[agent.icon] ?? Bot;

  return (
    <Card className="group relative overflow-hidden transition-colors hover:border-foreground/20">
      <div
        className="absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10"
        style={{ backgroundColor: agent.color }}
      />
      <CardHeader className="relative space-y-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-lg">{agent.name}</CardTitle>
          <CardDescription className="mt-1">{agent.description}</CardDescription>
        </div>
        <Button asChild size="sm" variant="secondary" className="w-full">
          <Link href={`/chat/${agent.slug}`}>Start Chat</Link>
        </Button>
      </CardHeader>
    </Card>
  );
}
