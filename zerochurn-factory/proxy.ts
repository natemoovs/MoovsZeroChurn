import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth/callback', '/api/login']

export function proxy(request: NextRequest) {
  const url = new URL(request.url)

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => url.pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check for Neon Auth token
  const authToken = request.cookies.get('neon-auth-token')
  if (authToken?.value) {
    return NextResponse.next()
  }

  // Fallback: check for old site password (for backward compatibility)
  const sitePassword = process.env.SITE_PW
  const siteAuthCookie = request.cookies.get('site-auth')
  if (sitePassword && siteAuthCookie?.value === sitePassword) {
    return NextResponse.next()
  }

  // Redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
