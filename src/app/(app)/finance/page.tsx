"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TransactionType {
  _id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
  source?: string;
}

interface Summary {
  income: number;
  expenses: number;
  net: number;
  count: number;
}

interface ChartPoint {
  date: string;
  income: number;
  expenses: number;
}

const INCOME_CATEGORIES = [
  "freelance",
  "client payment",
  "consulting",
  "product sale",
  "refund",
  "other income",
];

const EXPENSE_CATEGORIES = [
  "rent",
  "arnona",
  "BTL",
  "food",
  "transport",
  "subscriptions",
  "tools",
  "marketing",
  "health",
  "utilities",
  "other expense",
];

function formatChartDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IL", { month: "short", day: "numeric" });
}

function formatCurrency(value: number) {
  return `₪${value.toLocaleString()}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="mb-1 text-xs text-muted-foreground">
        {label ? formatChartDate(label) : ""}
      </p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-sm font-medium"
          style={{ color: entry.color }}
        >
          {entry.dataKey === "income" ? "Income" : "Expenses"}:{" "}
          {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  // Chart data
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  // Form
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("type", filter);
      const res = await fetch(`/api/finance?${params}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      setSummary(data.summary || null);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchChartData = useCallback(async () => {
    setChartLoading(true);
    try {
      const res = await fetch("/api/charts?type=revenue&days=30");
      const json = await res.json();
      setChartData(json.data ?? []);
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Monthly comparison — compute from transactions
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    let thisIncome = 0;
    let thisExpenses = 0;
    let lastIncome = 0;
    let lastExpenses = 0;

    for (const t of transactions) {
      const d = new Date(t.date);
      if (d >= thisMonthStart) {
        if (t.type === "income") thisIncome += t.amount;
        else thisExpenses += t.amount;
      } else if (d >= lastMonthStart && d <= lastMonthEnd) {
        if (t.type === "income") lastIncome += t.amount;
        else lastExpenses += t.amount;
      }
    }

    const incomeDelta = lastIncome > 0
      ? ((thisIncome - lastIncome) / lastIncome) * 100
      : thisIncome > 0
        ? 100
        : 0;
    const expenseDelta = lastExpenses > 0
      ? ((thisExpenses - lastExpenses) / lastExpenses) * 100
      : thisExpenses > 0
        ? 100
        : 0;

    return {
      thisIncome,
      thisExpenses,
      lastIncome,
      lastExpenses,
      incomeDelta,
      expenseDelta,
    };
  }, [transactions]);

  const createTransaction = async () => {
    if (!formAmount || !formCategory) return;
    setCreating(true);
    try {
      await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          amount: parseFloat(formAmount),
          category: formCategory,
          description: formDescription,
          date: formDate,
        }),
      });
      setFormAmount("");
      setFormCategory("");
      setFormDescription("");
      setShowCreate(false);
      fetchData();
      fetchChartData();
    } finally {
      setCreating(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/finance/${id}`, { method: "DELETE" });
    fetchData();
    fetchChartData();
  };

  const categories =
    formType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <h1 className="text-2xl font-bold">Finance</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Track income, expenses, and cash flow
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              fetchData();
              fetchChartData();
            }}
          >
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
            {showCreate ? "Cancel" : "Add"}
          </Button>
        </div>
      </div>

      {/* 30-Day Overview Chart */}
      {chartLoading ? (
        <Card className="p-4">
          <Skeleton className="mb-4 h-5 w-36" />
          <Skeleton className="h-[200px] w-full" />
        </Card>
      ) : (
        <Card className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">30-Day Overview</h3>
          </div>

          {chartData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="financeIncomeGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="oklch(0.723 0.219 149.579)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="oklch(0.723 0.219 149.579)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="financeExpenseGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="oklch(0.637 0.237 25.331)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="oklch(0.637 0.237 25.331)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  className="text-xs"
                  tick={{ fill: "oklch(0.556 0 0)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `₪${v}`}
                  className="text-xs"
                  tick={{ fill: "oklch(0.556 0 0)" }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="oklch(0.723 0.219 149.579)"
                  strokeWidth={2}
                  fill="url(#financeIncomeGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="oklch(0.637 0.237 25.331)"
                  strokeWidth={2}
                  fill="url(#financeExpenseGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}

      {/* Monthly Comparison */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Monthly Comparison</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* This Month */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              This Month
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Income</span>
              <span className="text-sm font-semibold text-green-500">
                {formatCurrency(monthlyComparison.thisIncome)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expenses</span>
              <span className="text-sm font-semibold text-red-500">
                {formatCurrency(monthlyComparison.thisExpenses)}
              </span>
            </div>
          </div>

          {/* Last Month */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Last Month
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Income</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-green-500">
                  {formatCurrency(monthlyComparison.lastIncome)}
                </span>
                {monthlyComparison.incomeDelta !== 0 && (
                  <span
                    className={`flex items-center text-xs font-medium ${
                      monthlyComparison.incomeDelta > 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {monthlyComparison.incomeDelta > 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(Math.round(monthlyComparison.incomeDelta))}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expenses</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-red-500">
                  {formatCurrency(monthlyComparison.lastExpenses)}
                </span>
                {monthlyComparison.expenseDelta !== 0 && (
                  <span
                    className={`flex items-center text-xs font-medium ${
                      monthlyComparison.expenseDelta > 0
                        ? "text-red-500"
                        : "text-green-500"
                    }`}
                  >
                    {monthlyComparison.expenseDelta > 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(Math.round(monthlyComparison.expenseDelta))}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Income</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-green-500">
              {formatCurrency(summary.income)}
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Expenses</span>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-red-500">
              {formatCurrency(summary.expenses)}
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Net</span>
              <DollarSign className="h-4 w-4" />
            </div>
            <p
              className={`mt-1 text-2xl font-bold ${
                summary.net >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrency(summary.net)}
            </p>
          </Card>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <Card className="p-4 space-y-4 border-green-500/20">
          <h3 className="text-sm font-semibold">Add Transaction</h3>
          <div className="flex gap-2">
            <Button
              variant={formType === "income" ? "default" : "outline"}
              size="sm"
              onClick={() => setFormType("income")}
              className="gap-1"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Income
            </Button>
            <Button
              variant={formType === "expense" ? "default" : "outline"}
              size="sm"
              onClick={() => setFormType("expense")}
              className="gap-1"
            >
              <ArrowDownRight className="h-3.5 w-3.5" />
              Expense
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">
                Amount (₪)
              </label>
              <input
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select...</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Description
              </label>
              <input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <Button
            onClick={createTransaction}
            disabled={creating || !formAmount || !formCategory}
          >
            {creating ? "Saving..." : "Save Transaction"}
          </Button>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "income", "expense"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "income" ? "Income" : "Expenses"}
          </Button>
        ))}
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Loading transactions...
          </p>
        </div>
      ) : transactions.length === 0 ? (
        <Card className="flex h-48 items-center justify-center">
          <div className="text-center">
            <DollarSign className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No transactions yet
            </p>
            <p className="text-xs text-muted-foreground">
              Add one above or tell Ria: &quot;I got paid ₪500 for freelance
              work&quot;
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <Card key={t._id} className="flex items-center gap-3 p-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  t.type === "income"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {t.type === "income" ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {t.description || t.category}
                  </span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {t.category}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(t.date).toLocaleDateString()}
                </span>
              </div>
              <span
                className={`text-sm font-semibold shrink-0 ${
                  t.type === "income" ? "text-green-500" : "text-red-500"
                }`}
              >
                {t.type === "income" ? "+" : "-"}
                {formatCurrency(t.amount)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => deleteTransaction(t._id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
