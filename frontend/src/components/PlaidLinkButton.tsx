"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

export function PlaidLinkButton({ onLinked }: { onLinked: () => void }) {
  const { token } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const [fetchAttempt, setFetchAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ linkToken: string }>(
      "/api/plaid/link-token",
      { method: "POST" },
      token
    )
      .then((res) => setLinkToken(res.linkToken))
      .catch(() => setError("Couldn't start the bank connection. Try again."));
  }, [token, fetchAttempt]);

  const onSuccess: PlaidLinkOnSuccess = useCallback(
    (publicToken, metadata) => {
      setIsExchanging(true);
      setError(null);
      apiFetch(
        "/api/plaid/exchange-token",
        {
          method: "POST",
          body: JSON.stringify({
            publicToken,
            institutionId: metadata.institution?.institution_id ?? null,
            institutionName: metadata.institution?.name ?? null,
          }),
        },
        token
      )
        .then(() => {
          onLinked();
          setFetchAttempt((n) => n + 1);
        })
        .catch(() => setError("Couldn't finish connecting your bank. Try again."))
        .finally(() => setIsExchanging(false));
    },
    [token, onLinked]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => open()}
        disabled={!ready || isExchanging}
        className="flex cursor-pointer items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {isExchanging ? "Connecting..." : "Connect a bank account"}
      </button>
      {error && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setFetchAttempt((n) => n + 1);
          }}
          className="cursor-pointer text-sm text-negative underline"
        >
          {error} Retry?
        </button>
      )}
    </div>
  );
}
