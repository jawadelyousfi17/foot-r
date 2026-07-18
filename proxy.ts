import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes reachable without a session (the login flow itself).
const PUBLIC_PATHS = ["/login"];

// Auth.js (next-auth v5) database-session cookie names.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

// Login wall: every route requires a 42 session. Runs on the edge, so it only
// checks for the session cookie's presence — full session validation still
// happens in the server components/actions via `auth()`.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (isPublic || hasSession) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except the auth API, Next internals, and static assets.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|logo.png|fonts|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)",
  ],
};
