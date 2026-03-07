"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Plus,
  X,
  RefreshCw,
  Dumbbell,
  Apple,
  Moon,
  Brain,
  Scale,
  Pill,
} from "lucide-react";

interface HealthEntryType {
  _id: string;
  date: string;
  type: string;
  data: Record<string, unknown>;
  notes?: string;
  tags: string[];
}

const TYPE_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    label: string;
  }
> = {
  workout: { icon: Dumbbell, color: "text-orange-400", label: "Workout" },
  meal: { icon: Apple, color: "text-green-400", label: "Meal" },
  sleep: { icon: Moon, color: "text-indigo-400", label: "Sleep" },
  mood: { icon: Brain, color: "text-yellow-400", label: "Mood" },
  weight: { icon: Scale, color: "text-blue-400", label: "Weight" },
  medication: { icon: Pill, color: "text-purple-400", label: "Medication" },
  symptom: { icon: Heart, color: "text-red-400", label: "Symptom" },
  note: { icon: Heart, color: "text-gray-400", label: "Note" },
};

const ENTRY_TYPES = Object.keys(TYPE_CONFIG).filter((t) => t !== "note");

// --- Structured form field definitions ---

const WORKOUT_ACTIVITIES = [
  "running",
  "gym",
  "yoga",
  "walking",
  "cycling",
  "swimming",
  "other",
];

const MOOD_OPTIONS = [
  { emoji: "\ud83d\ude22", label: "Awful", value: 1 },
  { emoji: "\ud83d\ude15", label: "Bad", value: 2 },
  { emoji: "\ud83d\ude10", label: "Okay", value: 3 },
  { emoji: "\ud83d\ude0a", label: "Good", value: 4 },
  { emoji: "\ud83d\ude04", label: "Great", value: 5 },
];

const SLEEP_QUALITY = ["poor", "fair", "good", "excellent"];
const SEVERITY_LEVELS = ["mild", "moderate", "severe"];

// Shared input class
const inputClass =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "text-xs text-muted-foreground";

// --- Structured form components per type ---

function WorkoutForm({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={labelClass}>Activity Type</label>
        <select
          value={(value.activity as string) || ""}
          onChange={(e) => onChange({ ...value, activity: e.target.value })}
          className={inputClass}
        >
          <option value="">Select activity...</option>
          {WORKOUT_ACTIVITIES.map((a) => (
            <option key={a} value={a}>
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Duration (minutes)</label>
        <input
          type="number"
          min="1"
          value={(value.duration as string) || ""}
          onChange={(e) => onChange({ ...value, duration: e.target.value ? Number(e.target.value) : "" })}
          placeholder="30"
          className={inputClass}
        />
      </div>
    </div>
  );
}

function MealForm({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={labelClass}>Description</label>
        <input
          type="text"
          value={(value.description as string) || ""}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="What did you eat?"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Calories (optional)</label>
        <input
          type="number"
          min="0"
          value={(value.calories as string) || ""}
          onChange={(e) => onChange({ ...value, calories: e.target.value ? Number(e.target.value) : "" })}
          placeholder="500"
          className={inputClass}
        />
      </div>
    </div>
  );
}

function SleepForm({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={labelClass}>Hours Slept</label>
        <input
          type="number"
          min="0"
          max="24"
          step="0.5"
          value={(value.hours as string) || ""}
          onChange={(e) => onChange({ ...value, hours: e.target.value ? Number(e.target.value) : "" })}
          placeholder="7.5"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Quality</label>
        <select
          value={(value.quality as string) || ""}
          onChange={(e) => onChange({ ...value, quality: e.target.value })}
          className={inputClass}
        >
          <option value="">Select quality...</option>
          {SLEEP_QUALITY.map((q) => (
            <option key={q} value={q}>
              {q.charAt(0).toUpperCase() + q.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function MoodForm({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const selected = value.score as number | undefined;

  return (
    <div>
      <label className={labelClass}>How are you feeling?</label>
      <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
        {MOOD_OPTIONS.map((m) => {
          const isSelected = selected === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange({ ...value, score: m.value, label: m.label })}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 transition-all duration-150 border-2 ${
                isSelected
                  ? "scale-110 border-primary ring-2 ring-primary/30 bg-primary/10 shadow-md"
                  : "border-transparent hover:border-border hover:bg-muted/50"
              }`}
            >
              <span className="text-2xl sm:text-3xl leading-none">{m.emoji}</span>
              <span
                className={`text-xs font-medium ${
                  isSelected ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {m.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeightForm({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const unit = (value.unit as string) || "kg";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={labelClass}>Weight</label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={(value.weight as string) || ""}
          onChange={(e) => onChange({ ...value, weight: e.target.value ? Number(e.target.value) : "" })}
          placeholder={unit === "kg" ? "75.0" : "165.0"}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Unit</label>
        <div className="mt-1 flex rounded-md border border-input overflow-hidden">
          <button
            type="button"
            onClick={() => onChange({ ...value, unit: "kg" })}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              unit === "kg"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            kg
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, unit: "lbs" })}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              unit === "lbs"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            lbs
          </button>
        </div>
      </div>
    </div>
  );
}

function MedicationForm({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={labelClass}>Medication Name</label>
        <input
          type="text"
          value={(value.name as string) || ""}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g., Ibuprofen"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Dosage</label>
        <input
          type="text"
          value={(value.dosage as string) || ""}
          onChange={(e) => onChange({ ...value, dosage: e.target.value })}
          placeholder="e.g., 200mg"
          className={inputClass}
        />
      </div>
    </div>
  );
}

function SymptomForm({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={labelClass}>Symptom Description</label>
        <input
          type="text"
          value={(value.description as string) || ""}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="e.g., Headache, back pain"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Severity</label>
        <select
          value={(value.severity as string) || ""}
          onChange={(e) => onChange({ ...value, severity: e.target.value })}
          className={inputClass}
        >
          <option value="">Select severity...</option>
          {SEVERITY_LEVELS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Map type to structured form component
function StructuredFormFields({
  type,
  value,
  onChange,
}: {
  type: string;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  switch (type) {
    case "workout":
      return <WorkoutForm value={value} onChange={onChange} />;
    case "meal":
      return <MealForm value={value} onChange={onChange} />;
    case "sleep":
      return <SleepForm value={value} onChange={onChange} />;
    case "mood":
      return <MoodForm value={value} onChange={onChange} />;
    case "weight":
      return <WeightForm value={value} onChange={onChange} />;
    case "medication":
      return <MedicationForm value={value} onChange={onChange} />;
    case "symptom":
      return <SymptomForm value={value} onChange={onChange} />;
    default:
      return null;
  }
}

// Helper to render entry data nicely in the list
function formatEntryData(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case "workout": {
      const parts: string[] = [];
      if (data.activity) parts.push(String(data.activity));
      if (data.duration) parts.push(`${data.duration} min`);
      return parts.join(" - ") || JSON.stringify(data);
    }
    case "meal": {
      const parts: string[] = [];
      if (data.description) parts.push(String(data.description));
      if (data.calories) parts.push(`${data.calories} cal`);
      return parts.join(" - ") || JSON.stringify(data);
    }
    case "sleep": {
      const parts: string[] = [];
      if (data.hours) parts.push(`${data.hours}h`);
      if (data.quality) parts.push(String(data.quality));
      return parts.join(" - ") || JSON.stringify(data);
    }
    case "mood": {
      const m = MOOD_OPTIONS.find((o) => o.value === data.score);
      if (m) return `${m.emoji} ${m.label}`;
      if (data.label) return String(data.label);
      return JSON.stringify(data);
    }
    case "weight": {
      if (data.weight) return `${data.weight} ${data.unit || "kg"}`;
      return JSON.stringify(data);
    }
    case "medication": {
      const parts: string[] = [];
      if (data.name) parts.push(String(data.name));
      if (data.dosage) parts.push(String(data.dosage));
      return parts.join(" - ") || JSON.stringify(data);
    }
    case "symptom": {
      const parts: string[] = [];
      if (data.description) parts.push(String(data.description));
      if (data.severity) parts.push(String(data.severity));
      return parts.join(" - ") || JSON.stringify(data);
    }
    default:
      return Object.keys(data).length > 0 ? JSON.stringify(data) : "";
  }
}

export default function HealthPage() {
  const [entries, setEntries] = useState<HealthEntryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formType, setFormType] = useState("workout");
  const [formNotes, setFormNotes] = useState("");
  const [formStructuredData, setFormStructuredData] = useState<
    Record<string, unknown>
  >({});

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health?days=14");
      const data = await res.json();
      setEntries(data.entries || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Reset structured data when type changes
  const handleTypeChange = (newType: string) => {
    setFormType(newType);
    setFormStructuredData({});
  };

  const create = async () => {
    setCreating(true);
    // Clean up empty string values from structured data
    const cleanData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(formStructuredData)) {
      if (v !== "" && v !== undefined && v !== null) {
        cleanData[k] = v;
      }
    }
    try {
      await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          data: cleanData,
          notes: formNotes || undefined,
        }),
      });
      setFormNotes("");
      setFormStructuredData({});
      setShowCreate(false);
      fetchEntries();
    } finally {
      setCreating(false);
    }
  };

  // Group by date
  const grouped = entries.reduce<Record<string, HealthEntryType[]>>(
    (acc, e) => {
      const date = new Date(e.date).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(e);
      return acc;
    },
    {}
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            <h1 className="text-2xl font-bold">Health Tracker</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Track workouts, meals, sleep, mood, and more
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchEntries}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setShowCreate(!showCreate)}
            className="gap-2"
          >
            {showCreate ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {showCreate ? "Cancel" : "Log"}
          </Button>
        </div>
      </div>

      {/* Quick Log Types */}
      <div className="flex gap-2 flex-wrap">
        {ENTRY_TYPES.map((t) => {
          const cfg = TYPE_CONFIG[t];
          return (
            <Button
              key={t}
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                handleTypeChange(t);
                setShowCreate(true);
              }}
            >
              <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
              {cfg.label}
            </Button>
          );
        })}
      </div>

      {showCreate && (
        <Card className="p-4 space-y-4 border-red-500/20">
          <h3 className="text-sm font-semibold">
            Log {TYPE_CONFIG[formType]?.label || formType}
          </h3>

          {/* Type selector */}
          <div>
            <label className={labelClass}>Type</label>
            <select
              value={formType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className={inputClass}
            >
              {ENTRY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_CONFIG[t].label}
                </option>
              ))}
            </select>
          </div>

          {/* Structured form fields based on type */}
          <StructuredFormFields
            type={formType}
            value={formStructuredData}
            onChange={setFormStructuredData}
          />

          {/* Notes field — available for all types */}
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <input
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Any additional notes..."
              className={inputClass}
            />
          </div>

          <Button onClick={create} disabled={creating}>
            {creating ? "Logging..." : "Save Entry"}
          </Button>
        </Card>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : entries.length === 0 ? (
        <Card className="flex h-48 items-center justify-center">
          <div className="text-center">
            <Heart className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No health entries yet
            </p>
            <p className="text-xs text-muted-foreground">
              Log a workout, meal, or mood above. Or tell Ria: &quot;I did 30
              pushups&quot;
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, dayEntries]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                {date}
              </h3>
              <div className="space-y-1.5">
                {dayEntries.map((e) => {
                  const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.note;
                  const displayData = formatEntryData(e.type, e.data);
                  return (
                    <Card
                      key={e._id}
                      className="flex items-center gap-3 p-2.5"
                    >
                      <cfg.icon
                        className={`h-4 w-4 shrink-0 ${cfg.color}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {cfg.label}
                          </Badge>
                          {e.notes && (
                            <span className="text-xs text-muted-foreground truncate">
                              {e.notes}
                            </span>
                          )}
                        </div>
                        {displayData && (
                          <span className="text-xs text-muted-foreground">
                            {displayData}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(e.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
