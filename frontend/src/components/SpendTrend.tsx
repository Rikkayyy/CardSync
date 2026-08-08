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

function weekdayInitial(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "narrow" });
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
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Spend trend</h2>
        <div className="flex gap-1 rounded-full border border-border p-1">
          {GRANULARITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGranularity(opt.value)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                granularity === opt.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:bg-background"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

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

      {points.length > 0 && granularity === "DAY" && (
        <div className="flex gap-[2px] text-xs text-[#898781]">
          {points.map((p) => (
            <span key={p.periodStart} className="flex-1 max-w-[24px] text-center">
              {weekdayInitial(p.periodStart)}
            </span>
          ))}
        </div>
      )}

      {points.length > 0 && granularity !== "DAY" && (
        <div className="flex justify-between text-xs text-[#898781]">
          <span>{formatPeriodLabel(points[0].periodStart, granularity)}</span>
          <span>{formatPeriodLabel(points[points.length - 1].periodStart, granularity)}</span>
        </div>
      )}
    </div>
  );
}
