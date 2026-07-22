"use server";

import { prisma } from "@/lib/prisma";

export type SearchResults = {
  teams: Array<{ id: string; name: string; slug: string; shortName: string | null; logoUrl: string | null; players: number }>;
  players: Array<{ id: string; name: string; login: string | null; imageUrl: string | null; number: number | null; teamName: string | null; teamSlug: string | null }>;
};

const empty: SearchResults = { teams: [], players: [] };

export async function searchSite(query: string): Promise<SearchResults> {
  const term = query.trim();
  if (term.length < 2) return empty;

  const match = { contains: term, mode: "insensitive" as const };
  const [teams, players] = await Promise.all([
    prisma.team.findMany({
      where: { OR: [{ name: match }, { shortName: match }] },
      orderBy: { name: "asc" },
      take: 5,
      include: { _count: { select: { players: true } } },
    }),
    // Players are searchable by their 42 login as well as their name.
    prisma.player.findMany({
      where: { OR: [{ firstName: match }, { lastName: match }, { displayName: match }, { intraLogin: match }] },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 8,
      include: { team: { select: { name: true, slug: true } } },
    }),
  ]);

  return {
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      shortName: team.shortName,
      logoUrl: team.logoUrl,
      players: team._count.players,
    })),
    players: players.map((player) => ({
      id: player.id,
      name: player.displayName || `${player.firstName} ${player.lastName}`,
      login: player.intraLogin,
      imageUrl: player.imageUrl,
      number: player.shirtNumber,
      teamName: player.team?.name ?? null,
      teamSlug: player.team?.slug ?? null,
    })),
  };
}
