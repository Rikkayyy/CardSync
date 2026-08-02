"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type TransactionResponse = {
  accountName: string;
  date: string;
  name: string;
  merchantName: string | null;
  amount: number;
  isoCurrencyCode: string | null;
  category: string | null;
  pending: boolean;
};

export function TransactionList() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(() => {
    if (!token) return Promise.resolve<TransactionResponse[]>([]);
    return apiFetch<TransactionResponse[]>("/api/transactions", {}, token);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    fetchTransactions()
      .then((data) => {
        if (!cancelled) setTransactions(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load transactions.");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchTransactions]);

  async function handleSync() {
    setIsSyncing(true);
    setError(null);
    try {
      await apiFetch("/api/transactions/sync", { method: "POST" }, token);
      setTransactions(await fetchTransactions());
    } catch {
      setError("Couldn't sync transactions. Try again.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          Transactions
        </h2>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          {isSyncing ? "Syncing..." : "Sync"}
        </button>
      </div>

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
                </td>
                <td className="py-2 text-zinc-600 dark:text-zinc-400">
                  {t.accountName}
                </td>
                <td className="py-2 text-zinc-600 dark:text-zinc-400">
                  {t.category ?? "—"}
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
