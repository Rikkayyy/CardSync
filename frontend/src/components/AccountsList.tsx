"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type AccountResponse = {
  institutionName: string | null;
  accountName: string;
  mask: string | null;
};

export function AccountsList({ refreshKey }: { refreshKey: number }) {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<AccountResponse[]>("/api/accounts", {}, token)
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .catch(() => {
        // Non-critical: the accounts list is a convenience display.
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  if (accounts.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1.5">
      {accounts.map((a, i) => (
        <li
          key={i}
          className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <CreditCard className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            {a.institutionName ? `${a.institutionName} — ` : ""}
            {a.accountName}
            {a.mask ? ` ••${a.mask}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
