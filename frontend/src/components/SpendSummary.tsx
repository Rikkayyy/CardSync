"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CalendarRange, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type CategoryTotal = {
  category: string;
  total: number;
};

type SpendSummaryResponse = {
  totalToday: number;
  totalThisWeek: number;
  totalThisMonth: number;
  isoCurrencyCode: string | null;
  byCategoryThisMonth: CategoryTotal[];
};

function formatCategory(value: string): string {
  if (!/^[A-Z_]+$/.test(value)) return value;
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatAmount(amount: number, currency: string | null): string {
  return `${amount.toFixed(2)} ${currency ?? ""}`.trim();
}

export function SpendSummary({ refreshKey }: { refreshKey: number }) {
  const { token } = useAuth();
  const [summary, setSummary] = useState<SpendSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<SpendSummaryResponse>("/api/transactions/summary", {}, token)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load spend summary.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  if (error) {
    return <p className="text-sm text-negative">{error}</p>;
  }

  if (!summary) {
    return null;
  }

  const currency = summary.isoCurrencyCode;
  const maxCategoryTotal = Math.max(1, ...summary.byCategoryThisMonth.map((c) => c.total));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 shadow-sm">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            Today
          </span>
          <p className="text-xl font-semibold text-foreground">
            {formatAmount(summary.totalToday, currency)}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 shadow-sm">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
            This week
          </span>
          <p className="text-xl font-semibold text-foreground">
            {formatAmount(summary.totalThisWeek, currency)}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 shadow-sm">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            This month
          </span>
          <p className="text-xl font-semibold text-foreground">
            {formatAmount(summary.totalThisMonth, currency)}
          </p>
        </div>
      </div>

      {summary.byCategoryThisMonth.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="text-sm font-medium text-muted">By category this month</h3>
          <ul className="flex flex-col gap-2.5">
            {summary.byCategoryThisMonth.map((c) => (
              <li key={c.category} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">{formatCategory(c.category)}</span>
                  <span className="text-muted">{formatAmount(c.total, currency)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(2, (c.total / maxCategoryTotal) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
