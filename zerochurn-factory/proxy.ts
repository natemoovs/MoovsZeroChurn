import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const sitePassword = process.env.SITE_PW

  // If no password set, allow access
  if (!sitePassword) {
    return NextResponse.next()
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('site-auth')
  if (authCookie?.value === sitePassword) {
    return NextResponse.next()
  }

  // Check for password in URL (for login)
  const url = new URL(request.url)
  if (url.pathname === '/api/login') {
    return NextResponse.next()
  }

  // Show login page
  if (url.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
