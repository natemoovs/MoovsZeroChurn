"use client"

import { AuthView } from "@neondatabase/auth/react/ui"

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md p-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            ZeroChurn Factory
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Sign in to access your CSM dashboard
          </p>
        </div>
        <AuthView />
      </div>
    </div>
  )
}
