"use client"

import { createAuthClient } from "@neondatabase/auth/next"

export const authClient = createAuthClient()

// Re-export hooks for convenience
export const {
  useSession,
  signIn,
  signOut,
  signUp,
} = authClient
