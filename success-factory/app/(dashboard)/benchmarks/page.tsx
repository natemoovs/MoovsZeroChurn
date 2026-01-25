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
  if (score >= 70) return "text-success-600 dark:text-success-400"
  if (score >= 40) return "text-warning-600 dark:text-warning-400"
  return "text-error-600 dark:text-error-400"
}

function getComparisonIcon(value: number) {
  if (value > 10) return <TrendingUp className="text-success-500 h-4 w-4" />
  if (value < -10) return <TrendingDown className="text-error-500 h-4 w-4" />
  return <Minus className="text-content-tertiary h-4 w-4" />
}

function getPercentileLabel(percentile: number): string {
  if (percentile >= 90) return "Top 10%"
  if (percentile >= 75) return "Top 25%"
  if (percentile >= 50) return "Above Average"
  if (percentile >= 25) return "Below Average"
  return "Bottom 25%"
}

function getPercentileColor(percentile: number): string {
  if (percentile >= 75) return "bg-success-500"
  if (percentile >= 50) return "bg-success-400"
  if (percentile >= 25) return "bg-warning-400"
  return "bg-error-400"
}

export default function BenchmarksPage() {
  const [segments, setSegments] = useState<SegmentBenchmark[]>([])
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [companyBenchmark, setCompanyBenchmark] = useState<CompanyBenchmark | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ companyId: string; companyName: string }[]>(
    []
  )
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
      const res = await fetch(`/api/integrations/hubspot/companies?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      const results = (data.companies || []).slice(0, 5).map((c: { id: string; name: string }) => ({
        companyId: c.id,
        companyName: c.name,
      }))
      setSearchResults(results)
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
              <Scale className="text-primary-600 dark:text-primary-400 h-6 w-6" />
              <h1 className="text-content-primary text-2xl font-bold">Health Benchmarks</h1>
            </div>
            <p className="text-content-secondary mt-1">Compare accounts against segment averages</p>
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
              className="border-border-default bg-bg-elevated placeholder:text-content-tertiary focus:border-primary-500 focus:ring-primary-500/20 h-10 w-full rounded-lg border pr-4 pl-4 text-sm transition-colors outline-none focus:ring-2"
            />
            {searchResults.length > 0 && (
              <div className="border-border-default bg-bg-elevated absolute top-full z-10 mt-1 w-full rounded-lg border shadow-lg">
                {searchResults.map((result) => (
                  <button
                    key={result.companyId}
                    onClick={() => {
                      fetchCompanyBenchmark(result.companyId)
                      setSearchQuery("")
                      setSearchResults([])
                    }}
                    className="hover:bg-bg-secondary flex w-full items-center gap-2 px-4 py-2 text-left text-sm"
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
          {loading
            ? [1, 2, 3, 4].map((i) => <div key={i} className="shimmer h-32 rounded-xl" />)
            : segments.slice(0, 4).map((segment) => (
                <button
                  key={segment.segment}
                  onClick={() => setSelectedSegment(segment.segment)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    selectedSegment === segment.segment
                      ? "border-primary-500 bg-primary-50 dark:border-primary-500 dark:bg-primary-950/30"
                      : "border-border-default bg-bg-elevated hover:border-border-hover"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-content-secondary text-sm font-medium capitalize">
                      {segment.segment.replace("_", " ")}
                    </span>
                    <span className="bg-bg-secondary text-content-secondary rounded-full px-2 py-0.5 text-xs font-medium">
                      {segment.accountCount}
                    </span>
                  </div>
                  <p className="text-content-primary mt-2 text-xl font-bold">
                    {formatCurrency(segment.metrics.avgMrr)}
                  </p>
                  <p className="text-content-secondary text-xs">avg MRR</p>
                  <div className="bg-bg-secondary mt-2 flex h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-success-500"
                      style={{
                        width: `${(segment.metrics.healthDistribution.green / segment.accountCount) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-warning-500"
                      style={{
                        width: `${(segment.metrics.healthDistribution.yellow / segment.accountCount) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-error-500"
                      style={{
                        width: `${(segment.metrics.healthDistribution.red / segment.accountCount) * 100}%`,
                      }}
                    />
                  </div>
                </button>
              ))}
        </div>

        {/* Selected Segment Detail */}
        {selectedSegment && (
          <div className="card-sf p-6">
            <h2 className="text-content-primary mb-4 text-lg font-semibold capitalize">
              {selectedSegment.replace("_", " ")} Segment Benchmarks
            </h2>
            {(() => {
              const segment = segments.find((s) => s.segment === selectedSegment)
              if (!segment) return null

              return (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="text-content-tertiary h-4 w-4" />
                      <span className="text-content-secondary text-sm">Average MRR</span>
                    </div>
                    <p className="text-content-primary mt-1 text-2xl font-bold">
                      {formatCurrency(segment.metrics.avgMrr)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="text-content-tertiary h-4 w-4" />
                      <span className="text-content-secondary text-sm">Avg Trips/Month</span>
                    </div>
                    <p className="text-content-primary mt-1 text-2xl font-bold">
                      {segment.metrics.avgTripsPerMonth}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="text-content-tertiary h-4 w-4" />
                      <span className="text-content-secondary text-sm">Avg Days Since Login</span>
                    </div>
                    <p className="text-content-primary mt-1 text-2xl font-bold">
                      {segment.metrics.avgDaysSinceLogin}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="text-content-tertiary h-4 w-4" />
                      <span className="text-content-secondary text-sm">Avg Tenure</span>
                    </div>
                    <p className="text-content-primary mt-1 text-2xl font-bold">
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
          <div className="border-primary-200 bg-primary-50 dark:border-primary-900/50 dark:bg-primary-950/30 rounded-xl border p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <Link
                  href={`/accounts/${companyBenchmark.companyId}`}
                  className="text-content-primary hover:text-primary-600 dark:hover:text-primary-400 text-xl font-bold"
                >
                  {companyBenchmark.companyName}
                </Link>
                <p className="text-content-secondary text-sm capitalize">
                  {companyBenchmark.segment.replace("_", " ")} segment
                </p>
              </div>
              <div className="text-right">
                <div
                  className={cn("text-3xl font-bold", getScoreColor(companyBenchmark.overallScore))}
                >
                  {companyBenchmark.overallScore}
                </div>
                <p className="text-content-secondary text-sm">Overall Score</p>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* MRR */}
              <div className="border-border-default bg-bg-elevated rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-content-secondary text-sm">MRR</span>
                  {getComparisonIcon(companyBenchmark.comparison.mrrVsSegment)}
                </div>
                <p className="text-content-primary mt-1 text-xl font-bold">
                  {formatCurrency(companyBenchmark.metrics.mrr)}
                </p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    companyBenchmark.comparison.mrrVsSegment >= 0
                      ? "text-success-600 dark:text-success-400"
                      : "text-error-600 dark:text-error-400"
                  )}
                >
                  {companyBenchmark.comparison.mrrVsSegment >= 0 ? "+" : ""}
                  {companyBenchmark.comparison.mrrVsSegment}% vs segment
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="bg-bg-secondary h-1.5 flex-1 overflow-hidden rounded-full">
                    <div
                      className={getPercentileColor(companyBenchmark.percentiles.mrr)}
                      style={{ width: `${companyBenchmark.percentiles.mrr}%` }}
                    />
                  </div>
                  <span className="text-content-secondary text-xs">
                    {getPercentileLabel(companyBenchmark.percentiles.mrr)}
                  </span>
                </div>
              </div>

              {/* Usage */}
              <div className="border-border-default bg-bg-elevated rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-content-secondary text-sm">Usage</span>
                  {getComparisonIcon(companyBenchmark.comparison.usageVsSegment)}
                </div>
                <p className="text-content-primary mt-1 text-xl font-bold">
                  {companyBenchmark.metrics.tripsPerMonth}/mo
                </p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    companyBenchmark.comparison.usageVsSegment >= 0
                      ? "text-success-600 dark:text-success-400"
                      : "text-error-600 dark:text-error-400"
                  )}
                >
                  {companyBenchmark.comparison.usageVsSegment >= 0 ? "+" : ""}
                  {companyBenchmark.comparison.usageVsSegment}% vs segment
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="bg-bg-secondary h-1.5 flex-1 overflow-hidden rounded-full">
                    <div
                      className={getPercentileColor(companyBenchmark.percentiles.usage)}
                      style={{ width: `${companyBenchmark.percentiles.usage}%` }}
                    />
                  </div>
                  <span className="text-content-secondary text-xs">
                    {getPercentileLabel(companyBenchmark.percentiles.usage)}
                  </span>
                </div>
              </div>

              {/* Activity */}
              <div className="border-border-default bg-bg-elevated rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-content-secondary text-sm">Activity</span>
                  {getComparisonIcon(companyBenchmark.comparison.activityVsSegment)}
                </div>
                <p className="text-content-primary mt-1 text-xl font-bold">
                  {companyBenchmark.metrics.daysSinceLogin}d ago
                </p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    companyBenchmark.comparison.activityVsSegment >= 0
                      ? "text-success-600 dark:text-success-400"
                      : "text-error-600 dark:text-error-400"
                  )}
                >
                  {companyBenchmark.comparison.activityVsSegment >= 0 ? "+" : ""}
                  {companyBenchmark.comparison.activityVsSegment}% more active
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="bg-bg-secondary h-1.5 flex-1 overflow-hidden rounded-full">
                    <div
                      className={getPercentileColor(companyBenchmark.percentiles.activity)}
                      style={{ width: `${companyBenchmark.percentiles.activity}%` }}
                    />
                  </div>
                  <span className="text-content-secondary text-xs">
                    {getPercentileLabel(companyBenchmark.percentiles.activity)}
                  </span>
                </div>
              </div>

              {/* Tenure */}
              <div className="border-border-default bg-bg-elevated rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-content-secondary text-sm">Tenure</span>
                  {getComparisonIcon(companyBenchmark.comparison.tenureVsSegment)}
                </div>
                <p className="text-content-primary mt-1 text-xl font-bold">
                  {companyBenchmark.metrics.tenureMonths} months
                </p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    companyBenchmark.comparison.tenureVsSegment >= 0
                      ? "text-success-600 dark:text-success-400"
                      : "text-error-600 dark:text-error-400"
                  )}
                >
                  {companyBenchmark.comparison.tenureVsSegment >= 0 ? "+" : ""}
                  {companyBenchmark.comparison.tenureVsSegment}% vs segment
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="bg-bg-secondary h-1.5 flex-1 overflow-hidden rounded-full">
                    <div
                      className={getPercentileColor(companyBenchmark.percentiles.tenure)}
                      style={{ width: `${companyBenchmark.percentiles.tenure}%` }}
                    />
                  </div>
                  <span className="text-content-secondary text-xs">
                    {getPercentileLabel(companyBenchmark.percentiles.tenure)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Segment Comparison Table */}
        {!loading && segments.length > 0 && (
          <div className="card-sf overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-border-default border-b">
                  <th className="text-content-secondary px-4 py-3 text-left text-sm font-medium">
                    Segment
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                    Accounts
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                    Avg MRR
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                    Usage/Mo
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                    Days Since Login
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                    Avg Tenure
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-left text-sm font-medium">
                    Health
                  </th>
                </tr>
              </thead>
              <tbody>
                {segments.map((segment, idx) => (
                  <tr
                    key={segment.segment}
                    className={cn(
                      "border-border-default hover:bg-bg-secondary border-b transition-colors",
                      idx === segments.length - 1 && "border-b-0"
                    )}
                  >
                    <td className="text-content-primary px-4 py-3 font-medium capitalize">
                      {segment.segment.replace("_", " ")}
                    </td>
                    <td className="text-content-secondary px-4 py-3 text-right">
                      {segment.accountCount}
                    </td>
                    <td className="text-content-primary px-4 py-3 text-right font-medium">
                      {formatCurrency(segment.metrics.avgMrr)}
                    </td>
                    <td className="text-content-secondary px-4 py-3 text-right">
                      {segment.metrics.avgTripsPerMonth}
                    </td>
                    <td className="text-content-secondary px-4 py-3 text-right">
                      {segment.metrics.avgDaysSinceLogin}
                    </td>
                    <td className="text-content-secondary px-4 py-3 text-right">
                      {segment.metrics.avgTenureMonths} mo
                    </td>
                    <td className="px-4 py-3">
                      <div className="bg-bg-secondary flex h-2 w-24 overflow-hidden rounded-full">
                        <div
                          className="bg-success-500"
                          style={{
                            width: `${(segment.metrics.healthDistribution.green / segment.accountCount) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-warning-500"
                          style={{
                            width: `${(segment.metrics.healthDistribution.yellow / segment.accountCount) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-error-500"
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
