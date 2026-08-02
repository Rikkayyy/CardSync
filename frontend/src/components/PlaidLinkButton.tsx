"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

export function PlaidLinkButton() {
  const { token } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ linkToken: string }>(
      "/api/plaid/link-token",
      { method: "POST" },
      token
    )
      .then((res) => setLinkToken(res.linkToken))
      .catch(() => setError("Couldn't start the bank connection. Try again."));
  }, [token]);

  const onSuccess: PlaidLinkOnSuccess = useCallback(
    (publicToken) => {
      setIsExchanging(true);
      setError(null);
      apiFetch(
        "/api/plaid/exchange-token",
        {
          method: "POST",
          body: JSON.stringify({ publicToken }),
        },
        token
      )
        .then(() => setConnected(true))
        .catch(() => setError("Couldn't finish connecting your bank. Try again."))
        .finally(() => setIsExchanging(false));
    },
    [token]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  if (connected) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Bank account connected.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => open()}
        disabled={!ready || isExchanging}
        className="rounded-full bg-foreground px-5 py-2 text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {isExchanging ? "Connecting..." : "Connect a bank account"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
