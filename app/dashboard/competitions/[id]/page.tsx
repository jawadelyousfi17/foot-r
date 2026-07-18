import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getGroupStandings } from "@/lib/football";
import { prisma } from "@/lib/prisma";
import { CompetitionBuilder } from "./competition-builder";
import { MatchFilter } from "./match-filter";
import { recordResultAction, scheduleMatchAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ManageCompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/dashboard");

  const [competition, allTeams] = await Promise.all([
    prisma.competition.findFirst({
      where: { id },
      include: {
        teams: { include: { team: true }, orderBy: { joinedAt: "asc" } },
        groups: {
          orderBy: { position: "asc" },
          include: { teams: { include: { team: true }, orderBy: { seed: "asc" } } },
        },
        matches: {
          orderBy: { scheduledAt: "asc" },
          include: { homeTeam: true, awayTeam: true, result: true, group: true },
        },
      },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!competition) notFound();
  const standings = await Promise.all(competition.groups.map((group) => getGroupStandings(group.id)));

  const teamData = (team: { id: string; name: string; shortName: string | null; logoUrl: string | null }) => ({
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    logoUrl: team.logoUrl,
  });

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <Link href="/dashboard" className="text-sm font-bold text-muted-foreground">← Dashboard</Link>
      <div className="mt-6 flex flex-col justify-between gap-5 pb-8 md:flex-row md:items-end">
        <div>
          <Badge className="bg-[#d7ff3f] text-black">ADMIN WORKSPACE</Badge>
          <h1 className="mt-4 text-5xl font-black tracking-[-.05em]">{competition.name}</h1>
          <p className="mt-2 text-muted-foreground">Build teams, groups and fixtures in four quick steps.</p>
        </div>
        <Link href={`/competitions/${competition.slug}`} className={buttonVariants({ variant: "outline" })}>View public page →</Link>
      </div>

      <CompetitionBuilder
        competitionId={id}
        allTeams={allTeams.map(teamData)}
        registeredTeams={competition.teams.map(({ team }) => teamData(team))}
        groups={competition.groups.map((group, index) => ({
          id: group.id,
          name: group.name,
          teams: group.teams.map(({ team }) => teamData(team)),
          rankedTeams: standings[index].map((row) => ({
            id: row.team.id,
            name: row.team.name,
            position: row.position,
            points: row.points,
            goalDifference: row.goalDifference,
            goalsFor: row.goalsFor,
          })),
          qualificationConfirmed: (() => {
            const groupMatches = competition.matches.filter((match) => match.groupId === group.id);
            return groupMatches.length > 0 && groupMatches.every((match) => match.status === "COMPLETED" && match.result !== null);
          })(),
        }))}
        hasGeneratedFixtures={competition.matches.some((match) => match.groupId !== null)}
        knockoutStages={[...new Set(competition.matches.filter((match) => match.groupId === null && match.round).map((match) => match.round as number))]}
        fixtures={<FixtureSchedule competitionId={id} matches={competition.matches} />}
        results={<MatchResults competitionId={id} matches={competition.matches} />}
      />
    </main>
  );
}

type ManagedMatch = Awaited<ReturnType<typeof prisma.match.findMany>>[number] & {
  homeTeam: { name: string };
  awayTeam: { name: string };
  group: { name: string } | null;
  result: { homeScore: number; awayScore: number } | null;
};

function filterMeta(matches: ManagedMatch[]) {
  return {
    groups: [...new Set(matches.map((match) => match.group?.name).filter((name): name is string => Boolean(name)))],
    hasKnockout: matches.some((match) => match.group === null),
  };
}

function FixtureSchedule({ competitionId, matches }: { competitionId: string; matches: ManagedMatch[] }) {
  const { groups, hasKnockout } = filterMeta(matches);
  return (
    <section>
      <SectionHeading eyebrow="Schedule" title="Fixture dates" count={matches.length} />
      {!matches.length ? <EmptyMatches /> : (
        <MatchFilter
          groups={groups}
          hasKnockout={hasKnockout}
          unsetLabel="Only without date"
          items={matches.map((match) => ({
            key: match.id,
            group: match.group?.name ?? null,
            unset: !match.scheduledAt,
            search: `${match.homeTeam.name} ${match.awayTeam.name}`.toLowerCase(),
            node: (
              <MatchCard match={match}>
                <form action={scheduleMatchAction.bind(null, competitionId, match.id)} className="flex items-end gap-2">
                  <label className="text-xs font-bold">Edit date & time
                    <input name="scheduledAt" type="datetime-local" required defaultValue={match.scheduledAt?.toISOString().slice(0, 16)} className="mt-1 block h-8 rounded-lg border border-input px-2 text-sm" />
                  </label>
                  <Button type="submit" variant="outline">{match.scheduledAt ? "Update time" : "Set time"}</Button>
                </form>
              </MatchCard>
            ),
          }))}
        />
      )}
    </section>
  );
}

function MatchResults({ competitionId, matches }: { competitionId: string; matches: ManagedMatch[] }) {
  const { groups, hasKnockout } = filterMeta(matches);
  return (
    <section>
      <SectionHeading eyebrow="Match control" title="Enter results" count={matches.length} />
      {!matches.length ? <EmptyMatches /> : (
        <MatchFilter
          groups={groups}
          hasKnockout={hasKnockout}
          unsetLabel="Only without result"
          items={matches.map((match) => ({
            key: match.id,
            group: match.group?.name ?? null,
            unset: !match.result,
            search: `${match.homeTeam.name} ${match.awayTeam.name}`.toLowerCase(),
            node: (
              <MatchCard match={match}>
                <form action={recordResultAction.bind(null, competitionId, match.id)} className="flex items-end gap-2">
                  <ScoreInput name="homeScore" label="Home" value={match.result?.homeScore} />
                  <span className="pb-2 font-black">:</span>
                  <ScoreInput name="awayScore" label="Away" value={match.result?.awayScore} />
                  <Button type="submit">{match.result ? "Update" : "Save result"}</Button>
                </form>
              </MatchCard>
            ),
          }))}
        />
      )}
    </section>
  );
}

function MatchCard({ match, children }: { match: ManagedMatch; children: React.ReactNode }) {
  return <div className="grid gap-4 rounded-2xl border border-black/10 bg-white p-5 xl:grid-cols-[1fr_auto] xl:items-end"><div><p className="text-xs text-black/40">{match.group?.name || "Competition"}{match.round ? ` · Round ${match.round}` : ""} · {match.scheduledAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(match.scheduledAt) : "Date TBD"}</p><h3 className="mt-2 text-lg font-black">{match.homeTeam.name} <span className="mx-2 text-black/25">vs</span> {match.awayTeam.name}</h3><div className="mt-2 flex flex-wrap gap-3"><Link href={`/matches/${match.id}`} className="text-xs font-bold text-muted-foreground hover:text-foreground">View match →</Link><Link href={`/dashboard/matches/${match.id}/lineup`} className="text-xs font-black text-[#d7ff3f]">Set lineups →</Link><Link href={`/dashboard/matches/${match.id}/stats`} className="text-xs font-black text-emerald-500 hover:text-emerald-400">Open live stats →</Link></div></div>{children}</div>;
}

function SectionHeading({ eyebrow, title, count }: { eyebrow: string; title: string; count: number }) {
  return <div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-black/40">{eyebrow}</p><h2 className="mt-2 text-3xl font-black">{title}</h2></div><span className="text-sm text-black/40">{count} matches</span></div>;
}

function EmptyMatches() {
  return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No fixtures yet. Generate them in the Fixtures tab.</p>;
}

function ScoreInput({ name, label, value }: { name: string; label: string; value?: number }) {
  return (
    <label className="text-xs font-bold">{label}
      <input name={name} type="number" min="0" required defaultValue={value} className="mt-1 block h-8 w-20 rounded-lg border border-input px-2 text-sm" />
    </label>
  );
}
