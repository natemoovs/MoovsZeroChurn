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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Something went wrong
          </h2>

          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            {error.message || "An unexpected error occurred while loading the dashboard."}
          </p>

          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>

            <button
              onClick={() => window.location.href = "/"}
              className="w-full px-4 py-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Go to home
            </button>
          </div>

          {error.digest && (
            <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-600">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
