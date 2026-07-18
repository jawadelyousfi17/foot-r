"use client";

import { useEffect, useState } from "react";

export function MatchClock({ status, phaseStartedAt }: { status: string; phaseStartedAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  const timed = ["FIRST_HALF", "SECOND_HALF", "EXTRA_TIME", "PENALTIES"].includes(status);
  useEffect(() => {
    if (!timed || !phaseStartedAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timed, phaseStartedAt]);
  if (!timed || !phaseStartedAt) return null;
  const seconds = Math.max(0, 30 * 60 - Math.floor((now - new Date(phaseStartedAt).getTime()) / 1000));
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00c281] px-3 py-1 font-mono text-sm font-black tabular-nums text-[#04120c]"><span className="size-1.5 animate-pulse rounded-full bg-[#04120c]" />{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span>;
}
