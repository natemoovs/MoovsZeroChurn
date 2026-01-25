"use client"

import { Search, Bell, Menu, Wifi, User } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useLiveUpdates } from "@/hooks/use-live-updates"

interface DashboardHeaderProps {
  onMenuClick: () => void
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const [initialAtRiskCount, setInitialAtRiskCount] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { isConnected, stats } = useLiveUpdates({
    showNotifications: false, // Don't show toasts from header
  })

  // Use live stats if available, otherwise use initial fetch
  const atRiskCount = stats?.atRiskAccounts ?? initialAtRiskCount

  useEffect(() => {
    // Fetch at-risk account count for notification badge (initial load)
    let mounted = true
    fetch("/api/integrations/portfolio?segment=all")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return
        const summaries = data.summaries || []
        const redCount = summaries.filter(
          (s: { healthScore: string }) => s.healthScore === "red"
        ).length
        setInitialAtRiskCount(redCount)
      })
      .catch(() => {})

    // Fetch user avatar
    fetch("/api/settings/avatar")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return
        setAvatarUrl(data.avatarUrl)
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [])

  return (
    <header className="border-border-default glass sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b px-4 sm:h-16 sm:gap-4 sm:px-6">
      {/* Left side - menu button + search */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="text-content-tertiary hover:bg-surface-hover hover:text-content-primary transition-colors-smooth shrink-0 rounded-lg p-2 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search - opens command palette */}
        <button
          onClick={() => {
            // Trigger Cmd+K programmatically
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
          }}
          className="border-border-default bg-bg-secondary text-content-tertiary transition-colors-smooth hover:border-border-strong hover:bg-surface-hover flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-sm sm:h-10 sm:max-w-md sm:px-4"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="bg-bg-tertiary text-content-secondary hidden rounded px-1.5 py-0.5 text-xs font-medium sm:inline-block">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Live indicator */}
        <div
          className={`hidden items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium sm:flex ${
            isConnected ? "badge-sf badge-success pulse-glow" : "badge-sf"
          }`}
          title={isConnected ? "Real-time updates active" : "Connecting..."}
        >
          {isConnected && (
            <span className="relative flex h-2 w-2">
              <span className="bg-success-500 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
              <span className="bg-success-600 relative inline-flex h-2 w-2 rounded-full" />
            </span>
          )}
          <Wifi className="h-3 w-3" />
          <span className="hidden lg:inline">{isConnected ? "Live" : "..."}</span>
        </div>

        <Link
          href="/accounts?filter=at-risk"
          className="text-content-tertiary hover:bg-surface-hover hover:text-content-primary transition-colors-smooth relative rounded-lg p-2"
          title={atRiskCount > 0 ? `${atRiskCount} at-risk accounts` : "No at-risk accounts"}
        >
          <Bell className="h-5 w-5" />
          {atRiskCount > 0 && (
            <span className="bg-error-500 text-text-inverse glow-error absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
              {atRiskCount > 9 ? "9+" : atRiskCount}
            </span>
          )}
        </Link>
        <ThemeToggle />

        {/* Profile avatar */}
        <Link
          href="/settings"
          className="hover:ring-primary-500/50 relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-transparent transition-all hover:ring-2"
          title="Settings"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Profile"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="bg-bg-tertiary text-content-tertiary flex h-full w-full items-center justify-center">
              <User className="h-4 w-4" />
            </div>
          )}
        </Link>
      </div>
    </header>
  )
}
