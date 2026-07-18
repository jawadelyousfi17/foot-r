import type { Metadata } from "next";
import { Icon } from "@/components/icon";
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
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-[#00c281] px-4 font-bold text-[#04120c] transition hover:bg-[#05e08c]"
          >
            <span aria-hidden="true" className="text-xl font-black tracking-tighter">42</span>
            Continue with 42
          </button>
        </form>
      </section>
    </main>
  );
}
