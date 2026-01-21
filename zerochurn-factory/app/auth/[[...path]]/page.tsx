"use client"

import { AuthView } from "@neondatabase/auth/react/ui"
import "@neondatabase/auth/ui/css"

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        <AuthView redirectTo="/" />
      </div>
    </div>
  )
}
