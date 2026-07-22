"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

export function ProfileMenu({ user, isAdmin, signOutAction }: {
  user: { name: string | null; login: string | null; image: string | null };
  isAdmin: boolean;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const label = user.login || user.name || "Account";

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="grid size-9 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        {user.image ? (
          // Avatars come from 42's CDN, so the host is not known at build time.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="size-7 rounded-full object-cover ring-1 ring-white/15" />
        ) : (
          <Icon name="profile" size={20} strokeWidth={2} />
        )}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#111] p-1.5 shadow-2xl shadow-black/60">
          <div className="border-b border-white/8 px-3 py-2.5">
            <b className="block truncate text-sm text-white">{user.name || label}</b>
            {user.login && <small className="block truncate font-mono text-white/40">{user.login}</small>}
          </div>
          {isAdmin && (
            <Link href="/dashboard" role="menuitem" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5 hover:text-white">
              <Icon name="settings" size={18} /> Dashboard
            </Link>
          )}
          <form action={signOutAction}>
            <button role="menuitem" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#dd3636] transition hover:bg-white/5">
              <Icon name="logout" size={18} /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
