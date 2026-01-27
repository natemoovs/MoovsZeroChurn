import { NextResponse } from "next/server"
import { getCurrentUser, type AuthUser } from "./server"

/**
 * API Authentication Middleware
 *
 * Use this in API routes to require authentication.
 * Returns the user if authenticated, or a 401 response if not.
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const authResult = await requireAuth()
 *   if (authResult instanceof NextResponse) return authResult
 *   const user = authResult
 *   // ... rest of handler
 * }
 */
export async function requireAuth(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 })
  }

  return user
}

/**
 * API Admin Authorization Middleware
 *
 * Use this in API routes to require admin role.
 * Returns the user if admin, or a 401/403 response if not.
 *
 * @example
 * export async function DELETE(request: NextRequest) {
 *   const authResult = await requireAdmin()
 *   if (authResult instanceof NextResponse) return authResult
 *   const adminUser = authResult
 *   // ... rest of handler (only admins reach here)
 * }
 */
export async function requireAdmin(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 })
  }

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 }
    )
  }

  return user
}

/**
 * Type guard to check if requireAuth/requireAdmin returned an error response
 */
export function isAuthError(
  result: AuthUser | NextResponse
): result is NextResponse<{ error: string }> {
  return result instanceof NextResponse
}

/**
 * Higher-order function to wrap an API handler with authentication
 *
 * @example
 * export const GET = withAuth(async (request, user) => {
 *   // user is guaranteed to be authenticated here
 *   return NextResponse.json({ data: "..." })
 * })
 */
export function withAuth<T extends unknown[]>(
  handler: (...args: [...T, AuthUser]) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    return handler(...args, authResult)
  }
}

/**
 * Higher-order function to wrap an API handler with admin authorization
 *
 * @example
 * export const DELETE = withAdmin(async (request, adminUser) => {
 *   // adminUser is guaranteed to be an admin here
 *   return NextResponse.json({ data: "..." })
 * })
 */
export function withAdmin<T extends unknown[]>(
  handler: (...args: [...T, AuthUser]) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    return handler(...args, authResult)
  }
}
