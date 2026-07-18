import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LineupSelector } from "./lineup-selector";

export const dynamic = "force-dynamic";

export default async function MatchLineupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/dashboard");
  const match = await prisma.match.findFirst({ where: { id, competition: { ownerId: session.user.id } }, include: { competition: true, lineupEntries: true, homeTeam: { include: { players: { orderBy: { shirtNumber: "asc" } } } }, awayTeam: { include: { players: { orderBy: { shirtNumber: "asc" } } } } } });
  if (!match) notFound();
  const teamData = (team: typeof match.homeTeam) => ({ id: team.id, name: team.name, logoUrl: team.logoUrl, players: team.players.map((player) => ({ id: player.id, name: player.displayName || `${player.firstName} ${player.lastName}`, imageUrl: player.imageUrl, number: player.shirtNumber, position: player.position })), starters: match.lineupEntries.filter((entry) => entry.teamId === team.id && entry.role === "STARTER").sort((a,b)=>(a.position ?? 0)-(b.position ?? 0)).map((entry) => entry.playerId) });
  return <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8"><Link href={`/dashboard/competitions/${match.competitionId}`} className="text-sm font-bold text-muted-foreground">← Competition manager</Link><div className="my-8 border-b pb-8"><Badge className="bg-[#d7ff3f] text-black">ADMIN · PRE-MATCH</Badge><h1 className="mt-4 text-4xl font-black">Select match lineups</h1><p className="mt-2 text-muted-foreground">{match.homeTeam.name} vs {match.awayTeam.name} · Choose five starters for each side.</p></div><LineupSelector matchId={match.id} homeTeam={teamData(match.homeTeam)} awayTeam={teamData(match.awayTeam)} /></main>;
}
