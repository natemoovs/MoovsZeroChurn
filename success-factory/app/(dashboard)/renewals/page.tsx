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
  CalendarCheck,
  MessageSquare,
  Gift,
  Phone,
  Mail,
  Sparkles,
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

type ViewMode = "list" | "calendar"

// Calculate renewal likelihood based on health score
function getRenewalLikelihood(health: string): number {
  switch (health) {
    case "green":
      return 0.95
    case "yellow":
      return 0.7
    case "red":
      return 0.3
    default:
      return 0.5
  }
}

// Get recommended actions based on health and days until renewal
function getRecommendedActions(
  renewal: Renewal
): { icon: React.ElementType; label: string; priority: "high" | "medium" | "low" }[] {
  const actions: { icon: React.ElementType; label: string; priority: "high" | "medium" | "low" }[] =
    []

  if (renewal.healthScore === "red") {
    actions.push({ icon: Phone, label: "Schedule urgent call", priority: "high" })
    actions.push({ icon: Gift, label: "Prepare rescue offer", priority: "high" })
  } else if (renewal.healthScore === "yellow") {
    actions.push({ icon: MessageSquare, label: "Send check-in email", priority: "medium" })
    actions.push({ icon: CalendarCheck, label: "Schedule QBR", priority: "medium" })
  }

  if (renewal.daysUntilRenewal <= 14) {
    actions.push({ icon: Mail, label: "Send renewal contract", priority: "high" })
  } else if (renewal.daysUntilRenewal <= 30) {
    actions.push({ icon: MessageSquare, label: "Renewal discussion", priority: "medium" })
  }

  if (renewal.riskSignals.some((s) => s.includes("Inactive") || s.includes("No trips"))) {
    actions.push({ icon: Sparkles, label: "Re-engagement campaign", priority: "high" })
  }

  return actions.slice(0, 3) // Return top 3 actions
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
  const [viewMode, setViewMode] = useState<ViewMode>("list")

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/integrations/renewals?days=${timeRange}`)
        const result = await res.json()
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [timeRange])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-content-primary text-2xl font-bold">Renewals</h1>
            <p className="text-content-secondary mt-1">Track upcoming contract renewals</p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            {/* View Mode Toggle */}
            <div className="border-border-default bg-bg-secondary flex gap-1 rounded-lg border p-1">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  viewMode === "list"
                    ? "bg-bg-elevated text-content-primary shadow-sm"
                    : "text-content-secondary hover:text-content-primary"
                )}
              >
                List
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  viewMode === "calendar"
                    ? "bg-bg-elevated text-content-primary shadow-sm"
                    : "text-content-secondary hover:text-content-primary"
                )}
              >
                Calendar
              </button>
            </div>

            {/* Time Range Filter */}
            <div className="border-border-default bg-bg-secondary flex gap-1 rounded-lg border p-1">
              {[30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeRange(days as 30 | 60 | 90)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                    timeRange === days
                      ? "bg-bg-elevated text-content-primary shadow-sm"
                      : "text-content-secondary hover:text-content-primary"
                  )}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <RenewalsSkeleton />
        ) : !data?.configured ? (
          <div className="card-sf p-12 text-center">
            <Calendar className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
            <h3 className="text-content-primary text-lg font-medium">Data sync not configured</h3>
            <p className="text-content-secondary mt-1">Run data sync to track renewals</p>
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

            {/* Renewals View */}
            {data.renewals.length === 0 ? (
              <div className="card-sf p-12 text-center">
                <Calendar className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
                <h3 className="text-content-primary text-lg font-medium">
                  No renewals in the next {timeRange} days
                </h3>
                <p className="text-content-secondary mt-1">
                  Check back later or extend the time range
                </p>
              </div>
            ) : viewMode === "calendar" ? (
              <RenewalCalendar renewals={data.renewals} />
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
    <div className="card-sf p-4">
      <div className="flex items-center justify-between">
        <span className="text-content-secondary text-sm">{label}</span>
        <Icon
          className={cn(
            "h-5 w-5",
            variant === "success" && "text-success-500",
            variant === "danger" && "text-error-500",
            variant === "default" && "text-content-tertiary"
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold",
          variant === "success" && "text-success-600 dark:text-success-500",
          variant === "danger" && "text-error-600 dark:text-error-400",
          variant === "default" && "text-content-primary"
        )}
      >
        {value}
      </p>
      {subtext && <p className="text-content-secondary mt-1 text-sm">{subtext}</p>}
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
    urgent: "border-error-200 bg-error-50/50 dark:border-error-900 dark:bg-error-950/20",
    upcoming: "border-warning-200 bg-warning-50/50 dark:border-warning-900 dark:bg-warning-950/20",
    future: "border-border-default bg-bg-secondary/50 dark:bg-bg-tertiary/50",
  }

  const headerColors = {
    urgent: "text-error-700 dark:text-error-400",
    upcoming: "text-warning-700 dark:text-warning-400",
    future: "text-content-primary",
  }

  return (
    <div className={cn("rounded-xl border p-5", colors[variant])}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className={cn("font-semibold", headerColors[variant])}>{title}</h2>
          <p className="text-content-secondary text-sm">{subtitle}</p>
        </div>
        <span className="bg-bg-elevated text-content-primary rounded-full px-3 py-1 text-sm font-medium shadow-sm">
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
      className="border-border-default bg-bg-elevated hover:border-border-muted flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-content-primary text-2xl font-bold">{renewal.daysUntilRenewal}</p>
          <p className="text-content-secondary text-xs">days</p>
        </div>
        <div className="bg-border-default h-10 w-px" />
        <div>
          <div className="flex items-center gap-2">
            <p className="text-content-primary font-medium">{renewal.companyName}</p>
            <HealthBadge score={renewal.healthScore} size="sm" />
          </div>
          <p className="text-content-secondary text-sm">
            {formatDate(renewal.renewalDate)}
            {renewal.amount && ` · $${renewal.amount.toLocaleString()}`}
          </p>
          {renewal.riskSignals.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <AlertTriangle className="text-error-500 h-3 w-3" />
              <span className="text-error-600 dark:text-error-400 text-xs">
                {renewal.riskSignals.slice(0, 2).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
      <ChevronRight className="text-content-tertiary h-5 w-5" />
    </Link>
  )
}

function ForecastSection({ renewals, timeRange }: { renewals: Renewal[]; timeRange: number }) {
  const forecast = calculateForecast(renewals)

  return (
    <div className="card-sf p-5">
      <div className="mb-4">
        <h2 className="text-content-primary font-semibold">Revenue Forecast ({timeRange} days)</h2>
        <p className="text-content-secondary text-sm">
          Projected renewal outcomes based on health scores
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Expected Revenue */}
        <div className="border-border-default bg-bg-secondary dark:bg-bg-tertiary/50 rounded-lg border p-4">
          <p className="text-content-secondary text-sm">Expected Revenue</p>
          <p className="text-content-primary mt-1 text-2xl font-bold">
            ${forecast.expectedRevenue.toLocaleString()}
          </p>
          <p className="text-content-tertiary text-xs">If all renewals close</p>
        </div>

        {/* Likely Revenue */}
        <div className="border-success-200 bg-success-50/50 dark:border-success-900 dark:bg-success-950/20 rounded-lg border p-4">
          <p className="text-success-700 dark:text-success-400 text-sm">Likely Revenue</p>
          <p className="text-success-600 dark:text-success-500 mt-1 text-2xl font-bold">
            ${forecast.likelyRevenue.toLocaleString()}
          </p>
          <p className="text-success-600/70 dark:text-success-500/70 text-xs">
            Based on health scores
          </p>
        </div>

        {/* At Risk Revenue */}
        <div className="border-error-200 bg-error-50/50 dark:border-error-900 dark:bg-error-950/20 rounded-lg border p-4">
          <p className="text-error-700 dark:text-error-400 text-sm">At Risk</p>
          <p className="text-error-600 dark:text-error-400 mt-1 text-2xl font-bold">
            ${forecast.atRiskRevenue.toLocaleString()}
          </p>
          <p className="text-error-600/70 dark:text-error-500/70 text-xs">Yellow/Red accounts</p>
        </div>

        {/* Retention Rate */}
        <div className="border-border-default bg-bg-secondary dark:bg-bg-tertiary/50 rounded-lg border p-4">
          <p className="text-content-secondary text-sm">Est. Retention</p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              forecast.retentionRate >= 90
                ? "text-success-600 dark:text-success-500"
                : forecast.retentionRate >= 70
                  ? "text-warning-600 dark:text-warning-400"
                  : "text-error-600 dark:text-error-400"
            )}
          >
            {forecast.retentionRate.toFixed(1)}%
          </p>
          <p className="text-content-tertiary text-xs">Weighted by health</p>
        </div>
      </div>

      {/* Forecast Bar Visualization */}
      <div className="mt-4">
        <div className="bg-bg-tertiary flex h-4 overflow-hidden rounded-full">
          <div
            className="bg-success-500 transition-all"
            style={{ width: `${(forecast.likelyRevenue / forecast.expectedRevenue) * 100}%` }}
          />
          <div
            className="bg-error-400 transition-all"
            style={{ width: `${(forecast.atRiskRevenue / forecast.expectedRevenue) * 100}%` }}
          />
        </div>
        <div className="text-content-secondary mt-2 flex justify-between text-xs">
          <span className="flex items-center gap-1">
            <span className="bg-success-500 h-2 w-2 rounded-full" />
            Likely to renew
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-error-400 h-2 w-2 rounded-full" />
            At risk
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-content-tertiary h-2 w-2 rounded-full" />
            Unknown
          </span>
        </div>
      </div>
    </div>
  )
}

function RenewalCalendar({ renewals }: { renewals: Renewal[] }) {
  // Group renewals by week
  const now = new Date()
  const weeks: { start: Date; end: Date; renewals: Renewal[] }[] = []

  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000)
    weekStart.setHours(0, 0, 0, 0)
    const dayOfWeek = weekStart.getDay()
    weekStart.setDate(weekStart.getDate() - dayOfWeek) // Start of week (Sunday)

    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
    weekEnd.setHours(23, 59, 59, 999)

    const weekRenewals = renewals.filter((r) => {
      const renewalDate = new Date(r.renewalDate)
      return renewalDate >= weekStart && renewalDate <= weekEnd
    })

    if (weekRenewals.length > 0 || i < 8) {
      weeks.push({ start: weekStart, end: weekEnd, renewals: weekRenewals })
    }
  }

  // Remove duplicate weeks
  const uniqueWeeks = weeks.filter(
    (week, idx, arr) => arr.findIndex((w) => w.start.getTime() === week.start.getTime()) === idx
  )

  const formatWeek = (start: Date, end: Date) => {
    const startMonth = start.toLocaleDateString("en-US", { month: "short" })
    const endMonth = end.toLocaleDateString("en-US", { month: "short" })
    const startDay = start.getDate()
    const endDay = end.getDate()

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
  }

  const getWeekHealth = (weekRenewals: Renewal[]): string => {
    if (weekRenewals.length === 0) return "empty"
    const hasRed = weekRenewals.some((r) => r.healthScore === "red")
    const hasYellow = weekRenewals.some((r) => r.healthScore === "yellow")
    if (hasRed) return "red"
    if (hasYellow) return "yellow"
    return "green"
  }

  const weekHealthColors: Record<string, string> = {
    empty: "border-border-default",
    green: "border-success-300 bg-success-50/50 dark:border-success-800 dark:bg-success-950/20",
    yellow: "border-warning-300 bg-warning-50/50 dark:border-warning-800 dark:bg-warning-950/20",
    red: "border-error-300 bg-error-50/50 dark:border-error-800 dark:bg-error-950/20",
  }

  return (
    <div className="space-y-4">
      <div className="card-sf p-4">
        <h3 className="text-content-primary mb-4 font-semibold">Renewal Calendar</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {uniqueWeeks.slice(0, 8).map((week, idx) => {
            const health = getWeekHealth(week.renewals)
            const totalValue = week.renewals.reduce((sum, r) => sum + (r.amount || r.mrr || 0), 0)

            return (
              <div
                key={idx}
                className={cn("rounded-lg border p-3 transition-all", weekHealthColors[health])}
              >
                <p className="text-content-secondary text-xs font-medium">
                  {formatWeek(week.start, week.end)}
                </p>
                <div className="mt-2">
                  {week.renewals.length === 0 ? (
                    <p className="text-content-tertiary text-sm">No renewals</p>
                  ) : (
                    <>
                      <p className="text-content-primary text-lg font-bold">
                        {week.renewals.length} {week.renewals.length === 1 ? "renewal" : "renewals"}
                      </p>
                      <p className="text-content-secondary text-sm">
                        ${totalValue.toLocaleString()}
                      </p>
                      <div className="mt-2 flex gap-1">
                        {week.renewals.slice(0, 3).map((r, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-2 w-2 rounded-full",
                              r.healthScore === "green" && "bg-success-500",
                              r.healthScore === "yellow" && "bg-warning-500",
                              r.healthScore === "red" && "bg-error-500",
                              r.healthScore === "unknown" && "bg-content-tertiary"
                            )}
                            title={r.companyName}
                          />
                        ))}
                        {week.renewals.length > 3 && (
                          <span className="text-content-tertiary text-xs">
                            +{week.renewals.length - 3}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detailed List with Actions */}
      <div className="card-sf">
        <div className="border-border-default border-b p-4">
          <h3 className="text-content-primary font-semibold">Renewals with Recommended Actions</h3>
        </div>
        <div className="divide-border-default divide-y">
          {renewals.map((renewal) => {
            const actions = getRecommendedActions(renewal)
            return (
              <div key={`${renewal.companyId}-${renewal.dealId}`} className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-1 h-3 w-3 flex-shrink-0 rounded-full",
                        renewal.healthScore === "green" && "bg-success-500",
                        renewal.healthScore === "yellow" && "bg-warning-500",
                        renewal.healthScore === "red" && "bg-error-500",
                        renewal.healthScore === "unknown" && "bg-content-tertiary"
                      )}
                    />
                    <div>
                      <Link
                        href={`/accounts/${renewal.companyId}`}
                        className="text-content-primary hover:text-success-600 dark:hover:text-success-400 font-medium"
                      >
                        {renewal.companyName}
                      </Link>
                      <p className="text-content-secondary text-sm">
                        {new Date(renewal.renewalDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        ({renewal.daysUntilRenewal} days)
                        {renewal.amount && <> · ${renewal.amount.toLocaleString()}</>}
                      </p>
                      {renewal.riskSignals.length > 0 && (
                        <div className="mt-1 flex items-center gap-1">
                          <AlertTriangle className="text-error-500 h-3 w-3" />
                          <span className="text-error-600 dark:text-error-400 text-xs">
                            {renewal.riskSignals.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {actions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {actions.map((action, idx) => (
                        <span
                          key={idx}
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                            action.priority === "high" &&
                              "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
                            action.priority === "medium" &&
                              "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
                            action.priority === "low" && "bg-bg-tertiary text-content-secondary"
                          )}
                        >
                          <action.icon className="h-3 w-3" />
                          {action.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
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
          <div key={i} className="shimmer h-24 rounded-xl" />
        ))}
      </div>
      <div className="shimmer h-64 rounded-xl" />
    </div>
  )
}
