import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PlayerPosition, PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const teams = [
  ["Atlas Lions", "ATL"],
  ["Casablanca Stars", "CAS"],
  ["Rabat United", "RBT"],
  ["Marrakech City", "MAR"],
  ["Tangier Waves", "TNG"],
  ["Agadir Eagles", "AGA"],
  ["Fes Warriors", "FES"],
  ["Meknes Royals", "MEK"],
  ["Oujda Phoenix", "OUJ"],
  ["Tetouan Athletic", "TET"],
  ["Safi Mariners", "SAF"],
  ["Kenitra Racing", "KEN"],
  ["El Jadida Knights", "JAD"],
  ["Beni Mellal Falcons", "BML"],
  ["Nador Sporting", "NAD"],
  ["Ifrane Wolves", "IFR"],
  ["Essaouira Wind", "ESS"],
  ["Dakhla Ocean", "DAK"],
  ["Laayoune Sahara", "LAY"],
  ["Chefchaouen Blues", "CHE"],
  ["Taza Tigers", "TAZ"],
  ["Khouribga Miners", "KHO"],
  ["Mohammedia Port", "MOH"],
  ["Sale Corsairs", "SAL"],
] as const;

const firstNames = [
  "Adam", "Youssef", "Amine", "Ilyas", "Omar", "Mehdi", "Ayoub", "Zakaria",
];

const lastNames = [
  "Alaoui", "Bennani", "Idrissi", "El Amrani", "Tazi", "Berrada", "Naciri", "Fassi",
];

const positions = [
  PlayerPosition.GOALKEEPER,
  PlayerPosition.DEFENDER,
  PlayerPosition.DEFENDER,
  PlayerPosition.MIDFIELDER,
  PlayerPosition.MIDFIELDER,
  PlayerPosition.FORWARD,
  PlayerPosition.FORWARD,
  PlayerPosition.CAPTAIN,
] as const;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  for (const [teamIndex, [name, shortName]] of teams.entries()) {
    const teamSlug = `demo-${slugify(name)}`;
    const team = await prisma.team.upsert({
      where: { slug: teamSlug },
      update: {
        name,
        shortName,
        description: `Demo squad representing ${name}.`,
        logoUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear`,
      },
      create: {
        name,
        slug: teamSlug,
        shortName,
        description: `Demo squad representing ${name}.`,
        logoUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear`,
      },
    });

    for (let playerIndex = 0; playerIndex < 8; playerIndex += 1) {
      const firstName = firstNames[(teamIndex + playerIndex) % firstNames.length];
      const lastName = lastNames[(teamIndex * 2 + playerIndex) % lastNames.length];
      const playerSlug = `${teamSlug}-player-${playerIndex + 1}`;
      const player = {
        teamId: team.id,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        shirtNumber: playerIndex + 1,
        position: positions[playerIndex],
        imageUrl: `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(playerSlug)}`,
      };

      await prisma.player.upsert({
        where: { slug: playerSlug },
        update: player,
        create: { ...player, slug: playerSlug },
      });
    }
  }

  const seededTeams = await prisma.team.count({
    where: { slug: { startsWith: "demo-" } },
  });
  const seededPlayers = await prisma.player.count({
    where: { slug: { startsWith: "demo-" } },
  });

  console.log(`Seed complete: ${seededTeams} demo teams and ${seededPlayers} demo players.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
