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
    return <TrendingUp className="text-success-500 h-4 w-4" />
  }
  if (trend === "decreasing" || trend === "declining") {
    return <TrendingDown className="text-error-500 h-4 w-4" />
  }
  return <Minus className="text-content-tertiary h-4 w-4" />
}

export default function EngagementPage() {
  const [metrics, setMetrics] = useState<EngagementMetrics[]>([])
  const [summary, setSummary] = useState<EngagementSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>("score")
  const [selectedAccount, setSelectedAccount] = useState<EngagementMetrics | null>(null)

  useEffect(() => {
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
    fetchEngagement()
  }, [sortBy])

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "score", label: "Engagement Score" },
    { value: "risk", label: "At Risk First" },
    { value: "adoption", label: "Low Adoption First" },
  ]

  return (
    <DashboardLayout>
      <div className="max-w-full min-w-0 space-y-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="text-accent-600 dark:text-accent-400 h-6 w-6" />
              <h1 className="text-content-primary text-2xl font-bold">Engagement Analytics</h1>
            </div>
            <p className="text-content-secondary mt-1">Track feature adoption and usage patterns</p>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="border-border-default bg-bg-elevated h-10 rounded-lg border px-3 text-sm"
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
                <div className="bg-accent-100 dark:bg-accent-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Zap className="text-accent-600 dark:text-accent-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Avg Engagement</p>
                  <p
                    className={cn("text-2xl font-bold", getScoreColor(summary.avgEngagementScore))}
                  >
                    {summary.avgEngagementScore}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 dark:bg-primary-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <CheckCircle2 className="text-primary-600 dark:text-primary-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Avg Feature Adoption</p>
                  <p className="text-content-primary text-2xl font-bold">
                    {summary.avgFeatureAdoption}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="bg-error-100 dark:bg-error-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <AlertTriangle className="text-error-600 dark:text-error-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">At Risk</p>
                  <p className="text-error-600 dark:text-error-400 text-2xl font-bold">
                    {summary.atRiskCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="bg-success-100 dark:bg-success-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <TrendingUp className="text-success-600 dark:text-success-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Improving</p>
                  <p className="text-success-600 dark:text-success-400 text-2xl font-bold">
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
            <div className="card-sf">
              <div className="border-border-default border-b p-4">
                <h2 className="text-content-primary font-semibold">Accounts</h2>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="space-y-2 p-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="shimmer h-16 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="divide-border-default divide-y">
                    {metrics.map((m) => (
                      <button
                        key={m.companyId}
                        onClick={() => setSelectedAccount(m)}
                        className={cn(
                          "hover:bg-surface-hover flex w-full items-center justify-between p-4 text-left transition-colors",
                          selectedAccount?.companyId === m.companyId &&
                            "bg-accent-50 dark:bg-accent-950/30"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-content-primary truncate font-medium">
                              {m.companyName}
                            </p>
                            {getTrendIcon(m.engagementTrend)}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-content-secondary text-xs">
                              {m.featureAdoption.adoptionRate}% adoption
                            </span>
                            {m.riskIndicators.length > 0 && (
                              <span className="bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400 rounded-full px-1.5 py-0.5 text-xs font-medium">
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
                          <ChevronRight className="text-content-tertiary h-4 w-4" />
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
                        className="text-content-primary hover:text-accent-600 dark:hover:text-accent-400 text-xl font-bold"
                      >
                        {selectedAccount.companyName}
                      </Link>
                      <p className="text-content-secondary mt-1 text-sm capitalize">
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
                      <p className="text-content-secondary text-sm">Engagement Score</p>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="mt-4">
                    <div className="bg-bg-tertiary flex h-3 overflow-hidden rounded-full">
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
                      <Clock className="text-content-tertiary h-4 w-4" />
                      <span className="text-content-secondary text-sm">Login Frequency</span>
                    </div>
                    <p className="text-content-primary mt-2 text-2xl font-bold">
                      {selectedAccount.loginFrequency.avgDaysPerWeek} days/wk
                    </p>
                    <div className="text-content-secondary mt-1 flex items-center gap-1 text-sm">
                      {getTrendIcon(selectedAccount.loginFrequency.trend)}
                      <span>Last: {selectedAccount.loginFrequency.lastLogin}</span>
                    </div>
                  </div>

                  <div className="card-sf p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="text-content-tertiary h-4 w-4" />
                      <span className="text-content-secondary text-sm">Avg Session</span>
                    </div>
                    <p className="text-content-primary mt-2 text-2xl font-bold">
                      {selectedAccount.sessionMetrics.avgSessionDuration} min
                    </p>
                    <p className="text-content-secondary mt-1 text-sm">
                      {selectedAccount.sessionMetrics.totalSessions} total sessions
                    </p>
                  </div>

                  <div className="card-sf p-4">
                    <div className="flex items-center gap-2">
                      <MousePointer className="text-content-tertiary h-4 w-4" />
                      <span className="text-content-secondary text-sm">Actions/Session</span>
                    </div>
                    <p className="text-content-primary mt-2 text-2xl font-bold">
                      {selectedAccount.sessionMetrics.avgActionsPerSession}
                    </p>
                  </div>
                </div>

                {/* Feature Adoption */}
                <div className="card-sf p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-content-primary font-semibold">Feature Adoption</h3>
                    <span
                      className={cn(
                        "text-lg font-bold",
                        getScoreColor(selectedAccount.featureAdoption.adoptionRate)
                      )}
                    >
                      {selectedAccount.featureAdoption.adoptionRate}%
                    </span>
                  </div>

                  <div className="bg-bg-tertiary mb-4 flex h-3 overflow-hidden rounded-full">
                    <div
                      className={getScoreBgColor(selectedAccount.featureAdoption.adoptionRate)}
                      style={{ width: `${selectedAccount.featureAdoption.adoptionRate}%` }}
                    />
                  </div>

                  <p className="text-content-secondary mb-4 text-sm">
                    Using {selectedAccount.featureAdoption.totalFeaturesUsed} of{" "}
                    {selectedAccount.featureAdoption.totalFeaturesAvailable} available features
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Top Features */}
                    <div>
                      <h4 className="text-success-700 dark:text-success-400 mb-2 flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Top Used Features
                      </h4>
                      <div className="space-y-2">
                        {selectedAccount.featureAdoption.topFeatures.slice(0, 4).map((f, i) => (
                          <div
                            key={i}
                            className="bg-success-50 dark:bg-success-950/30 flex items-center justify-between rounded-lg px-3 py-2"
                          >
                            <span className="text-success-800 dark:text-success-300 text-sm">
                              {f.feature}
                            </span>
                            <span className="text-success-600 dark:text-success-400 text-xs">
                              {f.usageCount} uses
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Unused Features */}
                    <div>
                      <h4 className="text-content-secondary mb-2 flex items-center gap-2 text-sm font-medium">
                        <XCircle className="h-4 w-4" />
                        Unused Features
                      </h4>
                      <div className="space-y-2">
                        {selectedAccount.featureAdoption.unusedFeatures.slice(0, 4).map((f, i) => (
                          <div
                            key={i}
                            className="bg-bg-tertiary text-content-secondary rounded-lg px-3 py-2 text-sm"
                          >
                            {f}
                          </div>
                        ))}
                        {selectedAccount.featureAdoption.unusedFeatures.length === 0 && (
                          <p className="text-content-secondary text-sm">All features adopted!</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk & Recommendations */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedAccount.riskIndicators.length > 0 && (
                    <div className="border-error-200 bg-error-50 dark:border-error-900/50 dark:bg-error-950/30 rounded-xl border p-4">
                      <h3 className="text-error-700 dark:text-error-400 mb-3 flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4" />
                        Risk Indicators
                      </h3>
                      <ul className="space-y-2">
                        {selectedAccount.riskIndicators.map((risk, i) => (
                          <li
                            key={i}
                            className="text-error-700 dark:text-error-300 flex items-center gap-2 text-sm"
                          >
                            <span className="bg-error-500 h-1.5 w-1.5 rounded-full" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedAccount.recommendations.length > 0 && (
                    <div className="border-accent-200 bg-accent-50 dark:border-accent-900/50 dark:bg-accent-950/30 rounded-xl border p-4">
                      <h3 className="text-accent-700 dark:text-accent-400 mb-3 flex items-center gap-2 font-semibold">
                        <Lightbulb className="h-4 w-4" />
                        Recommendations
                      </h3>
                      <ul className="space-y-2">
                        {selectedAccount.recommendations.map((rec, i) => (
                          <li
                            key={i}
                            className="text-accent-700 dark:text-accent-300 flex items-center gap-2 text-sm"
                          >
                            <span className="bg-accent-500 h-1.5 w-1.5 rounded-full" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card-sf flex h-96 items-center justify-center">
                <div className="text-center">
                  <Activity className="text-content-tertiary mx-auto h-12 w-12" />
                  <p className="text-content-secondary mt-4">
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
