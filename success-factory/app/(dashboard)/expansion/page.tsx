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
  Sparkles,
  RefreshCw,
  Zap,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { HubSpotActions } from "@/components/hubspot-actions"

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

interface PropensityScore {
  companyId: string
  companyName: string
  segment: string
  score: number
  drivers: Array<{ factor: string; contribution: number; value: string | number }>
  recommendation: string
}

interface PropensityData {
  scores: PropensityScore[]
  summary: { avgScore: number; highPropensityCount: number; totalScored: number }
}

interface ApiPropensityResult {
  companyId: string
  name: string
  segment: string | null
  score: number
  usageScore: number
  engagementScore: number
  healthScore: number
  tenureScore: number
  fitScore: number
  optimalTiming: string
  positiveSignals: string[]
}

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
  const [propensityData, setPropensityData] = useState<PropensityData | null>(null)
  const [propensityLoading, setPropensityLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"pipeline" | "propensity">("pipeline")

  useEffect(() => {
    fetchOpportunities()
    fetchPropensityScores()
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

  async function fetchPropensityScores() {
    try {
      setPropensityLoading(true)
      const res = await fetch("/api/analytics/expansion-propensity")
      const data = await res.json()

      // Transform API response to match UI interface
      const transformed: PropensityData = {
        summary: {
          avgScore: data.summary?.avgScore || 0,
          highPropensityCount: data.summary?.high || 0,
          totalScored: data.summary?.total || 0,
        },
        scores: (data.results || []).map((result: ApiPropensityResult) => ({
          companyId: result.companyId,
          companyName: result.name,
          segment: result.segment || "unknown",
          score: result.score,
          drivers: [
            {
              factor: "Usage",
              contribution: Math.round(result.usageScore * 0.25),
              value: result.usageScore,
            },
            {
              factor: "Engagement",
              contribution: Math.round(result.engagementScore * 0.2),
              value: result.engagementScore,
            },
            {
              factor: "Health",
              contribution: Math.round(result.healthScore * 0.2),
              value: result.healthScore,
            },
            {
              factor: "Tenure",
              contribution: Math.round(result.tenureScore * 0.1),
              value: result.tenureScore,
            },
            {
              factor: "Fit",
              contribution: Math.round(result.fitScore * 0.25),
              value: result.fitScore,
            },
          ].sort((a, b) => b.contribution - a.contribution),
          recommendation:
            result.optimalTiming || (result.positiveSignals && result.positiveSignals[0]) || "",
        })),
      }

      setPropensityData(transformed)
    } catch (error) {
      console.error("Failed to fetch propensity scores:", error)
    } finally {
      setPropensityLoading(false)
    }
  }

  async function recalculatePropensity() {
    try {
      setPropensityLoading(true)
      await fetch("/api/analytics/expansion-propensity", { method: "POST" })
      await fetchPropensityScores()
    } catch (error) {
      console.error("Failed to recalculate propensity:", error)
    } finally {
      setPropensityLoading(false)
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-content-primary text-2xl font-bold">Expansion Pipeline</h1>
            <p className="text-content-secondary mt-1">Track upsell and cross-sell opportunities</p>
          </div>
          <div className="flex items-center gap-2">
            <HubSpotActions entityType="accounts" />
            {activeTab === "propensity" && (
              <button
                onClick={recalculatePropensity}
                disabled={propensityLoading}
                className="bg-primary-600 hover:bg-primary-700 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              >
                {propensityLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {propensityLoading ? "Calculating..." : "Recalculate Scores"}
              </button>
            )}
            {activeTab === "pipeline" && (
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
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-border-default bg-bg-secondary flex gap-1 rounded-lg border p-1">
          <button
            onClick={() => setActiveTab("pipeline")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all",
              activeTab === "pipeline"
                ? "bg-bg-elevated text-content-primary shadow-sm"
                : "text-content-secondary hover:text-content-primary"
            )}
          >
            <Target className="h-4 w-4" />
            Opportunity Pipeline
          </button>
          <button
            onClick={() => setActiveTab("propensity")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all",
              activeTab === "propensity"
                ? "bg-bg-elevated text-content-primary shadow-sm"
                : "text-content-secondary hover:text-content-primary"
            )}
          >
            <Zap className="h-4 w-4" />
            Propensity Scores
            {propensityData?.summary && (
              <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 ml-1 rounded-full px-1.5 py-0.5 text-xs">
                {propensityData.summary.highPropensityCount} high
              </span>
            )}
          </button>
        </div>

        {/* Pipeline Tab Content */}
        {activeTab === "pipeline" && (
          <>
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
                      {(stats?.identified || 0) +
                        (stats?.qualified || 0) +
                        (stats?.inProgress || 0)}
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
                              className={cn(
                                "text-xs font-medium",
                                confidenceColors[opp.confidence]
                              )}
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
          </>
        )}

        {/* Propensity Scores Tab Content */}
        {activeTab === "propensity" && (
          <>
            {/* Summary Stats */}
            {propensityData?.summary && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="card-sf p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-100 dark:bg-primary-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Building2 className="text-primary-600 dark:text-primary-400 h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-content-secondary text-sm">Accounts Scored</p>
                      <p className="text-content-primary text-xl font-bold">
                        {propensityData.summary.totalScored}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card-sf p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-success-100 dark:bg-success-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Zap className="text-success-600 dark:text-success-400 h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-content-secondary text-sm">High Propensity</p>
                      <p className="text-content-primary text-xl font-bold">
                        {propensityData.summary.highPropensityCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card-sf p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent-100 dark:bg-accent-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                      <TrendingUp className="text-accent-600 dark:text-accent-400 h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-content-secondary text-sm">Avg Score</p>
                      <p className="text-content-primary text-xl font-bold">
                        {propensityData.summary.avgScore}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Propensity Scores List */}
            {propensityLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="shimmer h-24 rounded-xl" />
                ))}
              </div>
            ) : !propensityData || propensityData.scores.length === 0 ? (
              <div className="card-sf p-12 text-center">
                <div className="bg-bg-secondary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                  <Zap className="text-content-tertiary h-6 w-6" />
                </div>
                <h3 className="text-content-primary text-lg font-medium">
                  No propensity scores yet
                </h3>
                <p className="text-content-secondary mt-1">
                  Click &quot;Recalculate Scores&quot; to analyze expansion likelihood
                </p>
              </div>
            ) : (
              <div className="card-sf overflow-hidden">
                <div className="border-border-default border-b px-6 py-4">
                  <h2 className="text-content-primary text-lg font-semibold">
                    Expansion Propensity Rankings
                  </h2>
                  <p className="text-content-tertiary text-sm">
                    Accounts ranked by likelihood to expand
                  </p>
                </div>
                <div className="divide-border-default divide-y">
                  {propensityData.scores.map((score, idx) => (
                    <div
                      key={score.companyId}
                      className="hover:bg-bg-secondary px-6 py-4 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                              idx < 3
                                ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                                : "bg-bg-secondary text-content-secondary"
                            )}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <h3 className="text-content-primary font-medium">
                              {score.companyName}
                            </h3>
                            <p className="text-content-tertiary text-sm capitalize">
                              {score.segment.replace("_", " ")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div
                              className={cn(
                                "text-2xl font-bold",
                                score.score >= 70
                                  ? "text-success-600 dark:text-success-400"
                                  : score.score >= 40
                                    ? "text-warning-600 dark:text-warning-400"
                                    : "text-content-secondary"
                              )}
                            >
                              {score.score}
                            </div>
                            <p className="text-content-tertiary text-xs">propensity score</p>
                          </div>
                        </div>
                      </div>
                      {/* Score Drivers */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {score.drivers.slice(0, 4).map((driver) => (
                          <span
                            key={driver.factor}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs",
                              driver.contribution >= 15
                                ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                                : driver.contribution >= 10
                                  ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                                  : "bg-bg-secondary text-content-secondary"
                            )}
                          >
                            {driver.factor}: +{driver.contribution}
                          </span>
                        ))}
                      </div>
                      {score.recommendation && (
                        <p className="text-content-secondary mt-2 text-sm">
                          {score.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
