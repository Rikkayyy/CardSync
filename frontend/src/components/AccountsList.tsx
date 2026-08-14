import { useEffect, useState } from "react";
import {
  Banknote,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Info,
  Landmark,
  PiggyBank,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type AccountResponse = {
  institutionName: string | null;
  accountName: string;
  mask: string | null;
  currentBalance: number | null;
  type: string | null;
  subtype: string | null;
};

const balanceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function AccountRow({ a }: { a: AccountResponse }) {
  return (
    <li className="flex items-center justify-between gap-2.5 py-2 pl-9 pr-1 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{a.accountName}</p>
        <p className="truncate text-xs text-muted">
          {a.mask ? `••${a.mask}` : ""}
          {a.mask && a.institutionName ? " | " : ""}
          {a.institutionName ?? ""}
        </p>
      </div>
      {a.currentBalance != null && (
        <span className="shrink-0 font-medium tabular-nums text-foreground">
          {balanceFormatter.format(a.currentBalance)}
        </span>
      )}
    </li>
  );
}

type Section = {
  key: string;
  label: string;
  icon: LucideIcon;
  accounts: AccountResponse[];
};

export function AccountsList({ refreshKey }: { refreshKey: number }) {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const checking = accounts.filter((a) => a.type === "depository" && a.subtype === "checking");
  const savings = accounts.filter((a) => a.type === "depository" && a.subtype === "savings");
  const cards = accounts.filter((a) => a.type === "credit");
  const investments = accounts.filter((a) => a.type === "investment");
  const other = accounts.filter(
    (a) => !checking.includes(a) && !savings.includes(a) && !cards.includes(a) && !investments.includes(a),
  );

  const sum = (list: AccountResponse[]) =>
    list.reduce((total, a) => total + (a.currentBalance ?? 0), 0);
  const netCash = sum(checking) + sum(savings);

  const beforeNetCash: Section[] = [
    { key: "checking", label: "Checking", icon: Landmark, accounts: checking },
    { key: "cards", label: "Card Balance", icon: CreditCard, accounts: cards },
  ];
  const afterNetCash: Section[] = [
    { key: "savings", label: "Savings", icon: PiggyBank, accounts: savings },
    { key: "investments", label: "Investments", icon: TrendingUp, accounts: investments },
    { key: "other", label: "Other", icon: Landmark, accounts: other },
  ];
  const hasCash = checking.length > 0 || savings.length > 0;

  function renderSection(section: Section) {
    if (section.accounts.length === 0) return null;
    const isOpen = expanded === section.key;
    const Icon = section.icon;
    return (
      <div key={section.key}>
        <button
          type="button"
          onClick={() => setExpanded(isOpen ? null : section.key)}
          className="flex w-full cursor-pointer items-center justify-between gap-2.5 px-3 py-2.5 text-sm"
        >
          <span className="flex items-center gap-2.5 text-foreground">
            <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            {section.label}
          </span>
          <span className="flex items-center gap-1.5 font-medium tabular-nums text-foreground">
            {balanceFormatter.format(sum(section.accounts))}
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
            )}
          </span>
        </button>
        {isOpen && (
          <ul className="flex flex-col divide-y divide-border border-t border-border bg-surface">
            {section.accounts.map((a, j) => (
              <AccountRow key={j} a={a} />
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background">
      {beforeNetCash.map(renderSection)}

      {hasCash && (
        <div className="flex items-center justify-between gap-2.5 bg-background/60 px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2.5 text-foreground">
            <Banknote className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            Net Cash
          </span>
          <span className="flex items-center gap-1.5 font-medium tabular-nums text-positive">
            {balanceFormatter.format(netCash)}
            <Info className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
          </span>
        </div>
      )}

      {afterNetCash.map(renderSection)}
    </div>
  );
}
