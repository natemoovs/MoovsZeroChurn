"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  DollarSign,
  Activity,
  Clock,
  ChevronRight,
  BarChart2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SegmentBenchmark {
  segment: string
  accountCount: number
  metrics: {
    avgMrr: number
    avgTripsPerMonth: number
    avgDaysSinceLogin: number
    healthDistribution: { green: number; yellow: number; red: number }
    avgTenureMonths: number
    npsAvg: number | null
  }
}

interface CompanyBenchmark {
  companyId: string
  companyName: string
  segment: string
  metrics: {
    mrr: number
    tripsPerMonth: number
    daysSinceLogin: number
    healthScore: string
    tenureMonths: number
    npsScore: number | null
  }
  comparison: {
    mrrVsSegment: number
    usageVsSegment: number
    activityVsSegment: number
    tenureVsSegment: number
    npsVsSegment: number | null
  }
  percentiles: {
    mrr: number
    usage: number
    activity: number
    tenure: number
  }
  overallScore: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

function getComparisonIcon(value: number) {
  if (value > 10) return <TrendingUp className="h-4 w-4 text-emerald-500" />
  if (value < -10) return <TrendingDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-zinc-400" />
}

function getPercentileLabel(percentile: number): string {
  if (percentile >= 90) return "Top 10%"
  if (percentile >= 75) return "Top 25%"
  if (percentile >= 50) return "Above Average"
  if (percentile >= 25) return "Below Average"
  return "Bottom 25%"
}

function getPercentileColor(percentile: number): string {
  if (percentile >= 75) return "bg-emerald-500"
  if (percentile >= 50) return "bg-emerald-400"
  if (percentile >= 25) return "bg-amber-400"
  return "bg-red-400"
}

export default function BenchmarksPage() {
  const [segments, setSegments] = useState<SegmentBenchmark[]>([])
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [companyBenchmark, setCompanyBenchmark] = useState<CompanyBenchmark | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ companyId: string; companyName: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBenchmarks()
  }, [])

  async function fetchBenchmarks() {
    try {
      const res = await fetch("/api/benchmarks")
      const data = await res.json()
      setSegments(data.segments || [])
    } catch (error) {
      console.error("Failed to fetch benchmarks:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCompanyBenchmark(companyId: string) {
    try {
      const res = await fetch(`/api/benchmarks?companyId=${companyId}`)
      const data = await res.json()
      setCompanyBenchmark(data.company)
      setSelectedSegment(data.company.segment)
    } catch (error) {
      console.error("Failed to fetch company benchmark:", error)
    }
  }

  async function searchCompanies(query: string) {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const res = await fetch(`/api/integrations/portfolio?segment=all`)
      const data = await res.json()
      const filtered = (data.summaries || [])
        .filter((c: { companyName: string }) =>
          c.companyName.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5)
        .map((c: { companyId: string; companyName: string }) => ({
          companyId: c.companyId,
          companyName: c.companyName,
        }))
      setSearchResults(filtered)
    } catch (error) {
      console.error("Failed to search companies:", error)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Health Benchmarks
              </h1>
            </div>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Compare accounts against segment averages
            </p>
          </div>

          {/* Company Search */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search company to compare..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                searchCompanies(e.target.value)
              }}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-4 pr-4 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {searchResults.map((result) => (
                  <button
                    key={result.companyId}
                    onClick={() => {
                      fetchCompanyBenchmark(result.companyId)
                      setSearchQuery("")
                      setSearchResults([])
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    {result.companyName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Segment Overview */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
              />
            ))
          ) : (
            segments.slice(0, 4).map((segment) => (
              <button
                key={segment.segment}
                onClick={() => setSelectedSegment(segment.segment)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all",
                  selectedSegment === segment.segment
                    ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-zinc-600 dark:text-zinc-400">
                    {segment.segment.replace("_", " ")}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {segment.accountCount}
                  </span>
                </div>
                <p className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(segment.metrics.avgMrr)}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  avg MRR
                </p>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="bg-emerald-500"
                    style={{
                      width: `${(segment.metrics.healthDistribution.green / segment.accountCount) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-amber-500"
                    style={{
                      width: `${(segment.metrics.healthDistribution.yellow / segment.accountCount) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-red-500"
                    style={{
                      width: `${(segment.metrics.healthDistribution.red / segment.accountCount) * 100}%`,
                    }}
                  />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Selected Segment Detail */}
        {selectedSegment && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-100">
              {selectedSegment.replace("_", " ")} Segment Benchmarks
            </h2>
            {(() => {
              const segment = segments.find((s) => s.segment === selectedSegment)
              if (!segment) return null

              return (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        Average MRR
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(segment.metrics.avgMrr)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        Avg Trips/Month
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {segment.metrics.avgTripsPerMonth}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        Avg Days Since Login
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {segment.metrics.avgDaysSinceLogin}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        Avg Tenure
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {segment.metrics.avgTenureMonths} months
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Company Comparison */}
        {companyBenchmark && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <Link
                  href={`/accounts/${companyBenchmark.companyId}`}
                  className="text-xl font-bold text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400"
                >
                  {companyBenchmark.companyName}
                </Link>
                <p className="text-sm capitalize text-zinc-500 dark:text-zinc-400">
                  {companyBenchmark.segment.replace("_", " ")} segment
                </p>
              </div>
              <div className="text-right">
                <div
                  className={cn(
                    "text-3xl font-bold",
                    getScoreColor(companyBenchmark.overallScore)
                  )}
                >
                  {companyBenchmark.overallScore}
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Overall Score
                </p>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* MRR */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">MRR</span>
                  {getComparisonIcon(companyBenchmark.comparison.mrrVsSegment)}
                </div>
                <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(companyBenchmark.metrics.mrr)}
                </p>
                <p className={cn(
                  "text-sm font-medium",
                  companyBenchmark.comparison.mrrVsSegment >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {companyBenchmark.comparison.mrrVsSegment >= 0 ? "+" : ""}
                  {companyBenchmark.comparison.mrrVsSegment}% vs segment
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={getPercentileColor(companyBenchmark.percentiles.mrr)}
                      style={{ width: `${companyBenchmark.percentiles.mrr}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {getPercentileLabel(companyBenchmark.percentiles.mrr)}
                  </span>
                </div>
              </div>

              {/* Usage */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Usage</span>
                  {getComparisonIcon(companyBenchmark.comparison.usageVsSegment)}
                </div>
                <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {companyBenchmark.metrics.tripsPerMonth}/mo
                </p>
                <p className={cn(
                  "text-sm font-medium",
                  companyBenchmark.comparison.usageVsSegment >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {companyBenchmark.comparison.usageVsSegment >= 0 ? "+" : ""}
                  {companyBenchmark.comparison.usageVsSegment}% vs segment
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={getPercentileColor(companyBenchmark.percentiles.usage)}
                      style={{ width: `${companyBenchmark.percentiles.usage}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {getPercentileLabel(companyBenchmark.percentiles.usage)}
                  </span>
                </div>
              </div>

              {/* Activity */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Activity</span>
                  {getComparisonIcon(companyBenchmark.comparison.activityVsSegment)}
                </div>
                <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {companyBenchmark.metrics.daysSinceLogin}d ago
                </p>
                <p className={cn(
                  "text-sm font-medium",
                  companyBenchmark.comparison.activityVsSegment >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {companyBenchmark.comparison.activityVsSegment >= 0 ? "+" : ""}
                  {companyBenchmark.comparison.activityVsSegment}% more active
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={getPercentileColor(companyBenchmark.percentiles.activity)}
                      style={{ width: `${companyBenchmark.percentiles.activity}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {getPercentileLabel(companyBenchmark.percentiles.activity)}
                  </span>
                </div>
              </div>

              {/* Tenure */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Tenure</span>
                  {getComparisonIcon(companyBenchmark.comparison.tenureVsSegment)}
                </div>
                <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {companyBenchmark.metrics.tenureMonths} months
                </p>
                <p className={cn(
                  "text-sm font-medium",
                  companyBenchmark.comparison.tenureVsSegment >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {companyBenchmark.comparison.tenureVsSegment >= 0 ? "+" : ""}
                  {companyBenchmark.comparison.tenureVsSegment}% vs segment
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={getPercentileColor(companyBenchmark.percentiles.tenure)}
                      style={{ width: `${companyBenchmark.percentiles.tenure}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {getPercentileLabel(companyBenchmark.percentiles.tenure)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Segment Comparison Table */}
        {!loading && segments.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Segment
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Accounts
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Avg MRR
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Usage/Mo
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Days Since Login
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Avg Tenure
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Health
                  </th>
                </tr>
              </thead>
              <tbody>
                {segments.map((segment, idx) => (
                  <tr
                    key={segment.segment}
                    className={cn(
                      "border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/50",
                      idx === segments.length - 1 && "border-b-0"
                    )}
                  >
                    <td className="px-4 py-3 font-medium capitalize text-zinc-900 dark:text-zinc-100">
                      {segment.segment.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {segment.accountCount}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(segment.metrics.avgMrr)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {segment.metrics.avgTripsPerMonth}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {segment.metrics.avgDaysSinceLogin}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {segment.metrics.avgTenureMonths} mo
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex h-2 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="bg-emerald-500"
                          style={{
                            width: `${(segment.metrics.healthDistribution.green / segment.accountCount) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-amber-500"
                          style={{
                            width: `${(segment.metrics.healthDistribution.yellow / segment.accountCount) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-red-500"
                          style={{
                            width: `${(segment.metrics.healthDistribution.red / segment.accountCount) * 100}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
