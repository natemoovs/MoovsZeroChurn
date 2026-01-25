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
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary p-6">
      <div className="max-w-md w-full">
        <div className="bg-bg-elevated rounded-xl shadow-lg border border-border-default p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-error-100 dark:bg-error-950 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-error-600 dark:text-error-400" />
          </div>

          <h2 className="text-xl font-semibold text-content-primary mb-2">
            Something went wrong
          </h2>

          <p className="text-content-secondary mb-6">
            {error.message || "An unexpected error occurred while loading the dashboard."}
          </p>

          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-colors font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>

            <button
              onClick={() => window.location.href = "/"}
              className="w-full px-4 py-2.5 text-content-secondary hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Go to home
            </button>
          </div>

          {error.digest && (
            <p className="mt-4 text-xs text-content-tertiary">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
