"use client";

import { useEffect, useState } from "react";
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
    <div className="flex w-full max-w-3xl flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
      <p className="font-medium text-black dark:text-zinc-50">Connected accounts</p>
      <ul className="flex flex-col gap-0.5">
        {accounts.map((a, i) => (
          <li key={i}>
            {a.institutionName ? `${a.institutionName} — ` : ""}
            {a.accountName}
            {a.mask ? ` ••${a.mask}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
