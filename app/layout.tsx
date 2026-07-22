import type { Metadata } from "next";
import Link from "next/link";
import NextTopLoader from "nextjs-toploader";
import { auth, signOut } from "@/lib/auth";
import { Icon, type IconName } from "@/components/icon";
import { MobileNav } from "@/components/mobile-nav";
import { SiteSearch } from "@/components/site-search";
import { ProfileMenu } from "@/components/profile-menu";
import { DesktopModeBanner } from "@/components/desktop-mode-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foot-R — Football, organized",
  description: "Create teams, run competitions, and follow every result.",
};

// TODO: replace with the real community URLs.
const SOCIAL_LINKS = [
  { label: "Discord", icon: "discord", href: "https://discord.gg/" },
  { label: "Instagram", icon: "instagram", href: "https://instagram.com/" },
  { label: "WhatsApp", icon: "whatsapp", href: "https://wa.me/" },
] as const satisfies ReadonlyArray<{ label: string; icon: IconName; href: string }>;

function IconLink({ href, icon, label, external }: { href: string; icon: IconName; label: string; external?: boolean }) {
  const className = "grid size-9 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white";
  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={className}><Icon name={icon} size={18} strokeWidth={2} /></a>;
  }
  return <Link href={href} aria-label={label} title={label} className={className}><Icon name={icon} size={18} strokeWidth={2} /></Link>;
}

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
          <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4 lg:h-14 lg:gap-6 lg:px-8">
            <Link href="/" className="flex shrink-0 items-center" aria-label="Foot-R home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Foot-R" className="h-7 w-auto" />
            </Link>

            <div className="hidden max-w-md flex-1 md:block">
              <SiteSearch compact />
            </div>

            {/* Icon-only from here on: the header carries no label text. */}
            <nav className="ml-auto hidden items-center gap-0.5 lg:flex" aria-label="Main">
              <IconLink href="/" icon="note" label="News" />
              <IconLink href="/teams" icon="shield" label="Teams" />
              <IconLink href="/competitions" icon="trophy" label="Competitions" />
            </nav>

            <div className="hidden items-center gap-0.5 lg:flex">
              <span className="mx-1.5 h-5 w-px bg-white/10" />
              {SOCIAL_LINKS.map((social) => (
                <IconLink key={social.label} href={social.href} icon={social.icon} label={social.label} external />
              ))}
            </div>

            <div className="hidden items-center gap-0.5 lg:flex">
              <span className="mx-1.5 h-5 w-px bg-white/10" />
              {session?.user ? (
                <ProfileMenu
                  user={{ name: session.user.name ?? null, login: session.user.login ?? null, image: session.user.image ?? null }}
                  isAdmin={Boolean(session.user.isAdmin)}
                  signOutAction={signOutAction}
                />
              ) : (
                <Link href="/login" aria-label="Sign in" title="Sign in" className="grid size-9 place-items-center rounded-full bg-[#00c281] text-[#04120c] transition hover:bg-[#05e08c]">
                  <Icon name="login" size={18} strokeWidth={2} />
                </Link>
              )}
            </div>

            <div className="ml-auto lg:hidden">
              <MobileNav authed={!!session?.user} isAdmin={Boolean(session?.user?.isAdmin)} socials={SOCIAL_LINKS} signOutAction={signOutAction} />
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
