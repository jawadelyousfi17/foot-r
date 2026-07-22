"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { searchSite, type SearchResults } from "@/app/search/actions";

const noResults: SearchResults = { teams: [], players: [] };

export function SiteSearch({ onNavigate, autoFocus }: { onNavigate?: () => void; autoFocus?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(noResults);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  // Only the newest request may write results — slow earlier ones are dropped.
  const latest = useRef(0);

  useEffect(() => {
    const term = query.trim();
    // Too short to search: invalidate anything in flight and leave state alone.
    if (term.length < 2) {
      latest.current += 1;
      return;
    }
    const request = ++latest.current;
    const timer = setTimeout(async () => {
      try {
        const found = await searchSite(term);
        if (request === latest.current) setResults(found);
      } catch {
        if (request === latest.current) setResults(noResults);
      } finally {
        if (request === latest.current) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function close() {
    setOpen(false);
    setQuery("");
    onNavigate?.();
  }

  const term = query.trim();
  const total = results.teams.length + results.players.length;
  const showPanel = open && term.length >= 2;

  return (
    <div ref={container} className="relative w-full">
      <label className="relative flex items-center">
        <span className="pointer-events-none absolute left-4 text-white/40"><Icon name="search" size={18} /></span>
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            setLoading(next.trim().length >= 2);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); event.currentTarget.blur(); } }}
          placeholder="Search players and teams"
          className="h-11 w-full rounded-full border border-white/5 bg-white/[.06] pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-white/15 focus:bg-white/10"
        />
      </label>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111] p-2 shadow-2xl shadow-black/60">
          {loading && !total && <p className="px-3 py-4 text-sm text-white/40">Searching…</p>}
          {!loading && !total && <p className="px-3 py-4 text-sm text-white/40">Nothing matches “{term}”.</p>}

          {!!results.teams.length && (
            <>
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[.15em] text-white/35">Teams</p>
              {results.teams.map((team) => (
                <Link key={team.id} href={`/teams/${team.slug}`} onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 bg-cover bg-center text-xs font-black text-white" style={team.logoUrl ? { backgroundImage: `url(${team.logoUrl})` } : undefined}>
                    {team.logoUrl ? null : (team.shortName || team.name.slice(0, 2).toUpperCase())}
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate text-sm text-white">{team.name}</b>
                    <small className="text-white/40">{team.players} player{team.players === 1 ? "" : "s"}</small>
                  </span>
                </Link>
              ))}
            </>
          )}

          {!!results.players.length && (
            <>
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[.15em] text-white/35">Players</p>
              {results.players.map((player) => {
                const row = (
                  <>
                    <span className="size-9 shrink-0 rounded-full bg-white/10 bg-cover bg-center" style={player.imageUrl ? { backgroundImage: `url(${player.imageUrl})` } : undefined} />
                    <span className="min-w-0">
                      <b className="block truncate text-sm text-white">{player.name}</b>
                      <small className="block truncate text-white/40">
                        {player.login && <span className="font-mono">{player.login}</span>}
                        {player.login && player.teamName && " · "}
                        {player.teamName ?? (player.login ? "" : "Free agent")}
                      </small>
                    </span>
                  </>
                );
                // No standalone player page exists, so a player opens their team.
                return player.teamSlug ? (
                  <Link key={player.id} href={`/teams/${player.teamSlug}`} onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/5">{row}</Link>
                ) : (
                  <div key={player.id} className="flex items-center gap-3 rounded-xl px-3 py-2 opacity-60">{row}</div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
