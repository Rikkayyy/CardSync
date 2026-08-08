"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { AccountsList } from "@/components/AccountsList";
import { CategoryGroups } from "@/components/CategoryGroups";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { SpendSummary } from "@/components/SpendSummary";
import { SpendTrend } from "@/components/SpendTrend";
import { TransactionList } from "@/components/TransactionList";

export default function DashboardPage() {
  const { token, email, logout, ready } = useAuth();
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (ready && !token) {
      router.push("/login");
    }
  }, [ready, token, router]);

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
    <div className="flex flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Landmark className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-foreground">CardSync</span>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-sm text-muted sm:block">{email}</p>
            <button
              type="button"
              onClick={logout}
              className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-base font-semibold text-foreground">Linked accounts</h1>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted">
                {lastSyncedAt
                  ? `Last synced ${lastSyncedAt.toLocaleTimeString()}`
                  : isSyncing
                    ? "Syncing…"
                    : "Not synced yet"}
              </p>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {isSyncing ? "Syncing" : "Sync"}
              </button>
            </div>
          </div>

          <AccountsList refreshKey={refreshKey} />
          <PlaidLinkButton onLinked={handleManualSync} />

          {syncError && <p className="text-sm text-negative">{syncError}</p>}
        </div>

        <SpendSummary refreshKey={refreshKey} />
        <SpendTrend refreshKey={refreshKey} />
        <CategoryGroups onChange={() => setRefreshKey((key) => key + 1)} />
        <TransactionList refreshKey={refreshKey} />
      </main>
    </div>
  );
}
