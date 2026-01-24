"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"

export interface PortfolioStats {
  totalAccounts: number
  healthyAccounts: number
  warningAccounts: number
  atRiskAccounts: number
  totalMrr: number
  pendingTasks: number
  inProgressTasks: number
  overdueTasks: number
  timestamp: string
}

export interface HealthChangeEvent {
  companyId: string
  companyName: string
  hubspotId: string
  previousScore: string
  newScore: string
  changedAt: string
}

export interface NewTaskEvent {
  id: string
  title: string
  companyName: string
  priority: string
  status: string
  createdAt: string
}

interface UseLiveUpdatesOptions {
  enabled?: boolean
  showNotifications?: boolean
  onHealthChange?: (event: HealthChangeEvent) => void
  onNewTask?: (event: NewTaskEvent) => void
  onStatsUpdate?: (stats: PortfolioStats) => void
}

export function useLiveUpdates(options: UseLiveUpdatesOptions = {}) {
  const {
    enabled = true,
    showNotifications = true,
    onHealthChange,
    onNewTask,
    onStatsUpdate,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [stats, setStats] = useState<PortfolioStats | null>(null)
  const [recentEvents, setRecentEvents] = useState<Array<HealthChangeEvent | NewTaskEvent>>([])
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!enabled || typeof window === "undefined") return

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource("/api/events/stream")
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      console.log("[LiveUpdates] Connected")
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      console.log("[LiveUpdates] Connection error, reconnecting in 5s...")

      // Attempt reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 5000)
    }

    // Handle connected event
    eventSource.addEventListener("connected", () => {
      setIsConnected(true)
    })

    // Handle heartbeat
    eventSource.addEventListener("heartbeat", () => {
      // Keep-alive, no action needed
    })

    // Handle health changes
    eventSource.addEventListener("health_change", (e) => {
      try {
        const data: HealthChangeEvent = JSON.parse(e.data)
        setRecentEvents((prev) => [data, ...prev.slice(0, 19)])
        onHealthChange?.(data)

        if (showNotifications) {
          const emoji = data.newScore === "red" ? "🔴" : data.newScore === "yellow" ? "🟡" : "🟢"
          toast(`${emoji} ${data.companyName}`, {
            description: `Health changed: ${data.previousScore} → ${data.newScore}`,
          })
        }
      } catch {
        // Ignore parse errors
      }
    })

    // Handle new tasks
    eventSource.addEventListener("new_task", (e) => {
      try {
        const data: NewTaskEvent = JSON.parse(e.data)
        setRecentEvents((prev) => [data, ...prev.slice(0, 19)])
        onNewTask?.(data)

        if (showNotifications) {
          toast("📋 New Task", {
            description: `${data.title} (${data.companyName})`,
          })
        }
      } catch {
        // Ignore parse errors
      }
    })

    // Handle portfolio stats
    eventSource.addEventListener("portfolio_stats", (e) => {
      try {
        const data: PortfolioStats = JSON.parse(e.data)
        setStats(data)
        onStatsUpdate?.(data)
      } catch {
        // Ignore parse errors
      }
    })

    return () => {
      eventSource.close()
    }
  }, [enabled, showNotifications, onHealthChange, onNewTask, onStatsUpdate])

  useEffect(() => {
    const cleanup = connect()

    return () => {
      cleanup?.()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [connect])

  return {
    isConnected,
    stats,
    recentEvents,
  }
}
