import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { LineupRole, PlayerPosition } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { statKeys, type StatValues } from "@/lib/match-stats";
import { calculatePlayerRating, ratingColor } from "@/lib/player-rating";
import { Icon, type IconName } from "@/components/icon";
import { MatchClock } from "@/components/match-clock";
import { FollowButton, MatchCountdown, MatchTabsProvider, MatchTabsNav, MatchTabsContent, WhoWillWin } from "@/components/match-hero";
import { castMatchVote, getMatchVoteTally } from "./actions";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      competition: true,
      group: true,
      result: true,
      playerStats: true,
      lineupEntries: true,
      homeTeam: { include: { players: { orderBy: [{ shirtNumber: "asc" }, { lastName: "asc" }] } } },
      awayTeam: { include: { players: { orderBy: [{ shirtNumber: "asc" }, { lastName: "asc" }] } } },
    },
  });
  if (!match) notFound();

  const voteTally = await getMatchVoteTally(match.id);
  const played = Boolean(match.result);
  const date = match.scheduledAt;
  const stage = match.group?.name ?? (match.round ? knockoutRound(match.round) : "Knockout");
  const total = (teamId: string, key: "passes" | "accuratePasses" | "shots" | "shotsOnTarget" | "saves" | "fouls" | "corners" | "tackles") => match.playerStats.filter((row) => row.teamId === teamId).reduce((sum, row) => sum + row[key], 0);
  const ratings = new Map(match.playerStats.map((row) => [row.playerId, calculatePlayerRating(Object.fromEntries(statKeys.map((key) => [key, row[key]])) as StatValues)]));
  const contributions = new Map(match.playerStats.map((row) => [row.playerId, { goals: row.goals, assists: row.assists }]));

  const kickoffTime = date ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date) : "TBD";
  const live = ["FIRST_HALF", "SECOND_HALF", "EXTRA_TIME", "PENALTIES", "IN_PROGRESS"].includes(match.status);
  const extraLabel = match.status === "EXTRA_TIME" ? "After extra time" : match.status === "PENALTIES" ? "After penalties" : played ? "Full time" : null;

  const homePasses = total(match.homeTeamId, "passes");
  const awayPasses = total(match.awayTeamId, "passes");
  const passTotal = homePasses + awayPasses;
  const homePoss = passTotal ? Math.round((homePasses / passTotal) * 100) : 50;
  const awayPoss = 100 - homePoss;
  const statistics = (
    <div>
      <h3 className="mb-6 text-center text-lg font-bold">Top stats</h3>
      <p className="mb-3 text-center text-sm text-white/55">Ball possession</p>
      <div className="mb-6 flex h-11 overflow-hidden rounded-full text-sm font-black">
        <div className="flex items-center bg-[#e8e45c] pl-4 text-black" style={{ width: `${homePoss}%` }}>{homePoss}%</div>
        <div className="flex items-center justify-end bg-[#751413] pl-4 text-white" style={{ width: `${awayPoss}%` }}><span className="pr-4">{awayPoss}%</span></div>
      </div>
      <div className="divide-y divide-white/8">
        <Stat label="Goals" home={match.result?.homeScore ?? "—"} away={match.result?.awayScore ?? "—"} />
        <Stat label="Shots" home={total(match.homeTeamId, "shots")} away={total(match.awayTeamId, "shots")} />
        <Stat label="Shots on target" home={total(match.homeTeamId, "shotsOnTarget")} away={total(match.awayTeamId, "shotsOnTarget")} />
        <Stat label="Passes" home={homePasses} away={awayPasses} />
        <Stat label="Accurate passes" home={total(match.homeTeamId, "accuratePasses")} away={total(match.awayTeamId, "accuratePasses")} />
        <Stat label="Saves" home={total(match.homeTeamId, "saves")} away={total(match.awayTeamId, "saves")} />
        <Stat label="Tackles" home={total(match.homeTeamId, "tackles")} away={total(match.awayTeamId, "tackles")} />
        <Stat label="Fouls" home={total(match.homeTeamId, "fouls")} away={total(match.awayTeamId, "fouls")} />
        <Stat label="Corners" home={total(match.homeTeamId, "corners")} away={total(match.awayTeamId, "corners")} />
      </div>
    </div>
  );

  const matchTabs = [
    {
      label: "Lineups",
      content: <MatchLineups matchId={match.id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} ratings={ratings} contributions={contributions} lineupEntries={match.lineupEntries} />,
    },
    { label: "Statistics", content: statistics },
    {
      label: "Head-to-Head",
      content: (
        <div>
          <h3 className="mb-4 font-bold">Match information</h3>
          <div className="space-y-3 text-sm">
            <Info label="Competition" value={match.competition.name} />
            <Info label="Stage" value={stage} />
            <Info label="Round" value={match.round ? String(match.round) : "—"} />
            <Info label="Status" value={match.status.replaceAll("_", " ")} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-black px-3 py-4 text-white sm:px-5 sm:py-6">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
         <MatchTabsProvider tabs={matchTabs}>
          {/* Hero banner */}
          <section className="overflow-hidden rounded-[28px] bg-[#1b1b1b]">
            {/* Gradient top */}
            <div
              className="relative px-4 pb-6 pt-5 sm:px-10"
              style={{
                backgroundImage:
                  "linear-gradient(90deg,rgba(16,42,28,.78) 0%,rgba(33,46,35,.48) 30%,rgba(23,43,77,.4) 55%,rgba(17,53,143,.35) 100%), linear-gradient(108deg,#24442d 0%,#524d31 27%,#8d3a3a 31%,#2e4159 39%,#183e98 60%,#182e77 100%)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-5">
                  <Link href={`/competitions/${match.competition.slug}`} aria-label="Back" className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-black transition hover:bg-white/90 sm:size-12">
                    <Icon name="chevronLeft" size={22} />
                  </Link>
                  <span className="hidden text-lg font-semibold sm:block">Matches</span>
                </div>
                <FollowButton />
              </div>

              <div className="pointer-events-none absolute left-1/2 top-6 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap sm:top-7">
                <Icon name="trophy" size={20} className="shrink-0 text-white/90" />
                <span className="max-w-[46vw] truncate text-sm font-normal tracking-tight sm:max-w-md sm:text-xl">{match.competition.name}</span>
              </div>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-medium text-[#a5a5a8] sm:mt-11 sm:text-base">
                <Meta icon="calendar" text={date ? new Intl.DateTimeFormat("en", { weekday: "short", month: "long", day: "numeric" }).format(date) + `, ${kickoffTime}` : "Date TBD"} />
                <Meta icon="location" text={match.venue || "1337 Campus"} />
                {match.refereeName && <Meta icon="whistle" text={match.refereeName} />}
              </div>
            </div>

            {/* Score area */}
            <div className="px-4 py-8 sm:px-8 sm:py-12">
              <div className="mx-auto grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
                <HeroTeam team={match.homeTeam} align="right" />
                <div className="text-center">
                  {played ? (
                    <>
                      <p className="text-3xl font-black tracking-wide tabular-nums sm:text-4xl">{match.result?.homeScore}<span className="mx-2 text-white/40">-</span>{match.result?.awayScore}</p>
                      {extraLabel && <p className="mt-2 text-xs font-semibold text-[#9f9fa2] sm:text-sm">{extraLabel}</p>}
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-black tracking-tight sm:text-3xl">{kickoffTime}</p>
                      <MatchCountdown kickoff={date ? date.toISOString() : null} />
                    </>
                  )}
                  {live && (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <MatchClock status={match.status} phaseStartedAt={match.phaseStartedAt?.toISOString() ?? null} />
                    </div>
                  )}
                </div>
                <HeroTeam team={match.awayTeam} align="left" />
              </div>
            </div>

            {/* Tab nav stays in the hero card */}
            <div className="px-4 pt-1 sm:px-8">
              <MatchTabsNav />
            </div>
          </section>

          {/* Tab content in its own card, separated by a gap */}
          <div className="mt-5 rounded-[28px] bg-[#1b1b1b] p-4 sm:p-6">
            <MatchTabsContent />
          </div>
         </MatchTabsProvider>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <WhoWillWin matchId={match.id} home={match.homeTeam} away={match.awayTeam} initialTally={voteTally} vote={castMatchVote} />

          <section className="rounded-3xl border border-white/8 bg-[#1c1c1c] p-5">
            <div className="flex items-start gap-3">
              <Icon name="location" size={20} className="mt-0.5 shrink-0 text-white/60" />
              <div>
                <p className="font-bold">{match.venue || "1337 Campus"}</p>
                <p className="text-sm text-white/45">{match.competition.name}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3 border-t border-white/8 pt-4 text-sm">
              <SideInfo icon="calendar" label="Kick-off" value={date ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date) + ` · ${kickoffTime}` : "TBD"} />
              <SideInfo icon="note" label="Stage" value={stage} />
              {match.refereeName && <SideInfo icon="whistle" label="Referee" value={match.refereeName} />}
              <SideInfo icon="shield" label="Status" value={match.status.replaceAll("_", " ")} />
            </div>
          </section>

          <section className="rounded-3xl border border-white/8 bg-[#1c1c1c] p-5">
            <h3 className="text-center font-bold">Insights</h3>
            <div className="mt-4 space-y-3">
              <Insight text={`${match.homeTeam.name} host ${match.awayTeam.name} in the ${stage.toLowerCase()}.`} />
              <Insight text={played ? `Final score ${match.result?.homeScore}-${match.result?.awayScore}.` : "Predicted lineups are based on recent selections."} />
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Meta({ icon, text }: { icon: IconName; text: string }) {
  return <span className="flex items-center gap-1.5"><Icon name={icon} size={16} className="text-white/45" />{text}</span>;
}

function HeroTeam({ team, align }: { team: NonNullable<TeamWithPlayers>; align: "left" | "right" }) {
  return (
    <Link href={`/teams/${team.slug}`} className={`group flex min-w-0 items-center gap-2 sm:gap-3 ${align === "right" ? "flex-col sm:flex-row-reverse sm:justify-start sm:text-right" : "flex-col sm:flex-row sm:justify-start sm:text-left"}`}>
      <TeamLogo team={team} />
      <h1 className="min-w-0 truncate text-sm font-normal leading-tight tracking-tight group-hover:underline sm:text-lg">{team.name}</h1>
    </Link>
  );
}

function SideInfo({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon name={icon} size={18} className="shrink-0 text-white/45" />
      <span className="text-white/50">{label}</span>
      <b className="ml-auto text-right">{value}</b>
    </div>
  );
}

function Insight({ text }: { text: string }) {
  return (
    <div className="rounded-xl border-l-2 border-[#00c281] bg-white/[.03] py-2.5 pl-3 pr-3 text-sm text-white/80">
      {text}
    </div>
  );
}

type TeamWithPlayers = Awaited<ReturnType<typeof prisma.team.findFirst>> & { players: Array<{ id: string; firstName: string; lastName: string; displayName: string | null; shirtNumber: number | null; position: PlayerPosition | null; imageUrl: string | null }> };
type Player = NonNullable<TeamWithPlayers>["players"][number];

function TeamLogo({ team }: { team: NonNullable<TeamWithPlayers> }) {
  return team.logoUrl ? <span className="block size-11 shrink-0 rounded-full bg-white bg-cover bg-center bg-no-repeat ring-2 ring-white/15 md:size-14" style={{ backgroundImage: `url(${team.logoUrl})` }} /> : <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black ring-2 ring-white/15 md:size-14">{team.shortName?.slice(0, 3) || team.name.slice(0, 2).toUpperCase()}</span>;
}

function MatchLineups({ matchId, homeTeam, awayTeam, ratings, contributions, lineupEntries }: { matchId: string; homeTeam: NonNullable<TeamWithPlayers>; awayTeam: NonNullable<TeamWithPlayers>; ratings: Map<string, number>; contributions: Map<string, Contribution>; lineupEntries: Array<{ playerId: string; teamId: string; role: LineupRole; position: number | null }> }) {
  const home = selectLineup(homeTeam.players, `${matchId}-${homeTeam.id}`, lineupEntries.filter((entry) => entry.teamId === homeTeam.id));
  const away = selectLineup(awayTeam.players, `${matchId}-${awayTeam.id}`, lineupEntries.filter((entry) => entry.teamId === awayTeam.id));
  const homePositions = [[7, 50], [27, 27], [27, 73], [42, 32], [42, 68]];
  const awayPositions = [[93, 50], [73, 27], [73, 73], [58, 32], [58, 68]];
  const average = (players: Player[]) => {
    const rated = players.filter((player) => ratings.has(player.id));
    return rated.length ? rated.reduce((sum, player) => sum + (ratings.get(player.id) ?? 0), 0) / rated.length : null;
  };
  const homeAvg = average(home.starters);
  const awayAvg = average(away.starters);

  return <div className="space-y-6">
    <div className="overflow-hidden rounded-t-2xl border border-[#171717] bg-[#2c2c2c]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[#3b3b3b] bg-[#343434] px-5 py-4 text-sm"><div className="flex items-center gap-3">{homeAvg !== null && <span className={`grid h-7 min-w-[3rem] place-items-center rounded-2xl px-3 text-sm font-black ${ratingColor(homeAvg)}`}>{homeAvg.toFixed(1)}</span>}<TeamMini team={homeTeam} /></div><span /><div className="flex flex-row-reverse items-center gap-3">{awayAvg !== null && <span className={`grid h-7 min-w-[3rem] place-items-center rounded-2xl px-3 text-sm font-black ${ratingColor(awayAvg)}`}>{awayAvg.toFixed(1)}</span>}<TeamMini team={awayTeam} away /></div></div>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#2c2c2c]">
        <div className="absolute inset-y-0 left-1/2 border-l-[3px] border-[#3a3a3a]" />
        <div className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#3a3a3a]" />
        <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3a3a3a]" />
        <div className="absolute left-0 top-1/2 h-[50%] w-[13%] -translate-y-1/2 border-y-[3px] border-r-[3px] border-[#3a3a3a]" />
        <div className="absolute right-0 top-1/2 h-[50%] w-[13%] -translate-y-1/2 border-y-[3px] border-l-[3px] border-[#3a3a3a]" />
        <div className="absolute left-0 top-1/2 h-[25%] w-[6%] -translate-y-1/2 border-y-[3px] border-r-[3px] border-[#3a3a3a]" />
        <div className="absolute right-0 top-1/2 h-[25%] w-[6%] -translate-y-1/2 border-y-[3px] border-l-[3px] border-[#3a3a3a]" />
        {home.starters.map((player, index) => <PitchPlayer key={player.id} player={player} contribution={contributions.get(player.id)} rating={ratings.get(player.id)} x={homePositions[index][0]} y={homePositions[index][1]} />)}
        {away.starters.map((player, index) => <PitchPlayer key={player.id} player={player} contribution={contributions.get(player.id)} rating={ratings.get(player.id)} x={awayPositions[index][0]} y={awayPositions[index][1]} />)}
      </div>
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      <Bench team={homeTeam} players={home.bench} ratings={ratings} contributions={contributions} />
      <Bench team={awayTeam} players={away.bench} ratings={ratings} contributions={contributions} />
    </div>
  </div>;
}

function selectLineup(players: Player[], seed: string, saved: Array<{ playerId: string; role: LineupRole; position: number | null }>) {
  if (saved.length) {
    const starterEntries = saved.filter((entry) => entry.role === LineupRole.STARTER).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const starters = starterEntries.map((entry) => players.find((player) => player.id === entry.playerId)).filter((player): player is Player => Boolean(player));
    return { starters, bench: players.filter((player) => !starters.some((starter) => starter.id === player.id)) };
  }
  const ordered = [...players].sort((a, b) => seededValue(`${seed}-${a.id}`) - seededValue(`${seed}-${b.id}`));
  const goalkeeper = ordered.find((player) => player.position === PlayerPosition.GOALKEEPER) ?? ordered[0];
  const outfield = ordered.filter((player) => player.id !== goalkeeper?.id).slice(0, 4);
  const starters = goalkeeper ? [goalkeeper, ...outfield] : [];
  return { starters, bench: ordered.filter((player) => !starters.some((starter) => starter.id === player.id)) };
}

function seededValue(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return hash >>> 0;
}

type Contribution = { goals: number; assists: number };

function PitchPlayer({ player, rating, contribution, x, y }: { player: Player; rating?: number; contribution?: Contribution; x: number; y: number }) {
  const name = player.displayName || player.lastName || player.firstName;
  return <div className="absolute z-10 flex w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${x}%`, top: `${y}%` }}><span className="relative"><span className="relative grid size-11 place-items-center overflow-hidden rounded-full bg-[#4c4c4c] shadow-md md:size-[3.75rem]">{player.imageUrl ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${player.imageUrl})` }} /> : <b className="text-white">{player.shirtNumber ?? "—"}</b>}</span>{rating !== undefined && <span className={`absolute -right-3 -top-1.5 grid h-[1.35rem] min-w-[2.4rem] place-items-center rounded-full px-1.5 text-[11px] font-black shadow ${ratingColor(rating)}`}>{rating.toFixed(1)}{rating >= 9 && <b className="ml-0.5">★</b>}</span>}</span><span className="mt-2 max-w-full truncate px-1 text-center text-[11px] font-normal text-[#f3f3f3] md:text-xs"><span className="mr-1 text-[#b4b4b4]">{player.shirtNumber ?? ""}</span>{name}</span><Contributions value={contribution} /></div>;
}

function TeamMini({ team, away }: { team: NonNullable<TeamWithPlayers>; away?: boolean }) {
  return <div className={`flex min-w-0 items-center gap-2 ${away ? "flex-row-reverse text-right" : ""}`}><span className="size-8 shrink-0 rounded-full bg-white bg-contain bg-center bg-no-repeat" style={team.logoUrl ? { backgroundImage: `url(${team.logoUrl})` } : undefined} /><span className="truncate">{team.name}</span></div>;
}

function Bench({ team, players, ratings, contributions }: { team: NonNullable<TeamWithPlayers>; players: Player[]; ratings: Map<string, number>; contributions: Map<string, Contribution> }) {
  return <section className="rounded-xl bg-[#292929] p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-black text-white">{team.name} bench</h3><Badge className="bg-white/10 text-white">{players.length}</Badge></div><div className="space-y-1">{players.map((player) => { const rating=ratings.get(player.id); return <div key={player.id} className="grid grid-cols-[2rem_2rem_1fr_auto_auto_auto] items-center gap-2 rounded-lg px-2 py-2 text-white hover:bg-white/5"><span className="text-center font-mono text-xs text-white/40">{player.shirtNumber ?? "—"}</span><span className="size-8 rounded-full bg-[#444] bg-cover bg-center" style={player.imageUrl ? { backgroundImage: `url(${player.imageUrl})` } : undefined} /><span className="truncate text-sm font-semibold">{player.displayName || `${player.firstName} ${player.lastName}`}</span><Contributions value={contributions.get(player.id)} /><Badge className="bg-white/10 text-[10px] text-white">{positionLabel(player.position)}</Badge>{rating !== undefined ? <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${ratingColor(rating)}`}>{rating.toFixed(1)}</span> : <span />}</div>})}{!players.length && <p className="py-3 text-center text-sm text-white/40">No substitutes.</p>}</div></section>;
}

function Contributions({ value }: { value?: Contribution }) {
  if (!value?.goals && !value?.assists) return null;
  return <span className="mt-0.5 flex items-center justify-center gap-1.5 text-white">{!!value.goals && <span className="flex -space-x-1" title={`${value.goals} goal${value.goals === 1 ? "" : "s"}`}>{Array.from({ length: value.goals }, (_, index) => <GoalIcon key={index} />)}</span>}{!!value.assists && <span className="flex -space-x-1" title={`${value.assists} assist${value.assists === 1 ? "" : "s"}`}>{Array.from({ length: value.assists }, (_, index) => <AssistIcon key={index} />)}</span>}</span>;
}

function GoalIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow"><g clipPath="url(#goal-icon-clip)"><circle cx="7" cy="7" r="5.25" fill="#fff" /><path d="M8.88284 9.49699C8.72009 9.49699 8.55734 9.48591 8.39459 9.46958C8.34242 9.4595 8.29347 9.43694 8.25192 9.40382C8.21037 9.3707 8.17746 9.32802 8.156 9.27941C7.988 8.65524 7.82525 8.06374 7.66775 7.48858C7.6388 7.41343 7.63706 7.33052 7.66285 7.25423C7.68863 7.17794 7.74031 7.11308 7.80892 7.07091L9.17625 5.84591C9.2334 5.7961 9.30665 5.76865 9.38246 5.76865C9.45827 5.76865 9.53152 5.7961 9.58867 5.84591C10.0474 6.09633 10.4588 6.42503 10.8043 6.81716C10.8827 6.91412 10.9266 7.03436 10.9292 7.15899C10.932 7.84171 10.7287 8.50937 10.3458 9.07466C10.342 9.09048 10.3346 9.10523 10.3243 9.11782C10.253 9.2147 10.1577 9.29131 10.0478 9.34008C9.67045 9.44934 9.27911 9.50241 8.88634 9.49758L8.88284 9.49699Z" fill="#171717" /><path d="M4.46584 8.17283C4.40038 8.17345 4.33693 8.15023 4.28734 8.10749C3.85925 7.84832 3.48656 7.50715 3.19067 7.10358C3.14231 7.03529 3.11586 6.95391 3.11484 6.87024C3.11458 6.23357 3.28305 5.60821 3.60309 5.05783C3.60723 5.03788 3.61894 5.02032 3.63575 5.00883C3.68407 4.96581 3.74151 4.93429 3.80375 4.91666C4.17914 4.77018 4.57855 4.69501 4.9815 4.69499C5.1061 4.68414 5.23141 4.68414 5.356 4.69499C5.42674 4.70258 5.49274 4.73415 5.54304 4.78445C5.59335 4.83475 5.62492 4.90076 5.6325 4.97149C5.72992 5.39499 5.83842 5.82899 5.94167 6.26299L6.02334 6.61299C6.03691 6.666 6.036 6.72167 6.02071 6.77421C6.00542 6.82674 5.97631 6.87421 5.93642 6.91166L4.67234 8.09699C4.64603 8.1233 4.61472 8.14409 4.58026 8.15811C4.5458 8.17214 4.50888 8.17912 4.47167 8.17866H4.46584V8.17283Z" fill="#171717" /><path d="M6.99984 1.16699C5.84612 1.16699 4.7183 1.50911 3.75901 2.15009C2.79973 2.79106 2.05205 3.7021 1.61054 4.76801C1.16903 5.83391 1.05351 7.0068 1.27859 8.13835C1.50367 9.26991 2.05924 10.3093 2.87505 11.1251C3.69086 11.9409 4.73026 12.4965 5.86181 12.7216C6.99337 12.9467 8.16626 12.8311 9.23216 12.3896C10.2981 11.9481 11.2091 11.2004 11.8501 10.2412C12.4911 9.28186 12.8332 8.15405 12.8332 7.00033C12.8332 5.45323 12.2186 3.9695 11.1246 2.87554C10.0307 1.78157 8.54694 1.16699 6.99984 1.16699ZM7.07042 11.3304L7.03776 11.2137C7.02663 11.134 6.98701 11.0609 6.92622 11.008C6.86543 10.9552 6.78757 10.9261 6.70701 10.9262C6.03797 10.915 5.38769 10.7032 4.84034 10.3183C4.78464 10.2907 4.72343 10.2759 4.66126 10.2752C4.62301 10.2718 4.58447 10.2763 4.54804 10.2884C4.51162 10.3006 4.47808 10.3201 4.44951 10.3457L4.05342 10.7202C3.29755 10.1246 2.74097 9.31297 2.45775 8.39325C2.17453 7.47354 2.1781 6.48938 2.46798 5.57174C2.75785 4.6541 3.3203 3.84649 4.08047 3.25638C4.84063 2.66626 5.76248 2.32163 6.72334 2.26833L6.78167 2.47424C6.82056 2.58819 6.85303 2.70213 6.87909 2.81608C6.89714 2.869 6.92709 2.91708 6.96663 2.95662C7.00617 2.99616 7.05425 3.02611 7.10717 3.04416H7.15617C7.80616 3.14238 8.43738 3.33908 9.02809 3.62749C9.06957 3.65019 9.11697 3.65975 9.16401 3.65491C9.22873 3.65539 9.2924 3.63847 9.34834 3.60591L9.88034 3.23141C10.6579 3.82155 11.2341 4.63761 11.53 5.56787C11.826 6.49813 11.8271 7.49711 11.5333 8.42804C11.2396 9.35898 10.6652 10.1764 9.88898 10.7683C9.11273 11.3602 8.17249 11.6977 7.19701 11.7347L7.07042 11.3304Z" fill="#171717" /></g><defs><clipPath id="goal-icon-clip"><rect width="14" height="14" fill="white" /></clipPath></defs></svg>;
}

function AssistIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" className="drop-shadow"><ellipse cx="7" cy="7" rx="7" ry="7" fill="#3b82f6" /><path fill="#fff" fillRule="evenodd" d="M12.608 5.7c-.175.1-.377.209-.6.337-.156.09-.322.188-.493.3-.806.524-6.651 4.113-7.836 4.793s-3.035.929-3.565.016 1.029-1.952 1.948-3.055C3.11 6.833 4.48 5.461 4.48 5.461c-.088-.426.332-.712.494-.805a.607.607 0 0 1 .06-.03c-.117-.5.631-.929.631-.929l1.147-2.518a.231.231 0 0 1 .094-.105.236.236 0 0 1 .208-.013l1.024.424c.673.283-.769 1.89-.465 1.962a1.67 1.67 0 0 0 1.043-.273 2.826 2.826 0 0 0 .735-.614c.48-.56-.03-1.38.249-1.543.1-.054.287-.034.642.095 1.393.535 2.192 2.211 2.776 3.254.402.709.121.973-.51 1.334zm-8.018.693a.085.085 0 0 0-.075.022l-.631.62a.079.079 0 0 0 .04.135l3.227.669a.09.09 0 0 0 .058-.009l.981-.563a.081.081 0 0 0-.02-.15zm5.558-.418l-4.407-.844a.089.089 0 0 0-.075.023l-.628.618a.081.081 0 0 0 .041.137l3.99.807a.089.089 0 0 0 .058-.009l1.041-.581a.082.082 0 0 0-.02-.151zM3.807 12.1a.083.083 0 0 1-.039.1l-.734.422a.082.082 0 0 1-.1-.016l-.546-.579a.083.083 0 0 1-.016-.063 5.312 5.312 0 0 0 1.3-.462zm1.668-.92a.083.083 0 0 1-.039.1l-.736.42a.082.082 0 0 1-.1-.016l-.41-.484c.3-.177.693-.415 1.15-.691zm5.687-3.4a.084.084 0 0 1-.039.1l-.735.422a.082.082 0 0 1-.1-.016l-.488-.5c.441-.27.839-.516 1.158-.716zM12.5 6.132c.1-.052.184-.1.268-.154L12.9 5.9l.222.754a.084.084 0 0 1-.039.1l-.734.422a.082.082 0 0 1-.1-.016L11.7 6.6c.144-.093.294-.182.466-.281.118-.068.224-.129.334-.187z" /></svg>;
}

function Stat({ label, home, away }: { label: string; home: string | number; away: string | number }) {
  const h = Number(home);
  const a = Number(away);
  const homeWin = !Number.isNaN(h) && !Number.isNaN(a) && h > a;
  const awayWin = !Number.isNaN(h) && !Number.isNaN(a) && a > h;
  return (
    <div className="grid grid-cols-[minmax(3rem,auto)_1fr_minmax(3rem,auto)] items-center gap-3 py-2.5 text-sm">
      <span className={`justify-self-start ${homeWin ? "rounded-full bg-[#e8e45c] px-3 py-1 font-black text-black" : "font-medium"}`}>{home}</span>
      <span className="text-center text-white/55">{label}</span>
      <span className={`justify-self-end ${awayWin ? "rounded-full bg-[#751413] px-3 py-1 font-black text-white" : "font-medium"}`}>{away}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-white/50">{label}</span><b className="text-right">{value}</b></div>;
}

function positionLabel(position: PlayerPosition | null) {
  return position ? ({ GOALKEEPER: "GK", DEFENDER: "DEF", MIDFIELDER: "MID", FORWARD: "ATT", CAPTAIN: "C" } satisfies Record<PlayerPosition, string>)[position] : "—";
}

function knockoutRound(round: number) {
  return round === 2 ? "Final" : round === 4 ? "Semifinal" : `Round of ${round}`;
}
