import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StatsMatchPickerPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/dashboard");
  const matches = await prisma.match.findMany({
        orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    include: { competition: true, homeTeam: true, awayTeam: true, result: true, _count: { select: { playerStats: true } } },
  });

  return <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
    <Link href="/dashboard" className="text-sm font-bold text-muted-foreground">← Dashboard</Link>
    <div className="my-8 border-b pb-8"><Badge className="bg-[#d7ff3f] text-black">ADMIN</Badge><h1 className="mt-4 text-5xl font-black tracking-tight">Choose a match</h1><p className="mt-2 text-muted-foreground">Open the live console for either team and record player events.</p></div>
    <div className="grid gap-4 md:grid-cols-2">{matches.map((match) => <div key={match.id} className="rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-lg"><Link href={`/dashboard/matches/${match.id}/stats`} className="group block p-5"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{match.competition.name}</span><Badge variant="secondary">{match.status.replaceAll("_", " ")}</Badge></div><div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><b>{match.homeTeam.name}</b><span className="rounded-lg bg-black px-3 py-2 text-xs font-black text-white">VS</span><b className="text-right">{match.awayTeam.name}</b></div><div className="mt-5 flex justify-between text-xs text-muted-foreground"><span>{match.scheduledAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(match.scheduledAt) : "Date TBD"}</span><b className="text-foreground">{match._count.playerStats} players tracked →</b></div></Link>{(match.result || match.status === "COMPLETED") && <Link href={`/dashboard/matches/${match.id}/goals`} className="block border-t px-5 py-3 text-xs font-black hover:bg-muted/50">Goals, assists &amp; cards →</Link>}</div>)}{!matches.length && <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground md:col-span-2">No matches available. Generate fixtures in a competition first.</p>}</div>
  </main>;
}
