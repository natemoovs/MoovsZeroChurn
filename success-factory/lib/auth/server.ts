import { createAuthServer } from "@neondatabase/auth/next/server"

export const authServer = createAuthServer()

// Helper to get current user in server components/API routes
export async function getCurrentUser() {
  try {
    const { data: session } = await authServer.getSession()
    if (!session?.user) return null
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    }
  } catch {
    return null
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser()
  return user !== null
}
