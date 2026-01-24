"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  BarChart3,
  Share2,
  Download,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CompanyROI {
  companyId: string
  companyName: string
  domain: string | null
  segment: string | null
  plan: string | null
  mrr: number | null
  customerSince: string
  monthsAsCustomer: number
  healthScore: string | null
  metrics: {
    totalTrips: number
    tripsPerMonth: number
    tripsGrowthPercent: number
    totalRevenue: number
    adoptionScore: number
    featuresUsed: string[]
    earlyPeriod: {
      trips: number
      avgTripsPerMonth: number
    }
    recentPeriod: {
      trips: number
      avgTripsPerMonth: number
    }
    tripGrowth: number
    revenueGrowth: number
  }
  roi: {
    lifetimeValue: number
    monthlyValue: number
    projectedAnnualValue: number
  }
}

interface PortfolioSummary {
  totalCompanies: number
  totalMrr: number
  totalLTV: number
  avgLifetimeMonths: number
  avgTripGrowth: number
  projectedAnnualValue: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

const healthColors: Record<string, string> = {
  green: "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
  yellow: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
  red: "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
}

export default function ROIPage() {
  const [companies, setCompanies] = useState<CompanyROI[]>([])
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState<CompanyROI | null>(null)

  useEffect(() => {
    fetch("/api/roi")
      .then((res) => res.json())
      .then((data) => {
        setCompanies(data.companies || [])
        setSummary(data.summary || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Sort by LTV
  const sortedCompanies = [...companies].sort(
    (a, b) => b.roi.lifetimeValue - a.roi.lifetimeValue
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-content-primary">
              ROI & Value Dashboard
            </h1>
            <p className="mt-1 text-content-secondary">
              Customer value metrics for QBR presentations
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-elevated px-4 py-2 text-sm font-medium text-content-primary transition-colors hover:bg-bg-secondary">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success-700">
              <Share2 className="h-4 w-4" />
              Share Report
            </button>
          </div>
        </div>

        {/* Portfolio Summary */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-900/30">
                  <DollarSign className="h-5 w-5 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <p className="text-sm text-content-secondary">
                    Total ARR
                  </p>
                  <p className="text-xl font-bold text-content-primary">
                    {formatCurrency(summary.projectedAnnualValue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
                  <BarChart3 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-content-secondary">
                    Total LTV
                  </p>
                  <p className="text-xl font-bold text-content-primary">
                    {formatCurrency(summary.totalLTV)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-content-secondary">
                    Avg Tenure
                  </p>
                  <p className="text-xl font-bold text-content-primary">
                    {summary.avgLifetimeMonths} months
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100 dark:bg-warning-900/30">
                  <TrendingUp className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                </div>
                <div>
                  <p className="text-sm text-content-secondary">
                    Avg Usage Growth
                  </p>
                  <p className="text-xl font-bold text-content-primary">
                    +{summary.avgTripGrowth}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two column layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Company List */}
          <div className="lg:col-span-1">
            <div className="card-sf">
              <div className="border-b border-border-default p-4">
                <h2 className="font-semibold text-content-primary">
                  Top Customers by LTV
                </h2>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="space-y-2 p-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="shimmer h-16 rounded-lg"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-border-default">
                    {sortedCompanies.map((company) => (
                      <button
                        key={company.companyId}
                        onClick={() => setSelectedCompany(company)}
                        className={cn(
                          "flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-bg-secondary",
                          selectedCompany?.companyId === company.companyId &&
                            "bg-success-50 dark:bg-success-950/30"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-content-primary">
                            {company.companyName}
                          </p>
                          <p className="text-sm text-content-secondary">
                            {formatCurrency(company.roi.lifetimeValue)} LTV
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-content-tertiary" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Company Detail / QBR View */}
          <div className="lg:col-span-2">
            {selectedCompany ? (
              <div className="space-y-4">
                {/* Company Header */}
                <div className="card-sf p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-content-primary">
                          {selectedCompany.companyName}
                        </h2>
                        {selectedCompany.healthScore && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              healthColors[selectedCompany.healthScore]
                            )}
                          >
                            {selectedCompany.healthScore === "green"
                              ? "Healthy"
                              : selectedCompany.healthScore === "yellow"
                              ? "Monitor"
                              : "At Risk"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-content-secondary">
                        Customer since {formatDate(selectedCompany.customerSince)}{" "}
                        ({selectedCompany.monthsAsCustomer} months)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                        {formatCurrency(selectedCompany.roi.lifetimeValue)}
                      </p>
                      <p className="text-sm text-content-secondary">
                        Lifetime Value
                      </p>
                    </div>
                  </div>
                </div>

                {/* Value Metrics */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="card-sf p-4">
                    <p className="text-sm text-content-secondary">
                      Monthly Revenue
                    </p>
                    <p className="text-2xl font-bold text-content-primary">
                      {formatCurrency(selectedCompany.mrr || 0)}
                    </p>
                  </div>
                  <div className="card-sf p-4">
                    <p className="text-sm text-content-secondary">
                      Total Trips
                    </p>
                    <p className="text-2xl font-bold text-content-primary">
                      {formatNumber(selectedCompany.metrics.totalTrips)}
                    </p>
                  </div>
                  <div className="card-sf p-4">
                    <p className="text-sm text-content-secondary">
                      Trips/Month
                    </p>
                    <p className="text-2xl font-bold text-content-primary">
                      {selectedCompany.metrics.tripsPerMonth}
                    </p>
                  </div>
                </div>

                {/* Before/After Comparison */}
                <div className="card-sf p-6">
                  <h3 className="mb-4 font-semibold text-content-primary">
                    Growth Comparison
                  </h3>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-content-secondary">
                        First 3 Months
                      </p>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-content-secondary">
                            Trips
                          </span>
                          <span className="font-medium text-content-primary">
                            {selectedCompany.metrics.earlyPeriod.trips}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-content-secondary">
                            Avg/Month
                          </span>
                          <span className="font-medium text-content-primary">
                            {selectedCompany.metrics.earlyPeriod.avgTripsPerMonth}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-content-secondary">
                        Last 3 Months
                      </p>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-content-secondary">
                            Trips
                          </span>
                          <span className="font-medium text-content-primary">
                            {selectedCompany.metrics.recentPeriod.trips}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-content-secondary">
                            Avg/Month
                          </span>
                          <span className="font-medium text-content-primary">
                            {selectedCompany.metrics.recentPeriod.avgTripsPerMonth}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 border-t border-border-default pt-4">
                    <div className="flex items-center gap-2">
                      {selectedCompany.metrics.tripGrowth >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-success-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-error-500" />
                      )}
                      <span
                        className={cn(
                          "text-lg font-bold",
                          selectedCompany.metrics.tripGrowth >= 0
                            ? "text-success-600 dark:text-success-400"
                            : "text-error-600 dark:text-error-400"
                        )}
                      >
                        {selectedCompany.metrics.tripGrowth >= 0 ? "+" : ""}
                        {selectedCompany.metrics.tripGrowth}%
                      </span>
                      <span className="text-sm text-content-secondary">
                        usage growth
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feature Adoption */}
                <div className="card-sf p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-content-primary">
                      Feature Adoption
                    </h3>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-success-500" />
                      <span className="font-bold text-success-600 dark:text-success-400">
                        {selectedCompany.metrics.adoptionScore}%
                      </span>
                    </div>
                  </div>
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-bg-secondary">
                    <div
                      className="h-full rounded-full bg-success-500 transition-all"
                      style={{
                        width: `${selectedCompany.metrics.adoptionScore}%`,
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCompany.metrics.featuresUsed.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-full bg-bg-secondary px-3 py-1 text-sm text-content-primary"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* QBR Insights */}
                <div className="rounded-xl border border-success-200 bg-success-50 p-6 dark:border-success-900/50 dark:bg-success-950/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-success-600 dark:text-success-400" />
                    <h3 className="font-semibold text-success-800 dark:text-success-200">
                      QBR Talking Points
                    </h3>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {selectedCompany.metrics.tripGrowth > 0 && (
                      <li className="text-sm text-success-700 dark:text-success-300">
                        Usage has grown {selectedCompany.metrics.tripGrowth}%
                        since onboarding - showing strong platform adoption
                      </li>
                    )}
                    {selectedCompany.metrics.adoptionScore >= 70 && (
                      <li className="text-sm text-success-700 dark:text-success-300">
                        High feature adoption ({selectedCompany.metrics.adoptionScore}
                        %) indicates strong product fit
                      </li>
                    )}
                    {selectedCompany.monthsAsCustomer >= 12 && (
                      <li className="text-sm text-success-700 dark:text-success-300">
                        {selectedCompany.monthsAsCustomer} months tenure
                        demonstrates long-term partnership value
                      </li>
                    )}
                    <li className="text-sm text-success-700 dark:text-success-300">
                      {formatCurrency(selectedCompany.roi.projectedAnnualValue)}{" "}
                      projected annual value
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="card-sf flex h-96 items-center justify-center">
                <div className="text-center">
                  <Users className="mx-auto h-12 w-12 text-content-tertiary" />
                  <p className="mt-4 text-content-secondary">
                    Select a customer to view their value report
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
