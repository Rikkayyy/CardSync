"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type TransactionResponse = {
  accountName: string;
  date: string;
  name: string;
  merchantName: string | null;
  amount: number;
  isoCurrencyCode: string | null;
  categoryPrimary: string | null;
  categoryDetailed: string | null;
  pending: boolean;
  isInternalTransfer: boolean;
};

function formatCategory(value: string | null): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatAmount(amount: number, currency: string | null): string {
  const sign = amount < 0 ? "+" : "-";
  return `${sign}${Math.abs(amount).toFixed(2)} ${currency ?? ""}`.trim();
}

export function TransactionList({ refreshKey }: { refreshKey: number }) {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<TransactionResponse[]>("/api/transactions", {}, token)
      .then((data) => {
        if (!cancelled) setTransactions(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load transactions.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Transactions</h2>

      {error && <p className="text-sm text-negative">{error}</p>}

      {transactions.length === 0 ? (
        <p className="text-sm text-muted">No transactions yet. Connect a bank account and sync.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Account</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td className="py-2.5 pr-3 whitespace-nowrap text-muted">{t.date}</td>
                  <td className="py-2.5 pr-3 text-foreground">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{t.merchantName ?? t.name}</span>
                      {t.pending && <span className="text-xs text-muted">pending</span>}
                      {t.isInternalTransfer && (
                        <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                          <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
                          transfer
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="max-w-[160px] truncate py-2.5 pr-3 text-muted" title={t.accountName}>
                    {t.accountName}
                  </td>
                  <td className="max-w-[160px] py-2.5 pr-3 text-muted">
                    {formatCategory(t.categoryDetailed ?? t.categoryPrimary)}
                  </td>
                  <td
                    className={`py-2.5 text-right font-medium tabular-nums ${
                      t.amount < 0 ? "text-positive" : "text-foreground"
                    }`}
                  >
                    {formatAmount(t.amount, t.isoCurrencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
