"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type GoalRow = { playerId: string; goals: number; assists: number; yellowCards: number; redCards: number };

// A player cannot be booked more than twice or sent off twice in one match.
const limits = { goals: Infinity, assists: Infinity, yellowCards: 2, redCards: 1 } as const;

// Writes only the goals/assists/card columns so the full stat console's other
// counters survive an edit here. The match score is then rebuilt from the
// per-player goal totals, exactly like saveTeamStats does.
export async function saveMatchGoals(matchId: string, teamId: string, rows: GoalRow[]) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) throw new Error("Administrator access is required");

  const match = await prisma.match.findFirst({
    where: { id: matchId },
    select: { homeTeamId: true, awayTeamId: true, result: { select: { id: true } } },
  });
  if (!match) throw new Error("Match not found or access denied");
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) throw new Error("This team is not in the match");

  const uniqueRows = [...new Map(rows.map((row) => [row.playerId, row])).values()];
  const validPlayers = await prisma.player.count({ where: { id: { in: uniqueRows.map((row) => row.playerId) }, teamId } });
  if (validPlayers !== uniqueRows.length) throw new Error("A player does not belong to this team");

  for (const row of uniqueRows) {
    for (const key of ["goals", "assists", "yellowCards", "redCards"] as const) {
      const value = row[key];
      if (!Number.isInteger(value) || value < 0) throw new Error("Goals, assists and cards must be non-negative whole numbers");
      if (value > limits[key]) throw new Error(`A player cannot have more than ${limits[key]} ${key === "yellowCards" ? "yellow cards" : "red cards"} in a match`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all(uniqueRows.map(({ playerId, goals, assists, yellowCards, redCards }) => tx.playerMatchStat.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      create: { matchId, playerId, teamId, goals, assists, yellowCards, redCards },
      update: { goals, assists, yellowCards, redCards },
    })));

    const totals = await tx.playerMatchStat.groupBy({
      by: ["teamId"],
      where: { matchId, teamId: { in: [match.homeTeamId, match.awayTeamId] } },
      _sum: { goals: true },
    });
    const score = (id: string) => totals.find((row) => row.teamId === id)?._sum.goals ?? 0;
    const homeScore = score(match.homeTeamId);
    const awayScore = score(match.awayTeamId);

    if (match.result || homeScore > 0 || awayScore > 0) {
      await tx.matchResult.upsert({
        where: { matchId },
        create: { matchId, homeScore, awayScore },
        update: { homeScore, awayScore },
      });
    }
  });

  revalidatePath(`/dashboard/matches/${matchId}/goals`);
  revalidatePath(`/dashboard/matches/${matchId}/stats`);
  revalidatePath(`/matches/${matchId}`);
}
