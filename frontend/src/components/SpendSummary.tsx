"use client";

import { useEffect, useState } from "react";
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
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!summary) {
    return null;
  }

  const currency = summary.isoCurrencyCode;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Today</p>
          <p className="text-xl font-semibold text-black dark:text-zinc-50">
            {formatAmount(summary.totalToday, currency)}
          </p>
        </div>
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            This Week
          </p>
          <p className="text-xl font-semibold text-black dark:text-zinc-50">
            {formatAmount(summary.totalThisWeek, currency)}
          </p>
        </div>
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            This Month
          </p>
          <p className="text-xl font-semibold text-black dark:text-zinc-50">
            {formatAmount(summary.totalThisMonth, currency)}
          </p>
        </div>
      </div>

      {summary.byCategoryThisMonth.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            By category this month
          </h3>
          <ul className="flex flex-col gap-1 text-sm">
            {summary.byCategoryThisMonth.map((c) => (
              <li key={c.category} className="flex justify-between">
                <span className="text-black dark:text-zinc-50">
                  {formatCategory(c.category)}
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {formatAmount(c.total, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
