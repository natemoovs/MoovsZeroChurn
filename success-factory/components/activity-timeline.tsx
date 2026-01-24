"use client"

import { useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  HelpCircle,
  Loader2,
  Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TimelineEvent {
  id: string
  companyId: string
  source: string
  eventType: string
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  importance: string
  occurredAt: string
  createdAt: string
}

interface GroupedEvents {
  date: string
  events: TimelineEvent[]
}

interface ActivityTimelineProps {
  companyId: string
  limit?: number
  showFilters?: boolean
}

const SOURCE_ICONS: Record<string, typeof Activity> = {
  platform: Activity,
  hubspot: Mail,
  stripe: CreditCard,
  support: HelpCircle,
  nps: MessageSquare,
  task: CheckCircle2,
  journey: Calendar,
}

const SOURCE_COLORS: Record<string, string> = {
  platform: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  hubspot: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  stripe: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  support: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  nps: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  task: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  journey: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
}

export function ActivityTimeline({
  companyId,
  limit = 30,
  showFilters = true,
}: ActivityTimelineProps) {
  const [grouped, setGrouped] = useState<GroupedEvents[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [sources, setSources] = useState<string[]>([])

  useEffect(() => {
    const url = new URL(`/api/timeline/${companyId}`, window.location.origin)
    url.searchParams.set("limit", limit.toString())
    if (selectedSource) {
      url.searchParams.set("source", selectedSource)
    }

    fetch(url.toString())
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setGrouped(data.grouped || [])
          setSources(data.sources || [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [companyId, limit, selectedSource])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (grouped.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <Activity className="mx-auto mb-2 h-8 w-8 text-zinc-400" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No activity recorded yet
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          <button
            onClick={() => setSelectedSource(null)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              !selectedSource
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
            )}
          >
            All
          </button>
          {sources.map((source) => {
            const Icon = SOURCE_ICONS[source] || Activity
            return (
              <button
                key={source}
                onClick={() => setSelectedSource(source)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                  selectedSource === source
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                )}
              >
                <Icon className="h-3 w-3" />
                {source}
              </button>
            )
          })}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date Header */}
            <div className="sticky top-0 z-10 mb-3 flex items-center gap-2 bg-zinc-50/80 py-1 backdrop-blur-sm dark:bg-zinc-950/80">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {formatDate(group.date)}
              </span>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>

            {/* Events for this date */}
            <div className="relative space-y-3 pl-6">
              {/* Vertical line */}
              <div className="absolute left-2.5 top-2 h-[calc(100%-1rem)] w-px bg-zinc-200 dark:bg-zinc-700" />

              {group.events.map((event) => (
                <TimelineEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TimelineEventCard({ event }: { event: TimelineEvent }) {
  const Icon = SOURCE_ICONS[event.source] || Activity
  const colorClass = SOURCE_COLORS[event.source] || SOURCE_COLORS.platform

  // Special icons for specific event types
  let EventIcon = Icon
  if (event.eventType === "health_changed") {
    EventIcon = event.metadata?.newScore === "red" ? AlertTriangle : Activity
  } else if (event.eventType === "nps_response") {
    const category = event.metadata?.category as string
    EventIcon = category === "promoter" ? ThumbsUp : category === "detractor" ? ThumbsDown : MessageSquare
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border p-3",
        event.importance === "critical"
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          : event.importance === "high"
          ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      )}
    >
      {/* Icon dot */}
      <div
        className={cn(
          "absolute -left-6 top-3 flex h-5 w-5 items-center justify-center rounded-full",
          colorClass
        )}
      >
        <EventIcon className="h-3 w-3" />
      </div>

      {/* Content */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            {event.title}
          </p>
          {event.description && (
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {event.description}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs text-zinc-400">
          {formatTime(event.occurredAt)}
        </span>
      </div>

      {/* Source badge */}
      <div className="mt-2 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
            colorClass
          )}
        >
          <Icon className="h-3 w-3" />
          {event.source}
        </span>
        {event.importance !== "normal" && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              event.importance === "critical"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            )}
          >
            {event.importance}
          </span>
        )}
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return "Today"
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}
