"use client";

import { useEffect, useState } from "react";

// Detects a phone stuck in the browser's "Request Desktop Website" mode
// (e.g. carried over from the 42 intra tab during OAuth): the physical
// screen is phone-sized but the layout viewport is desktop-wide.
function inDesktopMode() {
  if (typeof window === "undefined") return false;
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const phoneScreen = Math.min(screen.width, screen.height) < 500;
  const wideViewport = window.innerWidth > 900;
  return touch && phoneScreen && wideViewport;
}

export function DesktopModeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => setShow(inDesktopMode());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!show) return null;

  return (
    <div className="flex items-center justify-center gap-3 bg-[#d7ff3f] px-4 py-2.5 text-center text-sm font-semibold text-black">
      <span>
        Desktop view is on — tap <b>AA</b> (Safari) or <b>⋮</b> (Chrome) and choose{" "}
        <b>Request Mobile Website</b>.
      </span>
      <button
        onClick={() => setShow(false)}
        aria-label="Dismiss"
        className="shrink-0 rounded-full bg-black/10 px-2 py-0.5 font-bold"
      >
        ✕
      </button>
    </div>
  );
}
