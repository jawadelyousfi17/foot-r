"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingRedirect({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter();
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left <= 0) {
      router.replace("/");
      return;
    }
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, router]);

  return (
    <p className="pt-1 text-center text-xs text-white/40">
      Taking you home in <span className="font-bold text-white/70 tabular-nums">{left}s</span>…
    </p>
  );
}
