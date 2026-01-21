import { jwtVerify, createRemoteJWKSet } from "jose"
import { cookies } from "next/headers"

const NEON_AUTH_URL = process.env.NEON_AUTH_BASE_URL || process.env.VITE_NEON_AUTH_URL
const JWKS_URL = NEON_AUTH_URL ? `${NEON_AUTH_URL}/.well-known/jwks.json` : null

// Create JWKS client for verifying tokens
const getJWKS = () => {
  if (!JWKS_URL) return null
  return createRemoteJWKSet(new URL(JWKS_URL))
}

export interface NeonAuthUser {
  id: string
  email: string
  name?: string
}

/**
 * Verify JWT token from Neon Auth
 */
export async function verifyToken(token: string): Promise<NeonAuthUser | null> {
  const jwks = getJWKS()
  if (!jwks) return null

  try {
    const { payload } = await jwtVerify(token, jwks)
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string | undefined,
    }
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

/**
 * Get current user from cookies
 */
export async function getCurrentUser(): Promise<NeonAuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("neon-auth-token")?.value

  if (!token) return null
  return verifyToken(token)
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

/**
 * Get Neon Auth URLs
 */
export function getAuthUrls() {
  if (!NEON_AUTH_URL) {
    return null
  }

  return {
    signIn: `${NEON_AUTH_URL}/signin`,
    signUp: `${NEON_AUTH_URL}/signup`,
    signOut: `${NEON_AUTH_URL}/signout`,
    callback: "/api/auth/callback",
  }
}
