"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

const LINKS = [
  { href: "/", label: "News" },
  { href: "/teams", label: "Teams" },
  { href: "/competitions", label: "Competitions" },
];

export function MobileNav({ authed, signOutAction }: { authed: boolean; signOutAction: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10"
      >
        <span className="relative block h-4 w-5">
          <span className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all ${open ? "top-1.5 rotate-45" : "top-0"}`} />
          <span className={`absolute left-0 top-1.5 h-0.5 w-5 rounded-full bg-current transition-all ${open ? "opacity-0" : "opacity-100"}`} />
          <span className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
        </span>
      </button>

      {open && (
        <>
          <button aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 top-16 z-40 bg-black/60 backdrop-blur-sm" />
          <nav className="absolute inset-x-0 top-full z-50 border-b border-white/8 bg-[#111] p-4 shadow-2xl shadow-black/50">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-base font-medium text-white/80 transition hover:bg-white/5 hover:text-white">
                  {link.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-white/8" />
              {authed ? (
                <>
                  <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-base font-medium text-white/80 transition hover:bg-white/5 hover:text-white">Dashboard</Link>
                  <form action={signOutAction}>
                    <button className="w-full rounded-xl px-4 py-3 text-left text-base font-medium text-[#dd3636] transition hover:bg-white/5">Sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl bg-[#00c281] px-4 py-3 text-base font-bold text-[#04120c]">
                  <Icon name="login" size={18} strokeWidth={2} /> Sign in
                </Link>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
