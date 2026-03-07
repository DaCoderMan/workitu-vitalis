"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Users,
  Target,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  status: string;
  statusColor: string;
  priority: string | null;
  dueDate: number | null;
  url: string;
  description: string;
}

interface Client {
  id: string;
  name: string;
  status: string;
  statusColor: string;
  priority: string | null;
  url: string;
  description: string;
}

const STATUS_ORDER = [
  "open",
  "contacted",
  "in progress",
  "proposal sent",
  "negotiating",
  "closed won",
];

export default function RevenuePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pipeline" | "clients">("pipeline");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, clientsRes] = await Promise.all([
        fetch("/api/revenue/leads"),
        fetch("/api/revenue/clients"),
      ]);
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.leads || []);
      }
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.clients || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group leads by status for pipeline view
  const pipelineColumns = STATUS_ORDER.map((status) => ({
    status,
    leads: leads.filter(
      (l) => l.status.toLowerCase() === status.toLowerCase()
    ),
  })).filter((col) => col.leads.length > 0 || STATUS_ORDER.indexOf(col.status) < 4);

  // Also include any status not in our predefined order
  const knownStatuses = new Set(STATUS_ORDER.map((s) => s.toLowerCase()));
  const otherLeads = leads.filter(
    (l) => !knownStatuses.has(l.status.toLowerCase())
  );
  if (otherLeads.length > 0) {
    pipelineColumns.push({ status: "other", leads: otherLeads });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <h1 className="text-2xl font-bold">Revenue Pipeline</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Track leads, proposals, and clients toward ₪7,000/mo
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="gap-1.5"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>Active Leads</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{leads.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Clients</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{clients.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>MRR Target</span>
          </div>
          <p className="mt-1 text-2xl font-bold">
            ₪0<span className="text-sm font-normal text-muted-foreground">/₪7K</span>
          </p>
        </Card>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <Button
          variant={tab === "pipeline" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("pipeline")}
        >
          Pipeline
        </Button>
        <Button
          variant={tab === "clients" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("clients")}
        >
          Active Clients
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : tab === "pipeline" ? (
        /* Pipeline kanban */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipelineColumns.map((col) => (
            <div key={col.status} className="min-w-[220px] flex-shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium capitalize">
                  {col.status}
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {col.leads.length}
                </span>
              </div>
              <div className="space-y-2">
                {col.leads.map((lead) => (
                  <Card key={lead.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {lead.name}
                        </p>
                        {lead.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {lead.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          {lead.priority && (
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                lead.priority === "urgent"
                                  ? "bg-red-500/10 text-red-500"
                                  : lead.priority === "high"
                                    ? "bg-orange-500/10 text-orange-500"
                                    : "bg-muted text-muted-foreground"
                              )}
                            >
                              {lead.priority}
                            </span>
                          )}
                          {lead.dueDate && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(lead.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <a
                        href={lead.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </Card>
                ))}
                {col.leads.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No leads
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Clients list */
        <Card className="divide-y divide-border">
          {clients.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No active clients yet. Close a lead to see them here.
            </div>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-sm font-medium">{client.name}</p>
                  {client.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {client.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                    style={{
                      backgroundColor: `${client.statusColor}20`,
                      color: client.statusColor,
                    }}
                  >
                    {client.status}
                  </span>
                  <a
                    href={client.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
}
