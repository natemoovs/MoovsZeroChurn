"use client"

import { useLiveUpdates } from "@/hooks/use-live-updates"
import { Wifi, WifiOff, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react"

interface LiveStatsProps {
  showConnection?: boolean
  compact?: boolean
}

export function LiveStats({ showConnection = true, compact = false }: LiveStatsProps) {
  const { isConnected, stats, recentEvents } = useLiveUpdates({
    enabled: true,
    showNotifications: true,
  })

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {showConnection && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
              isConnected
                ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                : "bg-bg-tertiary text-content-secondary"
            }`}
          >
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Offline</span>
              </>
            )}
          </div>
        )}
        {stats && (
          <div className="flex items-center gap-3 text-xs text-content-secondary">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success-500" />
              {stats.healthyAccounts}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-warning-500" />
              {stats.warningAccounts}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-error-500" />
              {stats.atRiskAccounts}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card-sf p-4">
      {/* Header with connection status */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-content-primary">Live Dashboard</h3>
        {showConnection && (
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              isConnected
                ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                : "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
            }`}
          >
            {isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
                </span>
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Reconnecting...</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {stats ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-bg-tertiary p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success-500" />
              <span className="text-xs text-content-secondary">Healthy</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-success-600 dark:text-success-400">
              {stats.healthyAccounts}
            </p>
          </div>

          <div className="rounded-lg bg-bg-tertiary p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning-500" />
              <span className="text-xs text-content-secondary">Warning</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-warning-600 dark:text-warning-400">
              {stats.warningAccounts}
            </p>
          </div>

          <div className="rounded-lg bg-bg-tertiary p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-error-500" />
              <span className="text-xs text-content-secondary">At Risk</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-error-600 dark:text-error-400">
              {stats.atRiskAccounts}
            </p>
          </div>

          <div className="rounded-lg bg-bg-tertiary p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-info-500" />
              <span className="text-xs text-content-secondary">MRR</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-info-600 dark:text-info-400">
              ${(stats.totalMrr / 1000).toFixed(0)}k
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 shimmer rounded-lg"
            />
          ))}
        </div>
      )}

      {/* Recent Events */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-content-secondary">
          Recent Activity
        </h4>
        {recentEvents.length > 0 ? (
          <div className="space-y-2">
            {recentEvents.slice(0, 5).map((event, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg bg-bg-tertiary p-2 text-sm"
              >
                {"newScore" in event ? (
                  <>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        event.newScore === "red"
                          ? "bg-error-500"
                          : event.newScore === "yellow"
                            ? "bg-warning-500"
                            : "bg-success-500"
                      }`}
                    />
                    <span className="flex-1 truncate text-content-secondary">
                      {event.companyName}
                    </span>
                    <span className="text-xs text-content-secondary">
                      {event.previousScore} → {event.newScore}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-info-500" />
                    <span className="flex-1 truncate text-content-secondary">
                      {event.title}
                    </span>
                    <span className="text-xs text-content-secondary">{event.companyName}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-content-secondary">
            No recent activity. Updates will appear here in real-time.
          </p>
        )}
      </div>
    </div>
  )
}
