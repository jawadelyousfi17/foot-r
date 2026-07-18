import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Icon } from "@/components/icon";
import { OnboardingRedirect } from "@/components/onboarding-redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome | Foot-R",
};

const STEPS = [
  {
    icon: "users",
    title: "Build your team",
    body: "Create a squad, add players, and give it a crest that stands out.",
  },
  {
    icon: "trophy",
    title: "Run competitions",
    body: "Set up groups and knockouts, then track every standing live.",
  },
  {
    icon: "football",
    title: "Follow every match",
    body: "Live scores, lineups on the pitch, top stats, and head-to-head.",
  },
] as const;

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? session.user.login ?? "there";

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-black px-4 py-10 text-white">
      <section className="w-full max-w-lg overflow-hidden rounded-[28px] bg-[#1b1b1b]">
        <div
          className="px-6 py-10 text-center sm:px-10"
          style={{ backgroundImage: "linear-gradient(108deg,#24442d 0%,#2e4159 55%,#182e77 100%)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Foot-R" className="mx-auto mb-5 h-12 w-auto" />
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Welcome, {firstName} 👋</h1>
          <p className="mt-2 text-sm text-white/70">Here&apos;s what you can do with Foot-R.</p>
        </div>

        <div className="space-y-3 px-4 py-6 sm:px-8">
          {STEPS.map((step) => (
            <div key={step.title} className="flex items-start gap-4 rounded-2xl bg-white/[.04] p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#61df6e]/15 text-[#61df6e]">
                <Icon name={step.icon} size={22} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold sm:text-base">{step.title}</h2>
                <p className="mt-0.5 text-sm text-white/60">{step.body}</p>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-2 pt-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#00c281] px-4 font-bold text-[#04120c] transition hover:bg-[#05e08c]"
            >
              Go to dashboard
            </Link>
            <Link
              href="/"
              className="flex h-12 flex-1 items-center justify-center rounded-full border border-white/10 px-4 font-bold text-white transition hover:bg-white/10"
            >
              Explore matches
            </Link>
          </div>

          <OnboardingRedirect />
        </div>
      </section>
    </main>
  );
}
