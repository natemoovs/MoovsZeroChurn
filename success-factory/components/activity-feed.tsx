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
        return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
      case "health_change":
        return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
      case "renewal":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
      case "expansion":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
      case "note":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
      case "escalation":
        return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
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
            <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {showHeader && (
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-zinc-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Activity Feed
            </h3>
          </div>
          <button
            onClick={fetchActivities}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {activities.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = getIcon(activity.type)
            return (
              <div
                key={activity.id}
                className="flex gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
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
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                    {activity.companyName && (
                      <Link
                        href={`/accounts/${activity.companyId}`}
                        className="hover:text-emerald-600 hover:underline"
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
