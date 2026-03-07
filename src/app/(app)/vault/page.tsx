"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  FolderOpen,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

interface VaultNote {
  path: string;
  name?: string;
  size?: number;
  modified?: string;
}

interface VaultContent {
  content?: string;
  path?: string;
  frontmatter?: Record<string, unknown>;
}

export default function VaultPage() {
  const [notes, setNotes] = useState<VaultNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolder, setCurrentFolder] = useState("");
  const [selectedNote, setSelectedNote] = useState<VaultContent | null>(null);
  const [readingNote, setReadingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async (folder?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", folder: folder || "" }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setNotes([]);
      } else {
        const noteList = Array.isArray(data) ? data : data.notes || data.files || [];
        setNotes(noteList);
      }
    } catch {
      setError("Failed to connect to vault");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const searchNotes = async () => {
    if (!searchQuery.trim()) {
      fetchNotes(currentFolder);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", query: searchQuery }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setNotes([]);
      } else {
        const noteList = Array.isArray(data) ? data : data.results || data.notes || [];
        setNotes(noteList);
      }
    } catch {
      setError("Search failed");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const readNote = async (path: string) => {
    setReadingNote(true);
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", path }),
      });
      const data = await res.json();
      setSelectedNote({ content: data.content || data.text || JSON.stringify(data, null, 2), path });
    } catch {
      setSelectedNote({ content: "Failed to read note", path });
    } finally {
      setReadingNote(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const navigateFolder = (folder: string) => {
    setCurrentFolder(folder);
    setSelectedNote(null);
    fetchNotes(folder);
  };

  const goBack = () => {
    if (selectedNote) {
      setSelectedNote(null);
      return;
    }
    const parts = currentFolder.split("/").filter(Boolean);
    parts.pop();
    const parent = parts.join("/");
    setCurrentFolder(parent);
    fetchNotes(parent);
  };

  // Separate folders and files
  const folders = notes.filter(
    (n) => !n.path?.endsWith(".md") && !n.name?.endsWith(".md")
  );
  const files = notes.filter(
    (n) => n.path?.endsWith(".md") || n.name?.endsWith(".md")
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-500" />
          <h1 className="text-2xl font-bold">Document Vault</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse and search your Obsidian vault
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchNotes()}
            placeholder="Search vault..."
            className="w-full rounded-md border border-input bg-background px-9 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Button onClick={searchNotes} variant="secondary" size="sm">
          Search
        </Button>
        <Button
          onClick={() => {
            setSearchQuery("");
            fetchNotes(currentFolder);
          }}
          variant="ghost"
          size="icon"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Breadcrumb */}
      {(currentFolder || selectedNote) && (
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" onClick={goBack} className="gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <span className="text-muted-foreground">
            / {currentFolder || selectedNote?.path || "root"}
          </span>
        </div>
      )}

      {error && (
        <Card className="border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-400">{error}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Make sure VPS_API_KEY is configured and the VPS is online.
          </p>
        </Card>
      )}

      {/* Note Viewer */}
      {selectedNote ? (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {selectedNote.path}
          </h3>
          {readingNote ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <pre className="max-h-[600px] overflow-y-auto text-sm text-muted-foreground whitespace-pre-wrap rounded bg-muted p-4 font-mono">
              {selectedNote.content}
            </pre>
          )}
        </Card>
      ) : loading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading vault...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Folders */}
          {folders.map((folder) => {
            const name = folder.name || folder.path?.split("/").pop() || folder.path;
            return (
              <Card
                key={folder.path}
                className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-accent"
                onClick={() => navigateFolder(folder.path)}
              >
                <FolderOpen className="h-4 w-4 text-yellow-500" />
                <span className="flex-1 text-sm font-medium">{name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Card>
            );
          })}

          {/* Files */}
          {files.map((file) => {
            const name = file.name || file.path?.split("/").pop() || file.path;
            return (
              <Card
                key={file.path}
                className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-accent"
                onClick={() => readNote(file.path)}
              >
                <FileText className="h-4 w-4 text-blue-400" />
                <span className="flex-1 text-sm">{name}</span>
                {file.modified && (
                  <Badge variant="secondary" className="text-xs">
                    {new Date(file.modified).toLocaleDateString()}
                  </Badge>
                )}
              </Card>
            );
          })}

          {notes.length === 0 && !error && (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No results found" : "Vault is empty or not connected"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
