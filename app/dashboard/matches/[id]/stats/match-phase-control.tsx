"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Clock3 } from "@/components/icon";
import { updateMatchPhase } from "./actions";

const phases = [
  ["SCHEDULED", "Not started"],
  ["FIRST_HALF", "First half"],
  ["HALF_TIME", "Mi-temps"],
  ["SECOND_HALF", "Second half"],
  ["EXTRA_TIME", "Extra time"],
  ["PENALTIES", "Penalties"],
  ["COMPLETED", "Full-time"],
] as const;
type MatchPhase = (typeof phases)[number][0];

export function MatchPhaseControl({ matchId, initialStatus, initialPhaseStartedAt }: { matchId: string; initialStatus: string; initialPhaseStartedAt: string | null }) {
  const normalizedInitial = initialStatus === "IN_PROGRESS" ? "FIRST_HALF" : initialStatus;
  const initialPhase = phases.find(([value]) => value === normalizedInitial)?.[0] ?? "SCHEDULED";
  const [status, setStatus] = useState<MatchPhase>(initialPhase);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(initialPhaseStartedAt);
  const [now, setNow] = useState(() => Date.now());
  const timed = ["FIRST_HALF", "SECOND_HALF", "EXTRA_TIME", "PENALTIES"].includes(status);
  const secondsLeft = startedAt && timed ? Math.max(0, 30 * 60 - Math.floor((now - new Date(startedAt).getTime()) / 1000)) : null;

  useEffect(() => {
    if (!timed || !startedAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timed, startedAt]);

  function choose(next: MatchPhase) {
    const previous = status;
    setStatus(next);
    const nextTimed = ["FIRST_HALF", "SECOND_HALF", "EXTRA_TIME", "PENALTIES"].includes(next);
    const nextStartedAt = nextTimed ? new Date().toISOString() : null;
    setStartedAt(nextStartedAt);
    setNow(nextStartedAt ? new Date(nextStartedAt).getTime() : 0);
    setMessage("");
    startTransition(async () => {
      try { await updateMatchPhase(matchId, next); setMessage("Phase updated"); }
      catch (error) { setStatus(previous); setStartedAt(initialPhaseStartedAt); setMessage(error instanceof Error ? error.message : "Could not update phase"); }
    });
  }

  return <section className="mb-6 rounded-2xl border bg-card p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#d7ff3f]"><Clock3 className="size-4" />Match clock</p><h2 className="mt-1 text-xl font-black">What phase is the match in?</h2></div><div className="text-right">{secondsLeft !== null && <p className="font-mono text-3xl font-black tabular-nums text-[#d7ff3f]">{String(Math.floor(secondsLeft / 60)).padStart(2,"0")}:{String(secondsLeft % 60).padStart(2,"0")}</p>}<span className="text-xs text-muted-foreground">{pending ? "Updating…" : message && <span className="flex items-center gap-1 text-emerald-500"><Check className="size-3" />{message}</span>}</span></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{phases.map(([value, label]) => <button key={value} type="button" onClick={() => choose(value)} disabled={pending} className={`rounded-xl border px-3 py-3 text-sm font-black transition ${status === value ? "border-[#d7ff3f] bg-[#d7ff3f] text-black" : "bg-background hover:bg-muted"}`}>{label}</button>)}</div></section>;
}
