"use client";

import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from "react";

export function MatchCountdown({ kickoff }: { kickoff: string | null }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!kickoff) return;
    const target = new Date(kickoff).getTime();
    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [kickoff]);

  if (!kickoff || remaining === null || remaining <= 0) return null;

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    <p className="mt-1 font-mono text-sm tabular-nums text-white/55">
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </p>
  );
}

export function FollowButton() {
  const [following, setFollowing] = useState(false);
  return (
    <button
      onClick={() => setFollowing((value) => !value)}
      className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-white/90"
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}

type VoteChoice = "HOME" | "DRAW" | "AWAY";
type Tally = { home: number; draw: number; away: number; total: number; myChoice: VoteChoice | null };

export function WhoWillWin({
  matchId,
  home,
  away,
  initialTally,
  vote,
}: {
  matchId: string;
  home: { name: string; logoUrl: string | null };
  away: { name: string; logoUrl: string | null };
  initialTally: Tally;
  vote: (matchId: string, choice: VoteChoice) => Promise<Tally>;
}) {
  const [tally, setTally] = useState(initialTally);
  const [pending, startTransition] = useTransition();
  const voted = tally.myChoice !== null;

  const cast = (choice: VoteChoice) => {
    if (pending) return;
    startTransition(async () => {
      try {
        setTally(await vote(matchId, choice));
      } catch {
        /* ignore — the button just stays unselected */
      }
    });
  };

  const pct = (count: number) => (tally.total ? Math.round((count / tally.total) * 100) : 0);

  const crest = (team: { name: string; logoUrl: string | null }, active: boolean) => (
    <span className={`grid size-14 place-items-center overflow-hidden rounded-full ring-2 transition ${active ? "ring-[#61df6e]" : "ring-white/10"}`}>
      {team.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logoUrl} alt="" className="size-full bg-white object-cover" />
      ) : (
        <b className="text-sm">{team.name.slice(0, 2).toUpperCase()}</b>
      )}
    </span>
  );

  return (
    <section className="rounded-3xl border border-white/8 bg-[#1c1c1c] p-5">
      <h3 className="text-center font-medium">Who will win?</h3>

      <div className="mt-5 flex items-center justify-center gap-6">
        <button onClick={() => cast("HOME")} disabled={pending}>{crest(home, tally.myChoice === "HOME")}</button>
        <button
          onClick={() => cast("DRAW")}
          disabled={pending}
          className={`grid size-14 place-items-center rounded-full text-lg font-medium ring-2 transition ${tally.myChoice === "DRAW" ? "text-white ring-[#61df6e]" : "text-white/50 ring-white/10"}`}
        >
          X
        </button>
        <button onClick={() => cast("AWAY")} disabled={pending}>{crest(away, tally.myChoice === "AWAY")}</button>
      </div>

      {voted && (
        <div className="mt-5 space-y-2">
          <VoteBar label={home.name} value={pct(tally.home)} active={tally.myChoice === "HOME"} />
          <VoteBar label="Draw" value={pct(tally.draw)} active={tally.myChoice === "DRAW"} />
          <VoteBar label={away.name} value={pct(tally.away)} active={tally.myChoice === "AWAY"} />
          <p className="pt-1 text-center text-xs text-white/40">{tally.total} vote{tally.total === 1 ? "" : "s"}</p>
        </div>
      )}
    </section>
  );
}

function VoteBar({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className={`truncate ${active ? "text-white" : "text-white/60"}`}>{label}</span>
        <span className={active ? "text-[#61df6e]" : "text-white/50"}>{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${active ? "bg-[#61df6e]" : "bg-white/30"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

type Tab = { label: string; content: ReactNode };
const TabsContext = createContext<{ active: number; setActive: (n: number) => void; tabs: Tab[] } | null>(null);

export function MatchTabsProvider({ tabs, children }: { tabs: Tab[]; children: ReactNode }) {
  const [active, setActive] = useState(0);
  return <TabsContext.Provider value={{ active, setActive, tabs }}>{children}</TabsContext.Provider>;
}

export function MatchTabsNav() {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  const { active, setActive, tabs } = ctx;
  return (
    <div className="flex gap-6 px-1">
      {tabs.map((tab, index) => (
        <button
          key={tab.label}
          onClick={() => setActive(index)}
          className={`relative py-3 text-sm font-bold transition ${active === index ? "text-white" : "text-white/45 hover:text-white/70"}`}
        >
          {tab.label}
          {active === index && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#61df6e]" />}
        </button>
      ))}
    </div>
  );
}

export function MatchTabsContent() {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  return <>{ctx.tabs[ctx.active]?.content}</>;
}
