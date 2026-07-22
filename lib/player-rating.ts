import type { StatValues } from "@/lib/match-stats";

export type MatchOutcome = "win" | "draw" | "loss";

// The result the player's team got sets their starting point: winners begin
// above the losers before a single event is counted. A draw sits midway.
const baseRating: Record<MatchOutcome, number> = { win: 6, draw: 5.75, loss: 5.5 };

// Outcome is optional so an unfinished match still rates from a neutral 6.
export function calculatePlayerRating(stats: StatValues, outcome?: MatchOutcome) {
  const score = (outcome ? baseRating[outcome] : 6)
    + stats.goals * 1.25
    + stats.assists * 0.8
    + stats.shotsOnTarget * 0.08
    + stats.accuratePasses * 0.012
    - stats.missedPasses * 0.018
    + stats.duelsWon * 0.07
    - stats.duelsLost * 0.055
    + stats.tackles * 0.08
    + stats.interceptions * 0.1
    + stats.saves * 0.14
    + stats.foulsWon * 0.035
    - stats.fouls * 0.09
    - stats.yellowCards * 0.3
    - stats.redCards * 1.1;

  return Math.round(Math.min(10, Math.max(3, score)) * 10) / 10;
}

export function matchOutcome(scored: number, conceded: number): MatchOutcome {
  if (scored > conceded) return "win";
  if (scored < conceded) return "loss";
  return "draw";
}

// Anything below 7 is a plain black badge; from 7 up the green gets brighter
// the higher the rating, so standout performances read at a glance. The ring
// keeps the black badge legible on the dark match pages.
export function ratingColor(rating: number) {
  if (rating >= 9) return "bg-[#d7ff3f] text-black";
  if (rating >= 8) return "bg-[#5cf08a] text-black";
  if (rating >= 7) return "bg-[#1f9d57] text-white";
  return "bg-[#1c1c1c] text-white ring-1 ring-white/25";
}
