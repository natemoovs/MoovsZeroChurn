import { NextRequest, NextResponse } from "next/server"

/**
 * Sign out - clear auth cookies
 * POST /api/auth/signout
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url))

  // Clear all auth cookies
  response.cookies.delete("neon-auth-token")
  response.cookies.delete("site-auth")

  return response
}

/**
 * GET version for convenience
 */
export async function GET(request: NextRequest) {
  return POST(request)
}
