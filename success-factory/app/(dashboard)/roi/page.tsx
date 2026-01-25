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
  const sortedCompanies = [...companies].sort((a, b) => b.roi.lifetimeValue - a.roi.lifetimeValue)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-content-primary text-2xl font-bold">ROI & Value Dashboard</h1>
            <p className="text-content-secondary mt-1">
              Customer value metrics for QBR presentations
            </p>
          </div>
          <div className="flex gap-2">
            <button className="border-border-default bg-bg-elevated text-content-primary hover:bg-bg-secondary flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button className="bg-success-600 hover:bg-success-700 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors">
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
                <div className="bg-success-100 dark:bg-success-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <DollarSign className="text-success-600 dark:text-success-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Total ARR</p>
                  <p className="text-content-primary text-xl font-bold">
                    {formatCurrency(summary.projectedAnnualValue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 dark:bg-primary-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <BarChart3 className="text-primary-600 dark:text-primary-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Total LTV</p>
                  <p className="text-content-primary text-xl font-bold">
                    {formatCurrency(summary.totalLTV)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 dark:bg-primary-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Clock className="text-primary-600 dark:text-primary-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Avg Tenure</p>
                  <p className="text-content-primary text-xl font-bold">
                    {summary.avgLifetimeMonths} months
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="bg-warning-100 dark:bg-warning-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <TrendingUp className="text-warning-600 dark:text-warning-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Avg Usage Growth</p>
                  <p className="text-content-primary text-xl font-bold">
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
              <div className="border-border-default border-b p-4">
                <h2 className="text-content-primary font-semibold">Top Customers by LTV</h2>
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
                    {sortedCompanies.map((company) => (
                      <button
                        key={company.companyId}
                        onClick={() => setSelectedCompany(company)}
                        className={cn(
                          "hover:bg-bg-secondary flex w-full items-center justify-between p-4 text-left transition-colors",
                          selectedCompany?.companyId === company.companyId &&
                            "bg-success-50 dark:bg-success-950/30"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-content-primary truncate font-medium">
                            {company.companyName}
                          </p>
                          <p className="text-content-secondary text-sm">
                            {formatCurrency(company.roi.lifetimeValue)} LTV
                          </p>
                        </div>
                        <ChevronRight className="text-content-tertiary h-4 w-4 flex-shrink-0" />
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
                        <h2 className="text-content-primary text-xl font-bold">
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
                      <p className="text-content-secondary mt-1 text-sm">
                        Customer since {formatDate(selectedCompany.customerSince)} (
                        {selectedCompany.monthsAsCustomer} months)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-success-600 dark:text-success-400 text-2xl font-bold">
                        {formatCurrency(selectedCompany.roi.lifetimeValue)}
                      </p>
                      <p className="text-content-secondary text-sm">Lifetime Value</p>
                    </div>
                  </div>
                </div>

                {/* Value Metrics */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="card-sf p-4">
                    <p className="text-content-secondary text-sm">Monthly Revenue</p>
                    <p className="text-content-primary text-2xl font-bold">
                      {formatCurrency(selectedCompany.mrr || 0)}
                    </p>
                  </div>
                  <div className="card-sf p-4">
                    <p className="text-content-secondary text-sm">Total Trips</p>
                    <p className="text-content-primary text-2xl font-bold">
                      {formatNumber(selectedCompany.metrics.totalTrips)}
                    </p>
                  </div>
                  <div className="card-sf p-4">
                    <p className="text-content-secondary text-sm">Trips/Month</p>
                    <p className="text-content-primary text-2xl font-bold">
                      {selectedCompany.metrics.tripsPerMonth}
                    </p>
                  </div>
                </div>

                {/* Before/After Comparison */}
                <div className="card-sf p-6">
                  <h3 className="text-content-primary mb-4 font-semibold">Growth Comparison</h3>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-content-secondary text-sm font-medium">First 3 Months</p>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-content-secondary">Trips</span>
                          <span className="text-content-primary font-medium">
                            {selectedCompany.metrics.earlyPeriod.trips}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-content-secondary">Avg/Month</span>
                          <span className="text-content-primary font-medium">
                            {selectedCompany.metrics.earlyPeriod.avgTripsPerMonth}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-content-secondary text-sm font-medium">Last 3 Months</p>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-content-secondary">Trips</span>
                          <span className="text-content-primary font-medium">
                            {selectedCompany.metrics.recentPeriod.trips}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-content-secondary">Avg/Month</span>
                          <span className="text-content-primary font-medium">
                            {selectedCompany.metrics.recentPeriod.avgTripsPerMonth}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-border-default mt-4 flex items-center gap-4 border-t pt-4">
                    <div className="flex items-center gap-2">
                      {selectedCompany.metrics.tripGrowth >= 0 ? (
                        <TrendingUp className="text-success-500 h-5 w-5" />
                      ) : (
                        <TrendingDown className="text-error-500 h-5 w-5" />
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
                      <span className="text-content-secondary text-sm">usage growth</span>
                    </div>
                  </div>
                </div>

                {/* Feature Adoption */}
                <div className="card-sf p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-content-primary font-semibold">Feature Adoption</h3>
                    <div className="flex items-center gap-2">
                      <Target className="text-success-500 h-4 w-4" />
                      <span className="text-success-600 dark:text-success-400 font-bold">
                        {selectedCompany.metrics.adoptionScore}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-bg-secondary mb-4 h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-success-500 h-full rounded-full transition-all"
                      style={{
                        width: `${selectedCompany.metrics.adoptionScore}%`,
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCompany.metrics.featuresUsed.map((feature) => (
                      <span
                        key={feature}
                        className="bg-bg-secondary text-content-primary rounded-full px-3 py-1 text-sm"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* QBR Insights */}
                <div className="border-success-200 bg-success-50 dark:border-success-900/50 dark:bg-success-950/30 rounded-xl border p-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-success-600 dark:text-success-400 h-5 w-5" />
                    <h3 className="text-success-800 dark:text-success-200 font-semibold">
                      QBR Talking Points
                    </h3>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {selectedCompany.metrics.tripGrowth > 0 && (
                      <li className="text-success-700 dark:text-success-300 text-sm">
                        Usage has grown {selectedCompany.metrics.tripGrowth}% since onboarding -
                        showing strong platform adoption
                      </li>
                    )}
                    {selectedCompany.metrics.adoptionScore >= 70 && (
                      <li className="text-success-700 dark:text-success-300 text-sm">
                        High feature adoption ({selectedCompany.metrics.adoptionScore}
                        %) indicates strong product fit
                      </li>
                    )}
                    {selectedCompany.monthsAsCustomer >= 12 && (
                      <li className="text-success-700 dark:text-success-300 text-sm">
                        {selectedCompany.monthsAsCustomer} months tenure demonstrates long-term
                        partnership value
                      </li>
                    )}
                    <li className="text-success-700 dark:text-success-300 text-sm">
                      {formatCurrency(selectedCompany.roi.projectedAnnualValue)} projected annual
                      value
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="card-sf flex h-96 items-center justify-center">
                <div className="text-center">
                  <Users className="text-content-tertiary mx-auto h-12 w-12" />
                  <p className="text-content-secondary mt-4">
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
