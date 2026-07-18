"use server";

import { signIn } from "@/lib/auth";

export async function signInWithFortyTwo() {
  await signIn("42-school", { redirectTo: "/onboarding" });
}
