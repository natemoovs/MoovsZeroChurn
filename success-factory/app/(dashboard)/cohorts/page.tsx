"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { CohortSurvivalChart } from "@/components/cohort-survival-chart"
import {
  BarChart3,
  Users,
  DollarSign,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Calendar,
  ChevronDown,
  ChevronUp,
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
type SortField = "cohort" | "companies" | "retention" | "mrr"
type SortDir = "asc" | "desc"

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
  if (rate >= 90) return "bg-success-500"
  if (rate >= 80) return "bg-success-600"
  if (rate >= 70) return "bg-warning-500"
  if (rate >= 60) return "bg-warning-600"
  return "bg-error-500"
}

function getRetentionTextColor(rate: number): string {
  if (rate >= 90) return "text-success-600 dark:text-success-500"
  if (rate >= 80) return "text-success-600 dark:text-success-500"
  if (rate >= 70) return "text-warning-600 dark:text-warning-500"
  if (rate >= 60) return "text-warning-600 dark:text-warning-500"
  return "text-error-600 dark:text-error-500"
}

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<CohortData[]>([])
  const [summary, setSummary] = useState<CohortSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("monthly")
  const [metricView, setMetricView] = useState<MetricView>("retention")
  const [sortField, setSortField] = useState<SortField>("cohort")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

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

  // Sort cohorts based on current sort settings
  const sortedCohorts = [...cohorts].sort((a, b) => {
    const mult = sortDir === "asc" ? 1 : -1
    switch (sortField) {
      case "cohort":
        return mult * a.cohort.localeCompare(b.cohort)
      case "companies":
        return mult * (a.totalCompanies - b.totalCompanies)
      case "retention":
        return mult * (a.retentionRate - b.retentionRate)
      case "mrr":
        return mult * (a.totalMrr - b.totalMrr)
      default:
        return 0
    }
  })

  // Find best and worst performing cohorts
  const sortedByRetention = [...cohorts].sort(
    (a, b) => b.retentionRate - a.retentionRate
  )
  const bestCohort = sortedByRetention[0]
  const worstCohort = sortedByRetention[sortedByRetention.length - 1]

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 inline h-3 w-3" />
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-content-primary">
              Cohort Analysis
            </h1>
            <p className="mt-1 text-content-secondary">
              Analyze retention patterns by signup period
            </p>
          </div>
          <button
            onClick={syncCohorts}
            disabled={syncing}
            className="btn-primary flex items-center gap-2"
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
          <div className="card-sf p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-content-secondary">
                  Total Cohorts
                </p>
                <p className="text-xl font-bold text-content-primary">
                  {summary?.totalCohorts || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card-sf p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-50">
                <Users className="h-5 w-5 text-primary-600 dark:text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-content-secondary">
                  Total Companies
                </p>
                <p className="text-xl font-bold text-content-primary">
                  {summary?.totalCompanies || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card-sf p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-50">
                <TrendingUp className="h-5 w-5 text-success-600 dark:text-success-500" />
              </div>
              <div>
                <p className="text-sm text-content-secondary">
                  Overall Retention
                </p>
                <p className="text-xl font-bold text-content-primary">
                  {formatPercent(summary?.overallRetention || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="card-sf p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100 dark:bg-warning-50">
                <DollarSign className="h-5 w-5 text-warning-600 dark:text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-content-secondary">
                  Avg MRR/Cohort
                </p>
                <p className="text-xl font-bold text-content-primary">
                  {formatCurrency(summary?.avgMrrPerCohort || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Best/Worst Cohorts */}
        {cohorts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-success-300 bg-success-50 p-4 dark:border-success-700 dark:bg-success-50/10 glow-success">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success-600 dark:text-success-500" />
                <span className="font-medium text-success-700 dark:text-success-500">
                  Best Performing Cohort
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-success-700 dark:text-success-500">
                {bestCohort?.cohort}
              </p>
              <p className="text-sm text-success-600 dark:text-success-500">
                {formatPercent(bestCohort?.retentionRate || 0)} retention •{" "}
                {bestCohort?.activeCompanies} active companies
              </p>
            </div>

            <div className="rounded-xl border border-error-300 bg-error-50 p-4 dark:border-error-700 dark:bg-error-50/10 glow-error">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-error-600 dark:text-error-500" />
                <span className="font-medium text-error-700 dark:text-error-500">
                  Needs Attention
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-error-700 dark:text-error-500">
                {worstCohort?.cohort}
              </p>
              <p className="text-sm text-error-600 dark:text-error-500">
                {formatPercent(worstCohort?.retentionRate || 0)} retention •{" "}
                {worstCohort?.churnedCompanies} churned
              </p>
            </div>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg border border-border-default bg-bg-secondary p-1">
            <button
              onClick={() => setViewMode("monthly")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === "monthly"
                  ? "bg-bg-elevated text-content-primary shadow-sm"
                  : "text-content-secondary hover:text-content-primary"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode("quarterly")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === "quarterly"
                  ? "bg-bg-elevated text-content-primary shadow-sm"
                  : "text-content-secondary hover:text-content-primary"
              )}
            >
              Quarterly
            </button>
          </div>

          <div className="flex gap-1 rounded-lg border border-border-default bg-bg-secondary p-1">
            <button
              onClick={() => setMetricView("retention")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                metricView === "retention"
                  ? "bg-bg-elevated text-content-primary shadow-sm"
                  : "text-content-secondary hover:text-content-primary"
              )}
            >
              Retention
            </button>
            <button
              onClick={() => setMetricView("mrr")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                metricView === "mrr"
                  ? "bg-bg-elevated text-content-primary shadow-sm"
                  : "text-content-secondary hover:text-content-primary"
              )}
            >
              MRR
            </button>
            <button
              onClick={() => setMetricView("companies")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                metricView === "companies"
                  ? "bg-bg-elevated text-content-primary shadow-sm"
                  : "text-content-secondary hover:text-content-primary"
              )}
            >
              Companies
            </button>
          </div>
        </div>

        {/* Survival Curves Chart */}
        {!loading && cohorts.length > 0 && (
          <CohortSurvivalChart cohorts={cohorts} />
        )}

        {/* Cohort Table/Chart */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 shimmer rounded-xl"
              />
            ))}
          </div>
        ) : cohorts.length === 0 ? (
          <div className="card-sf p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-tertiary">
              <BarChart3 className="h-6 w-6 text-content-tertiary" />
            </div>
            <h3 className="text-lg font-medium text-content-primary">
              No cohort data
            </h3>
            <p className="mt-1 text-content-tertiary">
              Click &quot;Sync Data&quot; to generate cohort analysis
            </p>
          </div>
        ) : (
          <div className="overflow-hidden card-sf">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border-default bg-bg-secondary">
                    <th
                      onClick={() => toggleSort("cohort")}
                      className="cursor-pointer px-4 py-3 text-left text-sm font-medium text-content-tertiary hover:text-content-primary"
                    >
                      Cohort
                      <SortIcon field="cohort" />
                    </th>
                    <th
                      onClick={() => toggleSort("companies")}
                      className="cursor-pointer px-4 py-3 text-right text-sm font-medium text-content-tertiary hover:text-content-primary"
                    >
                      Companies
                      <SortIcon field="companies" />
                    </th>
                    <th className="hidden px-4 py-3 text-right text-sm font-medium text-content-tertiary sm:table-cell">
                      Active
                    </th>
                    <th className="hidden px-4 py-3 text-right text-sm font-medium text-content-tertiary sm:table-cell">
                      Churned
                    </th>
                    <th
                      onClick={() => toggleSort("retention")}
                      className="cursor-pointer px-4 py-3 text-right text-sm font-medium text-content-tertiary hover:text-content-primary"
                    >
                      Retention
                      <SortIcon field="retention" />
                    </th>
                    <th
                      onClick={() => toggleSort("mrr")}
                      className="cursor-pointer px-4 py-3 text-right text-sm font-medium text-content-tertiary hover:text-content-primary"
                    >
                      Total MRR
                      <SortIcon field="mrr" />
                    </th>
                    <th className="hidden px-4 py-3 text-left text-sm font-medium text-content-tertiary lg:table-cell">
                      Retention
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {sortedCohorts.map((cohort) => (
                    <tr
                      key={cohort.cohort}
                      className="transition-colors hover:bg-surface-hover"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-content-primary">
                        {cohort.cohort}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-content-secondary">
                        {cohort.totalCompanies}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-right text-success-600 dark:text-success-500 sm:table-cell">
                        {cohort.activeCompanies}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-right text-error-600 dark:text-error-400 sm:table-cell">
                        {cohort.churnedCompanies}
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap px-4 py-3 text-right font-semibold",
                          getRetentionTextColor(cohort.retentionRate)
                        )}
                      >
                        {formatPercent(cohort.retentionRate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-content-primary">
                        {formatCurrency(cohort.totalMrr)}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-28 overflow-hidden rounded-full bg-bg-tertiary">
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
                          <span className="text-xs text-content-tertiary">
                            {formatPercent(cohort.retentionRate)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Segment Breakdown */}
        {cohorts.length > 0 && Object.keys(cohorts[0]?.segments || {}).length > 0 && (
          <div className="card-sf p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-content-primary">
                  Segment Distribution by Cohort
                </h3>
                <p className="text-sm text-content-secondary">
                  Customer segments within each cohort
                </p>
              </div>
              {/* Legend - shown at top on mobile */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {cohorts[0] &&
                  Object.keys(cohorts[0].segments).map((segment, idx) => {
                    const colors = [
                      "bg-info-500",
                      "bg-primary-500",
                      "bg-success-500",
                      "bg-warning-500",
                      "bg-error-500",
                    ]
                    return (
                      <div key={segment} className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            colors[idx % colors.length]
                          )}
                        />
                        <span className="text-xs text-content-secondary sm:text-sm">
                          {segment || "Unknown"}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
            <div className="space-y-3">
              {sortedCohorts.slice(0, 6).map((cohort) => (
                <div key={cohort.cohort} className="group">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-content-primary">
                      {cohort.cohort}
                    </span>
                    <span className="text-xs text-content-tertiary sm:text-sm">
                      {cohort.totalCompanies} companies
                    </span>
                  </div>
                  <div className="flex h-5 overflow-hidden rounded-lg bg-bg-tertiary sm:h-6">
                    {Object.entries(cohort.segments).map(
                      ([segment, count], idx) => {
                        const percent =
                          cohort.totalCompanies > 0
                            ? (count / cohort.totalCompanies) * 100
                            : 0
                        const colors = [
                          "bg-info-500 hover:bg-info-600",
                          "bg-primary-500 hover:bg-primary-600",
                          "bg-success-500 hover:bg-success-600",
                          "bg-warning-500 hover:bg-warning-600",
                          "bg-error-500 hover:bg-error-600",
                        ]
                        return (
                          <div
                            key={segment}
                            className={cn(
                              "relative flex items-center justify-center transition-all",
                              colors[idx % colors.length],
                              percent >= 15 && "group/seg"
                            )}
                            style={{ width: `${Math.max(percent, 1)}%` }}
                            title={`${segment || "Unknown"}: ${count} (${Math.round(percent)}%)`}
                          >
                            {percent >= 15 && (
                              <span className="hidden text-[10px] font-medium text-white sm:block">
                                {Math.round(percent)}%
                              </span>
                            )}
                          </div>
                        )
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
