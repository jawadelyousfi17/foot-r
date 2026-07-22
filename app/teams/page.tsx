import Link from "next/link";
import { Icon } from "@/components/icon";
import { listPublicTeams } from "@/lib/football";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = await listPublicTeams();
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <PageHead eyebrow="Public directory" title="Teams" copy="Every club, every roster, one public home." />
        {teams.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Link key={team.id} href={`/teams/${team.slug}`} className="group rounded-3xl border border-white/8 bg-[#1b1b1b] p-6 transition hover:-translate-y-1 hover:border-white/15 hover:bg-[#212121]">
                <div style={team.logoUrl ? { backgroundImage: `url(${team.logoUrl})` } : undefined} className="grid size-14 place-items-center rounded-2xl bg-[#00c281] bg-cover bg-center text-xl font-black text-[#04120c]">
                  {team.logoUrl ? null : <Icon name="shield" size={26} />}
                </div>
                <h2 className="mt-8 text-2xl font-black tracking-tight group-hover:text-[#00c281]">{team.name}</h2>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/45">
                  <Icon name="users" size={16} /> {team._count.players} player{team._count.players === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <Empty text="No public teams yet." href="/dashboard" />
        )}
      </div>
    </main>
  );
}

function PageHead({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="mb-10 border-b border-white/8 pb-8">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#00c281]">{eyebrow}</p>
      <h1 className="mt-3 text-5xl font-black tracking-[-.06em] sm:text-6xl">{title}</h1>
      <p className="mt-4 text-lg text-white/50">{copy}</p>
    </div>
  );
}

function Empty({ text, href }: { text: string; href: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 p-14 text-center">
      <p className="text-white/50">{text}</p>
      <Link href={href} className="mt-5 inline-block rounded-full bg-[#00c281] px-5 py-3 font-bold text-[#04120c]">Create the first one</Link>
    </div>
  );
}
