"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Moon,
  Brain,
  Lightbulb,
  Database,
  Settings,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sleep", label: "Sleep Lab", icon: Moon },
  { href: "/mood", label: "Mood Tracker", icon: Brain },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/data", label: "Data", icon: Database },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-3.5rem-1px)] overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 top-14 z-50 flex flex-col border-r border-border/40 bg-sidebar transition-all duration-300 md:relative md:top-0",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-14 items-center justify-between px-3">
          {!collapsed && (
            <span className="text-sm font-semibold text-muted-foreground">
              Navigation
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            className="hidden md:flex"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              className={cn(
                "size-4 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-2 py-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 text-emerald-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <item.icon
                  className={cn(
                    "size-5 shrink-0",
                    isActive && "text-emerald-400"
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User avatar */}
        <div
          className={cn(
            "border-t border-border/40 p-3",
            collapsed ? "flex justify-center" : "flex items-center gap-3"
          )}
        >
          <Avatar className="size-8 border border-border">
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-bold text-white">
              U
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">User</p>
              <p className="truncate text-xs text-muted-foreground">
                vitalis user
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex h-12 items-center border-b border-border/40 px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <span className="ml-3 text-sm font-semibold">
            {navItems.find((i) => pathname.startsWith(i.href))?.label ??
              "Vitalis"}
          </span>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
