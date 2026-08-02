"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

export function PlaidLinkButton() {
  const { token } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const onSuccess: PlaidLinkOnSuccess = useCallback((publicToken) => {
    // TODO: send publicToken to POST /api/plaid/exchange-token once that endpoint exists.
    console.log("Plaid Link public_token:", publicToken);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <button
      type="button"
      onClick={() => open()}
      disabled={!ready}
      className="rounded-full bg-foreground px-5 py-2 text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
    >
      Connect a bank account
    </button>
  );
}
