"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Plus, X, RefreshCw, Trash2 } from "lucide-react";

interface InvoiceType {
  _id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  total: number;
  status: string;
  issuedDate: string;
  dueDate: string;
  currency: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "text-gray-400 border-gray-500/30",
  sent: "text-blue-400 border-blue-500/30",
  paid: "text-green-400 border-green-500/30",
  overdue: "text-red-400 border-red-500/30",
  cancelled: "text-muted-foreground border-border",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceType[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formClient, setFormClient] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      setInvoices(data.invoices || []);
      setSummary(data.summary || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const create = async () => {
    if (!formClient || !formAmount) return;
    setCreating(true);
    try {
      await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: formClient,
          clientEmail: formEmail || undefined,
          description: formDesc || "Service",
          amount: parseFloat(formAmount),
        }),
      });
      setFormClient(""); setFormEmail(""); setFormDesc(""); setFormAmount("");
      setShowCreate(false);
      fetchInvoices();
    } finally { setCreating(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchInvoices();
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    fetchInvoices();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-indigo-500" />
            <h1 className="text-2xl font-bold">Invoices</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Create and track client invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchInvoices}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
            {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreate ? "Cancel" : "New Invoice"}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Paid</span>
          <p className="mt-1 text-2xl font-bold text-green-500">₪{(summary.paid || 0).toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Pending</span>
          <p className="mt-1 text-2xl font-bold text-blue-500">₪{(summary.pending || 0).toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Overdue</span>
          <p className="mt-1 text-2xl font-bold text-red-500">₪{(summary.overdue || 0).toLocaleString()}</p>
        </Card>
      </div>

      {showCreate && (
        <Card className="p-4 space-y-3 border-indigo-500/20">
          <h3 className="text-sm font-semibold">Create Invoice</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={formClient} onChange={(e) => setFormClient(e.target.value)} placeholder="Client name *" className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Client email" className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Description" className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="Amount (₪)" className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <Button onClick={create} disabled={creating || !formClient || !formAmount}>
            {creating ? "Creating..." : "Create Invoice"}
          </Button>
        </Card>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>
      ) : invoices.length === 0 ? (
        <Card className="flex h-48 items-center justify-center">
          <div className="text-center">
            <Receipt className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No invoices yet</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Card key={inv._id} className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{inv.invoiceNumber}</span>
                  <span className="text-sm font-medium">{inv.clientName}</span>
                  <Badge variant="outline" className={STATUS_COLORS[inv.status] || ""}>{inv.status}</Badge>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>Issued: {new Date(inv.issuedDate).toLocaleDateString()}</span>
                  <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
              <span className="text-sm font-semibold shrink-0">₪{inv.total.toLocaleString()}</span>
              <div className="flex gap-1 shrink-0">
                {inv.status === "draft" && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus(inv._id, "sent")}>Send</Button>
                )}
                {inv.status === "sent" && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus(inv._id, "paid")}>Mark Paid</Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteInvoice(inv._id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
