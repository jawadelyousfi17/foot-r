import type { Metadata } from "next";
import Link from "next/link";
import NextTopLoader from "nextjs-toploader";
import { auth, signOut } from "@/lib/auth";
import { Icon } from "@/components/icon";
import { MobileNav } from "@/components/mobile-nav";
import { SiteSearch } from "@/components/site-search";
import { DesktopModeBanner } from "@/components/desktop-mode-banner";
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
  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/" });
  };

  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-black text-foreground">
        <NextTopLoader color="#61df6e" height={3} shadow="0 0 10px #61df6e,0 0 5px #61df6e" showSpinner={false} />
        <DesktopModeBanner />
        <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0d0d0d]/95 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:h-[72px] lg:gap-8 lg:px-8">
            <Link href="/" className="flex shrink-0 items-center" aria-label="Foot-R home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Foot-R" className="h-8 w-auto lg:h-9" />
            </Link>

            <div className="hidden max-w-md flex-1 md:block">
              <SiteSearch />
            </div>

            <nav className="ml-auto hidden items-center gap-7 text-sm font-bold text-white/70 lg:flex">
              <Link href="/" className="transition hover:text-white">News</Link>
              <Link href="/teams" className="transition hover:text-white">Teams</Link>
              <Link href="/competitions" className="transition hover:text-white">Competitions</Link>
            </nav>

            <div className="ml-auto hidden items-center gap-2 lg:flex lg:gap-3">
              {session?.user ? (
                <>
                  <Link href="/dashboard" className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10">Dashboard</Link>
                  <form action={signOutAction}>
                    <button className="rounded-full bg-[#00c281] px-4 py-2 text-sm font-bold text-[#04120c] transition hover:bg-[#05e08c]">Sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="flex items-center gap-2 rounded-full bg-[#00c281] px-5 py-2 text-sm font-bold text-[#04120c] transition hover:bg-[#05e08c]">
                  <Icon name="login" size={18} strokeWidth={2} /> Sign in
                </Link>
              )}
            </div>
            <div className="ml-auto lg:hidden">
              <MobileNav authed={!!session?.user} signOutAction={signOutAction} />
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
