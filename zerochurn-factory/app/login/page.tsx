"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

function LoginContent() {
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for error from callback
    const errorParam = searchParams.get("error")
    if (errorParam) {
      setError(errorParam === "no_token" ? "Authentication failed" : "Invalid token")
    }

    // Get the Neon Auth URL from environment
    const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL
    if (neonAuthUrl) {
      // Add callback URL
      const callbackUrl = `${window.location.origin}/api/auth/callback`
      setAuthUrl(`${neonAuthUrl}/signin?redirect_uri=${encodeURIComponent(callbackUrl)}`)
    }
  }, [searchParams])

  const handleSignIn = () => {
    if (authUrl) {
      window.location.href = authUrl
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>ZeroChurn Factory</CardTitle>
        <CardDescription>Sign in to access your CSM dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {error}
          </p>
        )}
        <Button
          onClick={handleSignIn}
          className="w-full"
          disabled={!authUrl}
        >
          {authUrl ? "Sign in with Neon" : "Loading..."}
        </Button>
        {!authUrl && (
          <p className="text-xs text-zinc-500 text-center">
            Neon Auth not configured. Check NEXT_PUBLIC_NEON_AUTH_URL.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Suspense fallback={
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>ZeroChurn Factory</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      }>
        <LoginContent />
      </Suspense>
    </div>
  )
}
