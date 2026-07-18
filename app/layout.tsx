import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Icon } from "@/components/icon";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foot-R — Football, organized",
  description: "Create teams, run competitions, and follow every result.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-black text-foreground">
        <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0d0d0d]/95 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:h-[72px] lg:gap-8 lg:px-8">
            <Link href="/" className="flex shrink-0 items-center" aria-label="Foot-R home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Foot-R" className="h-8 w-auto lg:h-9" />
            </Link>

            <label className="relative hidden max-w-md flex-1 items-center md:flex">
              <span className="pointer-events-none absolute left-4 text-white/40">
                <Icon name="search" size={18} />
              </span>
              <input
                type="search"
                placeholder="Search"
                className="h-11 w-full rounded-full border border-white/5 bg-white/[.06] pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-white/15 focus:bg-white/10"
              />
            </label>

            <nav className="ml-auto hidden items-center gap-7 text-sm font-bold text-white/70 lg:flex">
              <Link href="/" className="transition hover:text-white">News</Link>
              <Link href="/teams" className="transition hover:text-white">Teams</Link>
              <Link href="/competitions" className="transition hover:text-white">Competitions</Link>
            </nav>

            <div className="flex items-center gap-2 lg:gap-3 ml-auto lg:ml-0">
              {session?.user ? (
                <>
                  <Link href="/dashboard" className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10">Dashboard</Link>
                  <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                    <button className="rounded-full bg-[#00c281] px-4 py-2 text-sm font-bold text-[#04120c] transition hover:bg-[#05e08c]">Sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="flex items-center gap-2 rounded-full bg-[#00c281] px-5 py-2 text-sm font-bold text-[#04120c] transition hover:bg-[#05e08c]">
                  <Icon name="login" size={18} strokeWidth={2} /> Sign in
                </Link>
              )}
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
