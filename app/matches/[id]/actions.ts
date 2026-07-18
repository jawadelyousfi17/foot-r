"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VoteChoice } from "@/generated/prisma/client";

export type VoteTally = {
  home: number;
  draw: number;
  away: number;
  total: number;
  myChoice: VoteChoice | null;
};

async function buildTally(matchId: string, userId: string | null): Promise<VoteTally> {
  const [groups, mine] = await Promise.all([
    prisma.matchVote.groupBy({ by: ["choice"], where: { matchId }, _count: { choice: true } }),
    userId
      ? prisma.matchVote.findUnique({ where: { matchId_userId: { matchId, userId } }, select: { choice: true } })
      : Promise.resolve(null),
  ]);
  const counts: Record<VoteChoice, number> = { HOME: 0, DRAW: 0, AWAY: 0 };
  for (const group of groups) counts[group.choice] = group._count.choice;
  return {
    home: counts.HOME,
    draw: counts.DRAW,
    away: counts.AWAY,
    total: counts.HOME + counts.DRAW + counts.AWAY,
    myChoice: mine?.choice ?? null,
  };
}

export async function getMatchVoteTally(matchId: string): Promise<VoteTally> {
  const session = await auth();
  return buildTally(matchId, session?.user?.id ?? null);
}

export async function castMatchVote(matchId: string, choice: VoteChoice): Promise<VoteTally> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be signed in to vote");
  if (!Object.values(VoteChoice).includes(choice)) throw new Error("Invalid vote");

  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { id: true } });
  if (!match) throw new Error("Match not found");

  await prisma.matchVote.upsert({
    where: { matchId_userId: { matchId, userId: session.user.id } },
    create: { matchId, userId: session.user.id, choice },
    update: { choice },
  });

  revalidatePath(`/matches/${matchId}`);
  return buildTally(matchId, session.user.id);
}
