"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Plus,
  Clock,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  X,
} from "lucide-react";

interface AutomationType {
  _id: string;
  name: string;
  schedule: string;
  action: string;
  config: Record<string, string>;
  enabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  email_report: "Email Report",
  clickup_summary: "ClickUp Summary",
  briefing: "Daily Briefing",
  custom: "Custom",
};

const ACTION_COLORS: Record<string, string> = {
  email_report: "text-blue-400 border-blue-500/30",
  clickup_summary: "text-purple-400 border-purple-500/30",
  briefing: "text-green-400 border-green-500/30",
  custom: "text-yellow-400 border-yellow-500/30",
};

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSchedule, setFormSchedule] = useState("daily");
  const [formAction, setFormAction] = useState<string>("briefing");
  const [formConfig, setFormConfig] = useState("");

  const fetchAutomations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/automations");
      const data = await res.json();
      setAutomations(data.automations || []);
    } catch {
      setAutomations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const createAutomation = async () => {
    if (!formName.trim()) return;
    setCreating(true);

    let config: Record<string, string> = {};
    if (formConfig.trim()) {
      try {
        config = JSON.parse(formConfig);
      } catch {
        config = { raw: formConfig };
      }
    }

    try {
      await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          schedule: formSchedule,
          action: formAction,
          config,
        }),
      });
      setFormName("");
      setFormSchedule("daily");
      setFormAction("briefing");
      setFormConfig("");
      setShowCreate(false);
      fetchAutomations();
    } finally {
      setCreating(false);
    }
  };

  const toggleAutomation = async (id: string, enabled: boolean) => {
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    fetchAutomations();
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm("Delete this automation?")) return;
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    fetchAutomations();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <h1 className="text-2xl font-bold">Automations</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Scheduled tasks and recurring workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchAutomations}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
            {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreate ? "Cancel" : "New"}
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="p-4 space-y-4 border-amber-500/20">
          <h3 className="text-sm font-semibold">Create Automation</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Morning briefing email"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Schedule</label>
              <select
                value={formSchedule}
                onChange={(e) => setFormSchedule(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="daily">Daily (8:00 AM)</option>
                <option value="weekly">Weekly (Monday 8:00 AM)</option>
                <option value="0 8 * * *">Custom: 0 8 * * *</option>
                <option value="0 20 * * *">Custom: 0 20 * * * (8 PM)</option>
                <option value="0 8 * * 1-5">Weekdays 8:00 AM</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Action</label>
              <select
                value={formAction}
                onChange={(e) => setFormAction(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="briefing">Daily Briefing</option>
                <option value="email_report">Email Report</option>
                <option value="clickup_summary">ClickUp Summary</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Config (JSON or text)
              </label>
              <input
                value={formConfig}
                onChange={(e) => setFormConfig(e.target.value)}
                placeholder='e.g. {"to": "yonatan@workitu.com"}'
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <Button onClick={createAutomation} disabled={creating || !formName.trim()}>
            {creating ? "Creating..." : "Create Automation"}
          </Button>
        </Card>
      )}

      {/* Automations List */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading automations...</p>
        </div>
      ) : automations.length === 0 ? (
        <Card className="flex h-48 items-center justify-center">
          <div className="text-center">
            <Zap className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No automations yet
            </p>
            <p className="text-xs text-muted-foreground">
              Create one or ask Ria in chat: &quot;Set up a daily briefing email&quot;
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => (
            <Card key={auto._id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{auto.name}</span>
                    <Badge
                      variant="outline"
                      className={ACTION_COLORS[auto.action] || ""}
                    >
                      {ACTION_LABELS[auto.action] || auto.action}
                    </Badge>
                    {!auto.enabled && (
                      <Badge variant="secondary" className="text-muted-foreground">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {auto.schedule}
                    </span>
                    {auto.lastRunAt && (
                      <span>
                        Last run:{" "}
                        {new Date(auto.lastRunAt).toLocaleString()} —{" "}
                        <span
                          className={
                            auto.lastRunStatus === "success"
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {auto.lastRunStatus}
                        </span>
                      </span>
                    )}
                    {!auto.lastRunAt && <span>Never run</span>}
                  </div>
                  {Object.keys(auto.config || {}).length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Config: {JSON.stringify(auto.config)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleAutomation(auto._id, auto.enabled)}
                    title={auto.enabled ? "Disable" : "Enable"}
                  >
                    {auto.enabled ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteAutomation(auto._id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
