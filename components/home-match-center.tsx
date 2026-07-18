"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { useState } from "react";

type Team = { id: string; name: string; shortName: string | null; logoUrl: string | null };
type Standing = {
  position: number;
  team: { id: string; name: string; slug: string; logoUrl: string | null };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};
type Competition = {
  id: string;
  name: string;
  slug: string;
  status: string;
  matches: Array<{
    id: string;
    scheduledAt: string | null;
    status: string;
    groupName: string | null;
    isKnockout: boolean;
    round: number | null;
    homeTeam: Team;
    awayTeam: Team;
    homePlaceholder: string | null;
    awayPlaceholder: string | null;
    result: { homeScore: number; awayScore: number } | null;
  }>;
  tables: Array<{ id: string; name: string; rows: Standing[] }>;
};

const dayKey = (value: string) => value.slice(0, 10);

// Day key for "today + offset" (UTC-consistent with dayKey above).
function offsetDayKey(offset: number) {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}

function TeamMark({ team }: { team: { name: string; logoUrl: string | null } }) {
  return team.logoUrl ? (
    // Team logos are user-managed remote assets, so their hosts are not known at build time.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={team.logoUrl} alt="" className="size-7 rounded-full bg-white object-cover ring-1 ring-white/10" />
  ) : (
    <span className="grid size-7 place-items-center rounded-full bg-white/10 text-[10px] font-black">
      {team.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function dateLabel(key: string) {
  const date = new Date(`${key}T12:00:00`);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (key === todayKey) return "Today";
  if (key === tomorrow.toISOString().slice(0, 10)) return "Tomorrow";
  if (key === yesterday.toISOString().slice(0, 10)) return "Yesterday";
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

export function HomeMatchCenter({ competitions }: { competitions: Competition[] }) {
  const [view, setView] = useState<"matches" | "standings" | "knockout">("matches");
  const [dayOffset, setDayOffset] = useState(0);
  const competition = competitions[0];

  const selectedKey = offsetDayKey(dayOffset);
  const visibleMatches = (competition?.matches ?? [])
    .filter((match) => match.scheduledAt && dayKey(match.scheduledAt) === selectedKey)
    .sort((left, right) => (left.scheduledAt ?? "").localeCompare(right.scheduledAt ?? ""));

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-black px-3 py-5 text-white sm:px-5 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-[28px] bg-[#1b1b1b]">
          <div
            className="relative px-5 pb-5 pt-7 sm:px-8 sm:pt-8"
            style={{ backgroundImage: "linear-gradient(90deg,rgba(16,42,28,.82) 0%,rgba(33,46,35,.5) 34%,rgba(23,43,77,.42) 62%,rgba(17,53,143,.38) 100%), linear-gradient(108deg,#24442d 0%,#2f5a3c 24%,#2e4159 52%,#183e98 78%,#182e77 100%)" }}
          >
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{competition?.name ?? "Match center"}</h1>
            <p className="mt-1 text-sm font-medium text-white/70">Summer football</p>
          </div>
          <div className="flex gap-7 px-5 sm:px-8">
            {(["matches", "standings", "knockout"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setView(tab)}
                className={`relative py-3.5 text-sm font-medium capitalize transition sm:text-base ${view === tab ? "text-white" : "text-white/50 hover:text-white/80"}`}
              >
                {tab}
                {view === tab && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#61df6e]" />}
              </button>
            ))}
          </div>
        </section>

        {view === "matches" ? (
          <section className="mt-5 space-y-5">
            {/* Date nav + filter chips (FotMob-style) */}
            <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#1b1b1b]">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-3.5">
                <button onClick={() => setDayOffset((value) => value - 1)} aria-label="Previous day" className="grid size-9 place-items-center rounded-full bg-white/8 text-white/70 transition hover:bg-white/15"><Icon name="chevronLeft" size={18} /></button>
                <button onClick={() => setDayOffset(0)} className="flex items-center gap-1.5 text-base font-bold" title="Back to today">
                  {dateLabel(selectedKey)}
                  {dayOffset !== 0 && <span className="text-xs font-medium text-white/40">· tap to reset</span>}
                </button>
                <button onClick={() => setDayOffset((value) => value + 1)} aria-label="Next day" className="grid size-9 place-items-center rounded-full bg-white/8 text-white/70 transition hover:bg-white/15"><Icon name="chevronRight" size={18} /></button>
              </div>
            </div>

            {visibleMatches.length > 0 && (
              <div className="overflow-hidden rounded-3xl bg-[#1d1d1d]">
                <div>
                  {visibleMatches.map((match) => {
                    const live = ["FIRST_HALF", "SECOND_HALF", "HALF_TIME", "EXTRA_TIME", "PENALTIES", "IN_PROGRESS"].includes(match.status);
                    const done = Boolean(match.result) || match.status === "COMPLETED";
                    const time = match.scheduledAt ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(match.scheduledAt)) : "TBD";
                    return (
                      <Link href={`/matches/${match.id}`} key={match.id} className="flex items-center gap-2 border-t border-[#2a2a2a] px-3 py-4 transition first:border-t-0 hover:bg-white/[.03] sm:px-5">
                        <span className="grid h-8 w-11 shrink-0 place-items-center text-[10px] font-bold text-white/60">
                          {live ? <span className="rounded-full bg-[#dd3636]/15 px-2 py-1 text-[#ff6a6a]">LIVE</span> : done ? <span className="rounded-full bg-[#393939] px-2 py-1">FT</span> : null}
                        </span>
                        <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                          <span className="flex min-w-0 items-center justify-end gap-2 text-right">
                            <span className="truncate text-sm font-medium sm:text-base">{match.homeTeam.name}</span>
                            <TeamMark team={match.homeTeam} />
                          </span>
                          <span className="min-w-[3rem] text-center text-sm font-bold tabular-nums sm:text-base">
                            {done || live ? <>{match.result?.homeScore ?? 0}<span className="px-1 text-white/30">-</span>{match.result?.awayScore ?? 0}</> : <span className="text-xs font-semibold text-white/45">{time}</span>}
                          </span>
                          <span className="flex min-w-0 items-center gap-2">
                            <TeamMark team={match.awayTeam} />
                            <span className="truncate text-sm font-medium sm:text-base">{match.awayTeam.name}</span>
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {!visibleMatches.length && <EmptyState title={`No matches on ${dateLabel(selectedKey)}`} body="No fixtures for this day. Use the arrows to browse other days." />}
          </section>
        ) : view === "standings" ? (
          <section className="mt-5 space-y-5">
            {competitions.flatMap((competition) => competition.tables.map((table) => (
              <article key={table.id}>
                <div className="flex items-center gap-2 px-4 py-4 sm:px-2"><span className="font-medium">{table.name}</span></div>
                <div>
                  <div className="grid grid-cols-[1.75rem_1fr_repeat(3,2.2rem)] items-center px-4 py-2.5 text-[11px] uppercase tracking-wide text-white/40 sm:grid-cols-[2.25rem_1fr_repeat(7,2.4rem)] sm:px-6">
                    <span>#</span><span>Team</span>
                    <span className="text-center">PL</span>
                    <span className="hidden text-center sm:block">W</span><span className="hidden text-center sm:block">D</span><span className="hidden text-center sm:block">L</span><span className="hidden text-center sm:block">+/-</span>
                    <span className="text-center">GD</span><span className="text-center">PTS</span>
                  </div>
                  {table.rows.map((row) => (
                    <div key={row.team.id} className="grid grid-cols-[1.75rem_1fr_repeat(3,2.2rem)] items-center border-t border-white/8 px-4 py-3 text-sm text-white/70 transition hover:bg-white/[.03] sm:grid-cols-[2.25rem_1fr_repeat(7,2.4rem)] sm:px-6">
                      <span className="flex items-center gap-2">
                        <span className={`h-4 w-0.5 rounded-full ${row.position <= 2 ? "bg-[#00985f]" : row.position === 3 ? "bg-[#f08022]" : "bg-transparent"}`} />
                        <span className="text-white/50">{row.position}</span>
                      </span>
                      <Link href={`/teams/${row.team.slug}`} className="flex min-w-0 items-center gap-2.5 text-white hover:underline"><TeamMark team={row.team} /><span className="truncate">{row.team.name}</span></Link>
                      <span className="text-center">{row.played}</span>
                      <span className="hidden text-center sm:block">{row.won}</span>
                      <span className="hidden text-center sm:block">{row.drawn}</span>
                      <span className="hidden text-center sm:block">{row.lost}</span>
                      <span className="hidden text-center tabular-nums sm:block">{row.goalsFor}-{row.goalsAgainst}</span>
                      <span className="text-center tabular-nums">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span>
                      <b className="text-center text-white">{row.points}</b>
                    </div>
                  ))}
                </div>
                {!table.rows.length && <p className="border-t border-white/8 px-6 py-8 text-center text-sm text-white/35">No teams in this group yet.</p>}
              </article>
            )))}
            {!competitions.some((competition) => competition.tables.length) && <EmptyState title="No standings yet" body="Group tables will appear here when a published competition has groups." />}
          </section>
        ) : (
          <KnockoutBracket competition={competition} />
        )}
      </div>
    </main>
  );
}

function KnockoutBracket({ competition }: { competition?: Competition }) {
  const knockoutMatches = (competition?.matches ?? []).filter((match) => match.isKnockout && match.round);
  const startingRound = Math.max(0, ...knockoutMatches.map((match) => match.round ?? 0));
  const rounds = startingRound >= 2
    ? Array.from({ length: Math.log2(startingRound) }, (_, index) => startingRound / 2 ** index)
    : [];

  if (!rounds.length) {
    return <section className="mt-5"><EmptyState title="Knockout bracket not created" body="The knockout road to the final will appear here once it is generated." /></section>;
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#151515]">
      <div className="border-b border-white/10 bg-[#202020] px-5 py-5 sm:px-7">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#d7ff3f]">Road to the final</p>
        <h2 className="mt-1 text-2xl font-black">{competition?.name} knockout stage</h2>
      </div>
      <div className="overflow-x-auto p-5 sm:p-7">
        <div className="flex min-w-max items-stretch gap-8">
          {rounds.map((round) => {
            const matches = knockoutMatches.filter((match) => match.round === round);
            const expectedMatches = round / 2;
            return (
              <div key={round} className="flex w-64 flex-col">
                <div className="mb-4 flex items-end justify-between"><h3 className="font-black">{round === 2 ? "Final" : `Round of ${round}`}</h3><span className="text-[10px] uppercase tracking-wider text-white/30">{matches.length}/{expectedMatches}</span></div>
                <div className="flex flex-1 flex-col justify-around gap-4">
                  {Array.from({ length: expectedMatches }, (_, index) => {
                    const match = matches[index];
                    return match ? <BracketMatch key={match.id} match={match} /> : <PendingBracketMatch key={`${round}-${index}`} round={round} index={index} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BracketMatch({ match }: { match: Competition["matches"][number] }) {
  return (
    <Link href={`/matches/${match.id}`} className="relative block rounded-xl border border-white/10 bg-[#262626] shadow-lg shadow-black/20 transition hover:border-[#d7ff3f]/50">
      <BracketTeam team={match.homeTeam} placeholder={match.homePlaceholder} score={match.result?.homeScore} winner={Boolean(match.result && match.result.homeScore > match.result.awayScore)} />
      <BracketTeam team={match.awayTeam} placeholder={match.awayPlaceholder} score={match.result?.awayScore} winner={Boolean(match.result && match.result.awayScore > match.result.homeScore)} border />
      <p className="border-t border-white/8 px-3 py-2 text-[10px] text-white/30">{match.scheduledAt ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(match.scheduledAt)) : "Date TBD"}</p>
    </Link>
  );
}

function BracketTeam({ team, placeholder, score, winner, border }: { team: Team; placeholder: string | null; score?: number; winner?: boolean; border?: boolean }) {
  return <div className={`flex items-center gap-2 px-3 py-2.5 ${border ? "border-t border-white/8" : ""}`}>{placeholder ? <span className="grid size-9 place-items-center rounded-full border border-dashed border-white/15 text-[10px] font-black text-white/35">TBD</span> : <TeamMark team={team} />}<span className={`min-w-0 flex-1 truncate text-sm ${winner ? "font-black text-[#d7ff3f]" : "font-semibold"}`}>{placeholder ?? team.name}</span><b className="text-sm">{placeholder ? "–" : score ?? "–"}</b></div>;
}

function PendingBracketMatch({ round, index }: { round: number; index: number }) {
  const sourceRound = round * 2;
  return <div className="rounded-xl border border-dashed border-white/10 bg-white/[.025] text-white/25"><div className="border-b border-white/8 px-3 py-3 text-xs font-semibold">Winner match {index * 2 + 1} · R{sourceRound}</div><div className="px-3 py-3 text-xs font-semibold">Winner match {index * 2 + 2} · R{sourceRound}</div></div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="rounded-[1.8rem] border border-dashed border-white/15 bg-[#1b1b1b] px-6 py-16 text-center"><span className="mx-auto grid w-fit"><Icon name="trophy" size={32} className="text-white/20" /></span><h2 className="mt-4 text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-white/35">{body}</p></div>;
}
