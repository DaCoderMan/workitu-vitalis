"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_READINGS = Array.from({ length: 20 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const sources = ["WHOOP", "Apple Health", "Manual"];
  const source = sources[i % 3];
  const confidence = 0.75 + Math.random() * 0.25;
  const hasOutlier = Math.random() > 0.85;
  return {
    id: `reading-${i}`,
    date: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    source,
    hrv: Math.round(35 + Math.random() * 30),
    rhr: Math.round(52 + Math.random() * 15),
    sleepHours: parseFloat((6 + Math.random() * 2.5).toFixed(1)),
    steps: Math.round(4000 + Math.random() * 10000),
    confidence: parseFloat(confidence.toFixed(2)),
    validated: confidence > 0.85,
    outlier: hasOutlier,
  };
});

const MOCK_WHOOP_STATUS = {
  lastSync: "2 hours ago",
  connected: true,
  totalSynced: 847,
};

/* ------------------------------------------------------------------ */
/*  Data Table                                                         */
/* ------------------------------------------------------------------ */

function DataTable({
  readings,
}: {
  readings: typeof MOCK_READINGS;
}) {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-5 text-cyan-400" />
          Readings
        </CardTitle>
        <CardDescription>
          Your biometric data with quality indicators
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {[
                  "Date",
                  "Source",
                  "HRV",
                  "RHR",
                  "Sleep",
                  "Steps",
                  "Confidence",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/30 transition-colors hover:bg-muted/30"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                    {r.date}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        r.source === "WHOOP"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : r.source === "Apple Health"
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {r.source}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {r.hrv} ms
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {r.rhr} bpm
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {r.sleepHours}h
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {r.steps.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            r.confidence > 0.9
                              ? "bg-emerald-500"
                              : r.confidence > 0.8
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          )}
                          style={{ width: `${r.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {(r.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {r.outlier ? (
                        <AlertTriangle className="size-3.5 text-amber-400" />
                      ) : r.validated ? (
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                      ) : (
                        <Clock className="size-3.5 text-muted-foreground" />
                      )}
                      <span
                        className={cn(
                          "text-xs",
                          r.outlier
                            ? "text-amber-400"
                            : r.validated
                            ? "text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {r.outlier
                          ? "Outlier"
                          : r.validated
                          ? "Validated"
                          : "Pending"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Data Quality Indicators                                            */
/* ------------------------------------------------------------------ */

function DataQualityCard({ readings }: { readings: typeof MOCK_READINGS }) {
  const validated = readings.filter((r) => r.validated).length;
  const outliers = readings.filter((r) => r.outlier).length;
  const avgConfidence =
    readings.reduce((sum, r) => sum + r.confidence, 0) / readings.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5 text-emerald-400" />
          Data Quality
        </CardTitle>
        <CardDescription>Overall data reliability metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{validated}</p>
            <p className="text-xs text-muted-foreground">Validated</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{outliers}</p>
            <p className="text-xs text-muted-foreground">Outliers</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {(avgConfidence * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Avg Confidence</p>
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Quality</span>
            <span className="font-semibold text-emerald-400">
              {avgConfidence > 0.9 ? "Excellent" : avgConfidence > 0.8 ? "Good" : "Fair"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
              style={{ width: `${avgConfidence * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  WHOOP Sync Status                                                  */
/* ------------------------------------------------------------------ */

function WhoopSyncCard({
  status,
}: {
  status: { lastSync: string; connected: boolean; totalSynced: number };
}) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = useCallback(() => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="size-5 text-teal-400" />
          WHOOP Sync
        </CardTitle>
        <CardDescription>Wearable data synchronization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl",
              status.connected ? "bg-emerald-500/15" : "bg-red-500/15"
            )}
          >
            {status.connected ? (
              <CheckCircle2 className="size-5 text-emerald-400" />
            ) : (
              <XCircle className="size-5 text-red-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {status.connected ? "Connected" : "Disconnected"}
            </p>
            <p className="text-xs text-muted-foreground">
              Last sync: {status.lastSync}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
          <p className="text-2xl font-bold">{status.totalSynced}</p>
          <p className="text-xs text-muted-foreground">Total readings synced</p>
        </div>
        <Button
          className="w-full"
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <RefreshCw className="mr-2 size-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 size-4" />
              Sync Now
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Apple Health Upload                                                */
/* ------------------------------------------------------------------ */

function AppleHealthUpload() {
  const [dragActive, setDragActive] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="size-5 text-blue-400" />
          Apple Health Upload
        </CardTitle>
        <CardDescription>Import your Apple Health export</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all",
            dragActive
              ? "border-emerald-500 bg-emerald-500/5"
              : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/30"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            // In production, handle file upload here
          }}
        >
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-blue-500/15">
            <FileText className="size-6 text-blue-400" />
          </div>
          <p className="text-sm font-medium">Drop your export.zip here</p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse. Supports ZIP and XML files.
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            Browse Files
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Data Page                                                          */
/* ------------------------------------------------------------------ */

export default function DataPage() {
  const [readings, setReadings] = useState(MOCK_READINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/readings?days=30");
        if (res.ok) {
          const d = await res.json();
          if (d && Array.isArray(d) && d.length > 0) setReadings(d);
        }
      } catch {
        // use mock
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleExport = useCallback(() => {
    // Generate CSV from readings
    const headers = [
      "Date",
      "Source",
      "HRV (ms)",
      "RHR (bpm)",
      "Sleep (h)",
      "Steps",
      "Confidence",
    ];
    const rows = readings.map((r) =>
      [
        r.date,
        r.source,
        r.hrv,
        r.rhr,
        r.sleepHours,
        r.steps,
        r.confidence,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vitalis-data-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [readings]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Management</h1>
          <p className="text-sm text-muted-foreground">
            View, import, and export your health data.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <DataQualityCard readings={readings} />
        <WhoopSyncCard status={MOCK_WHOOP_STATUS} />
        <AppleHealthUpload />
      </div>

      <DataTable readings={readings} />
    </div>
  );
}
