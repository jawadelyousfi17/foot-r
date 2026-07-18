"use client";

import { useMemo, useState, type ReactNode } from "react";

type Item = {
  key: string;
  /** Group name, or null for knockout matches. */
  group: string | null;
  /** True when the match still misses its date (fixtures) or result (results). */
  unset: boolean;
  /** Lower-cased haystack for the search box (team names). */
  search: string;
  node: ReactNode;
};

export function MatchFilter({
  items,
  groups,
  hasKnockout,
  unsetLabel,
}: {
  items: Item[];
  groups: string[];
  hasKnockout: boolean;
  unsetLabel: string;
}) {
  const [onlyUnset, setOnlyUnset] = useState(false);
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        (!onlyUnset || item.unset) &&
        (group === "all" || (group === "__knockout" ? item.group === null : item.group === group)) &&
        (!q || item.search.includes(q)),
    );
  }, [items, onlyUnset, group, query]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search team…"
          className="h-9 w-full rounded-full border border-black/15 bg-white px-4 text-sm outline-none transition focus:border-black/40 sm:w-56"
        />
        <select
          value={group}
          onChange={(event) => setGroup(event.target.value)}
          className="h-9 rounded-full border border-black/15 bg-white px-3 text-sm font-bold outline-none transition focus:border-black/40"
        >
          <option value="all">All groups</option>
          {groups.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
          {hasKnockout && <option value="__knockout">Knockout</option>}
        </select>
        <label className="flex h-9 cursor-pointer select-none items-center gap-2 rounded-full border border-black/15 bg-white px-4 text-sm font-bold">
          <input
            type="checkbox"
            checked={onlyUnset}
            onChange={(event) => setOnlyUnset(event.target.checked)}
            className="size-4 accent-black"
          />
          {unsetLabel}
        </label>
        <span className="ml-auto text-sm text-black/40">
          {filtered.length}/{items.length} matches
        </span>
      </div>
      <div className="space-y-3">
        {filtered.map((item) => (
          <div key={item.key}>{item.node}</div>
        ))}
        {!filtered.length && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No matches for these filters.
          </p>
        )}
      </div>
    </div>
  );
}
