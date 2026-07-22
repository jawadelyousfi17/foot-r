import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishCompetitionAction } from "./actions";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [teams, competitions] = await Promise.all([
    prisma.team.findMany({
      where: { createdById: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { competitions: { include: { competition: true }, orderBy: { joinedAt: "desc" } } },
    }),
    session.user.isAdmin
      ? prisma.competition.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { groups: true, matches: true } } } })
      : Promise.resolve([]),
  ]);

  const teamIds = teams.map((t) => t.id);
  const nextMatches = teamIds.length
    ? await prisma.match.findMany({
        where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }], result: null },
        orderBy: { scheduledAt: "asc" },
        include: { homeTeam: true, awayTeam: true, competition: true },
      })
    : [];

  // One card per competition — a competition is listed once even when several
  // of your teams play in it, or you both own it and field a team.
  const activeById = new Map<string, { competition: (typeof teams)[number]["competitions"][number]["competition"]; teams: typeof teams }>();
  for (const team of teams) {
    for (const { competition } of team.competitions) {
      if (competition.status !== "ACTIVE") continue;
      const entry = activeById.get(competition.id);
      if (entry) entry.teams.push(team);
      else activeById.set(competition.id, { competition, teams: [team] });
    }
  }
  for (const competition of competitions) {
    if (competition.status !== "ACTIVE" || competition.ownerId !== session.user.id) continue;
    if (!activeById.has(competition.id)) activeById.set(competition.id, { competition, teams: [] });
  }

  const activeEntries = [...activeById.values()].map(({ competition, teams: yourTeams }) => ({
    competition,
    teams: yourTeams,
    nextMatch: nextMatches.find(
      (m) => m.competitionId === competition.id && yourTeams.some((t) => t.id === m.homeTeamId || t.id === m.awayTeamId),
    ),
  }));

  return <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
    <div className="flex flex-col justify-between gap-4 border-b border-black/10 pb-10 md:flex-row md:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-black/40">Management</p><h1 className="mt-3 text-5xl font-black tracking-[-.05em]">Your dashboard</h1><p className="mt-3 text-black/50">Welcome back, {session.user.login || session.user.name}.</p></div>
      <div className="rounded-full bg-[#d7ff3f] px-5 py-3 text-sm font-bold">{session.user.isAdmin ? "Administrator" : "Team manager"}</div>
    </div>

    <section className="mt-10">
      <p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-black/40">Your active competition{activeEntries.length !== 1 ? "s" : ""}</p>
      {activeEntries.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {activeEntries.map(({ teams: yourTeams, competition, nextMatch }) => (
            <div key={competition.id} className="rounded-3xl border-2 border-[#151712] bg-white p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#151712] px-3 py-1 text-xs font-bold text-[#d7ff3f]"><span className="size-1.5 rounded-full bg-[#d7ff3f]" /> ACTIVE</span>
                  <h2 className="mt-3 text-2xl font-black tracking-[-.03em]">{competition.name}</h2>
                  <p className="mt-1 text-sm text-black/50">
                    {yourTeams.length
                      ? <>Playing as <b className="text-black/80">{yourTeams.map((t) => t.name).join(", ")}</b></>
                      : "You own this competition"}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-black/[.03] p-4">
                {nextMatch ? (
                  <>
                    <p className="text-xs font-bold uppercase tracking-[.15em] text-black/40">Next match</p>
                    <p className="mt-1.5 text-lg font-bold">{nextMatch.homeTeam.name} <span className="text-black/30">vs</span> {nextMatch.awayTeam.name}</p>
                    <p className="mt-1 text-sm text-black/50">{nextMatch.scheduledAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(nextMatch.scheduledAt) : "Date to be confirmed"}</p>
                  </>
                ) : <p className="text-sm text-black/45">No fixtures scheduled yet.</p>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {nextMatch && <Link href={`/matches/${nextMatch.id}`} className="rounded-full bg-[#d7ff3f] px-4 py-2 text-xs font-bold">View match</Link>}
                {yourTeams.map((t) => (
                  <Link key={t.id} href={`/teams/${t.slug}`} className="rounded-full border border-black/15 px-4 py-2 text-xs font-bold">
                    {yourTeams.length > 1 ? t.name : "Manage team"}
                  </Link>
                ))}
                {session.user.isAdmin
                  ? <Link href={`/dashboard/competitions/${competition.id}`} className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white">Manage competition</Link>
                  : <Link href={`/competitions/${competition.slug}`} className="rounded-full border border-black/15 px-4 py-2 text-xs font-bold">View competition</Link>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-black/20 p-7 text-center text-sm text-black/40">
          {teams.length ? "None of your teams are in an active competition yet." : "Create a team, then an admin can add it to a competition."}
        </p>
      )}
    </section>

    <section className="mt-10"><p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-black/40">Quick actions</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><ActionCard href="/dashboard/teams/new" mark="+" title="Create team" copy="Create a public club and build its roster." />{session.user.isAdmin && <><ActionCard href="/dashboard/competitions/new" mark="★" title="Create competition" copy="Set up a new tournament as administrator." admin /><ActionCard href="/dashboard/stats" mark="●" title="Live match stats" copy="Choose a match and record every player event." /></>}</div></section>
    {session.user.isAdmin && <div className="mt-10 rounded-3xl bg-[#151712] p-6 text-white md:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#d7ff3f]">Admin control</p><h2 className="mt-2 text-2xl font-black">Competition operations</h2><p className="mt-2 text-sm text-white/50">Create, publish and manage official competitions and match results.</p></div><span className="w-fit rounded-full bg-[#d7ff3f] px-4 py-2 text-xs font-black text-black">ADMIN ACCESS</span></div></div>}
    <div className={`mt-12 grid gap-8 ${session.user.isAdmin ? "lg:grid-cols-2" : ""}`}>
      <section><h2 className="mb-5 text-2xl font-black">Your teams</h2><div className="space-y-3">{teams.map(t => <div key={t.id} className="rounded-2xl border border-black/10 bg-white p-5"><b>{t.name}</b><div className="mt-4 flex gap-2"><Link href={`/teams/${t.slug}`} className="rounded-full border border-black/15 px-4 py-2 text-xs font-bold">View team</Link><Link href={`/teams/${t.slug}#add-player`} className="rounded-full bg-[#d7ff3f] px-4 py-2 text-xs font-bold">Add player</Link></div></div>)}{!teams.length && <Empty />}</div></section>
      {session.user.isAdmin && <section><h2 className="mb-5 text-2xl font-black">All competitions</h2><div className="space-y-3">{competitions.map(c => <div key={c.id} className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex justify-between"><b>{c.name}</b><span className="text-xs font-bold text-black/40">{c.status}</span></div><p className="mt-2 text-sm text-black/45">{c._count.groups} groups · {c._count.matches} matches</p><div className="mt-4 flex gap-2"><Link href={`/dashboard/competitions/${c.id}`} className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white">Manage</Link><Link href={`/competitions/${c.slug}`} className="rounded-full border border-black/15 px-4 py-2 text-xs font-bold">View</Link>{c.status === "DRAFT" && <form action={publishCompetitionAction.bind(null, c.id)}><button className="rounded-full bg-[#d7ff3f] px-4 py-2 text-xs font-bold">Publish</button></form>}</div></div>)}{!competitions.length && <Empty />}</div></section>}
    </div>
  </main>;
}

function ActionCard({href,mark,title,copy,admin}:{href:string;mark:string;title:string;copy:string;admin?:boolean}){return <Link href={href} className={`group rounded-3xl border p-6 transition hover:-translate-y-1 hover:shadow-xl ${admin?"border-[#d7ff3f] bg-[#d7ff3f]":"border-black/10 bg-white"}`}><span className={`grid size-11 place-items-center rounded-full text-xl font-black ${admin?"bg-black text-white":"bg-[#d7ff3f]"}`}>{mark}</span><h2 className="mt-8 text-2xl font-black">{title} <span className="inline-block transition group-hover:translate-x-1">→</span></h2><p className="mt-2 text-sm text-black/50">{copy}</p></Link>}
function Empty(){return <p className="rounded-2xl border border-dashed border-black/20 p-7 text-center text-sm text-black/40">Nothing here yet.</p>}
