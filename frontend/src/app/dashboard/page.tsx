"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { TransactionList } from "@/components/TransactionList";

export default function DashboardPage() {
  const { token, email, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

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
      <TransactionList />
    </div>
  );
}
