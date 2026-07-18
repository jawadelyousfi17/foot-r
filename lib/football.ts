import "server-only";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CompetitionStatus,
  MatchStatus,
  PlayerPosition,
} from "@/generated/prisma/client";

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "INVALID_INPUT"
      | "CONFLICT",
  ) {
    super(message);
    this.name = "DomainError";
  }
}

function requiredText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new DomainError(`${field} is required`, "INVALID_INPUT");
  }
  return normalized;
}

function toSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) throw new DomainError("A valid slug is required", "INVALID_INPUT");
  return slug;
}

function nonNegativeInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new DomainError(
      `${field} must be a non-negative integer`,
      "INVALID_INPUT",
    );
  }
  return value;
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new DomainError("You must be signed in", "UNAUTHENTICATED");
  }
  return session.user.id;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new DomainError("You must be signed in", "UNAUTHENTICATED");
  }
  if (!session.user.isAdmin) {
    throw new DomainError("Administrator access is required", "FORBIDDEN");
  }
  return session.user.id;
}

// Competitions are managed collectively: any administrator can manage any
// competition, regardless of which admin created it. Callers must already
// have passed requireAdmin(); this only checks the competition exists.
async function requireCompetition(competitionId: string) {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { id: true },
  });

  if (!competition) throw new DomainError("Competition not found", "NOT_FOUND");
}

export async function listPublicTeams() {
  return prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { players: true } },
    },
  });
}

export async function getPublicTeam(slug: string) {
  const matchInclude = {
    include: {
      competition: { select: { name: true, slug: true } },
      group: { select: { name: true } },
      homeTeam: { select: { id: true, name: true, shortName: true, slug: true, logoUrl: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, slug: true, logoUrl: true } },
      result: true,
    },
    orderBy: { scheduledAt: "asc" as const },
  };
  return prisma.team.findUnique({
    where: { slug },
    include: {
      players: { orderBy: [{ shirtNumber: "asc" }, { lastName: "asc" }], include: { matchStats: true } },
      competitions: { include: { competition: { select: { name: true, slug: true, status: true } } } },
      homeMatches: matchInclude,
      awayMatches: matchInclude,
    },
  });
}

export async function getPublicPlayer(slug: string) {
  return prisma.player.findUnique({
    where: { slug },
    include: { team: true },
  });
}

export async function createTeam(input: {
  name: string;
  slug?: string;
  shortName?: string;
  logoUrl?: string;
  description?: string;
}) {
  const userId = await requireUserId();
  const name = requiredText(input.name, "Team name");

  return prisma.team.create({
    data: {
      name,
      slug: toSlug(input.slug || name),
      shortName: input.shortName?.trim() || null,
      logoUrl: input.logoUrl?.trim() || null,
      description: input.description?.trim() || null,
      createdById: userId,
    },
  });
}

async function requireTeamManager(teamId: string) {
  const userId = await requireUserId();
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, slug: true, createdById: true },
  });
  if (!team) throw new DomainError("Team not found", "NOT_FOUND");
  if (team.createdById && team.createdById !== userId) {
    throw new DomainError("You do not manage this team", "FORBIDDEN");
  }
  return team;
}

export async function updateTeam(input: {
  teamId: string;
  name?: string;
  shortName?: string;
  description?: string;
  logoUrl?: string;
}) {
  const team = await requireTeamManager(input.teamId);

  const data: {
    name?: string;
    shortName?: string | null;
    description?: string | null;
    logoUrl?: string | null;
  } = {};
  if (input.name !== undefined) data.name = requiredText(input.name, "Team name");
  if (input.shortName !== undefined) data.shortName = input.shortName.trim() || null;
  if (input.description !== undefined) data.description = input.description.trim() || null;
  if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl || null;

  return prisma.team.update({ where: { id: team.id }, data });
}

export async function removePlayer(playerId: string) {
  const userId = await requireUserId();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, team: { select: { createdById: true } } },
  });
  if (!player) throw new DomainError("Player not found", "NOT_FOUND");
  if (player.team?.createdById && player.team.createdById !== userId) {
    throw new DomainError("You do not manage this team", "FORBIDDEN");
  }
  return prisma.player.delete({ where: { id: playerId } });
}

export async function addPlayer(input: {
  teamId: string;
  intraId?: number;
  intraLogin?: string;
  firstName: string;
  lastName: string;
  slug?: string;
  displayName?: string;
  shirtNumber?: number;
  position?: PlayerPosition;
  imageUrl?: string;
  dateOfBirth?: Date;
}) {
  const userId = await requireUserId();
  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    select: { id: true, createdById: true },
  });

  if (!team) throw new DomainError("Team not found", "NOT_FOUND");
  if (team.createdById && team.createdById !== userId) {
    throw new DomainError("You do not manage this team", "FORBIDDEN");
  }

  const firstName = requiredText(input.firstName, "First name");
  const lastName = requiredText(input.lastName, "Last name");
  if (input.shirtNumber !== undefined) {
    nonNegativeInteger(input.shirtNumber, "Shirt number");
  }

  return prisma.player.create({
    data: {
      teamId: team.id,
      intraId: input.intraId,
      intraLogin: input.intraLogin,
      firstName,
      lastName,
      slug: toSlug(input.slug || `${firstName}-${lastName}`),
      displayName: input.displayName?.trim() || null,
      shirtNumber: input.shirtNumber,
      position: input.position,
      imageUrl: input.imageUrl?.trim() || null,
      dateOfBirth: input.dateOfBirth,
    },
  });
}

export async function listPublicCompetitions() {
  return prisma.competition.findMany({
    where: { status: { not: CompetitionStatus.DRAFT } },
    orderBy: [{ startsAt: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { groups: true, matches: true } },
    },
  });
}

export async function getPublicCompetition(slug: string) {
  return prisma.competition.findUnique({
    where: { slug },
    include: {
      groups: {
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: {
          teams: { include: { team: true }, orderBy: { seed: "asc" } },
        },
      },
      matches: {
        orderBy: { scheduledAt: "asc" },
        include: { homeTeam: true, awayTeam: true, result: true },
      },
    },
  });
}

export async function createCompetition(input: {
  name: string;
  slug?: string;
  description?: string;
  startsAt?: Date;
  endsAt?: Date;
}) {
  const ownerId = await requireAdmin();
  const name = requiredText(input.name, "Competition name");

  if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) {
    throw new DomainError("End date cannot precede start date", "INVALID_INPUT");
  }

  return prisma.competition.create({
    data: {
      ownerId,
      name,
      slug: toSlug(input.slug || name),
      description: input.description?.trim() || null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    },
  });
}

export async function setCompetitionStatus(
  competitionId: string,
  status: CompetitionStatus,
) {
  await requireAdmin();
  await requireCompetition(competitionId);
  return prisma.competition.update({ where: { id: competitionId }, data: { status } });
}

export async function createGroup(input: {
  competitionId: string;
  name: string;
  position?: number;
}) {
  await requireAdmin();
  await requireCompetition(input.competitionId);
  if (input.position !== undefined) nonNegativeInteger(input.position, "Position");

  return prisma.group.create({
    data: {
      competitionId: input.competitionId,
      name: requiredText(input.name, "Group name"),
      position: input.position ?? 0,
    },
  });
}

export async function addTeamToCompetition(input: {
  competitionId: string;
  teamId: string;
  seed?: number;
}) {
  await requireAdmin();
  await requireCompetition(input.competitionId);
  if (input.seed !== undefined) nonNegativeInteger(input.seed, "Seed");
  const team = await prisma.team.findUnique({ where: { id: input.teamId }, select: { id: true } });
  if (!team) throw new DomainError("Team not found", "NOT_FOUND");
  return prisma.competitionTeam.create({
    data: { competitionId: input.competitionId, teamId: input.teamId, seed: input.seed },
  });
}

export async function addTeamsToCompetition(input: {
  competitionId: string;
  teamIds: string[];
}) {
  await requireAdmin();
  await requireCompetition(input.competitionId);
  const teamIds = [...new Set(input.teamIds.filter(Boolean))];
  if (!teamIds.length) throw new DomainError("Select at least one team", "INVALID_INPUT");

  const existingTeams = await prisma.team.count({ where: { id: { in: teamIds } } });
  if (existingTeams !== teamIds.length) throw new DomainError("One or more teams do not exist", "NOT_FOUND");

  return prisma.competitionTeam.createMany({
    data: teamIds.map((teamId, seed) => ({ competitionId: input.competitionId, teamId, seed })),
    skipDuplicates: true,
  });
}

export async function createCompetitionGroups(input: {
  competitionId: string;
  count: number;
}) {
  await requireAdmin();
  await requireCompetition(input.competitionId);
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 26) {
    throw new DomainError("Group count must be between 1 and 26", "INVALID_INPUT");
  }

  return prisma.group.createMany({
    data: Array.from({ length: input.count }, (_, position) => ({
      competitionId: input.competitionId,
      name: `Group ${String.fromCharCode(65 + position)}`,
      position,
    })),
    skipDuplicates: true,
  });
}

export async function addTeamToGroup(input: {
  groupId: string;
  teamId: string;
  seed?: number;
}) {
  await requireAdmin();
  const group = await prisma.group.findUnique({
    where: { id: input.groupId },
    select: { competitionId: true },
  });
  if (!group) throw new DomainError("Group not found", "NOT_FOUND");
  await requireCompetition(group.competitionId);
  if (input.seed !== undefined) nonNegativeInteger(input.seed, "Seed");

  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    select: { id: true },
  });
  if (!team) throw new DomainError("Team not found", "NOT_FOUND");
  const registered = await prisma.competitionTeam.findUnique({
    where: { competitionId_teamId: { competitionId: group.competitionId, teamId: input.teamId } },
  });
  if (!registered) throw new DomainError("Add the team to the competition first", "CONFLICT");

  return prisma.groupTeam.create({
    data: { groupId: input.groupId, teamId: input.teamId, seed: input.seed },
  });
}

export async function addTeamsToGroup(input: {
  groupId: string;
  teamIds: string[];
}) {
  await requireAdmin();
  const group = await prisma.group.findUnique({
    where: { id: input.groupId },
    select: { competitionId: true },
  });
  if (!group) throw new DomainError("Group not found", "NOT_FOUND");
  await requireCompetition(group.competitionId);

  const teamIds = [...new Set(input.teamIds.filter(Boolean))];
  if (!teamIds.length) throw new DomainError("Select at least one team", "INVALID_INPUT");
  const registered = await prisma.competitionTeam.count({
    where: { competitionId: group.competitionId, teamId: { in: teamIds } },
  });
  if (registered !== teamIds.length) {
    throw new DomainError("Every selected team must be in the competition", "CONFLICT");
  }

  const assigned = await prisma.groupTeam.findFirst({
    where: {
      teamId: { in: teamIds },
      group: { competitionId: group.competitionId },
    },
  });
  if (assigned) throw new DomainError("A selected team is already assigned to a group", "CONFLICT");

  return prisma.groupTeam.createMany({
    data: teamIds.map((teamId, seed) => ({ groupId: input.groupId, teamId, seed })),
    skipDuplicates: true,
  });
}

export async function updateGroup(input: { groupId: string; name: string }) {
  await requireAdmin();
  const group = await prisma.group.findUnique({
    where: { id: input.groupId },
    select: { competitionId: true },
  });
  if (!group) throw new DomainError("Group not found", "NOT_FOUND");
  await requireCompetition(group.competitionId);
  return prisma.group.update({
    where: { id: input.groupId },
    data: { name: requiredText(input.name, "Group name") },
  });
}

export async function deleteGroup(groupId: string) {
  await requireAdmin();
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { competitionId: true },
  });
  if (!group) throw new DomainError("Group not found", "NOT_FOUND");
  await requireCompetition(group.competitionId);
  return prisma.$transaction([
    prisma.match.deleteMany({ where: { groupId } }),
    prisma.group.delete({ where: { id: groupId } }),
  ]);
}

function roundRobinRounds(teamIds: string[]) {
  const rotation: Array<string | null> = [...teamIds];
  if (rotation.length % 2) rotation.push(null);
  const rounds: Array<Array<[string, string]>> = [];

  for (let round = 0; round < rotation.length - 1; round += 1) {
    const fixtures: Array<[string, string]> = [];
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const left = rotation[index];
      const right = rotation[rotation.length - 1 - index];
      if (left && right) fixtures.push(round % 2 ? [right, left] : [left, right]);
    }
    rounds.push(fixtures);
    rotation.splice(1, 0, rotation.pop() ?? null);
  }
  return rounds;
}

export async function generateGroupFixtures(input: { groupId: string; legs: 1 | 2 }) {
  await requireAdmin();
  const group = await prisma.group.findUnique({
    where: { id: input.groupId },
    include: { teams: { orderBy: [{ seed: "asc" }, { joinedAt: "asc" }], select: { teamId: true } } },
  });
  if (!group) throw new DomainError("Group not found", "NOT_FOUND");
  await requireCompetition(group.competitionId);
  if (input.legs !== 1 && input.legs !== 2) throw new DomainError("Choose one or two legs", "INVALID_INPUT");
  if (group.teams.length < 2) throw new DomainError("The group needs at least two teams", "CONFLICT");

  const firstLeg = roundRobinRounds(group.teams.map(({ teamId }) => teamId));
  const allRounds = input.legs === 2
    ? [...firstLeg, ...firstLeg.map((round) => round.map(([home, away]) => [away, home] as [string, string]))]
    : firstLeg;
  const existing = await prisma.match.findMany({
    where: { groupId: input.groupId },
    select: { homeTeamId: true, awayTeamId: true },
  });
  const existingKeys = new Set(existing.map((match) => `${match.homeTeamId}:${match.awayTeamId}`));
  const fixtures = allRounds.flatMap((round, roundIndex) => round.map(([homeTeamId, awayTeamId]) => ({
    competitionId: group.competitionId,
    groupId: input.groupId,
    homeTeamId,
    awayTeamId,
    round: roundIndex + 1,
  }))).filter((match) => !existingKeys.has(`${match.homeTeamId}:${match.awayTeamId}`));

  if (!fixtures.length) throw new DomainError("These fixtures have already been generated", "CONFLICT");
  return prisma.match.createMany({ data: fixtures });
}

export async function generateAllGroupFixtures(input: { competitionId: string; legs: 1 | 2 }) {
  await requireAdmin();
  await requireCompetition(input.competitionId);
  const groups = await prisma.group.findMany({
    where: { competitionId: input.competitionId, teams: { some: {} } },
    select: { id: true, _count: { select: { teams: true } } },
  });
  const eligible = groups.filter((group) => group._count.teams >= 2);
  if (!eligible.length) throw new DomainError("No group has enough teams", "CONFLICT");

  let created = 0;
  for (const group of eligible) {
    try {
      const result = await generateGroupFixtures({ groupId: group.id, legs: input.legs });
      created += result.count;
    } catch (error) {
      if (!(error instanceof DomainError) || error.code !== "CONFLICT" || error.message !== "These fixtures have already been generated") throw error;
    }
  }
  if (!created) throw new DomainError("All group fixtures have already been generated", "CONFLICT");
  return { count: created };
}

export async function scheduleMatch(input: { matchId: string; scheduledAt: Date }) {
  await requireAdmin();
  const match = await prisma.match.findUnique({
    where: { id: input.matchId },
    select: { competitionId: true },
  });
  if (!match) throw new DomainError("Match not found", "NOT_FOUND");
  await requireCompetition(match.competitionId);
  if (Number.isNaN(input.scheduledAt.getTime())) throw new DomainError("Choose a valid date and time", "INVALID_INPUT");
  return prisma.match.update({ where: { id: input.matchId }, data: { scheduledAt: input.scheduledAt } });
}

export async function createKnockoutFixture(input: {
  competitionId: string;
  homeGroupId: string;
  homePosition: number;
  awayGroupId: string;
  awayPosition: number;
}) {
  await requireAdmin();
  await requireCompetition(input.competitionId);
  if (input.homeGroupId === input.awayGroupId && input.homePosition === input.awayPosition) {
    throw new DomainError("Choose two different group positions", "INVALID_INPUT");
  }
  const groups = await prisma.group.count({
    where: { id: { in: [input.homeGroupId, input.awayGroupId] }, competitionId: input.competitionId },
  });
  if (groups !== new Set([input.homeGroupId, input.awayGroupId]).size) {
    throw new DomainError("A selected group is not in this competition", "NOT_FOUND");
  }

  const [homeStandings, awayStandings] = await Promise.all([
    getGroupStandings(input.homeGroupId),
    getGroupStandings(input.awayGroupId),
  ]);
  const homeTeam = homeStandings[input.homePosition - 1]?.team;
  const awayTeam = awayStandings[input.awayPosition - 1]?.team;
  if (!homeTeam || !awayTeam) throw new DomainError("A selected group position has no team", "INVALID_INPUT");
  if (homeTeam.id === awayTeam.id) throw new DomainError("A team cannot play itself", "INVALID_INPUT");

  return prisma.match.create({
    data: {
      competitionId: input.competitionId,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
    },
  });
}

export async function generateKnockoutStage(input: {
  competitionId: string;
  qualifiersPerGroup: number;
  bestNextPlaced: number;
  groupPairs: string[][];
}) {
  await requireAdmin();
  await requireCompetition(input.competitionId);
  const groups = await prisma.group.findMany({
    where: { competitionId: input.competitionId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, matches: { select: { status: true, result: { select: { id: true } } } } },
  });
  const hasExistingKnockout = await prisma.match.count({
    where: { competitionId: input.competitionId, groupId: null },
  });
  if (groups.length < 2) throw new DomainError("Knockout setup requires at least two groups", "CONFLICT");
  if (!Number.isInteger(input.qualifiersPerGroup) || input.qualifiersPerGroup < 1) throw new DomainError("Choose at least one qualifier per group", "INVALID_INPUT");
  if (!Number.isInteger(input.bestNextPlaced) || input.bestNextPlaced < 0 || input.bestNextPlaced > groups.length) throw new DomainError("Invalid best next-placed team count", "INVALID_INPUT");
  if (!hasExistingKnockout && groups.some((group) => group.matches.length === 0 || group.matches.some((match) => match.status !== MatchStatus.COMPLETED || !match.result))) {
    throw new DomainError("Every group must finish all of its matches before the knockout bracket is created", "CONFLICT");
  }

  const groupIds = new Set(groups.map((group) => group.id));
  const pairedIds = input.groupPairs.flat();
  const laneSizesAreValid = input.groupPairs.every((lane) => lane.length === 2 || lane.length === 3);
  const tripleLanes = input.groupPairs.filter((lane) => lane.length === 3).length;
  if (!laneSizesAreValid || tripleLanes !== groups.length % 2 || pairedIds.length !== groups.length || new Set(pairedIds).size !== groups.length || pairedIds.some((id) => !groupIds.has(id))) {
    throw new DomainError("Every group must appear in exactly one group pairing", "INVALID_INPUT");
  }

  const standings = await Promise.all(groups.map((group) => getGroupStandings(group.id)));
  if (standings.some((table) => table.length < input.qualifiersPerGroup)) throw new DomainError("A group does not have enough ranked teams for this qualification rule", "CONFLICT");

  type QualifiedTeam = StandingRow["team"] & { groupId: string; groupName: string; groupPosition: number; points: number; goalDifference: number; goalsFor: number };
  const rankedByGroup = new Map<string, QualifiedTeam[]>();
  groups.forEach((group, groupIndex) => rankedByGroup.set(group.id, standings[groupIndex].map((row) => ({
    ...row.team,
    groupId: group.id,
    groupName: group.name,
    groupPosition: row.position,
    points: row.points,
    goalDifference: row.goalDifference,
    goalsFor: row.goalsFor,
  }))));

  const direct = groups
    .flatMap((group) => (rankedByGroup.get(group.id) ?? []).slice(0, input.qualifiersPerGroup))
    .sort((a, b) => a.groupPosition - b.groupPosition || b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name));
  const wildcards = groups
    .map((group) => rankedByGroup.get(group.id)?.[input.qualifiersPerGroup])
    .filter((team): team is QualifiedTeam => Boolean(team))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name))
    .slice(0, input.bestNextPlaced);
  if (wildcards.length !== input.bestNextPlaced) throw new DomainError("Not every group has an eligible next-placed team", "CONFLICT");

  const qualified = [...direct, ...wildcards];
  const stageSize = 2 ** Math.ceil(Math.log2(qualified.length));
  if (stageSize < 2 || stageSize > 64) throw new DomainError("The qualified field must produce a bracket between 2 and 64 teams", "INVALID_INPUT");
  // A non-power-of-two field needs only (teams - half the bracket) opening matches.
  // Direct group qualifiers are seeded before wildcard teams, so the strongest seeds receive byes.
  const openingMatchCount = qualified.length - stageSize / 2;
  const playing = qualified.slice(qualified.length - openingMatchCount * 2);
  const preferredOpponents = new Map<string, Set<string>>();
  for (const lane of input.groupPairs) {
    for (const groupId of lane) preferredOpponents.set(groupId, new Set(lane.filter((candidate) => candidate !== groupId)));
  }
  const fixtures: Array<{ competitionId: string; homeTeamId: string; awayTeamId: string; round: number }> = [];
  while (playing.length >= 2) {
    const home = playing.shift()!;
    const complementaryPosition = input.qualifiersPerGroup + 1 - home.groupPosition;
    const preferred = preferredOpponents.get(home.groupId) ?? new Set<string>();
    let opponentIndex = playing.findIndex((team) => preferred.has(team.groupId) && team.groupPosition === complementaryPosition);
    if (opponentIndex < 0) opponentIndex = playing.findIndex((team) => preferred.has(team.groupId));
    if (opponentIndex < 0) opponentIndex = playing.findIndex((team) => team.groupId !== home.groupId);
    if (opponentIndex < 0) opponentIndex = 0;
    const [away] = playing.splice(opponentIndex, 1);
    fixtures.push({ competitionId: input.competitionId, homeTeamId: home.id, awayTeamId: away.id, round: stageSize });
  }
  const created = await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { competitionId: input.competitionId, groupId: null } });
    return tx.match.createMany({ data: fixtures });
  });
  return { ...created, stageSize, qualifiedTeams: qualified.length, byes: stageSize - qualified.length };
}

export async function createMatch(input: {
  competitionId: string;
  groupId?: string;
  homeTeamId: string;
  awayTeamId: string;
  round?: number;
  scheduledAt?: Date;
  venue?: string;
}) {
  await requireAdmin();
  await requireCompetition(input.competitionId);

  if (input.homeTeamId === input.awayTeamId) {
    throw new DomainError("A team cannot play itself", "INVALID_INPUT");
  }
  if (input.round !== undefined) nonNegativeInteger(input.round, "Round");

  const teams = await prisma.team.count({
    where: { id: { in: [input.homeTeamId, input.awayTeamId] } },
  });
  if (teams !== 2) throw new DomainError("One or both teams do not exist", "NOT_FOUND");

  if (input.groupId) {
    const group = await prisma.group.findFirst({
      where: { id: input.groupId, competitionId: input.competitionId },
      include: {
        teams: {
          where: { teamId: { in: [input.homeTeamId, input.awayTeamId] } },
          select: { teamId: true },
        },
      },
    });
    if (!group) throw new DomainError("Group not found in competition", "NOT_FOUND");
    if (group.teams.length !== 2) {
      throw new DomainError("Both teams must belong to the group", "CONFLICT");
    }
  }

  return prisma.match.create({
    data: {
      competitionId: input.competitionId,
      groupId: input.groupId,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      round: input.round,
      scheduledAt: input.scheduledAt,
      venue: input.venue?.trim() || null,
    },
  });
}

export async function recordMatchResult(input: {
  matchId: string;
  homeScore: number;
  awayScore: number;
  notes?: string;
}) {
  await requireAdmin();
  const match = await prisma.match.findUnique({
    where: { id: input.matchId },
    select: { competitionId: true, status: true },
  });
  if (!match) throw new DomainError("Match not found", "NOT_FOUND");
  await requireCompetition(match.competitionId);
  if (match.status === MatchStatus.CANCELLED) {
    throw new DomainError("A cancelled match cannot have a result", "CONFLICT");
  }

  const homeScore = nonNegativeInteger(input.homeScore, "Home score");
  const awayScore = nonNegativeInteger(input.awayScore, "Away score");

  return prisma.$transaction(async (tx) => {
    const result = await tx.matchResult.upsert({
      where: { matchId: input.matchId },
      create: {
        matchId: input.matchId,
        homeScore,
        awayScore,
        notes: input.notes?.trim() || null,
      },
      update: {
        homeScore,
        awayScore,
        notes: input.notes?.trim() || null,
      },
    });
    await tx.match.update({
      where: { id: input.matchId },
      data: { status: MatchStatus.COMPLETED },
    });
    return result;
  });
}

export type StandingRow = {
  position: number;
  team: { id: string; name: string; slug: string; logoUrl: string | null };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export async function getGroupStandings(groupId: string): Promise<StandingRow[]> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      teams: { include: { team: true } },
      matches: {
        where: { status: MatchStatus.COMPLETED, result: { isNot: null } },
        include: { result: true },
      },
    },
  });
  if (!group) throw new DomainError("Group not found", "NOT_FOUND");

  const table = new Map<string, Omit<StandingRow, "position">>();
  for (const entry of group.teams) {
    table.set(entry.teamId, {
      team: {
        id: entry.team.id,
        name: entry.team.name,
        slug: entry.team.slug,
        logoUrl: entry.team.logoUrl,
      },
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const match of group.matches) {
    if (!match.result) continue;
    const home = table.get(match.homeTeamId);
    const away = table.get(match.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.result.homeScore;
    home.goalsAgainst += match.result.awayScore;
    away.goalsFor += match.result.awayScore;
    away.goalsAgainst += match.result.homeScore;

    if (match.result.homeScore > match.result.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.result.homeScore < match.result.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return [...table.values()]
    .map((row) => ({
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst,
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.team.name.localeCompare(b.team.name),
    )
    .map((row, index) => ({ position: index + 1, ...row }));
}
