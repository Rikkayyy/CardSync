"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type Granularity = "DAY" | "WEEK" | "MONTH";

type TrendPoint = {
  periodStart: string;
  total: number;
};

type SpendTrendResponse = {
  granularity: Granularity;
  isoCurrencyCode: string | null;
  points: TrendPoint[];
};

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "DAY", label: "Day" },
  { value: "WEEK", label: "Week" },
  { value: "MONTH", label: "Month" },
];

function formatPeriodLabel(dateStr: string, granularity: Granularity): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (granularity === "MONTH") {
    return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SpendTrend({ refreshKey }: { refreshKey: number }) {
  const { token } = useAuth();
  const [granularity, setGranularity] = useState<Granularity>("DAY");
  const [data, setData] = useState<SpendTrendResponse | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<SpendTrendResponse>(`/api/transactions/trend?granularity=${granularity}`, {}, token)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load spend trend.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, granularity, refreshKey]);

  const points = data?.points ?? [];
  const max = Math.max(1, ...points.map((p) => p.total));
  const currency = data?.isoCurrencyCode ?? "";

  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          Spend trend
        </h2>
        <div className="flex gap-1 rounded-full border border-black/[.08] p-1 dark:border-white/[.145]">
          {GRANULARITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGranularity(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                granularity === opt.value
                  ? "bg-foreground text-background"
                  : "text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.08]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {points.length > 0 && (
        <div className="relative flex h-40 items-end gap-[2px] border-b border-[#c3c2b7] dark:border-[#383835]">
          {points.map((p, i) => {
            const heightPct = Math.max(2, (p.total / max) * 100);
            return (
              <div
                key={p.periodStart}
                className="group relative flex-1 max-w-[24px]"
                style={{ height: "100%" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              >
                <div
                  className="absolute bottom-0 w-full rounded-t-[4px] bg-[#2a78d6] transition-opacity dark:bg-[#3987e5]"
                  style={{
                    height: `${heightPct}%`,
                    opacity: hovered === null || hovered === i ? 1 : 0.55,
                  }}
                />
                {hovered === i && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-xs text-white shadow-md dark:bg-zinc-100 dark:text-black">
                    <span className="font-semibold">
                      {p.total.toFixed(2)} {currency}
                    </span>
                    <span className="ml-1.5 text-[#c3c2b7] dark:text-[#52514e]">
                      {formatPeriodLabel(p.periodStart, granularity)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {points.length > 0 && (
        <div className="flex justify-between text-xs text-[#898781]">
          <span>{formatPeriodLabel(points[0].periodStart, granularity)}</span>
          <span>{formatPeriodLabel(points[points.length - 1].periodStart, granularity)}</span>
        </div>
      )}
    </div>
  );
}
