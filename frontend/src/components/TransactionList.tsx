"use client";

import { useEffect, useState } from "react";
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
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Transactions
      </h2>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {transactions.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No transactions yet. Connect a bank account and sync.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
              <th className="py-2 font-medium">Date</th>
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Account</th>
              <th className="py-2 font-medium">Category</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => (
              <tr
                key={i}
                className="border-b border-black/[.04] dark:border-white/[.08]"
              >
                <td className="py-2 text-zinc-600 dark:text-zinc-400">
                  {t.date}
                </td>
                <td className="py-2 text-black dark:text-zinc-50">
                  {t.merchantName ?? t.name}
                  {t.pending && (
                    <span className="ml-2 text-xs text-zinc-500">
                      pending
                    </span>
                  )}
                  {t.isInternalTransfer && (
                    <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      transfer
                    </span>
                  )}
                </td>
                <td className="py-2 text-zinc-600 dark:text-zinc-400">
                  {t.accountName}
                </td>
                <td className="py-2 text-zinc-600 dark:text-zinc-400">
                  {formatCategory(t.categoryDetailed ?? t.categoryPrimary)}
                </td>
                <td className="py-2 text-right text-black dark:text-zinc-50">
                  {t.amount.toFixed(2)} {t.isoCurrencyCode ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
