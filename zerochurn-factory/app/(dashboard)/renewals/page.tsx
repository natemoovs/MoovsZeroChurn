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
