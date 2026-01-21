"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

function LoginContent() {
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    // Check for error from callback
    const errorParam = searchParams.get("error")
    if (errorParam) {
      setError(errorParam === "no_token" ? "Authentication failed" : "Invalid token")
    }

    // Get the Neon Auth URL from environment
    const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL
    if (neonAuthUrl) {
      const callbackUrl = `${window.location.origin}/api/auth/callback`
      setAuthUrl(`${neonAuthUrl}/signin?redirect_uri=${encodeURIComponent(callbackUrl)}`)
    }
  }, [searchParams])

  const handleNeonSignIn = () => {
    if (authUrl) {
      window.location.href = authUrl
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push("/")
      router.refresh()
    } else {
      setError("Invalid password")
    }
    setIsLoading(false)
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

        {/* Password login (always available) */}
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "..." : "Sign in"}
          </Button>
        </form>

        {/* Neon Auth (if configured) */}
        {authUrl && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500">Or</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleNeonSignIn}
              className="w-full"
            >
              Sign in with Google
            </Button>
          </>
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
