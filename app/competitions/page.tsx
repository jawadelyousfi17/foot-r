import Link from "next/link";
import { Icon } from "@/components/icon";
import { listPublicCompetitions } from "@/lib/football";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  const items = await listPublicCompetitions();
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 border-b border-white/8 pb-8">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#00c281]">Tournament center</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-.06em] sm:text-6xl">Competitions</h1>
        </div>
        <div className="space-y-4">
          {items.map((c) => (
            <Link href={`/competitions/${c.slug}`} key={c.id} className="group grid items-center gap-5 rounded-3xl border border-white/8 bg-[#1b1b1b] p-6 transition hover:border-white/15 hover:bg-[#212121] md:grid-cols-[3rem_1fr_auto]">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/5 text-white/60"><Icon name="trophy" size={22} className="text-[#00c281]" /></span>
              <div>
                <h2 className="text-2xl font-black group-hover:text-[#00c281]">{c.name}</h2>
                <p className="mt-1 text-sm text-white/45">{c._count.groups} groups · {c._count.matches} matches</p>
              </div>
              <span className="justify-self-start rounded-full bg-[#00c281] px-4 py-2 text-xs font-black uppercase text-[#04120c] md:justify-self-end">{c.status}</span>
            </Link>
          ))}
          {!items.length && <div className="rounded-3xl border border-dashed border-white/15 p-14 text-center text-white/45">No published competitions yet.</div>}
        </div>
      </div>
    </main>
  );
}
