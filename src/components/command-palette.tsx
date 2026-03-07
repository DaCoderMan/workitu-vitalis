"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  BarChart3,
  Heart,
  Brain,
  FileText,
  FolderGit2,
  ListChecks,
  Zap,
  Settings,
  Plus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

interface NavPage {
  label: string;
  href: string;
  icon: LucideIcon;
}

const PAGES: NavPage[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Revenue", href: "/revenue", icon: TrendingUp },
  { label: "Finance", href: "/finance", icon: DollarSign },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Health", href: "/health", icon: Heart },
  { label: "Knowledge", href: "/knowledge", icon: Brain },
  { label: "Vault", href: "/vault", icon: FileText },
  { label: "Projects", href: "/projects", icon: FolderGit2 },
  { label: "Tasks", href: "/tasks", icon: ListChecks },
  { label: "Automations", href: "/automations", icon: Zap },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "New Chat", href: "/chat", icon: Plus },
  { label: "Add Expense", href: "/finance?action=add", icon: DollarSign },
  { label: "New Contact", href: "/contacts?action=add", icon: UserPlus },
  { label: "Log Health", href: "/health?action=add", icon: Heart },
];

interface SearchResult {
  id: string;
  label: string;
  href: string;
}

// Module-level open function for programmatic access
let openPaletteFn: (() => void) | null = null;

export function openCommandPalette() {
  openPaletteFn?.();
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<SearchResult[]>([]);
  const [knowledge, setKnowledge] = useState<SearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Register the global opener
  useEffect(() => {
    openPaletteFn = () => setOpen(true);
    return () => {
      openPaletteFn = null;
    };
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Debounced dynamic search
  const fetchDynamic = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setContacts([]);
      setKnowledge([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const [contactsRes, knowledgeRes] = await Promise.all([
          fetch(`/api/contacts?q=${encodeURIComponent(q)}`).then((r) => r.json()),
          fetch(`/api/knowledge?q=${encodeURIComponent(q)}`).then((r) => r.json()),
        ]);

        setContacts(
          (contactsRes.contacts ?? []).slice(0, 5).map((c: { _id: string; name: string }) => ({
            id: c._id,
            label: c.name,
            href: `/contacts?id=${c._id}`,
          }))
        );

        setKnowledge(
          (knowledgeRes ?? []).slice(0, 5).map((k: { _id: string; title: string }) => ({
            id: k._id,
            label: k.title,
            href: `/knowledge?id=${k._id}`,
          }))
        );
      } catch {
        // Silently fail on search errors
      }
    }, 300);
  }, []);

  useEffect(() => {
    fetchDynamic(search);
  }, [search, fetchDynamic]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setSearch("");
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search pages, actions, contacts..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {PAGES.map((page) => (
            <CommandItem
              key={page.href}
              value={page.label}
              onSelect={() => handleSelect(page.href)}
            >
              <page.icon className="mr-2 h-4 w-4" />
              {page.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map((action) => (
            <CommandItem
              key={action.label}
              value={action.label}
              onSelect={() => handleSelect(action.href)}
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {contacts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Contacts">
              {contacts.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.label}
                  onSelect={() => handleSelect(c.href)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {c.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {knowledge.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Knowledge">
              {knowledge.map((k) => (
                <CommandItem
                  key={k.id}
                  value={k.label}
                  onSelect={() => handleSelect(k.href)}
                >
                  <Brain className="mr-2 h-4 w-4" />
                  {k.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
