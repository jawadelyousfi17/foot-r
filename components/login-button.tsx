"use client";

import { useFormStatus } from "react-dom";

export function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-[#00c281] px-4 font-bold text-[#04120c] transition hover:bg-[#05e08c] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <span
            aria-hidden="true"
            className="size-5 animate-spin rounded-full border-2 border-[#04120c]/30 border-t-[#04120c]"
          />
          Redirecting to 42…
        </>
      ) : (
        <>
          <span aria-hidden="true" className="text-xl font-black tracking-tighter">42</span>
          Continue with 42
        </>
      )}
    </button>
  );
}
