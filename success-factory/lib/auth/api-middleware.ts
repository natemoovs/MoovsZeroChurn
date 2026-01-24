import { NextResponse } from "next/server"
import { getCurrentUser } from "./server"

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
export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    )
  }

  return user
}

/**
 * Type guard to check if requireAuth returned an error response
 */
export function isAuthError(
  result: Awaited<ReturnType<typeof requireAuth>>
): result is NextResponse {
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
  handler: (
    ...args: [...T, { id: string; email: string | null; name: string | null }]
  ) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    return handler(...args, authResult)
  }
}
