"use client"

import { Search, Bell, Menu } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface DashboardHeaderProps {
  onMenuClick: () => void
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/accounts?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/80">
      {/* Left side - menu button + search */}
      <div className="flex flex-1 items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative w-full max-w-xs sm:max-w-md">
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
      <div className="flex items-center gap-1 sm:gap-2">
        <button className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
