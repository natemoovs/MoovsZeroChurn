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
          <div className="text-content-secondary flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="bg-success-500 h-2 w-2 rounded-full" />
              {stats.healthyAccounts}
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-warning-500 h-2 w-2 rounded-full" />
              {stats.warningAccounts}
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-error-500 h-2 w-2 rounded-full" />
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
        <h3 className="text-content-primary font-semibold">Live Dashboard</h3>
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
                  <span className="bg-success-400 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                  <span className="bg-success-500 relative inline-flex h-2 w-2 rounded-full" />
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
          <div className="bg-bg-tertiary rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-success-500 h-4 w-4" />
              <span className="text-content-secondary text-xs">Healthy</span>
            </div>
            <p className="text-success-600 dark:text-success-400 mt-1 text-2xl font-bold">
              {stats.healthyAccounts}
            </p>
          </div>

          <div className="bg-bg-tertiary rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-warning-500 h-4 w-4" />
              <span className="text-content-secondary text-xs">Warning</span>
            </div>
            <p className="text-warning-600 dark:text-warning-400 mt-1 text-2xl font-bold">
              {stats.warningAccounts}
            </p>
          </div>

          <div className="bg-bg-tertiary rounded-lg p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="text-error-500 h-4 w-4" />
              <span className="text-content-secondary text-xs">At Risk</span>
            </div>
            <p className="text-error-600 dark:text-error-400 mt-1 text-2xl font-bold">
              {stats.atRiskAccounts}
            </p>
          </div>

          <div className="bg-bg-tertiary rounded-lg p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-info-500 h-4 w-4" />
              <span className="text-content-secondary text-xs">MRR</span>
            </div>
            <p className="text-info-600 dark:text-info-400 mt-1 text-2xl font-bold">
              ${(stats.totalMrr / 1000).toFixed(0)}k
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="shimmer h-20 rounded-lg" />
          ))}
        </div>
      )}

      {/* Recent Events */}
      <div>
        <h4 className="text-content-secondary mb-2 text-sm font-medium">Recent Activity</h4>
        {recentEvents.length > 0 ? (
          <div className="space-y-2">
            {recentEvents.slice(0, 5).map((event, i) => (
              <div
                key={i}
                className="bg-bg-tertiary flex items-center gap-3 rounded-lg p-2 text-sm"
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
                    <span className="text-content-secondary flex-1 truncate">
                      {event.companyName}
                    </span>
                    <span className="text-content-secondary text-xs">
                      {event.previousScore} → {event.newScore}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="bg-info-500 h-2 w-2 rounded-full" />
                    <span className="text-content-secondary flex-1 truncate">{event.title}</span>
                    <span className="text-content-secondary text-xs">{event.companyName}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-content-secondary text-sm">
            No recent activity. Updates will appear here in real-time.
          </p>
        )}
      </div>
    </div>
  )
}
