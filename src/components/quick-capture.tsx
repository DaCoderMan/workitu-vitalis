"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  X,
  DollarSign,
  FileText,
  ListChecks,
  Heart,
} from "lucide-react";

type CaptureMode = null | "expense" | "note" | "task" | "health";

const ACTION_BUTTONS = [
  { mode: "health" as const, icon: Heart, label: "Health", color: "text-rose-500 bg-rose-500/10 hover:bg-rose-500/20" },
  { mode: "task" as const, icon: ListChecks, label: "Task", color: "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20" },
  { mode: "note" as const, icon: FileText, label: "Note", color: "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" },
  { mode: "expense" as const, icon: DollarSign, label: "Expense", color: "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20" },
];

export function QuickCapture() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<CaptureMode>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [healthType, setHealthType] = useState("");
  const [healthData, setHealthData] = useState("");

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setTitle("");
    setContent("");
    setHealthType("");
    setHealthData("");
    setMode(null);
  };

  const handleAction = (actionMode: CaptureMode) => {
    if (actionMode === "task") {
      setMenuOpen(false);
      router.push("/tasks");
      return;
    }
    setMode(actionMode);
    setMenuOpen(false);
  };

  const submitExpense = async () => {
    if (!amount || isNaN(Number(amount))) {
      toast.error("Enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          amount: Number(amount),
          category: "general",
          description,
          date: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Expense logged");
      resetForm();
    } catch {
      toast.error("Failed to log expense");
    } finally {
      setLoading(false);
    }
  };

  const submitNote = async () => {
    if (!title.trim()) {
      toast.error("Enter a title");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "note",
          title,
          content: content || title,
          tags: [],
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Note saved");
      resetForm();
    } catch {
      toast.error("Failed to save note");
    } finally {
      setLoading(false);
    }
  };

  const submitHealth = async () => {
    if (!healthType.trim()) {
      toast.error("Enter a health type");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: healthType,
          data: healthData ? { note: healthData } : {},
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Health entry logged");
      resetForm();
    } catch {
      toast.error("Failed to log health");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop when menu open */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* FAB with fan-out actions */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-center gap-3">
        {/* Action buttons */}
        {menuOpen &&
          ACTION_BUTTONS.map((action, i) => (
            <button
              key={action.mode}
              onClick={() => handleAction(action.mode)}
              className={`flex h-10 items-center gap-2 rounded-full px-4 shadow-lg transition-all duration-200 ${action.color}`}
              style={{
                animationDelay: `${i * 50}ms`,
                animation: "fadeInUp 0.2s ease-out forwards",
                opacity: 0,
              }}
            >
              <action.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}

        {/* Main FAB */}
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </Button>
      </div>

      {/* Expense Dialog */}
      <Dialog open={mode === "expense"} onOpenChange={() => resetForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Log Expense
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number"
              placeholder="Amount (ILS)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button onClick={submitExpense} disabled={loading} className="w-full">
              {loading ? "Saving..." : "Log Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={mode === "note"} onOpenChange={() => resetForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              Add Note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Content (optional)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
            <Button onClick={submitNote} disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Health Dialog */}
      <Dialog open={mode === "health"} onOpenChange={() => resetForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              Log Health
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Type (e.g. sleep, exercise, mood)"
              value={healthType}
              onChange={(e) => setHealthType(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Details (optional)"
              value={healthData}
              onChange={(e) => setHealthData(e.target.value)}
            />
            <Button onClick={submitHealth} disabled={loading} className="w-full">
              {loading ? "Saving..." : "Log Health"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
