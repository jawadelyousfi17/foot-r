import type { StatValues } from "@/lib/match-stats";

export function calculatePlayerRating(stats: StatValues) {
  const score = 6
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

// FotMob rating scale: green (good) → orange (mid) → red (poor), black label.
export function ratingColor(rating: number) {
  if (rating >= 8) return "bg-[#00985f] text-black";
  if (rating >= 7) return "bg-[#33c771] text-black";
  if (rating >= 6) return "bg-[#ff963f] text-black";
  return "bg-[#ff3939] text-black";
}
