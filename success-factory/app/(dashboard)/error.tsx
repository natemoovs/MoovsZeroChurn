"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="bg-bg-secondary flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-bg-elevated border-border-default rounded-xl border p-8 text-center shadow-lg">
          <div className="bg-error-100 dark:bg-error-950 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <AlertTriangle className="text-error-600 dark:text-error-400 h-8 w-8" />
          </div>

          <h2 className="text-content-primary mb-2 text-xl font-semibold">Something went wrong</h2>

          <p className="text-content-secondary mb-6">
            {error.message || "An unexpected error occurred while loading the dashboard."}
          </p>

          <div className="space-y-3">
            <button
              onClick={reset}
              className="bg-success-600 hover:bg-success-700 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>

            <button
              onClick={() => (window.location.href = "/")}
              className="text-content-secondary hover:text-content-primary w-full px-4 py-2.5 transition-colors"
            >
              Go to home
            </button>
          </div>

          {error.digest && (
            <p className="text-content-tertiary mt-4 text-xs">Error ID: {error.digest}</p>
          )}
        </div>
      </div>
    </div>
  )
}
