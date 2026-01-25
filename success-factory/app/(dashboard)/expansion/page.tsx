"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  TrendingUp,
  ArrowUpRight,
  DollarSign,
  Target,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ExpansionOpportunity {
  id: string
  companyId: string
  companyName: string
  type: "upsell" | "cross_sell" | "add_on" | "upgrade"
  status: "identified" | "qualified" | "in_progress" | "won" | "lost" | "deferred"
  source: string
  title: string
  description: string | null
  currentValue: number | null
  potentialValue: number | null
  confidence: "high" | "medium" | "low"
  createdAt: string
}

interface ExpansionStats {
  total: number
  identified: number
  qualified: number
  inProgress: number
  won: number
  lost: number
  totalPotentialValue: number
  totalWonValue: number
}

type StatusFilter = "all" | "identified" | "qualified" | "in_progress" | "won" | "lost"

const typeLabels: Record<string, string> = {
  upsell: "Upsell",
  cross_sell: "Cross-sell",
  add_on: "Add-on",
  upgrade: "Upgrade",
}

const typeColors: Record<string, string> = {
  upsell: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
  cross_sell: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
  add_on: "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400",
  upgrade: "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
}

const statusIcons: Record<string, React.ElementType> = {
  identified: Target,
  qualified: CheckCircle2,
  in_progress: Clock,
  won: TrendingUp,
  lost: XCircle,
  deferred: Clock,
}

const confidenceColors: Record<string, string> = {
  high: "text-success-600 dark:text-success-400",
  medium: "text-warning-600 dark:text-warning-400",
  low: "text-content-secondary",
}

function formatCurrency(value: number | null): string {
  if (value === null) return "-"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ExpansionPage() {
  const [opportunities, setOpportunities] = useState<ExpansionOpportunity[]>([])
  const [stats, setStats] = useState<ExpansionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  useEffect(() => {
    fetchOpportunities()
  }, [])

  async function fetchOpportunities() {
    try {
      const res = await fetch("/api/expansion")
      const data = await res.json()
      setOpportunities(data.opportunities || [])
      setStats(data.summary || null)
    } catch (error) {
      console.error("Failed to fetch opportunities:", error)
    } finally {
      setLoading(false)
    }
  }

  async function runDetection() {
    setDetecting(true)
    try {
      const res = await fetch("/api/expansion/detect", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        // Refresh the list
        await fetchOpportunities()
      }
    } catch (error) {
      console.error("Failed to run detection:", error)
    } finally {
      setDetecting(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await fetch(`/api/expansion/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      await fetchOpportunities()
    } catch (error) {
      console.error("Failed to update status:", error)
    }
  }

  const filteredOpportunities = opportunities.filter((opp) => {
    if (statusFilter === "all") return true
    return opp.status === statusFilter
  })

  const filterButtons: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: stats?.total || 0 },
    { value: "identified", label: "Identified", count: stats?.identified || 0 },
    { value: "qualified", label: "Qualified", count: stats?.qualified || 0 },
    { value: "in_progress", label: "In Progress", count: stats?.inProgress || 0 },
    { value: "won", label: "Won", count: stats?.won || 0 },
  ]

  // Calculate NRR
  const nrr = stats
    ? (((stats.totalWonValue || 0) + (stats.totalPotentialValue || 0)) /
        Math.max(stats.totalPotentialValue || 1, 1)) *
      100
    : 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-content-primary text-2xl font-bold">Expansion Pipeline</h1>
            <p className="text-content-secondary mt-1">Track upsell and cross-sell opportunities</p>
          </div>
          <button
            onClick={runDetection}
            disabled={detecting}
            className="bg-success-600 hover:bg-success-700 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {detecting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {detecting ? "Detecting..." : "Detect Signals"}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-sf p-4">
            <div className="flex items-center gap-3">
              <div className="bg-success-100 dark:bg-success-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                <DollarSign className="text-success-600 dark:text-success-400 h-5 w-5" />
              </div>
              <div>
                <p className="text-content-secondary text-sm">Pipeline Value</p>
                <p className="text-content-primary text-xl font-bold">
                  {formatCurrency(stats?.totalPotentialValue || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="card-sf p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-100 dark:bg-primary-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                <TrendingUp className="text-primary-600 dark:text-primary-400 h-5 w-5" />
              </div>
              <div>
                <p className="text-content-secondary text-sm">Won Value</p>
                <p className="text-content-primary text-xl font-bold">
                  {formatCurrency(stats?.totalWonValue || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="card-sf p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-100 dark:bg-primary-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                <Target className="text-primary-600 dark:text-primary-400 h-5 w-5" />
              </div>
              <div>
                <p className="text-content-secondary text-sm">Active Opportunities</p>
                <p className="text-content-primary text-xl font-bold">
                  {(stats?.identified || 0) + (stats?.qualified || 0) + (stats?.inProgress || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="card-sf p-4">
            <div className="flex items-center gap-3">
              <div className="bg-warning-100 dark:bg-warning-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                <ArrowUpRight className="text-warning-600 dark:text-warning-400 h-5 w-5" />
              </div>
              <div>
                <p className="text-content-secondary text-sm">Win Rate</p>
                <p className="text-content-primary text-xl font-bold">
                  {stats && stats.won + stats.lost > 0
                    ? Math.round((stats.won / (stats.won + stats.lost)) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Filters */}
        <div className="border-border-default bg-bg-secondary flex flex-wrap gap-1 rounded-lg border p-1">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setStatusFilter(btn.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                statusFilter === btn.value
                  ? "bg-bg-elevated text-content-primary shadow-sm"
                  : "text-content-secondary hover:text-content-primary"
              )}
            >
              {btn.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  statusFilter === btn.value ? "bg-bg-secondary" : "bg-bg-tertiary"
                )}
              >
                {btn.count}
              </span>
            </button>
          ))}
        </div>

        {/* Opportunities List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-24 rounded-xl" />
            ))}
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="card-sf p-12 text-center">
            <div className="bg-bg-secondary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Target className="text-content-tertiary h-6 w-6" />
            </div>
            <h3 className="text-content-primary text-lg font-medium">No opportunities found</h3>
            <p className="text-content-secondary mt-1">
              Click &quot;Detect Signals&quot; to automatically find expansion opportunities
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOpportunities.map((opp) => {
              const StatusIcon = statusIcons[opp.status] || Target
              return (
                <div
                  key={opp.id}
                  className="card-sf hover:border-border-hover p-4 transition-colors"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            typeColors[opp.type]
                          )}
                        >
                          {typeLabels[opp.type]}
                        </span>
                        <span
                          className={cn("text-xs font-medium", confidenceColors[opp.confidence])}
                        >
                          {opp.confidence} confidence
                        </span>
                      </div>
                      <h3 className="text-content-primary mt-1 truncate font-medium">
                        {opp.title}
                      </h3>
                      <p className="text-content-secondary mt-0.5 text-sm">{opp.companyName}</p>
                      {opp.description && (
                        <p className="text-content-secondary mt-1 line-clamp-1 text-sm">
                          {opp.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-content-secondary text-sm">Potential</p>
                        <p className="text-success-600 dark:text-success-400 font-semibold">
                          +{formatCurrency(opp.potentialValue)}
                        </p>
                      </div>

                      {opp.status === "identified" && (
                        <button
                          onClick={() => updateStatus(opp.id, "qualified")}
                          className="bg-success-600 hover:bg-success-700 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors"
                        >
                          Qualify
                        </button>
                      )}
                      {opp.status === "qualified" && (
                        <button
                          onClick={() => updateStatus(opp.id, "in_progress")}
                          className="bg-primary-600 hover:bg-primary-700 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors"
                        >
                          Start
                        </button>
                      )}
                      {opp.status === "in_progress" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus(opp.id, "won")}
                            className="bg-success-600 hover:bg-success-700 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors"
                          >
                            Won
                          </button>
                          <button
                            onClick={() => updateStatus(opp.id, "lost")}
                            className="bg-bg-secondary text-content-primary hover:bg-bg-tertiary rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                          >
                            Lost
                          </button>
                        </div>
                      )}
                      {(opp.status === "won" || opp.status === "lost") && (
                        <div className="flex items-center gap-1.5">
                          <StatusIcon
                            className={cn(
                              "h-5 w-5",
                              opp.status === "won" ? "text-success-500" : "text-error-500"
                            )}
                          />
                          <span
                            className={cn(
                              "text-sm font-medium capitalize",
                              opp.status === "won"
                                ? "text-success-600 dark:text-success-400"
                                : "text-error-600 dark:text-error-400"
                            )}
                          >
                            {opp.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
