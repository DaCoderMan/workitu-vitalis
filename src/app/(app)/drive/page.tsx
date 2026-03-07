"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Folder,
  FileText,
  FileSpreadsheet,
  Image,
  FileIcon,
  Film,
  Presentation,
  File,
  RefreshCw,
  ChevronRight,
  HardDrive,
  ExternalLink,
  Users,
  Clock,
} from "lucide-react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  size: number | null;
  webViewLink: string | null;
  shared: boolean;
  parentId: string | null;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType === "application/vnd.google-apps.folder") return Folder;
  if (mimeType.includes("document") || mimeType.includes("text")) return FileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv")) return FileSpreadsheet;
  if (mimeType.includes("presentation") || mimeType.includes("slide")) return Presentation;
  if (mimeType.includes("pdf")) return FileIcon;
  if (mimeType.includes("image")) return Image;
  if (mimeType.includes("video")) return Film;
  return File;
}

function getFileColor(mimeType: string) {
  if (mimeType === "application/vnd.google-apps.folder") return "text-yellow-400";
  if (mimeType.includes("document") || mimeType.includes("text")) return "text-blue-400";
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv")) return "text-green-400";
  if (mimeType.includes("presentation") || mimeType.includes("slide")) return "text-orange-400";
  if (mimeType.includes("pdf")) return "text-red-400";
  if (mimeType.includes("image")) return "text-purple-400";
  if (mimeType.includes("video")) return "text-pink-400";
  return "text-muted-foreground";
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function DrivePage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: "root", name: "My Drive" },
  ]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.set("q", searchQuery);
      } else {
        params.set("folderId", currentFolderId);
      }

      const res = await fetch(`/api/drive?${params}`);
      const data = await res.json();

      if (data.error && !data.files) {
        setError(data.error);
        setFiles([]);
      } else {
        setFiles(data.files ?? []);
        if (data.lastSyncedAt) setLastSynced(data.lastSyncedAt);
        if (data.error) setError(data.error);
      }
    } catch {
      setError("Failed to fetch files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, searchQuery]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/google/sync?type=drive", { method: "POST" });
      await fetchFiles();
    } catch {
      setError("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    if (searchInput) {
      setBreadcrumbs([{ id: "root", name: "My Drive" }]);
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  const navigateToFolder = (file: DriveFile) => {
    if (file.mimeType !== "application/vnd.google-apps.folder") return;
    setSearchInput("");
    setSearchQuery("");
    setBreadcrumbs((prev) => [...prev, { id: file.id, name: file.name }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    setSearchInput("");
    setSearchQuery("");
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const isFolder = (mimeType: string) =>
    mimeType === "application/vnd.google-apps.folder";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-primary" />
            Drive
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and search your Google Drive files
          </p>
        </div>
      </div>

      {/* Sync Banner */}
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {lastSynced ? (
            <span>Last synced: {formatRelativeTime(lastSynced)}</span>
          ) : (
            <span>Not synced yet</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files and folders..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {searchQuery && (
          <Button type="button" variant="ghost" onClick={handleClearSearch}>
            Clear
          </Button>
        )}
      </form>

      {/* Breadcrumbs */}
      {!searchQuery && (
        <div className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <button
                onClick={() => navigateToBreadcrumb(i)}
                className={`rounded px-1.5 py-0.5 transition-colors hover:bg-accent ${
                  i === breadcrumbs.length - 1
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          Search results for &quot;{searchQuery}&quot;
        </p>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-300">{error}</p>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && files.length === 0 && !error && (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <HardDrive className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No files found</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            {searchQuery
              ? `No files match "${searchQuery}". Try a different search term.`
              : "Connect your Google account to browse Drive files. Use the Sync button to pull your files."}
          </p>
          {!searchQuery && (
            <Button onClick={handleSync} className="mt-4 gap-2" disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync Drive
            </Button>
          )}
        </Card>
      )}

      {/* File Grid */}
      {!loading && files.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {files.map((file) => {
            const Icon = getFileIcon(file.mimeType);
            const color = getFileColor(file.mimeType);
            const folder = isFolder(file.mimeType);

            return (
              <Card
                key={file.id}
                className="group relative p-4 transition-colors hover:bg-accent/50 cursor-pointer"
                onClick={() => {
                  if (folder) {
                    navigateToFolder(file);
                  } else if (file.webViewLink) {
                    window.open(file.webViewLink, "_blank", "noopener");
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg bg-accent/50 p-2 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {file.modifiedTime && (
                        <span>{formatRelativeTime(file.modifiedTime)}</span>
                      )}
                      {file.size != null && file.size > 0 && (
                        <>
                          <span>-</span>
                          <span>{formatFileSize(file.size)}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {file.shared && (
                        <Badge variant="outline" className="text-[10px] gap-1 py-0">
                          <Users className="h-2.5 w-2.5" />
                          Shared
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!folder && file.webViewLink && (
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
