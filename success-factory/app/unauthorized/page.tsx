"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { signOut } from "@/lib/auth/client"
import { ALLOWED_EMAIL_DOMAINS } from "@/lib/auth/email-validator"

export default function UnauthorizedPage() {
  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/auth/sign-in"
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-error-600 dark:text-error-400">
            Access Restricted
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-content-secondary text-center">
            Success Factory is only available to users with authorized email
            addresses.
          </p>
          <p className="text-content-secondary text-center">
            Allowed domains:{" "}
            <span className="font-semibold">
              {ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(", ")}
            </span>
          </p>
          <p className="text-sm text-content-tertiary text-center">
            If you believe you should have access, please contact your
            administrator.
          </p>
          <div className="flex justify-center pt-4">
            <Button onClick={handleSignOut} variant="outline">
              Sign out and try again
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
