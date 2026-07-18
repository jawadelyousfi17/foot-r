"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCompetition, createTeam, setCompetitionStatus } from "@/lib/football";
import { CompetitionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { uploadPublicImage } from "@/lib/storage";

function value(data: FormData, key: string) { return String(data.get(key) ?? ""); }
export async function createTeamAction(data: FormData) {
  const team = await createTeam({ name: value(data,"name"), shortName: value(data,"shortName"), description: value(data,"description") });
  const file = data.get("logo");
  if (file instanceof File && file.size) {
    const logoUrl = await uploadPublicImage(file, "teams", team.id);
    await prisma.team.update({ where: { id: team.id }, data: { logoUrl } });
  }
  revalidatePath("/dashboard"); revalidatePath("/teams");
  redirect(`/teams/${team.slug}`);
}
export async function createCompetitionAction(data: FormData) {
  const competition = await createCompetition({ name: value(data,"name"), description: value(data,"description") });
  const file = data.get("logo");
  if (file instanceof File && file.size) {
    const logoUrl = await uploadPublicImage(file, "competitions", competition.id);
    await prisma.competition.update({ where: { id: competition.id }, data: { logoUrl } });
  }
  revalidatePath("/dashboard"); revalidatePath("/competitions");
  redirect("/dashboard");
}

export async function publishCompetitionAction(competitionId: string) {
  await setCompetitionStatus(competitionId, CompetitionStatus.ACTIVE);
  revalidatePath("/dashboard");
  revalidatePath("/competitions");
}
