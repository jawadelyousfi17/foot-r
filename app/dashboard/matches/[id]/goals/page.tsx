import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { emptyStats, statKeys, type StatValues } from "@/lib/match-stats";
import { prisma } from "@/lib/prisma";
import { GoalsEditor } from "./goals-editor";

export const dynamic = "force-dynamic";

export default async function MatchGoalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/dashboard");

  const match = await prisma.match.findFirst({
    where: { id },
    include: {
      competition: true,
      result: true,
      homeTeam: { include: { players: { include: { matchStats: { where: { matchId: id } } }, orderBy: { shirtNumber: "asc" } } } },
      awayTeam: { include: { players: { include: { matchStats: { where: { matchId: id } } }, orderBy: { shirtNumber: "asc" } } } },
    },
  });
  if (!match) notFound();

  const teamData = (team: typeof match.homeTeam) => ({
    id: team.id,
    name: team.name,
    logoUrl: team.logoUrl,
    players: team.players.map((player) => {
      const stored = player.matchStats[0];
      const stats = stored ? Object.fromEntries(statKeys.map((key) => [key, stored[key]])) as StatValues : emptyStats();
      return {
        id: player.id,
        name: player.displayName || `${player.firstName} ${player.lastName}`,
        login: player.intraLogin,
        imageUrl: player.imageUrl,
        number: player.shirtNumber,
        goals: stats.goals,
        assists: stats.assists,
        yellowCards: stats.yellowCards,
        redCards: stats.redCards,
        stats,
      };
    }),
  });

  return <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
    <Link href={`/dashboard/competitions/${match.competitionId}`} className="text-sm font-bold text-muted-foreground">← Competition manager</Link>
    <div className="my-8 flex flex-col justify-between gap-4 border-b pb-8 md:flex-row md:items-end">
      <div>
        <Badge className="bg-[#d7ff3f] text-black">ADMIN · GOALS, ASSISTS &amp; CARDS</Badge>
        <h1 className="mt-4 text-4xl font-black tracking-tight">{match.homeTeam.name} vs {match.awayTeam.name}</h1>
        <p className="mt-2 text-muted-foreground">{match.competition.name} · Record who scored, who assisted and who was booked. The match score and player ratings update from these totals.</p>
      </div>
      <Link href={`/dashboard/matches/${match.id}/stats`} className="text-sm font-bold underline underline-offset-4">Full stat console →</Link>
    </div>
    <GoalsEditor
      matchId={match.id}
      homeTeam={teamData(match.homeTeam)}
      awayTeam={teamData(match.awayTeam)}
      expectedScore={match.result ? { home: match.result.homeScore, away: match.result.awayScore } : null}
    />
  </main>;
}
