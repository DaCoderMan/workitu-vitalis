"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Settings,
  MessageSquare,
  FolderGit2,
  ListChecks,
  Brain,
  TrendingUp,
  FileText,
  Zap,
  DollarSign,
  Users,
  Receipt,
  BarChart3,
  Heart,
  ChevronRight,
  HardDrive,
  Mail,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { SidebarXPBar } from "./sidebar-xp-bar";
import { SidebarBadge } from "./sidebar-badge";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeUrl?: string;
  badgeColor?: "red" | "amber";
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    label: "Main",
    defaultOpen: true,
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Chat", href: "/chat", icon: MessageSquare },
    ],
  },
  {
    id: "google",
    label: "Google",
    defaultOpen: true,
    items: [
      { label: "Drive", href: "/drive", icon: HardDrive },
      { label: "Inbox", href: "/inbox", icon: Mail, badgeUrl: "/api/gmail?unread=true&limit=100", badgeColor: "red" },
      { label: "Calendar", href: "/calendar", icon: CalendarDays },
    ],
  },
  {
    id: "business",
    label: "Business",
    defaultOpen: true,
    items: [
      { label: "Revenue", href: "/revenue", icon: TrendingUp },
      { label: "Finance", href: "/finance", icon: DollarSign },
      { label: "Invoices", href: "/invoices", icon: Receipt },
      { label: "Contacts", href: "/contacts", icon: Users },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    defaultOpen: false,
    items: [
      { label: "Health", href: "/health", icon: Heart },
      { label: "Knowledge", href: "/knowledge", icon: Brain },
      { label: "Vault", href: "/vault", icon: FileText },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    defaultOpen: false,
    items: [
      { label: "Projects", href: "/projects", icon: FolderGit2 },
      { label: "Tasks", href: "/tasks", icon: ListChecks, badgeUrl: "/api/clickup/tasks?filter=overdue", badgeColor: "amber" },
      { label: "Automations", href: "/automations", icon: Zap },
    ],
  },
];

const STORAGE_KEY = "ria-sidebar-groups";

function isItemActive(pathname: string, href: string): boolean {
  return href === "/chat" ? pathname.startsWith("/chat") : pathname === href;
}

function getGroupHasActivePath(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => isItemActive(pathname, item.href));
}

function normalizeOpenGroupState(
  raw: unknown,
  defaults: Record<string, boolean>
): Record<string, boolean> {
  const normalized = { ...defaults };
  if (!raw || typeof raw !== "object") return defaults;

  const saved = raw as Record<string, unknown>;
  for (const group of NAV_GROUPS) {
    if (typeof saved[group.id] === "boolean") {
      normalized[group.id] = saved[group.id] as boolean;
    }
  }

  return normalized;
}

// Deterministic initial state (same on server and client — no localStorage)
function getDefaultState(pathname: string): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const group of NAV_GROUPS) {
    const hasActive = getGroupHasActivePath(group, pathname);
    state[group.id] = hasActive || !!group.defaultOpen;
  }
  return state;
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    getDefaultState(pathname)
  );

  // Hydrate from localStorage after mount (deferred to avoid SSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        setOpenGroups((prev) => normalizeOpenGroupState(parsed, prev));
      }
    } catch {}
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
    } catch {}
  }, [openGroups]);

  // Auto-open group when navigating to a route in a closed group
  useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const group of NAV_GROUPS) {
        if (getGroupHasActivePath(group, pathname) && !next[group.id]) {
          next[group.id] = true;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [pathname]);

  const handleClick = () => {
    onNavigate?.();
  };

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-border bg-sidebar h-full">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link
          href="/dashboard"
          className="text-lg font-bold"
          onClick={handleClick}
        >
          Ria <span className="text-primary">AI</span>
        </Link>
        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          v4.0
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => (
          <Collapsible
            key={group.id}
            open={openGroups[group.id] ?? false}
            onOpenChange={(isOpen) =>
              setOpenGroups((prev) => ({ ...prev, [group.id]: isOpen }))
            }
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1.5 mt-2 first:mt-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </span>
              <ChevronRight
                className={cn(
                  "h-3 w-3 text-muted-foreground transition-transform duration-200",
                  openGroups[group.id] && "rotate-90"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = isItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleClick}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
                      isActive &&
                        "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                    {item.badgeUrl && (
                      <SidebarBadge url={item.badgeUrl} color={item.badgeColor} />
                    )}
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-2">
        <SidebarXPBar />
        <Link
          href="/settings"
          onClick={handleClick}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
            pathname === "/settings" &&
              "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
