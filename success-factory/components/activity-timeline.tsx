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
  platform: "bg-info-100 text-info-600 dark:bg-info-900/30 dark:text-info-400",
  hubspot: "bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400",
  stripe: "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
  support: "bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400",
  nps: "bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400",
  task: "bg-bg-tertiary text-content-secondary",
  journey: "bg-info-100 text-info-600 dark:bg-info-900/30 dark:text-info-400",
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
        <Loader2 className="text-content-tertiary h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (grouped.length === 0) {
    return (
      <div className="card-sf p-6 text-center">
        <Activity className="text-content-tertiary mx-auto mb-2 h-8 w-8" />
        <p className="text-content-secondary text-sm">No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="text-content-tertiary h-4 w-4" />
          <button
            onClick={() => setSelectedSource(null)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              !selectedSource
                ? "bg-content-primary text-bg-elevated dark:text-bg-elevated dark:bg-white"
                : "bg-bg-tertiary text-content-secondary hover:bg-surface-hover"
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
                    ? "bg-content-primary text-bg-elevated dark:text-bg-elevated dark:bg-white"
                    : "bg-bg-tertiary text-content-secondary hover:bg-surface-hover"
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
            <div className="bg-bg-secondary/80 sticky top-0 z-10 mb-3 flex items-center gap-2 py-1 backdrop-blur-sm">
              <div className="bg-bg-tertiary h-px flex-1" />
              <span className="text-content-secondary text-xs font-medium">
                {formatDate(group.date)}
              </span>
              <div className="bg-bg-tertiary h-px flex-1" />
            </div>

            {/* Events for this date */}
            <div className="relative space-y-3 pl-6">
              {/* Vertical line */}
              <div className="bg-bg-tertiary absolute top-2 left-2.5 h-[calc(100%-1rem)] w-px" />

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
    EventIcon =
      category === "promoter" ? ThumbsUp : category === "detractor" ? ThumbsDown : MessageSquare
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border p-3",
        event.importance === "critical"
          ? "border-error-200 bg-error-50 dark:border-error-900 dark:bg-error-950/30"
          : event.importance === "high"
            ? "border-warning-200 bg-warning-50 dark:border-warning-900 dark:bg-warning-950/30"
            : "border-border-default bg-bg-elevated"
      )}
    >
      {/* Icon dot */}
      <div
        className={cn(
          "absolute top-3 -left-6 flex h-5 w-5 items-center justify-center rounded-full",
          colorClass
        )}
      >
        <EventIcon className="h-3 w-3" />
      </div>

      {/* Content */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-content-primary font-medium">{event.title}</p>
          {event.description && (
            <p className="text-content-secondary mt-0.5 text-sm">{event.description}</p>
          )}
        </div>
        <span className="text-content-tertiary shrink-0 text-xs">
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
                ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
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
