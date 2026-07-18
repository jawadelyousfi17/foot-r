import "server-only";

import { auth } from "@/lib/auth";
import { DomainError } from "@/lib/football";
import { prisma } from "@/lib/prisma";

export type FortyTwoUser = {
  id: number;
  login: string;
  first_name: string;
  last_name: string;
  usual_full_name?: string | null;
  displayname?: string | null;
  image?: { link?: string | null } | null;
};

async function getAccessToken() {
  const session = await auth();
  if (!session?.user?.id) throw new DomainError("You must be signed in", "UNAUTHENTICATED");

  const resolvedAccount = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "42-school" },
  });
  if (!resolvedAccount?.access_token) {
    throw new DomainError("Your 42 account must be reconnected", "UNAUTHENTICATED");
  }

  const expiresSoon = resolvedAccount.expires_at
    ? resolvedAccount.expires_at <= Math.floor(Date.now() / 1000) + 60
    : false;
  if (!expiresSoon) return resolvedAccount.access_token;
  if (!resolvedAccount.refresh_token) {
    throw new DomainError("Your 42 session expired; sign in again", "UNAUTHENTICATED");
  }

  const response = await fetch("https://api.intra.42.fr/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: resolvedAccount.refresh_token,
      client_id: process.env.FORTY_TWO_UID || "",
      client_secret: process.env.FORTY_TWO_SECRET || "",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new DomainError("Your 42 session expired; sign in again", "UNAUTHENTICATED");
  const token = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number };
  await prisma.account.update({
    where: { provider_providerAccountId: { provider: resolvedAccount.provider, providerAccountId: resolvedAccount.providerAccountId } },
    data: {
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? resolvedAccount.refresh_token,
      expires_at: token.expires_in ? Math.floor(Date.now() / 1000) + token.expires_in : null,
    },
  });
  return token.access_token;
}

export async function findFortyTwoUser(login: string) {
  const normalizedLogin = login.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(normalizedLogin)) {
    throw new DomainError("Enter a valid 42 login", "INVALID_INPUT");
  }
  const accessToken = await getAccessToken();
  const response = await fetch(`https://api.intra.42.fr/v2/users/${encodeURIComponent(normalizedLogin)}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (response.status === 404) throw new DomainError("42 user not found", "NOT_FOUND");
  if (!response.ok) throw new Error(`42 API request failed (${response.status})`);
  return await response.json() as FortyTwoUser;
}
