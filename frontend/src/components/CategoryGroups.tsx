"use client";

import { useEffect, useState } from "react";
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
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Category groups
      </h2>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New group name (e.g. Work lunches)"
          className="flex-1 rounded-md border border-black/[.08] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.145]"
        />
        <button
          type="button"
          onClick={createGroup}
          className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background"
        >
          Create
        </button>
      </div>

      {groups.length > 0 && (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div key={group.id} className="rounded-md border border-black/[.08] p-3 dark:border-white/[.145]">
              <div className="flex items-center justify-between">
                <p className="font-medium text-black dark:text-zinc-50">{group.name}</p>
                <button
                  type="button"
                  onClick={() => deleteGroup(group.id)}
                  className="text-xs text-red-600 underline"
                >
                  Delete group
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {merchants
                  .filter((m) => m.groupId === group.id)
                  .map((m) => (
                    <span
                      key={m.normalizedMerchant}
                      className="flex items-center gap-1 rounded-full bg-black/[.06] px-2.5 py-1 text-xs text-zinc-700 dark:bg-white/[.1] dark:text-zinc-300"
                    >
                      {m.displayName}
                      <button
                        type="button"
                        onClick={() => m.memberId && unassignMerchant(m.memberId)}
                        className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100"
                        aria-label={`Remove ${m.displayName} from ${group.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                {merchants.filter((m) => m.groupId === group.id).length === 0 && (
                  <span className="text-xs text-zinc-500">No merchants assigned yet.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {merchants.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Merchants</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
                <th className="py-2 font-medium">Merchant</th>
                <th className="py-2 font-medium">Default category</th>
                <th className="py-2 font-medium">Group</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((m) => (
                <tr key={m.normalizedMerchant} className="border-b border-black/[.04] dark:border-white/[.08]">
                  <td className="py-2 text-black dark:text-zinc-50">{m.displayName}</td>
                  <td className="py-2 text-zinc-600 dark:text-zinc-400">
                    {formatCategory(m.effectiveCategoryPrimary)}
                  </td>
                  <td className="py-2">
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
                      className="rounded-md border border-black/[.08] bg-transparent px-2 py-1 text-sm dark:border-white/[.145]"
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
      )}
    </div>
  );
}
