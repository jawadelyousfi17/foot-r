import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import FortyTwo from "next-auth/providers/42-school";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface User {
    login?: string | null;
    isAdmin?: boolean;
  }

  interface Session {
    user: {
      id: string;
      login?: string | null;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    FortyTwo({
      clientId: process.env.FORTY_TWO_UID,
      clientSecret: process.env.FORTY_TWO_SECRET,
      profile(profile) {
        return {
          id: String(profile.id),
          email: profile.email,
          login: profile.login,
          name: profile.usual_full_name || profile.displayname,
          image: profile.image?.link,
        };
      },
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  // Persistent, cross-site-safe session cookie. Without an explicit maxAge some
  // mobile browsers (iOS Safari) treat it as a session cookie and drop it on
  // reload / view toggle, silently logging the user out. Let Auth.js own the
  // cookie name + `__Secure-` prefix (kept in sync with the proxy check).
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.login = user.login;
      session.user.isAdmin = user.isAdmin ?? false;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
