import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

// Optimistic redirect only — checks cookie presence, not validity.
// Authoritative session checks happen in lib/auth-session.ts (requireUser/requireAdmin).
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|webmanifest)$).*)"],
}
