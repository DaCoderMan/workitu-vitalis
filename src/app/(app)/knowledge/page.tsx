"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Plus, Trash2, Pencil, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KnowledgeEntry {
  _id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

const CATEGORIES = [
  "personal",
  "business",
  "finance",
  "health",
  "preferences",
  "contacts",
  "projects",
  "goals",
];

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [formCategory, setFormCategory] = useState("personal");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTags, setFormTags] = useState("");

  const loadEntries = useCallback(async () => {
    const url = filter
      ? `/api/knowledge?category=${filter}`
      : "/api/knowledge";
    const res = await fetch(url);
    const data = await res.json();
    setEntries(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleAdd = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;

    await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: formCategory,
        title: formTitle,
        content: formContent,
        tags: formTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });

    setFormTitle("");
    setFormContent("");
    setFormTags("");
    setShowAdd(false);
    loadEntries();
  };

  const handleUpdate = async (id: string) => {
    const entry = entries.find((e) => e._id === id);
    if (!entry) return;

    await fetch(`/api/knowledge/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: entry.category,
        title: entry.title,
        content: entry.content,
        tags: entry.tags,
      }),
    });

    setEditing(null);
    loadEntries();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    loadEntries();
  };

  const updateEntry = (id: string, field: string, value: string | string[]) => {
    setEntries((prev) =>
      prev.map((e) => (e._id === id ? { ...e, [field]: value } : e))
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-yellow-500" />
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything Ria knows about you. Add facts, preferences, and context
            to make her smarter.
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            !filter
              ? "bg-yellow-500 text-white"
              : "bg-card border border-border hover:bg-accent"
          )}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(filter === cat ? null : cat)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
              filter === cat
                ? "bg-yellow-500 text-white"
                : "bg-card border border-border hover:bg-accent"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <Card className="p-4 space-y-3">
          <div className="flex gap-3">
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Title (e.g. 'Revenue target')"
              className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
          </div>
          <textarea
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            placeholder="Content (e.g. 'Target is ₪7,000/mo by end of 2026')"
            rows={3}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-3">
            <input
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
            <Button onClick={handleAdd} size="sm" disabled={!formTitle || !formContent}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button
              onClick={() => setShowAdd(false)}
              size="sm"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Brain className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p className="text-lg font-medium">No knowledge entries yet</p>
          <p className="text-sm mt-1">
            Add facts about yourself, your business, preferences — anything Ria
            should know.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry._id} className="p-4">
              {editing === entry._id ? (
                <div className="space-y-2">
                  <input
                    value={entry.title}
                    onChange={(e) =>
                      updateEntry(entry._id, "title", e.target.value)
                    }
                    className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium"
                  />
                  <textarea
                    value={entry.content}
                    onChange={(e) =>
                      updateEntry(entry._id, "content", e.target.value)
                    }
                    rows={3}
                    className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(entry._id)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(null);
                        loadEntries();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-600 capitalize">
                          {entry.category}
                        </span>
                        <h3 className="text-sm font-medium">{entry.title}</h3>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">
                        {entry.content}
                      </p>
                      {entry.tags.length > 0 && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditing(entry._id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(entry._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
