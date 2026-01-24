"use client"

import { Search, Bell, Menu } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface DashboardHeaderProps {
  onMenuClick: () => void
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [atRiskCount, setAtRiskCount] = useState(0)
  const router = useRouter()

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/accounts?q=${encodeURIComponent(searchQuery)}`)
    }
  }

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

        {/* Search */}
        <form onSubmit={handleSearch} className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 sm:h-10 sm:pl-10 sm:pr-4 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-500 dark:focus:bg-zinc-800"
          />
        </form>
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
