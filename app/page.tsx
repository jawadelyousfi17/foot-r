import { HomeMatchCenter } from "@/components/home-match-center";
import { getGroupStandings, getPublicCompetition, listPublicCompetitions } from "@/lib/football";

export const dynamic = "force-dynamic";

export default async function Home() {
  const summaries = await listPublicCompetitions();
  const competitions = await Promise.all(
    summaries.slice(0, 1).map(async ({ slug }) => {
      const competition = await getPublicCompetition(slug);
      if (!competition) return null;

      const tables = await Promise.all(
        competition.groups.map(async (group) => ({
          id: group.id,
          name: group.name,
          rows: await getGroupStandings(group.id),
        })),
      );

      const provisionalSlot = (teamId: string) => {
        for (const table of tables) {
          const row = table.rows.find((standing) => standing.team.id === teamId);
          if (!row) continue;
          const groupMatches = competition.matches.filter((match) => match.groupId === table.id);
          const confirmed = groupMatches.length > 0 && groupMatches.every((match) => match.status === "COMPLETED" && match.result);
          if (confirmed) return null;
          if (row.position >= 3) return `Best ${ordinal(row.position)}`;
          return `${table.name} ${ordinal(row.position)}`;
        }
        return null;
      };

      return {
        id: competition.id,
        name: competition.name,
        slug: competition.slug,
        status: competition.status,
        matches: competition.matches.map((match) => ({
          id: match.id,
          scheduledAt: match.scheduledAt?.toISOString() ?? null,
          status: match.status,
          groupName: competition.groups.find((group) => group.id === match.groupId)?.name ?? null,
          isKnockout: match.groupId === null,
          round: match.round,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homePlaceholder: match.groupId === null ? provisionalSlot(match.homeTeamId) : null,
          awayPlaceholder: match.groupId === null ? provisionalSlot(match.awayTeamId) : null,
          result: match.result
            ? { homeScore: match.result.homeScore, awayScore: match.result.awayScore }
            : null,
        })),
        tables,
      };
    }),
  );

  return <HomeMatchCenter competitions={competitions.filter((item) => item !== null)} />;
}

function ordinal(value: number) {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  return `${value}${value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th"}`;
}
