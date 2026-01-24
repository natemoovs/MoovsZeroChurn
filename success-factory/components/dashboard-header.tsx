"use client"

import { Search, Bell, Menu } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useState, useEffect } from "react"
import Link from "next/link"

interface DashboardHeaderProps {
  onMenuClick: () => void
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const [atRiskCount, setAtRiskCount] = useState(0)

  useEffect(() => {
    // Fetch at-risk account count for notification badge
    fetch("/api/integrations/portfolio?segment=all")
      .then((res) => res.json())
      .then((data) => {
        const summaries = data.summaries || []
        const redCount = summaries.filter((s: { healthScore: string }) => s.healthScore === "red").length
        setAtRiskCount(redCount)
      })
      .catch(() => {})
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-sm sm:h-16 sm:gap-4 sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/80">
      {/* Left side - menu button + search */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search - opens command palette */}
        <button
          onClick={() => {
            // Trigger Cmd+K programmatically
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
          }}
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-zinc-100 sm:h-10 sm:max-w-md sm:px-4 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-500 sm:inline-block dark:bg-zinc-700 dark:text-zinc-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href="/accounts?filter=at-risk"
          className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          title={atRiskCount > 0 ? `${atRiskCount} at-risk accounts` : "No at-risk accounts"}
        >
          <Bell className="h-5 w-5" />
          {atRiskCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {atRiskCount > 9 ? "9+" : atRiskCount}
            </span>
          )}
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
