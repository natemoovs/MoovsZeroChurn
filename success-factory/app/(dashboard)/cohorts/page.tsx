"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  BarChart3,
  Users,
  DollarSign,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CohortData {
  cohort: string
  totalCompanies: number
  activeCompanies: number
  churnedCompanies: number
  retentionRate: number
  totalMrr: number
  avgMrr: number
  segments: Record<string, number>
}

interface CohortSummary {
  totalCohorts: number
  totalCompanies: number
  overallRetention: number
  avgMrrPerCohort: number
}

type ViewMode = "monthly" | "quarterly"
type MetricView = "retention" | "mrr" | "companies"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

function getRetentionColor(rate: number): string {
  if (rate >= 90) return "bg-emerald-500"
  if (rate >= 80) return "bg-emerald-400"
  if (rate >= 70) return "bg-amber-400"
  if (rate >= 60) return "bg-amber-500"
  return "bg-red-500"
}

function getRetentionTextColor(rate: number): string {
  if (rate >= 90) return "text-emerald-600 dark:text-emerald-400"
  if (rate >= 80) return "text-emerald-500"
  if (rate >= 70) return "text-amber-600 dark:text-amber-400"
  if (rate >= 60) return "text-amber-500"
  return "text-red-600 dark:text-red-400"
}

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<CohortData[]>([])
  const [summary, setSummary] = useState<CohortSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("monthly")
  const [metricView, setMetricView] = useState<MetricView>("retention")

  useEffect(() => {
    fetchCohorts()
  }, [viewMode])

  async function fetchCohorts() {
    setLoading(true)
    try {
      const res = await fetch(`/api/cohorts?groupBy=${viewMode}`)
      const data = await res.json()
      setCohorts(data.cohorts || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error("Failed to fetch cohorts:", error)
    } finally {
      setLoading(false)
    }
  }

  async function syncCohorts() {
    setSyncing(true)
    try {
      const res = await fetch("/api/cohorts", { method: "POST" })
      const data = await res.json()
      if (data.synced) {
        await fetchCohorts()
      }
    } catch (error) {
      console.error("Failed to sync cohorts:", error)
    } finally {
      setSyncing(false)
    }
  }

  // Find best and worst performing cohorts
  const sortedByRetention = [...cohorts].sort(
    (a, b) => b.retentionRate - a.retentionRate
  )
  const bestCohort = sortedByRetention[0]
  const worstCohort = sortedByRetention[sortedByRetention.length - 1]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Cohort Analysis
            </h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Analyze retention patterns by signup period
            </p>
          </div>
          <button
            onClick={syncCohorts}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncing ? "Syncing..." : "Sync Data"}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Cohorts
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {summary?.totalCohorts || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Companies
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {summary?.totalCompanies || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Overall Retention
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatPercent(summary?.overallRetention || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Avg MRR/Cohort
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(summary?.avgMrrPerCohort || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Best/Worst Cohorts */}
        {cohorts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                  Best Performing Cohort
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                {bestCohort?.cohort}
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {formatPercent(bestCohort?.retentionRate || 0)} retention •{" "}
                {bestCohort?.activeCompanies} active companies
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-700 dark:text-red-300">
                  Needs Attention
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-800 dark:text-red-200">
                {worstCohort?.cohort}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                {formatPercent(worstCohort?.retentionRate || 0)} retention •{" "}
                {worstCohort?.churnedCompanies} churned
              </p>
            </div>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
            <button
              onClick={() => setViewMode("monthly")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === "monthly"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode("quarterly")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === "quarterly"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              Quarterly
            </button>
          </div>

          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
            <button
              onClick={() => setMetricView("retention")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                metricView === "retention"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              Retention
            </button>
            <button
              onClick={() => setMetricView("mrr")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                metricView === "mrr"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              MRR
            </button>
            <button
              onClick={() => setMetricView("companies")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                metricView === "companies"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              Companies
            </button>
          </div>
        </div>

        {/* Cohort Table/Chart */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : cohorts.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <BarChart3 className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              No cohort data
            </h3>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Click &quot;Sync Data&quot; to generate cohort analysis
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Cohort
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Companies
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Active
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Churned
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Retention
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Total MRR
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Visualization
                  </th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((cohort, idx) => (
                  <tr
                    key={cohort.cohort}
                    className={cn(
                      "border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/50",
                      idx === cohorts.length - 1 && "border-b-0"
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {cohort.cohort}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {cohort.totalCompanies}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                      {cohort.activeCompanies}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                      {cohort.churnedCompanies}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-semibold",
                        getRetentionTextColor(cohort.retentionRate)
                      )}
                    >
                      {formatPercent(cohort.retentionRate)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(cohort.totalMrr)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              getRetentionColor(cohort.retentionRate)
                            )}
                            style={{
                              width: `${cohort.retentionRate}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Segment Breakdown */}
        {cohorts.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Segment Distribution by Cohort
            </h3>
            <div className="space-y-4">
              {cohorts.slice(0, 6).map((cohort) => (
                <div key={cohort.cohort}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {cohort.cohort}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {cohort.totalCompanies} companies
                    </span>
                  </div>
                  <div className="flex h-4 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    {Object.entries(cohort.segments).map(
                      ([segment, count], idx) => {
                        const percent =
                          (count / cohort.totalCompanies) * 100
                        const colors = [
                          "bg-blue-500",
                          "bg-purple-500",
                          "bg-emerald-500",
                          "bg-amber-500",
                          "bg-red-500",
                        ]
                        return (
                          <div
                            key={segment}
                            className={cn(
                              "transition-all",
                              colors[idx % colors.length]
                            )}
                            style={{ width: `${percent}%` }}
                            title={`${segment}: ${count}`}
                          />
                        )
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              {cohorts[0] &&
                Object.keys(cohorts[0].segments).map((segment, idx) => {
                  const colors = [
                    "bg-blue-500",
                    "bg-purple-500",
                    "bg-emerald-500",
                    "bg-amber-500",
                    "bg-red-500",
                  ]
                  return (
                    <div key={segment} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full",
                          colors[idx % colors.length]
                        )}
                      />
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {segment || "Unknown"}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
