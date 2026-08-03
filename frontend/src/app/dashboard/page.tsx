"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { SpendSummary } from "@/components/SpendSummary";
import { TransactionList } from "@/components/TransactionList";

export default function DashboardPage() {
  const { token, email, logout } = useAuth();
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setIsSyncing(true);
        return apiFetch("/api/transactions/sync", { method: "POST" }, token);
      })
      .then(() => {
        if (cancelled) return;
        setLastSyncedAt(new Date());
        setRefreshKey((key) => key + 1);
      })
      .catch(() => {
        if (!cancelled) setSyncError("Couldn't sync transactions.");
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleManualSync() {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await apiFetch("/api/transactions/sync", { method: "POST" }, token);
      setLastSyncedAt(new Date());
      setRefreshKey((key) => key + 1);
    } catch {
      setSyncError("Couldn't sync transactions. Try again.");
    } finally {
      setIsSyncing(false);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 px-16 py-32 dark:bg-black">
      <div className="flex w-full max-w-3xl items-center justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as {email}
        </p>
        <button
          type="button"
          onClick={logout}
          className="text-sm font-medium underline"
        >
          Log out
        </button>
      </div>

      <PlaidLinkButton />

      <div className="flex w-full max-w-3xl items-center justify-between">
        <p className="text-xs text-zinc-500">
          {lastSyncedAt
            ? `Last synced ${lastSyncedAt.toLocaleTimeString()}`
            : isSyncing
              ? "Syncing..."
              : "Not synced yet"}
        </p>
        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          {isSyncing ? "Syncing..." : "Sync"}
        </button>
      </div>
      {syncError && <p className="text-sm text-red-600">{syncError}</p>}

      <SpendSummary refreshKey={refreshKey} />
      <TransactionList refreshKey={refreshKey} />
    </div>
  );
}
