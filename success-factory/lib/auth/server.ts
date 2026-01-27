import { createAuthServer } from "@neondatabase/auth/next/server"

// Lazy-initialize auth server to avoid build-time env var requirement
let authServer: ReturnType<typeof createAuthServer> | null = null
function getAuthServer() {
  if (!authServer) {
    authServer = createAuthServer()
  }
  return authServer
}

export type UserRole = "admin" | "user"

export interface AuthUser {
  id: string
  email: string | null
  name: string | null
  role: UserRole
}

// Helper to get current user in server components/API routes
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: session } = await getAuthServer().getSession()
    if (!session?.user) return null
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: (session.user as { role?: string }).role === "admin" ? "admin" : "user",
    }
  } catch {
    return null
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser()
  return user !== null
}

export async function isAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin"
}
