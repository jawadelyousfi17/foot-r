"use server";

import { revalidatePath } from "next/cache";
import { addPlayer, DomainError, removePlayer, updateTeam } from "@/lib/football";
import { findFortyTwoUser } from "@/lib/forty-two";
import { prisma } from "@/lib/prisma";
import { uploadPublicImage } from "@/lib/storage";
import { PlayerPosition } from "@/generated/prisma/client";

const allowedPositions = new Set(Object.values(PlayerPosition));

export async function updateTeamAction(teamId: string, teamSlug: string, formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const shortName = String(formData.get("shortName") ?? "");
  const description = String(formData.get("description") ?? "");

  let logoUrl: string | undefined;
  const file = formData.get("logo");
  if (file instanceof File && file.size) {
    logoUrl = (await uploadPublicImage(file, "teams", teamId)) ?? undefined;
  }

  await updateTeam({ teamId, name, shortName, description, logoUrl });
  revalidatePath(`/teams/${teamSlug}`);
  revalidatePath("/teams");
}

export async function removePlayerAction(teamSlug: string, playerId: string) {
  await removePlayer(playerId);
  revalidatePath(`/teams/${teamSlug}`);
}

export async function addManualPlayerAction(teamId: string, teamSlug: string, formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const positionRaw = String(formData.get("position") ?? "");
  const shirtRaw = String(formData.get("shirtNumber") ?? "").trim();

  if (!firstName || !lastName) {
    throw new DomainError("First and last name are required", "INVALID_INPUT");
  }
  const position = allowedPositions.has(positionRaw as PlayerPosition)
    ? (positionRaw as PlayerPosition)
    : undefined;
  const shirtNumber = shirtRaw ? Number(shirtRaw) : undefined;
  if (shirtNumber !== undefined && (!Number.isInteger(shirtNumber) || shirtNumber < 0)) {
    throw new DomainError("Shirt number must be a positive whole number", "INVALID_INPUT");
  }

  await addPlayer({
    teamId,
    firstName,
    lastName,
    displayName: displayName || undefined,
    position,
    shirtNumber,
  });
  revalidatePath(`/teams/${teamSlug}`);
}

export type RosterResult = {
  login: string;
  status: "added" | "skipped" | "error";
  role: string | null;
  message: string;
};

// Parse a comma-separated roster string.
//   "login1, login2, login3(c)"
//   - first login  -> goalkeeper
//   - login with a "(c)" suffix -> captain
//   - everyone else -> no fixed position
function parseRoster(raw: string) {
  const tokens = raw
    .split(/[,\n]/)
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.map((token, index) => {
    const captain = /\(c\)$/i.test(token);
    const login = token.replace(/\(c\)$/i, "").trim().toLowerCase();
    let position: PlayerPosition | undefined;
    if (captain) position = PlayerPosition.CAPTAIN;
    else if (index === 0) position = PlayerPosition.GOALKEEPER;
    return { login, position };
  });
}

export async function addPlayersBulk(
  teamId: string,
  teamSlug: string,
  formData: FormData,
): Promise<RosterResult[]> {
  const roster = parseRoster(String(formData.get("roster") ?? ""));
  if (!roster.length) {
    throw new DomainError("Enter at least one 42 login", "INVALID_INPUT");
  }

  const results: RosterResult[] = [];
  const seen = new Set<string>();

  for (const { login, position } of roster) {
    const role = position ? roleLabel(position) : "Player";

    if (!/^[a-z0-9-]+$/.test(login)) {
      results.push({ login, status: "error", role: null, message: "Not a valid 42 login" });
      continue;
    }
    if (seen.has(login)) {
      results.push({ login, status: "skipped", role, message: "Duplicate in list" });
      continue;
    }
    seen.add(login);

    try {
      const profile = await findFortyTwoUser(login);
      const existing = await prisma.player.findUnique({ where: { intraId: profile.id } });
      if (existing) {
        results.push({
          login,
          status: "skipped",
          role,
          message: existing.teamId === teamId ? "Already on this team" : "On another team",
        });
        continue;
      }

      await addPlayer({
        teamId,
        intraId: profile.id,
        intraLogin: profile.login,
        firstName: profile.first_name,
        lastName: profile.last_name,
        displayName: profile.usual_full_name || profile.displayname || undefined,
        slug: profile.login,
        imageUrl: profile.image?.link || undefined,
        position,
      });
      results.push({ login, status: "added", role, message: `Added as ${role}` });
    } catch (error) {
      const message =
        error instanceof DomainError || error instanceof Error
          ? error.message
          : "Could not add this player";
      results.push({ login, status: "error", role: null, message });
    }
  }

  revalidatePath(`/teams/${teamSlug}`);
  return results;
}

function roleLabel(position: PlayerPosition) {
  return (
    {
      GOALKEEPER: "Goalkeeper",
      DEFENDER: "Defender",
      MIDFIELDER: "Midfielder",
      FORWARD: "Attacker",
      CAPTAIN: "Captain",
    } satisfies Record<PlayerPosition, string>
  )[position];
}
