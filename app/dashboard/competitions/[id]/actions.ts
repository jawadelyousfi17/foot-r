"use server";

import { revalidatePath } from "next/cache";
import {
  addTeamsToCompetition,
  addTeamsToGroup,
  createCompetitionGroups,
  createKnockoutFixture,
  generateKnockoutStage,
  createMatch,
  deleteGroup,
  generateAllGroupFixtures,
  recordMatchResult,
  scheduleMatch,
  updateGroup,
} from "@/lib/football";

const text = (data: FormData, key: string) => String(data.get(key) ?? "");
const texts = (data: FormData, key: string) => data.getAll(key).map(String).filter(Boolean);
const optionalNumber = (data: FormData, key: string) => {
  const raw = text(data, key);
  return raw ? Number(raw) : undefined;
};

function refresh(competitionId: string) {
  revalidatePath(`/dashboard/competitions/${competitionId}`);
}

export async function addCompetitionTeamsAction(competitionId: string, data: FormData) {
  await addTeamsToCompetition({ competitionId, teamIds: texts(data, "teamIds") });
  refresh(competitionId);
}

export async function createGroupsAction(competitionId: string, data: FormData) {
  await createCompetitionGroups({ competitionId, count: Number(text(data, "count")) });
  refresh(competitionId);
}

export async function assignGroupTeamsAction(competitionId: string, data: FormData) {
  await addTeamsToGroup({ groupId: text(data, "groupId"), teamIds: texts(data, "teamIds") });
  refresh(competitionId);
}

export async function updateGroupAction(competitionId: string, data: FormData) {
  await updateGroup({ groupId: text(data, "groupId"), name: text(data, "name") });
  refresh(competitionId);
}

export async function deleteGroupAction(competitionId: string, data: FormData) {
  await deleteGroup(text(data, "groupId"));
  refresh(competitionId);
}

export async function generateFixturesAction(competitionId: string, data: FormData) {
  const legs = Number(text(data, "legs"));
  await generateAllGroupFixtures({
    competitionId,
    legs: legs === 2 ? 2 : 1,
  });
  refresh(competitionId);
}

export async function createKnockoutFixtureAction(competitionId: string, data: FormData) {
  await createKnockoutFixture({
    competitionId,
    homeGroupId: text(data, "homeGroupId"),
    homePosition: Number(text(data, "homePosition")),
    awayGroupId: text(data, "awayGroupId"),
    awayPosition: Number(text(data, "awayPosition")),
  });
  refresh(competitionId);
}

export async function generateKnockoutStageAction(competitionId: string, data: FormData) {
  const parsedPairs: unknown = JSON.parse(text(data, "groupPairs") || "[]");
  if (!Array.isArray(parsedPairs) || !parsedPairs.every((pair) => Array.isArray(pair) && (pair.length === 2 || pair.length === 3) && pair.every((id) => typeof id === "string"))) {
    throw new Error("Invalid group pairing plan");
  }
  await generateKnockoutStage({
    competitionId,
    qualifiersPerGroup: Number(text(data, "qualifiersPerGroup")),
    bestNextPlaced: Number(text(data, "bestNextPlaced")),
    groupPairs: parsedPairs as string[][],
  });
  refresh(competitionId);
}

export async function scheduleMatchAction(competitionId: string, matchId: string, data: FormData) {
  await scheduleMatch({ matchId, scheduledAt: new Date(text(data, "scheduledAt")) });
  refresh(competitionId);
  revalidatePath("/competitions");
}

export async function createFixtureAction(competitionId: string, data: FormData) {
  const scheduled = text(data, "scheduledAt");
  await createMatch({
    competitionId,
    groupId: text(data, "groupId") || undefined,
    homeTeamId: text(data, "homeTeamId"),
    awayTeamId: text(data, "awayTeamId"),
    round: optionalNumber(data, "round"),
    scheduledAt: scheduled ? new Date(scheduled) : undefined,
    venue: text(data, "venue"),
  });
  refresh(competitionId);
}

export async function recordResultAction(competitionId: string, matchId: string, data: FormData) {
  await recordMatchResult({
    matchId,
    homeScore: Number(text(data, "homeScore")),
    awayScore: Number(text(data, "awayScore")),
  });
  refresh(competitionId);
  revalidatePath("/competitions");
}
