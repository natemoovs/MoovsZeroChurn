"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Calendar,
  DollarSign,
  UserPlus,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface ActivityItem {
  id: string
  type: "task_completed" | "health_change" | "renewal" | "expansion" | "note" | "escalation"
  title: string
  description?: string
  companyId?: string
  companyName?: string
  userId?: string
  userName?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface ActivityFeedProps {
  limit?: number
  companyId?: string
  showHeader?: boolean
}

export function ActivityFeed({ limit = 20, companyId, showHeader = true }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [companyId])

  async function fetchActivities() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (companyId) params.set("companyId", companyId)
      params.set("limit", limit.toString())

      const res = await fetch(`/api/activity?${params}`)
      const data = await res.json()
      setActivities(data.activities || [])
    } catch (error) {
      console.error("Failed to fetch activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "task_completed":
        return CheckCircle2
      case "health_change":
        return TrendingDown
      case "renewal":
        return Calendar
      case "expansion":
        return TrendingUp
      case "note":
        return MessageSquare
      case "escalation":
        return AlertTriangle
      default:
        return Activity
    }
  }

  const getColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "task_completed":
        return "bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
      case "health_change":
        return "bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400"
      case "renewal":
        return "bg-info-100 text-info-600 dark:bg-info-900/30 dark:text-info-400"
      case "expansion":
        return "bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
      case "note":
        return "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
      case "escalation":
        return "bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400"
      default:
        return "bg-bg-tertiary text-content-secondary"
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex gap-3 animate-pulse"
          >
            <div className="h-10 w-10 rounded-full bg-bg-tertiary" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-bg-tertiary" />
              <div className="h-3 w-1/2 rounded bg-bg-tertiary" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card-sf">
      {showHeader && (
        <div className="flex items-center justify-between border-b border-border-default p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-content-secondary" />
            <h3 className="font-semibold text-content-primary">
              Activity Feed
            </h3>
          </div>
          <button
            onClick={fetchActivities}
            className="rounded-lg p-2 text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-secondary"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="divide-y divide-border-default">
        {activities.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="mx-auto mb-3 h-8 w-8 text-content-tertiary" />
            <p className="text-sm text-content-secondary">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = getIcon(activity.type)
            return (
              <div
                key={activity.id}
                className="flex gap-3 p-4 transition-colors hover:bg-surface-hover"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                    getColor(activity.type)
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-content-primary">
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p className="mt-0.5 text-sm text-content-secondary line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-content-tertiary">
                    {activity.companyName && (
                      <Link
                        href={`/accounts/${activity.companyId}`}
                        className="hover:text-success-600 hover:underline"
                      >
                        {activity.companyName}
                      </Link>
                    )}
                    {activity.companyName && activity.userName && (
                      <span>•</span>
                    )}
                    {activity.userName && <span>{activity.userName}</span>}
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
