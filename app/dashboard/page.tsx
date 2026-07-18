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
    prisma.team.findMany({ where: { createdById: session.user.id }, orderBy: { createdAt: "desc" } }),
    session.user.isAdmin
      ? prisma.competition.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { groups: true, matches: true } } } })
      : Promise.resolve([]),
  ]);

  return <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
    <div className="flex flex-col justify-between gap-4 border-b border-black/10 pb-10 md:flex-row md:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-black/40">Management</p><h1 className="mt-3 text-5xl font-black tracking-[-.05em]">Your dashboard</h1><p className="mt-3 text-black/50">Welcome back, {session.user.login || session.user.name}.</p></div>
      <div className="rounded-full bg-[#d7ff3f] px-5 py-3 text-sm font-bold">{session.user.isAdmin ? "Administrator" : "Team manager"}</div>
    </div>
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
