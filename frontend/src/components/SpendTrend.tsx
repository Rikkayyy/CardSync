import { useEffect, useMemo, useState } from "react";
import { CircleHelp, List } from "lucide-react";
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

type TransactionResponse = {
  date: string;
  name: string;
  merchantName: string | null;
  amount: number;
  isoCurrencyCode: string | null;
  isInternalTransfer: boolean;
};

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "DAY", label: "Daily" },
  { value: "WEEK", label: "Weekly" },
  { value: "MONTH", label: "Monthly" },
];

const AVERAGE_LABEL: Record<Granularity, string> = {
  DAY: "Daily average",
  WEEK: "Weekly average",
  MONTH: "Monthly average",
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatPeriodLabel(dateStr: string, granularity: Granularity): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (granularity === "MONTH") {
    return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function weekdayLabel(dateStr: string): string {
  if (dateStr === todayStr()) return "Today";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function formatMoney(amount: number, currency: string | null, fractionDigits = 0): string {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}${currency && currency !== "USD" ? ` ${currency}` : ""}`;
}

export function SpendTrend({ refreshKey }: { refreshKey: number }) {
  const { token } = useAuth();
  const [granularity, setGranularity] = useState<Granularity>("DAY");
  const [data, setData] = useState<SpendTrendResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<SpendTrendResponse>(`/api/transactions/trend?granularity=${granularity}`, {}, token)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setSelected(res.points.length > 0 ? res.points.length - 1 : null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load spend trend.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, granularity, refreshKey]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<TransactionResponse[]>("/api/transactions", {}, token)
      .then((res) => {
        if (!cancelled) setTransactions(res);
      })
      .catch(() => {
        // Top-transactions list is a convenience add-on; ignore failures here.
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  const points = useMemo(() => data?.points ?? [], [data]);
  const max = Math.max(1, ...points.map((p) => p.total));
  const currency = data?.isoCurrencyCode ?? "USD";
  const activeIndex = hovered ?? selected;

  const average =
    points.length > 0 ? points.reduce((sum, p) => sum + p.total, 0) / points.length : 0;

  const selectedPoint = selected !== null ? points[selected] : null;

  const topTransactions = useMemo(() => {
    if (!selectedPoint) return [];
    const start = new Date(`${selectedPoint.periodStart}T00:00:00`);
    const nextPoint = selected !== null ? points[selected + 1] : undefined;
    const end = nextPoint
      ? new Date(`${nextPoint.periodStart}T00:00:00`)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    return transactions
      .filter((t) => {
        if (t.isInternalTransfer || t.amount <= 0) return false;
        const d = new Date(`${t.date}T00:00:00`);
        return d >= start && d < end;
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions, selectedPoint, selected, points]);

  const isToday = granularity === "DAY" && selectedPoint?.periodStart === todayStr();

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Credit card usage</h2>

      <div className="flex gap-1 rounded-full border border-border bg-background p-1">
        {GRANULARITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setGranularity(opt.value)}
            className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              granularity === opt.value
                ? "border border-accent bg-surface text-accent"
                : "border border-transparent text-muted hover:bg-surface"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      {points.length > 0 && !showTable && (
        <>
          <div className="flex items-end justify-center gap-3">
            {points.map((p, i) => {
              const heightPct = Math.max(2, (p.total / max) * 100);
              return (
                <div
                  key={p.periodStart}
                  className="flex flex-1 max-w-[56px] flex-col items-center gap-1"
                >
                  <span className="text-xs font-medium tabular-nums text-foreground">
                    {formatMoney(p.total, null)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
                    className="flex h-32 w-full cursor-pointer items-end"
                    aria-label={`${formatPeriodLabel(p.periodStart, granularity)}: ${formatMoney(p.total, currency, 2)}`}
                  >
                    <span
                      className="w-full rounded-t-[4px] bg-[#2a78d6] transition-opacity dark:bg-[#3987e5]"
                      style={{
                        height: `${heightPct}%`,
                        opacity: activeIndex === null || activeIndex === i ? 1 : 0.55,
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-3 border-t border-border pt-1.5 text-xs text-muted">
            {points.map((p, i) => (
              <span
                key={p.periodStart}
                className={`flex-1 max-w-[56px] text-center ${
                  selected === i ? "font-semibold text-foreground underline" : ""
                }`}
              >
                {granularity === "DAY" ? weekdayLabel(p.periodStart) : formatPeriodLabel(p.periodStart, granularity)}
              </span>
            ))}
          </div>
        </>
      )}

      {points.length > 0 && showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-1.5 pr-3 font-medium">Period</th>
                <th className="py-1.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.periodStart} className="border-b border-border last:border-b-0">
                  <td className="py-1.5 pr-3 text-foreground">
                    {granularity === "DAY" ? weekdayLabel(p.periodStart) : formatPeriodLabel(p.periodStart, granularity)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-foreground">
                    {formatMoney(p.total, currency, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {points.length > 0 && (
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="flex cursor-pointer items-center justify-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          <List className="h-4 w-4" aria-hidden="true" />
          {showTable ? "See chart as bars" : "See chart as table"}
        </button>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted">{AVERAGE_LABEL[granularity]}</span>
        <span className="font-medium tabular-nums text-foreground">
          {formatMoney(average, currency, 2)}
        </span>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <h3 className="text-sm font-semibold text-foreground">
          {isToday ? "Today's top transactions" : "Top transactions"}
          {!isToday && selectedPoint && (
            <span className="ml-1 font-normal text-muted">
              — {formatPeriodLabel(selectedPoint.periodStart, granularity)}
            </span>
          )}
        </h3>
        {topTransactions.length === 0 ? (
          <p className="text-sm text-muted">
            We couldn't find any transactions {isToday ? "today" : "for this period"}.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {topTransactions.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-2.5 text-sm">
                <span className="truncate text-foreground">{t.merchantName ?? t.name}</span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {formatMoney(t.amount, t.isoCurrencyCode, 2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <CircleHelp className="h-5 w-5 text-muted" aria-hidden="true" />
        <button
          type="button"
          onClick={() =>
            document.getElementById("spend-summary")?.scrollIntoView({ behavior: "smooth" })
          }
          className="cursor-pointer rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
        >
          See spending summary
        </button>
      </div>
    </div>
  );
}
