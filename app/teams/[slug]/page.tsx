import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPublicTeam } from "@/lib/football";
import { statKeys, type StatValues } from "@/lib/match-stats";
import { calculatePlayerRating, matchOutcome, ratingColor } from "@/lib/player-rating";
import { Icon } from "@/components/icon";
import { FollowButton } from "@/components/match-hero";
import { TeamTabs } from "@/components/team-tabs";
import { PlayerSearch } from "./player-search";
import { TeamManager } from "./team-manager";
import { removePlayerAction } from "./actions";

export const dynamic = "force-dynamic";

type PublicTeam = NonNullable<Awaited<ReturnType<typeof getPublicTeam>>>;
type TeamMatch = PublicTeam["homeMatches"][number] & { side: "home" | "away" };
type Rated = { id: string; name: string; shirtNumber: number | null; imageUrl: string | null; apps: number; goals: number; assists: number; avg: number };

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [team, session] = await Promise.all([getPublicTeam(slug), auth()]);
  if (!team) notFound();
  const canManage = Boolean(session?.user?.id && team.createdById === session.user.id);

  const matches: TeamMatch[] = [
    ...team.homeMatches.map((match) => ({ ...match, side: "home" as const })),
    ...team.awayMatches.map((match) => ({ ...match, side: "away" as const })),
  ].sort((a, b) => (a.scheduledAt?.getTime() ?? Infinity) - (b.scheduledAt?.getTime() ?? Infinity));

  const results = matches.filter((match) => match.result).reverse();
  const fixtures = matches.filter((match) => !match.result);
  const nextMatch = fixtures[0];

  const record = results.reduce(
    (acc, match) => {
      const [gf, ga] = goalsOf(match);
      const outcome = outcomeOf(match);
      acc.played += 1; acc.gf += gf; acc.ga += ga;
      if (outcome === "W") acc.won += 1; else if (outcome === "D") acc.drawn += 1; else acc.lost += 1;
      return acc;
    },
    { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 },
  );

  const rated: Rated[] = team.players
    .map((player) => {
      const apps = player.matchStats.length;
      const ratings = player.matchStats.map((stat) => {
        const values = Object.fromEntries(statKeys.map((key) => [key, stat[key]])) as StatValues;
        const result = stat.match.result;
        if (!result) return calculatePlayerRating(values);
        const [scored, conceded] = stat.teamId === stat.match.homeTeamId
          ? [result.homeScore, result.awayScore]
          : [result.awayScore, result.homeScore];
        return calculatePlayerRating(values, matchOutcome(scored, conceded));
      });
      return {
        id: player.id,
        name: player.displayName || player.lastName || player.firstName,
        shirtNumber: player.shirtNumber,
        imageUrl: player.imageUrl,
        apps,
        goals: player.matchStats.reduce((sum, stat) => sum + stat.goals, 0),
        assists: player.matchStats.reduce((sum, stat) => sum + stat.assists, 0),
        avg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      };
    })
    .filter((player) => player.apps > 0)
    .sort((a, b) => b.avg - a.avg);

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <div style={team.logoUrl ? { backgroundImage: `url(${team.logoUrl})` } : undefined} className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#00c281] bg-cover bg-center text-xl font-black text-[#04120c]">
          {team.logoUrl ? null : (team.shortName || team.name.slice(0, 2).toUpperCase())}
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{team.name}</h1>
          <p className="mt-0.5 text-sm text-white/45">{team.shortName || "Football club"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm font-bold text-white/85 transition hover:bg-black/60">
          <Icon name="calendar" size={16} /> Sync to calendar
        </button>
        <FollowButton />
      </div>
    </div>
  );

  const overview = (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Team form */}
      <Card title="Team form">
        {results.length ? (
          <div className="flex flex-wrap gap-3">
            {results.slice(0, 5).map((match) => {
              const opponent = match.side === "home" ? match.awayTeam : match.homeTeam;
              const [gf, ga] = goalsOf(match);
              const outcome = outcomeOf(match);
              return (
                <Link href={`/matches/${match.id}`} key={match.id} className="flex flex-col items-center gap-2">
                  <span className={`rounded-md px-2.5 py-1 text-sm font-black ${outcome === "W" ? "bg-[#00c281] text-[#04120c]" : outcome === "L" ? "bg-red-500 text-white" : "bg-white/25 text-white"}`}>{gf} - {ga}</span>
                  <TeamMark team={opponent} size={9} />
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-white/40">No matches played yet.</p>
        )}
        {record.played > 0 && (
          <div className="mt-5 grid grid-cols-6 gap-2 border-t border-white/8 pt-4 text-center">
            <Mini label="P" value={record.played} /><Mini label="W" value={record.won} accent /><Mini label="D" value={record.drawn} /><Mini label="L" value={record.lost} /><Mini label="GF" value={record.gf} /><Mini label="GA" value={record.ga} />
          </div>
        )}
      </Card>

      {/* Next match */}
      <Card title="Next match" aside={nextMatch?.competition.name}>
        {nextMatch ? (
          <Link href={`/matches/${nextMatch.id}`} className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-2 text-center"><TeamMark team={nextMatch.homeTeam} size={12} /><b className="text-sm">{nextMatch.homeTeam.shortName || nextMatch.homeTeam.name}</b></div>
            <div className="text-center">
              <p className="text-2xl font-black">{nextMatch.scheduledAt ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(nextMatch.scheduledAt) : "TBD"}</p>
              <p className="text-xs text-white/45">{nextMatch.scheduledAt ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(nextMatch.scheduledAt) : ""}</p>
            </div>
            <div className="flex flex-col items-center gap-2 text-center"><TeamMark team={nextMatch.awayTeam} size={12} /><b className="text-sm">{nextMatch.awayTeam.shortName || nextMatch.awayTeam.name}</b></div>
          </Link>
        ) : (
          <p className="text-sm text-white/40">No upcoming match scheduled.</p>
        )}
      </Card>

      {/* Season stats */}
      <div className="lg:row-span-2 lg:col-start-3 lg:row-start-1">
        <Card title="Season stats" aside="Avg. rating">
          {rated.length ? (
            <div className="grid grid-cols-3 gap-x-3 gap-y-5 pt-2">
              {rated.slice(0, 12).map((player) => (
                <div key={player.id} className="flex flex-col items-center text-center">
                  <span className="relative">
                    <span className="grid size-12 place-items-center overflow-hidden rounded-full bg-[#3a3a3a]" style={player.imageUrl ? { backgroundImage: `url(${player.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                      {player.imageUrl ? null : <b className="text-xs">{player.shirtNumber ?? "—"}</b>}
                    </span>
                    <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] font-black ${ratingColor(player.avg)}`}>{player.avg.toFixed(2)}</span>
                  </span>
                  <span className="mt-2 flex items-center gap-1 text-[11px] font-semibold">
                    <span className="text-white/40">{player.shirtNumber ?? ""}</span>{player.name}
                  </span>
                  {(player.goals > 0 || player.assists > 0) && (
                    <span className="mt-0.5 flex items-center gap-2 text-[10px] text-white/50">
                      {player.goals > 0 && <span className="flex items-center gap-0.5"><Icon name="football" size={11} /> {player.goals}</span>}
                      {player.assists > 0 && <span className="flex items-center gap-0.5"><Icon name="star" size={11} /> {player.assists}</span>}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">No player ratings yet. They appear once match stats are recorded.</p>
          )}
        </Card>
      </div>

      {/* Competitions */}
      {team.competitions.length > 0 && (
        <div className="lg:col-span-2">
          <Card title="Competitions">
            <div className="space-y-2">
              {team.competitions.map(({ competition }) => (
                <Link key={competition.slug} href={`/competitions/${competition.slug}`} className="flex items-center gap-3 rounded-xl bg-white/[.03] px-4 py-3 transition hover:bg-white/[.06]">
                  <Icon name="trophy" size={18} className="text-[#00c281]" />
                  <b className="flex-1 truncate">{competition.name}</b>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-white/60">{competition.status}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-black px-3 py-4 text-white sm:px-5 sm:py-6">
      <div className="mx-auto max-w-6xl">
        {canManage && (
          <div className="mb-4">
            <TeamManager team={{ id: team.id, slug: team.slug, name: team.name, shortName: team.shortName, description: team.description, logoUrl: team.logoUrl }} />
            <PlayerSearch teamId={team.id} teamSlug={team.slug} />
          </div>
        )}

        <TeamTabs
          header={header}
          tabs={[
            { label: "Overview", content: overview },
            { label: "Fixtures", content: <MatchList matches={fixtures} empty="No upcoming fixtures scheduled." /> },
            { label: "Results", content: <MatchList matches={results} empty="No results played yet." /> },
            { label: "Squad", content: <Squad team={team} canManage={canManage} /> },
          ]}
        />
      </div>
    </main>
  );
}

function outcomeOf(match: TeamMatch): "W" | "D" | "L" {
  const [gf, ga] = goalsOf(match);
  return gf > ga ? "W" : gf < ga ? "L" : "D";
}

function goalsOf(match: TeamMatch): [number, number] {
  if (!match.result) return [0, 0];
  return match.side === "home" ? [match.result.homeScore, match.result.awayScore] : [match.result.awayScore, match.result.homeScore];
}

function Card({ title, aside, children }: { title: string; aside?: string | null; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/8 bg-[#1b1b1b] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        {aside && <span className="text-xs text-white/40">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Mini({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return <div><p className={`text-lg font-black ${accent ? "text-[#00c281]" : ""}`}>{value}</p><p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</p></div>;
}

function Squad({ team, canManage }: { team: PublicTeam; canManage: boolean }) {
  if (!team.players.length) return <p className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-white/45">The roster is empty.</p>;
  return (
    <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#1b1b1b]">
      {team.players.map((player, i) => (
        <div key={player.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 border-b border-white/8 p-5 transition last:border-0 hover:bg-white/[.03]">
          <div style={player.imageUrl ? { backgroundImage: `url(${player.imageUrl})` } : undefined} className="grid size-14 place-items-center rounded-2xl bg-[#00c281] bg-cover bg-center font-black text-[#04120c]" role={player.imageUrl ? "img" : undefined} aria-label={player.imageUrl ? `${player.displayName || player.intraLogin || player.firstName} profile photo` : undefined}>
            {player.imageUrl ? null : `${player.firstName[0] ?? ""}${player.lastName[0] ?? ""}`.toUpperCase()}
          </div>
          <div>
            <b>{player.displayName || `${player.firstName} ${player.lastName}`}</b>
            <p className="text-sm text-white/45">{player.intraLogin ? `@${player.intraLogin}` : player.position?.toLowerCase() || "Player"}</p>
          </div>
          <div className="flex items-center justify-end gap-4">
            <div className="text-right"><span className="text-2xl font-black text-white/25">{player.shirtNumber ?? "—"}</span><p className="font-mono text-xs text-white/25">#{String(i + 1).padStart(2, "0")}</p></div>
            {canManage && (
              <form action={removePlayerAction.bind(null, team.slug, player.id)}>
                <button type="submit" aria-label={`Remove ${player.firstName} ${player.lastName}`} className="grid size-9 place-items-center rounded-full text-white/40 transition hover:bg-red-500/15 hover:text-red-400"><Icon name="delete" size={18} /></button>
              </form>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchList({ matches, empty }: { matches: TeamMatch[]; empty: string }) {
  if (!matches.length) return <p className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-white/45">{empty}</p>;
  return (
    <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#1b1b1b]">
      {matches.map((match) => {
        const opponent = match.side === "home" ? match.awayTeam : match.homeTeam;
        const [gf, ga] = goalsOf(match);
        const outcome = match.result ? outcomeOf(match) : null;
        return (
          <Link href={`/matches/${match.id}`} key={match.id} className="flex items-center gap-3 border-b border-white/8 px-4 py-4 transition last:border-0 hover:bg-white/[.03] sm:px-5">
            <div className="w-14 shrink-0 text-center">
              {outcome ? (
                <span className={`grid size-7 place-items-center rounded-full text-xs font-black ${outcome === "W" ? "bg-[#00c281] text-[#04120c]" : outcome === "L" ? "bg-red-500 text-white" : "bg-white/25 text-white"}`}>{outcome}</span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{match.side === "home" ? "Home" : "Away"}</span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <TeamMark team={opponent} size={9} />
              <div className="min-w-0"><b className="block truncate text-sm sm:text-base">{opponent.name}</b><p className="truncate text-xs text-white/40">{match.competition.name}{match.group ? ` · ${match.group.name}` : ""}</p></div>
            </div>
            <div className="shrink-0 text-right">
              {match.result ? (
                <b className="text-lg tabular-nums">{gf}<span className="px-1 text-white/40">-</span>{ga}</b>
              ) : (
                <b className="text-sm text-white/60">{match.scheduledAt ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(match.scheduledAt) : "TBD"}</b>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function TeamMark({ team, size = 9 }: { team: { name: string; logoUrl: string | null }; size?: 9 | 12 }) {
  const cls = `${size === 12 ? "size-12" : "size-9"} shrink-0 rounded-full`;
  return team.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={team.logoUrl} alt="" className={`${cls} bg-white object-cover ring-1 ring-white/10`} />
  ) : (
    <span className={`${cls} grid place-items-center bg-white/10 text-[10px] font-black`}>{team.name.slice(0, 2).toUpperCase()}</span>
  );
}
