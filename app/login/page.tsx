import type { Metadata } from "next";
import { LoginButton } from "@/components/login-button";
import { signInWithFortyTwo } from "./actions";

export const metadata: Metadata = {
  title: "Sign in | Foot-R",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-black px-6 text-white">
      <section className="w-full max-w-sm rounded-3xl border border-white/8 bg-[#1b1b1b] p-8 shadow-2xl shadow-black/40">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Foot-R" className="mx-auto mb-5 h-14 w-auto" />
          <h1 className="text-2xl font-black tracking-tight">Welcome to Foot-R</h1>
        </div>
        <form action={signInWithFortyTwo}>
          <LoginButton />
        </form>
        <p className="mt-8 text-center text-xs text-white/35">
          Made by <span className="font-bold text-white/60">Wedesignclub</span>
        </p>
      </section>
    </main>
  );
}
