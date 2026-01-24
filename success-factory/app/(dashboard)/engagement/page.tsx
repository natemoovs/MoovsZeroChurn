"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  MousePointer,
  CheckCircle2,
  XCircle,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FeatureUsage {
  feature: string
  category: string
  usageCount: number
  lastUsed: string | null
  adoptionRate: number
  trend: "increasing" | "stable" | "decreasing"
}

interface EngagementMetrics {
  companyId: string
  companyName: string
  segment: string | null
  overallEngagementScore: number
  loginFrequency: {
    avgDaysPerWeek: number
    lastLogin: string | null
    trend: "increasing" | "stable" | "decreasing"
  }
  sessionMetrics: {
    avgSessionDuration: number
    avgActionsPerSession: number
    totalSessions: number
  }
  featureAdoption: {
    totalFeaturesUsed: number
    totalFeaturesAvailable: number
    adoptionRate: number
    topFeatures: FeatureUsage[]
    unusedFeatures: string[]
  }
  engagementTrend: "improving" | "stable" | "declining"
  riskIndicators: string[]
  recommendations: string[]
}

interface EngagementSummary {
  totalAccounts: number
  avgEngagementScore: number
  avgFeatureAdoption: number
  atRiskCount: number
  decliningCount: number
  byTrend: {
    improving: number
    stable: number
    declining: number
  }
}

type SortOption = "score" | "risk" | "adoption"

function getScoreColor(score: number): string {
  if (score >= 70) return "text-success-600 dark:text-success-500"
  if (score >= 40) return "text-warning-600 dark:text-warning-500"
  return "text-error-600 dark:text-error-500"
}

function getScoreBgColor(score: number): string {
  if (score >= 70) return "bg-success-500"
  if (score >= 40) return "bg-warning-500"
  return "bg-error-500"
}

function getTrendIcon(trend: string) {
  if (trend === "increasing" || trend === "improving") {
    return <TrendingUp className="h-4 w-4 text-success-500" />
  }
  if (trend === "decreasing" || trend === "declining") {
    return <TrendingDown className="h-4 w-4 text-error-500" />
  }
  return <Minus className="h-4 w-4 text-content-tertiary" />
}

export default function EngagementPage() {
  const [metrics, setMetrics] = useState<EngagementMetrics[]>([])
  const [summary, setSummary] = useState<EngagementSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>("score")
  const [selectedAccount, setSelectedAccount] = useState<EngagementMetrics | null>(null)

  useEffect(() => {
    fetchEngagement()
  }, [sortBy])

  async function fetchEngagement() {
    setLoading(true)
    try {
      const res = await fetch(`/api/engagement?sortBy=${sortBy}`)
      const data = await res.json()
      setMetrics(data.metrics || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error("Failed to fetch engagement:", error)
    } finally {
      setLoading(false)
    }
  }

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "score", label: "Engagement Score" },
    { value: "risk", label: "At Risk First" },
    { value: "adoption", label: "Low Adoption First" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              <h1 className="text-2xl font-bold text-content-primary">
                Engagement Analytics
              </h1>
            </div>
            <p className="mt-1 text-content-secondary">
              Track feature adoption and usage patterns
            </p>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
                  <Zap className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-content-secondary">
                    Avg Engagement
                  </p>
                  <p className={cn(
                    "text-2xl font-bold",
                    getScoreColor(summary.avgEngagementScore)
                  )}>
                    {summary.avgEngagementScore}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-content-secondary">
                    Avg Feature Adoption
                  </p>
                  <p className="text-2xl font-bold text-content-primary">
                    {summary.avgFeatureAdoption}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-content-secondary">
                    At Risk
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {summary.atRiskCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-content-secondary">
                    Improving
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {summary.byTrend.improving}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Account List */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="font-semibold text-content-primary">
                  Accounts
                </h2>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="space-y-2 p-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {metrics.map((m) => (
                      <button
                        key={m.companyId}
                        onClick={() => setSelectedAccount(m)}
                        className={cn(
                          "flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                          selectedAccount?.companyId === m.companyId &&
                            "bg-teal-50 dark:bg-teal-950/30"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-content-primary">
                              {m.companyName}
                            </p>
                            {getTrendIcon(m.engagementTrend)}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs text-content-secondary">
                              {m.featureAdoption.adoptionRate}% adoption
                            </span>
                            {m.riskIndicators.length > 0 && (
                              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                {m.riskIndicators.length} risks
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "text-lg font-bold",
                              getScoreColor(m.overallEngagementScore)
                            )}
                          >
                            {m.overallEngagementScore}
                          </div>
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detail View */}
          <div className="lg:col-span-2">
            {selectedAccount ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="card-sf p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`/accounts/${selectedAccount.companyId}`}
                        className="text-xl font-bold text-zinc-900 hover:text-teal-600 dark:text-zinc-100 dark:hover:text-teal-400"
                      >
                        {selectedAccount.companyName}
                      </Link>
                      <p className="mt-1 text-sm capitalize text-content-secondary">
                        {selectedAccount.segment?.replace("_", " ")} segment
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-3xl font-bold",
                            getScoreColor(selectedAccount.overallEngagementScore)
                          )}
                        >
                          {selectedAccount.overallEngagementScore}
                        </span>
                        {getTrendIcon(selectedAccount.engagementTrend)}
                      </div>
                      <p className="text-sm text-content-secondary">
                        Engagement Score
                      </p>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="mt-4">
                    <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className={cn(
                          "transition-all",
                          getScoreBgColor(selectedAccount.overallEngagementScore)
                        )}
                        style={{ width: `${selectedAccount.overallEngagementScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="card-sf p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm text-content-secondary">
                        Login Frequency
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-content-primary">
                      {selectedAccount.loginFrequency.avgDaysPerWeek} days/wk
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-sm text-zinc-500">
                      {getTrendIcon(selectedAccount.loginFrequency.trend)}
                      <span>Last: {selectedAccount.loginFrequency.lastLogin}</span>
                    </div>
                  </div>

                  <div className="card-sf p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm text-content-secondary">
                        Avg Session
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-content-primary">
                      {selectedAccount.sessionMetrics.avgSessionDuration} min
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {selectedAccount.sessionMetrics.totalSessions} total sessions
                    </p>
                  </div>

                  <div className="card-sf p-4">
                    <div className="flex items-center gap-2">
                      <MousePointer className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm text-content-secondary">
                        Actions/Session
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-content-primary">
                      {selectedAccount.sessionMetrics.avgActionsPerSession}
                    </p>
                  </div>
                </div>

                {/* Feature Adoption */}
                <div className="card-sf p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-content-primary">
                      Feature Adoption
                    </h3>
                    <span className={cn(
                      "text-lg font-bold",
                      getScoreColor(selectedAccount.featureAdoption.adoptionRate)
                    )}>
                      {selectedAccount.featureAdoption.adoptionRate}%
                    </span>
                  </div>

                  <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={getScoreBgColor(selectedAccount.featureAdoption.adoptionRate)}
                      style={{ width: `${selectedAccount.featureAdoption.adoptionRate}%` }}
                    />
                  </div>

                  <p className="mb-4 text-sm text-content-secondary">
                    Using {selectedAccount.featureAdoption.totalFeaturesUsed} of{" "}
                    {selectedAccount.featureAdoption.totalFeaturesAvailable} available features
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Top Features */}
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Top Used Features
                      </h4>
                      <div className="space-y-2">
                        {selectedAccount.featureAdoption.topFeatures.slice(0, 4).map((f, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30"
                          >
                            <span className="text-sm text-emerald-800 dark:text-emerald-300">
                              {f.feature}
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                              {f.usageCount} uses
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Unused Features */}
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        <XCircle className="h-4 w-4" />
                        Unused Features
                      </h4>
                      <div className="space-y-2">
                        {selectedAccount.featureAdoption.unusedFeatures.slice(0, 4).map((f, i) => (
                          <div
                            key={i}
                            className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {f}
                          </div>
                        ))}
                        {selectedAccount.featureAdoption.unusedFeatures.length === 0 && (
                          <p className="text-sm text-zinc-500">All features adopted!</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk & Recommendations */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedAccount.riskIndicators.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                      <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        Risk Indicators
                      </h3>
                      <ul className="space-y-2">
                        {selectedAccount.riskIndicators.map((risk, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedAccount.recommendations.length > 0 && (
                    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900/50 dark:bg-teal-950/30">
                      <h3 className="mb-3 flex items-center gap-2 font-semibold text-teal-700 dark:text-teal-400">
                        <Lightbulb className="h-4 w-4" />
                        Recommendations
                      </h3>
                      <ul className="space-y-2">
                        {selectedAccount.recommendations.map((rec, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-sm text-teal-700 dark:text-teal-300"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-96 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-center">
                  <Activity className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                  <p className="mt-4 text-content-secondary">
                    Select an account to view engagement details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
