"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { StatCard } from "@/components/stat-card"
import { HealthChart } from "@/components/health-chart"
import { AccountCard, AccountCardSkeleton } from "@/components/account-card"
import { QuickAction } from "@/components/quick-action"
import {
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  CalendarClock,
  MessageSquare,
  FileText,
} from "lucide-react"

interface PortfolioData {
  summaries: Array<{
    companyId: string
    companyName: string
    domain: string | null
    healthScore: "green" | "yellow" | "red" | "unknown"
    mrr: number | null
    plan: string | null
    riskSignals: string[]
    positiveSignals: string[]
  }>
  total: number
  configured: { hubspot: boolean; stripe: boolean }
}

export default function DashboardPage() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/integrations/portfolio?segment=all")
      .then((res) => res.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const green = data?.summaries.filter((s) => s.healthScore === "green").length || 0
  const yellow = data?.summaries.filter((s) => s.healthScore === "yellow").length || 0
  const red = data?.summaries.filter((s) => s.healthScore === "red").length || 0
  const totalAccounts = data?.total || 0
  const totalMrr = data?.summaries.reduce((sum, s) => sum + (s.mrr || 0), 0) || 0
  const atRiskMrr = data?.summaries
    .filter((s) => s.healthScore === "red")
    .reduce((sum, s) => sum + (s.mrr || 0), 0) || 0

  const atRiskAccounts = data?.summaries.filter((s) => s.healthScore === "red") || []
  const monitorAccounts = data?.summaries.filter((s) => s.healthScore === "yellow") || []

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Your portfolio health at a glance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Accounts"
            value={totalAccounts}
            icon={Users}
            variant="default"
          />
          <StatCard
            title="Monthly Revenue"
            value={`$${totalMrr.toLocaleString()}`}
            subtitle="MRR"
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="At Risk"
            value={red}
            subtitle={`$${atRiskMrr.toLocaleString()} MRR at risk`}
            icon={AlertTriangle}
            variant="danger"
          />
          <StatCard
            title="Healthy"
            value={`${totalAccounts > 0 ? Math.round((green / totalAccounts) * 100) : 0}%`}
            subtitle={`${green} accounts`}
            icon={TrendingUp}
            variant="success"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Portfolio Health Chart */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Portfolio Health
            </h2>
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : (
              <HealthChart green={green} yellow={yellow} red={red} />
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Quick Actions
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <QuickAction
                href="/accounts?filter=at-risk"
                icon={AlertTriangle}
                label="At-Risk Accounts"
                description="Needs immediate attention"
                badge={red}
                badgeVariant="danger"
              />
              <QuickAction
                href="/skills/portfolio-health"
                icon={FileText}
                label="Portfolio Review"
                description="Generate full report"
              />
              <QuickAction
                href="/skills/customer-health"
                icon={MessageSquare}
                label="Prep for Call"
                description="Get customer briefing"
              />
              <QuickAction
                href="/skills"
                icon={Sparkles}
                label="All Skills"
                description="Browse available tools"
              />
            </div>
          </div>
        </div>

        {/* Accounts Needing Attention */}
        {(atRiskAccounts.length > 0 || loading) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Accounts Needing Attention
              </h2>
              {atRiskAccounts.length > 3 && (
                <a
                  href="/accounts?filter=at-risk"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  View all {atRiskAccounts.length} →
                </a>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <>
                  <AccountCardSkeleton />
                  <AccountCardSkeleton />
                  <AccountCardSkeleton />
                </>
              ) : (
                atRiskAccounts.slice(0, 3).map((account) => (
                  <AccountCard
                    key={account.companyId}
                    id={account.companyId}
                    name={account.companyName}
                    domain={account.domain}
                    healthScore={account.healthScore}
                    mrr={account.mrr}
                    plan={account.plan}
                    riskSignals={account.riskSignals}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Monitor Accounts */}
        {(monitorAccounts.length > 0 || loading) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Monitor List
              </h2>
              {monitorAccounts.length > 5 && (
                <a
                  href="/accounts?filter=monitor"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  View all {monitorAccounts.length} →
                </a>
              )}
            </div>
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
                    />
                  ))}
                </div>
              ) : (
                monitorAccounts.slice(0, 5).map((account) => (
                  <AccountCard
                    key={account.companyId}
                    id={account.companyId}
                    name={account.companyName}
                    healthScore={account.healthScore}
                    mrr={account.mrr}
                    plan={account.plan}
                    riskSignals={account.riskSignals}
                    variant="compact"
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
