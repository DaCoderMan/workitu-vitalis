"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  X,
  Trash2,
  Mail,
  Phone,
  Building,
  Edit2,
} from "lucide-react";

interface ContactType {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  type: string;
  status: string;
  notes: string;
  tags: string[];
  lastContactedAt?: string;
  source?: string;
  updatedAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  lead: "text-amber-400 border-amber-500/30",
  client: "text-green-400 border-green-500/30",
  partner: "text-blue-400 border-blue-500/30",
  personal: "text-purple-400 border-purple-500/30",
  vendor: "text-orange-400 border-orange-500/30",
  other: "text-gray-400 border-gray-500/30",
};

const CONTACT_TYPES = ["lead", "client", "partner", "personal", "vendor", "other"] as const;

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formType, setFormType] = useState<string>("other");
  const [formNotes, setFormNotes] = useState("");
  const [formSource, setFormSource] = useState("");

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const createContact = async () => {
    if (!formName.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail || undefined,
          phone: formPhone || undefined,
          company: formCompany || undefined,
          role: formRole || undefined,
          type: formType,
          notes: formNotes,
          source: formSource || undefined,
        }),
      });
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      setFormCompany("");
      setFormRole("");
      setFormType("other");
      setFormNotes("");
      setFormSource("");
      setShowCreate(false);
      fetchContacts();
    } finally {
      setCreating(false);
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    fetchContacts();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <h1 className="text-2xl font-bold">Contacts</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            CRM — leads, clients, partners, and connections
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchContacts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
            {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreate ? "Cancel" : "Add"}
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchContacts()}
            placeholder="Search contacts..."
            className="w-full rounded-md border border-input bg-background px-9 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All types</option>
          {CONTACT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="p-4 space-y-4 border-blue-500/20">
          <h3 className="text-sm font-semibold">Add Contact</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Name *</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Phone</label>
              <input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+972..."
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Company</label>
              <input
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                placeholder="Company name"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Role</label>
              <input
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                placeholder="Job title"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CONTACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Source</label>
              <input
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                placeholder="Where you met"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes</label>
              <input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Notes about this contact"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <Button onClick={createContact} disabled={creating || !formName.trim()}>
            {creating ? "Creating..." : "Add Contact"}
          </Button>
        </Card>
      )}

      {/* Contacts List */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading contacts...</p>
        </div>
      ) : contacts.length === 0 ? (
        <Card className="flex h-48 items-center justify-center">
          <div className="text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No contacts yet</p>
            <p className="text-xs text-muted-foreground">
              Add one above or tell Ria: &quot;Add David Cohen as a lead&quot;
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <Card
              key={c._id}
              className="p-3 cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => setExpandedId(expandedId === c._id ? null : c._id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold">
                  {c.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.name}</span>
                    <Badge variant="outline" className={TYPE_COLORS[c.type] || ""}>
                      {c.type}
                    </Badge>
                    {c.status !== "active" && (
                      <Badge variant="secondary" className="text-muted-foreground">
                        {c.status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {c.company && (
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {c.company}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteContact(c._id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === c._id && (
                <div className="mt-3 pl-12 space-y-2 text-sm">
                  {c.role && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-16">Role:</span>
                      <span>{c.role}</span>
                    </div>
                  )}
                  {c.source && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-16">Source:</span>
                      <span>{c.source}</span>
                    </div>
                  )}
                  {c.notes && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-16">Notes:</span>
                      <span className="text-muted-foreground">{c.notes}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16">Updated:</span>
                    <span className="text-muted-foreground">
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </span>
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
