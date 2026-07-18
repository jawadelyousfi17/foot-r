"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { statKeys, type StatValues } from "@/lib/match-stats";
import { prisma } from "@/lib/prisma";
import { findFortyTwoUser } from "@/lib/forty-two";
import { MatchStatus } from "@/generated/prisma/client";

async function requireOwnedMatch(matchId: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) throw new Error("Administrator access is required");
  const match = await prisma.match.findFirst({ where: { id: matchId, competition: { ownerId: session.user.id } }, select: { id: true } });
  if (!match) throw new Error("Match not found or access denied");
}

export async function setMatchReferee(matchId: string, login: string) {
  await requireOwnedMatch(matchId);
  const profile = await findFortyTwoUser(login);
  await prisma.match.update({
    where: { id: matchId },
    data: {
      refereeLogin: profile.login,
      refereeName: profile.usual_full_name || profile.displayname || `${profile.first_name} ${profile.last_name}`,
      refereeImageUrl: profile.image?.link || null,
    },
  });
  revalidatePath(`/dashboard/matches/${matchId}/stats`);
  revalidatePath(`/matches/${matchId}`);
}

export async function clearMatchReferee(matchId: string) {
  await requireOwnedMatch(matchId);
  await prisma.match.update({
    where: { id: matchId },
    data: { refereeLogin: null, refereeName: null, refereeImageUrl: null },
  });
  revalidatePath(`/dashboard/matches/${matchId}/stats`);
  revalidatePath(`/matches/${matchId}`);
}

export async function saveTeamStats(matchId: string, teamId: string, rows: Array<{ playerId: string; values: StatValues }>) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) throw new Error("Administrator access is required");
  const match = await prisma.match.findFirst({
    where: { id: matchId, competition: { ownerId: session.user.id } },
    select: { homeTeamId: true, awayTeamId: true, status: true, result: { select: { id: true } } },
  });
  if (!match) throw new Error("Match not found or access denied");
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) throw new Error("This team is not in the match");

  const uniqueRows = [...new Map(rows.map((row) => [row.playerId, row])).values()];
  const validPlayers = await prisma.player.count({ where: { id: { in: uniqueRows.map((row) => row.playerId) }, teamId } });
  if (validPlayers !== uniqueRows.length) throw new Error("A player does not belong to this team");

  const safeRows = uniqueRows.map(({ playerId, values }) => {
    const safeValues = Object.fromEntries(statKeys.map((key) => {
      const value = Number(values[key]);
      if (!Number.isInteger(value) || value < 0) throw new Error(`${key} must be a non-negative integer`);
      return [key, value];
    })) as StatValues;
    return { playerId, values: safeValues };
  });

  await prisma.$transaction(async (tx) => {
    await Promise.all(safeRows.map(({ playerId, values }) => tx.playerMatchStat.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      create: { matchId, playerId, teamId, ...values },
      update: { teamId, ...values },
    })));

    const goals = await tx.playerMatchStat.groupBy({
      by: ["teamId"],
      where: { matchId, teamId: { in: [match.homeTeamId, match.awayTeamId] } },
      _sum: { goals: true },
    });
    const score = (id: string) => goals.find((row) => row.teamId === id)?._sum.goals ?? 0;
    const homeScore = score(match.homeTeamId);
    const awayScore = score(match.awayTeamId);

    if (match.result || homeScore > 0 || awayScore > 0) {
      await tx.matchResult.upsert({
        where: { matchId },
        create: { matchId, homeScore, awayScore },
        update: { homeScore, awayScore },
      });
      if (match.status === MatchStatus.SCHEDULED && (homeScore > 0 || awayScore > 0)) {
        await tx.match.update({ where: { id: matchId }, data: { status: MatchStatus.FIRST_HALF, phaseStartedAt: new Date() } });
      }
    }
  });
  revalidatePath(`/dashboard/matches/${matchId}/stats`);
  revalidatePath(`/matches/${matchId}`);
}

export async function updateMatchPhase(matchId: string, status: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) throw new Error("Administrator access is required");
  const allowed: MatchStatus[] = [MatchStatus.SCHEDULED, MatchStatus.FIRST_HALF, MatchStatus.HALF_TIME, MatchStatus.SECOND_HALF, MatchStatus.EXTRA_TIME, MatchStatus.PENALTIES, MatchStatus.COMPLETED];
  const validStatus = allowed.find((value) => value === status);
  if (!validStatus) throw new Error("Invalid match phase");
  const match = await prisma.match.findFirst({ where: { id: matchId, competition: { ownerId: session.user.id } }, select: { id: true } });
  if (!match) throw new Error("Match not found or access denied");
  const timedPhases: MatchStatus[] = [MatchStatus.FIRST_HALF, MatchStatus.SECOND_HALF, MatchStatus.EXTRA_TIME, MatchStatus.PENALTIES];
  await prisma.match.update({ where: { id: matchId }, data: { status: validStatus, phaseStartedAt: timedPhases.includes(validStatus) ? new Date() : null } });
  revalidatePath(`/dashboard/matches/${matchId}/stats`);
  revalidatePath(`/matches/${matchId}`);
}
