import { neonAuthMiddleware } from "@neondatabase/auth/next/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const NEON_AUTH_ENABLED = !!process.env.NEON_AUTH_BASE_URL

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/auth", "/api/auth", "/api/login", "/api/nps/respond"]

function legacyPasswordAuth(request: NextRequest) {
  const url = new URL(request.url)

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => url.pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check for site password cookie
  const sitePassword = process.env.SITE_PW
  const siteAuthCookie = request.cookies.get("site-auth")
  if (sitePassword && siteAuthCookie?.value === sitePassword) {
    return NextResponse.next()
  }

  // Redirect to login
  return NextResponse.redirect(new URL("/login", request.url))
}

// Use Neon Auth middleware if configured, otherwise fall back to password auth
export default NEON_AUTH_ENABLED
  ? neonAuthMiddleware({
      loginUrl: "/auth/sign-in",
    })
  : legacyPasswordAuth

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/nps/respond).*)"],
}
