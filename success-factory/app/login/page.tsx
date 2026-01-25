"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

function LoginContent() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Check for error from callback
  const errorParam = searchParams.get("error")

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
        <CardTitle>Success Factory</CardTitle>
        <CardDescription>Sign in to access your CSM dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(error || errorParam) && (
          <p className="text-error-500 bg-error-50 dark:bg-error-900/20 rounded-lg p-3 text-sm">
            {error || (errorParam === "no_token" ? "Authentication failed" : "Invalid token")}
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

        {/* Neon Auth SSO */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="border-border-default w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-bg-secondary text-content-tertiary px-2">Or</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" asChild>
          <Link href="/auth/sign-up">Sign up / Sign in with SSO</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="bg-bg-secondary flex min-h-screen items-center justify-center">
      <Suspense
        fallback={
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Success Factory</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
          </Card>
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  )
}
