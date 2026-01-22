import { neonAuthMiddleware, neonAuth } from "@neondatabase/auth/next/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isAllowedEmailDomain } from "@/lib/auth/email-validator"

const NEON_AUTH_ENABLED = !!process.env.NEON_AUTH_BASE_URL

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/auth",
  "/api/auth",
  "/api/login",
  "/api/nps/respond",
  "/unauthorized",
]

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

// Create a wrapper around neonAuthMiddleware that also checks email domain
async function neonAuthWithDomainCheck(request: NextRequest) {
  const url = new URL(request.url)

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => url.pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Run the standard Neon Auth middleware first
  const neonMiddleware = neonAuthMiddleware({
    loginUrl: "/auth/sign-in",
  })
  const response = await neonMiddleware(request)

  // If neonAuthMiddleware is redirecting (user not authenticated), return that
  if (response.status === 307 || response.status === 302) {
    return response
  }

  // User is authenticated - now check if their email domain is allowed
  try {
    const session = await neonAuth()
    if (session?.user?.email) {
      if (!isAllowedEmailDomain(session.user.email)) {
        // Redirect to unauthorized page
        return NextResponse.redirect(new URL("/unauthorized", request.url))
      }
    }
  } catch {
    // If we can't get the session, let it pass through
    // The API routes will handle unauthorized access
  }

  return response
}

// Use Neon Auth middleware if configured, otherwise fall back to password auth
export default NEON_AUTH_ENABLED ? neonAuthWithDomainCheck : legacyPasswordAuth

export const config = {
  // Exclude: static files, and API routes that handle their own auth
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/nps/respond|api/sync|api/health-history/snapshot|api/alerts/digest|api/alerts/email-digest|api/integrations|api/churn|api/ai|api/agents).*)",
  ],
}
