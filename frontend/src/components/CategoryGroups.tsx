"use client";

import { useEffect, useState } from "react";
import { Tag, Trash2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type CategoryGroupResponse = {
  id: string;
  name: string;
  members: { id: string; type: string; value: string }[];
};

type MerchantSummaryResponse = {
  normalizedMerchant: string;
  displayName: string;
  effectiveCategoryPrimary: string | null;
  transactionCount: number;
  groupId: string | null;
  groupName: string | null;
  memberId: string | null;
};

function formatCategory(value: string | null): string {
  if (!value) return "—";
  if (!/^[A-Z_]+$/.test(value)) return value;
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function CategoryGroups({ onChange }: { onChange?: () => void }) {
  const { token } = useAuth();
  const [groups, setGroups] = useState<CategoryGroupResponse[]>([]);
  const [merchants, setMerchants] = useState<MerchantSummaryResponse[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([
      apiFetch<CategoryGroupResponse[]>("/api/category-groups", {}, token),
      apiFetch<MerchantSummaryResponse[]>("/api/category-groups/merchants", {}, token),
    ])
      .then(([groupsRes, merchantsRes]) => {
        if (!cancelled) {
          setGroups(groupsRes);
          setMerchants(merchantsRes);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load category groups.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
    onChange?.();
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    try {
      await apiFetch("/api/category-groups", { method: "POST", body: JSON.stringify({ name: newGroupName }) }, token);
      setNewGroupName("");
      refresh();
    } catch {
      setError("Couldn't create group.");
    }
  }

  async function deleteGroup(groupId: string) {
    try {
      await apiFetch(`/api/category-groups/${groupId}`, { method: "DELETE" }, token);
      refresh();
    } catch {
      setError("Couldn't delete group.");
    }
  }

  async function assignMerchant(merchant: string, groupId: string) {
    try {
      await apiFetch(
        `/api/category-groups/${groupId}/members`,
        { method: "POST", body: JSON.stringify({ type: "MERCHANT", value: merchant }) },
        token
      );
      refresh();
    } catch {
      setError("Couldn't assign merchant.");
    }
  }

  async function unassignMerchant(memberId: string) {
    try {
      await apiFetch(`/api/category-groups/members/${memberId}`, { method: "DELETE" }, token);
      refresh();
    } catch {
      setError("Couldn't unassign merchant.");
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Category groups</h2>

      {error && <p className="text-sm text-negative">{error}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createGroup()}
          placeholder="New group name (e.g. Work lunches)"
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="button"
          onClick={createGroup}
          className="cursor-pointer rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90"
        >
          Create
        </button>
      </div>

      {groups.length > 0 && (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div key={group.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-medium text-foreground">
                  <Tag className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  {group.name}
                </p>
                <button
                  type="button"
                  onClick={() => deleteGroup(group.id)}
                  className="flex cursor-pointer items-center gap-1 text-xs font-medium text-negative hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Delete group
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {merchants
                  .filter((m) => m.groupId === group.id)
                  .map((m) => (
                    <span
                      key={m.normalizedMerchant}
                      className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
                    >
                      {m.displayName}
                      <button
                        type="button"
                        onClick={() => m.memberId && unassignMerchant(m.memberId)}
                        className="cursor-pointer text-accent/70 hover:text-accent"
                        aria-label={`Remove ${m.displayName} from ${group.name}`}
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                {merchants.filter((m) => m.groupId === group.id).length === 0 && (
                  <span className="text-xs text-muted">No merchants assigned yet.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {merchants.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted">Merchants</p>
          <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border text-muted">
                  <th className="px-3 py-2 font-medium">Merchant</th>
                  <th className="px-3 py-2 font-medium">Default category</th>
                  <th className="px-3 py-2 font-medium">Group</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((m) => (
                  <tr key={m.normalizedMerchant} className="border-b border-border last:border-b-0">
                    <td className="max-w-xs truncate px-3 py-2 text-foreground" title={m.displayName}>
                      {m.displayName}
                    </td>
                    <td className="px-3 py-2 text-muted">{formatCategory(m.effectiveCategoryPrimary)}</td>
                    <td className="px-3 py-2">
                      <select
                        value={m.groupId ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value) {
                            assignMerchant(m.normalizedMerchant, value);
                          } else if (m.memberId) {
                            unassignMerchant(m.memberId);
                          }
                        }}
                        className="cursor-pointer rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
                      >
                        <option value="">— none —</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
