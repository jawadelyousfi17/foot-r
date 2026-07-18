"use server";

import { revalidatePath } from "next/cache";
import { LineupRole, PlayerPosition } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function saveMatchLineup(matchId: string, teamId: string, starterIds: string[]) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) throw new Error("Administrator access is required");
  const match = await prisma.match.findFirst({ where: { id: matchId }, select: { homeTeamId: true, awayTeamId: true } });
  if (!match) throw new Error("Match not found or access denied");
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) throw new Error("This team is not in the match");
  const starters = [...new Set(starterIds)];
  if (starters.length !== 5) throw new Error("Choose exactly five starters");
  const players = await prisma.player.findMany({ where: { teamId }, select: { id: true, position: true } });
  if (players.length < 5) throw new Error("This team needs at least five players");
  if (!starters.every((id) => players.some((player) => player.id === id))) throw new Error("A selected player does not belong to this team");
  const goalkeepers = players.filter((player) => player.position === PlayerPosition.GOALKEEPER);
  if (goalkeepers.length && !goalkeepers.some((player) => starters.includes(player.id))) throw new Error("The starting five must include a goalkeeper");

  await prisma.$transaction(async (tx) => {
    await tx.matchLineupEntry.deleteMany({ where: { matchId, teamId } });
    await tx.matchLineupEntry.createMany({ data: players.map((player) => ({
      matchId,
      teamId,
      playerId: player.id,
      role: starters.includes(player.id) ? LineupRole.STARTER : LineupRole.BENCH,
      position: starters.includes(player.id) ? starters.indexOf(player.id) : null,
    })) });
  });
  revalidatePath(`/dashboard/matches/${matchId}/lineup`);
  revalidatePath(`/matches/${matchId}`);
}
