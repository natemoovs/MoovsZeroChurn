"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { HealthBadge } from "@/components/health-badge"
import {
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  ChevronRight,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Renewal {
  companyId: string
  companyName: string
  dealId: string
  dealName: string
  renewalDate: string
  daysUntilRenewal: number
  amount: number | null
  healthScore: "green" | "yellow" | "red" | "unknown"
  riskSignals: string[]
  mrr: number | null
  stage: string | null
}

interface RenewalsData {
  renewals: Renewal[]
  grouped: {
    next30Days: Renewal[]
    next60Days: Renewal[]
    next90Days: Renewal[]
  }
  stats: {
    total: number
    totalAmount: number
    atRiskCount: number
    atRiskAmount: number
    byHealth: {
      green: number
      yellow: number
      red: number
    }
  }
  configured: boolean
}

// Calculate renewal likelihood based on health score
function getRenewalLikelihood(health: string): number {
  switch (health) {
    case "green": return 0.95
    case "yellow": return 0.70
    case "red": return 0.30
    default: return 0.50
  }
}

// Calculate forecasted revenue
function calculateForecast(renewals: Renewal[]) {
  let expectedRevenue = 0
  let atRiskRevenue = 0
  let likelyRevenue = 0

  for (const r of renewals) {
    const amount = r.amount || r.mrr || 0
    const likelihood = getRenewalLikelihood(r.healthScore)

    expectedRevenue += amount
    likelyRevenue += amount * likelihood

    if (r.healthScore === "red" || r.healthScore === "yellow") {
      atRiskRevenue += amount * (1 - likelihood)
    }
  }

  return {
    expectedRevenue,
    likelyRevenue,
    atRiskRevenue,
    retentionRate: expectedRevenue > 0 ? (likelyRevenue / expectedRevenue) * 100 : 100,
  }
}

export default function RenewalsPage() {
  const [data, setData] = useState<RenewalsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(90)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/integrations/renewals?days=${timeRange}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [timeRange])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Renewals
            </h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Track upcoming contract renewals
            </p>
          </div>

          {/* Time Range Filter */}
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
            {[30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days as 30 | 60 | 90)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  timeRange === days
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                )}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <RenewalsSkeleton />
        ) : !data?.configured ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              HubSpot not configured
            </h3>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Connect HubSpot to track renewals
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Upcoming Renewals"
                value={data.stats.total.toString()}
                icon={CalendarDays}
                variant="default"
              />
              <StatCard
                label="Total Value"
                value={`$${data.stats.totalAmount.toLocaleString()}`}
                icon={DollarSign}
                variant="default"
              />
              <StatCard
                label="At Risk"
                value={data.stats.atRiskCount.toString()}
                subtext={`$${data.stats.atRiskAmount.toLocaleString()}`}
                icon={AlertTriangle}
                variant="danger"
              />
              <StatCard
                label="Healthy"
                value={data.stats.byHealth.green.toString()}
                subtext="Ready to renew"
                icon={Clock}
                variant="success"
              />
            </div>

            {/* Revenue Forecast */}
            {data.renewals.length > 0 && (
              <ForecastSection renewals={data.renewals} timeRange={timeRange} />
            )}

            {/* Renewals by Time Window */}
            {data.renewals.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  No renewals in the next {timeRange} days
                </h3>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                  Check back later or extend the time range
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Next 30 Days */}
                {data.grouped.next30Days.length > 0 && (
                  <RenewalSection
                    title="Next 30 Days"
                    subtitle="Immediate attention needed"
                    renewals={data.grouped.next30Days}
                    variant="urgent"
                  />
                )}

                {/* 30-60 Days */}
                {data.grouped.next60Days.length > 0 && (
                  <RenewalSection
                    title="30-60 Days"
                    subtitle="Start preparing"
                    renewals={data.grouped.next60Days}
                    variant="upcoming"
                  />
                )}

                {/* 60-90 Days */}
                {data.grouped.next90Days.length > 0 && (
                  <RenewalSection
                    title="60-90 Days"
                    subtitle="On the horizon"
                    renewals={data.grouped.next90Days}
                    variant="future"
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = "default",
}: {
  label: string
  value: string
  subtext?: string
  icon: React.ElementType
  variant?: "default" | "success" | "danger"
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
        <Icon
          className={cn(
            "h-5 w-5",
            variant === "success" && "text-emerald-500",
            variant === "danger" && "text-red-500",
            variant === "default" && "text-zinc-400"
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold",
          variant === "success" && "text-emerald-600 dark:text-emerald-400",
          variant === "danger" && "text-red-600 dark:text-red-400",
          variant === "default" && "text-zinc-900 dark:text-zinc-100"
        )}
      >
        {value}
      </p>
      {subtext && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtext}</p>
      )}
    </div>
  )
}

function RenewalSection({
  title,
  subtitle,
  renewals,
  variant,
}: {
  title: string
  subtitle: string
  renewals: Renewal[]
  variant: "urgent" | "upcoming" | "future"
}) {
  const colors = {
    urgent: "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
    upcoming: "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
    future: "border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-800/50",
  }

  const headerColors = {
    urgent: "text-red-700 dark:text-red-400",
    upcoming: "text-amber-700 dark:text-amber-400",
    future: "text-zinc-700 dark:text-zinc-300",
  }

  return (
    <div className={cn("rounded-xl border p-5", colors[variant])}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className={cn("font-semibold", headerColors[variant])}>{title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100">
          {renewals.length} {renewals.length === 1 ? "renewal" : "renewals"}
        </span>
      </div>

      <div className="space-y-2">
        {renewals.map((renewal) => (
          <RenewalCard key={`${renewal.companyId}-${renewal.dealId}`} renewal={renewal} />
        ))}
      </div>
    </div>
  )
}

function RenewalCard({ renewal }: { renewal: Renewal }) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Link
      href={`/accounts/${renewal.companyId}`}
      className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {renewal.daysUntilRenewal}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">days</p>
        </div>
        <div className="h-10 w-px bg-zinc-200 dark:bg-zinc-700" />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {renewal.companyName}
            </p>
            <HealthBadge score={renewal.healthScore} size="sm" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatDate(renewal.renewalDate)}
            {renewal.amount && ` · $${renewal.amount.toLocaleString()}`}
          </p>
          {renewal.riskSignals.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span className="text-xs text-red-600 dark:text-red-400">
                {renewal.riskSignals.slice(0, 2).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
    </Link>
  )
}

function ForecastSection({ renewals, timeRange }: { renewals: Renewal[]; timeRange: number }) {
  const forecast = calculateForecast(renewals)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Revenue Forecast ({timeRange} days)
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Projected renewal outcomes based on health scores
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Expected Revenue */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Expected Revenue</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            ${forecast.expectedRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">If all renewals close</p>
        </div>

        {/* Likely Revenue */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">Likely Revenue</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ${forecast.likelyRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">Based on health scores</p>
        </div>

        {/* At Risk Revenue */}
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
          <p className="text-sm text-red-700 dark:text-red-400">At Risk</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            ${forecast.atRiskRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-red-600/70 dark:text-red-500/70">Yellow/Red accounts</p>
        </div>

        {/* Retention Rate */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Est. Retention</p>
          <p className={cn(
            "mt-1 text-2xl font-bold",
            forecast.retentionRate >= 90 ? "text-emerald-600 dark:text-emerald-400" :
            forecast.retentionRate >= 70 ? "text-amber-600 dark:text-amber-400" :
            "text-red-600 dark:text-red-400"
          )}>
            {forecast.retentionRate.toFixed(1)}%
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Weighted by health</p>
        </div>
      </div>

      {/* Forecast Bar Visualization */}
      <div className="mt-4">
        <div className="flex h-4 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${(forecast.likelyRevenue / forecast.expectedRevenue) * 100}%` }}
          />
          <div
            className="bg-red-400 transition-all"
            style={{ width: `${(forecast.atRiskRevenue / forecast.expectedRevenue) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Likely to renew
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            At risk
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            Unknown
          </span>
        </div>
      </div>
    </div>
  )
}

function RenewalsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}
