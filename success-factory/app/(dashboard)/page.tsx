"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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
  CheckSquare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Target,
  ThumbsUp,
  ThumbsDown,
  UserX,
  Activity,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

interface Task {
  id: string
  companyId: string
  companyName: string
  title: string
  priority: string
  status: string
  dueDate: string | null
}

interface Renewal {
  companyId: string
  companyName: string
  renewalDate: string
  daysUntilRenewal: number
  amount: number | null
  healthScore: string
}

interface HealthTrend {
  trend: "improving" | "declining" | "stable" | "unknown"
  recentChanges: Array<{
    companyName: string
    from: string
    to: string
    date: string
  }>
}

interface StalledOnboarding {
  count: number
  critical: number
  mrrAtRisk: number
  accounts: Array<{
    companyId: string
    companyName: string
    overdueMilestones: string[]
    severity: string
    mrr: number
  }>
}

interface NPSTrends {
  currentNPS: number | null
  previousNPS: number | null
  trend: "improving" | "declining" | "stable" | "unknown"
  recentDetractors: number
  totalResponses: number
}

interface ChampionAlerts {
  noChampion: number
  singleThreaded: number
  recentChampionLeft: Array<{
    companyId: string
    companyName: string
    championName: string
    leftAt: string
  }>
}

interface RecentActivity {
  id: string
  companyId: string
  companyName: string
  source: string
  eventType: string
  title: string
  occurredAt: string
  importance: string
}

export default function DashboardPage() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [renewals, setRenewals] = useState<Renewal[]>([])
  const [healthTrend, setHealthTrend] = useState<HealthTrend | null>(null)
  const [stalledOnboardings, setStalledOnboardings] = useState<StalledOnboarding | null>(null)
  const [npsTrends, setNpsTrends] = useState<NPSTrends | null>(null)
  const [championAlerts, setChampionAlerts] = useState<ChampionAlerts | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Single combined API call for faster loading
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((dashboardData) => {
        if (dashboardData.portfolio) setData(dashboardData.portfolio)
        if (dashboardData.tasks?.tasks) setTasks(dashboardData.tasks.tasks)
        if (dashboardData.renewals?.renewals) setRenewals(dashboardData.renewals.renewals)
        if (dashboardData.healthTrend) setHealthTrend(dashboardData.healthTrend)
        if (dashboardData.stalledOnboardings)
          setStalledOnboardings(dashboardData.stalledOnboardings)
        if (dashboardData.npsTrends) setNpsTrends(dashboardData.npsTrends)
        if (dashboardData.championAlerts) setChampionAlerts(dashboardData.championAlerts)
        if (dashboardData.recentActivity) setRecentActivity(dashboardData.recentActivity)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const green = data?.summaries.filter((s) => s.healthScore === "green").length || 0
  const yellow = data?.summaries.filter((s) => s.healthScore === "yellow").length || 0
  const red = data?.summaries.filter((s) => s.healthScore === "red").length || 0
  const totalAccounts = data?.total || 0
  const totalMrr = data?.summaries.reduce((sum, s) => sum + (s.mrr || 0), 0) || 0
  const atRiskMrr =
    data?.summaries
      .filter((s) => s.healthScore === "red")
      .reduce((sum, s) => sum + (s.mrr || 0), 0) || 0

  const atRiskAccounts = data?.summaries.filter((s) => s.healthScore === "red") || []
  const monitorAccounts = data?.summaries.filter((s) => s.healthScore === "yellow") || []

  return (
    <DashboardLayout>
      <div className="max-w-full min-w-0 space-y-8 overflow-hidden">
        {/* Header */}
        <div>
          <h1 className="text-content-primary text-2xl font-bold">Dashboard</h1>
          <p className="text-content-secondary mt-1">Your portfolio health at a glance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Accounts" value={totalAccounts} icon={Users} variant="default" />
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
          <div className="card-sf p-6">
            <h2 className="text-content-primary mb-4 text-lg font-semibold">Portfolio Health</h2>
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="border-primary-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
              </div>
            ) : (
              <HealthChart green={green} yellow={yellow} red={red} />
            )}
          </div>

          {/* Quick Actions */}
          <div className="card-sf p-6 lg:col-span-2">
            <h2 className="text-content-primary mb-4 text-lg font-semibold">Quick Actions</h2>
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

        {/* Second Row: Tasks, Renewals, Trends */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pending Tasks */}
          <div className="card-sf p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-content-primary text-lg font-semibold">Pending Tasks</h2>
              <Link
                href="/tasks"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-500 text-sm"
              >
                View all →
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="shimmer h-12 rounded-lg" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-content-secondary py-8 text-center">
                <CheckSquare className="text-content-tertiary mx-auto mb-2 h-8 w-8" />
                <p>No pending tasks</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((task) => (
                  <Link
                    key={task.id}
                    href={`/accounts/${task.companyId}`}
                    className="border-border-default hover:bg-surface-hover flex items-center justify-between rounded-lg border p-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-content-primary truncate text-sm font-medium">
                        {task.title}
                      </p>
                      <p className="text-content-secondary text-xs">{task.companyName}</p>
                    </div>
                    <span
                      className={cn(
                        "ml-2 rounded-full px-2 py-0.5 text-xs font-medium",
                        task.priority === "urgent" &&
                          "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
                        task.priority === "high" &&
                          "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
                        task.priority === "medium" &&
                          "bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400",
                        task.priority === "low" &&
                          "bg-bg-tertiary text-content-secondary dark:text-content-tertiary"
                      )}
                    >
                      {task.priority}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Renewals */}
          <div className="card-sf p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-content-primary text-lg font-semibold">Renewals (30 days)</h2>
              <Link
                href="/renewals"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-500 text-sm"
              >
                View all →
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="shimmer h-12 rounded-lg" />
                ))}
              </div>
            ) : renewals.length === 0 ? (
              <div className="text-content-secondary py-8 text-center">
                <CalendarClock className="text-content-tertiary mx-auto mb-2 h-8 w-8" />
                <p>No renewals in 30 days</p>
              </div>
            ) : (
              <div className="space-y-2">
                {renewals.slice(0, 5).map((renewal) => (
                  <Link
                    key={renewal.companyId}
                    href={`/accounts/${renewal.companyId}`}
                    className="border-border-default hover:bg-surface-hover flex items-center justify-between rounded-lg border p-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-content-primary truncate text-sm font-medium">
                        {renewal.companyName}
                      </p>
                      <p className="text-content-secondary text-xs">
                        {renewal.daysUntilRenewal} days ·{" "}
                        {renewal.amount ? `$${renewal.amount.toLocaleString()}` : "No amount"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "ml-2 h-2.5 w-2.5 rounded-full",
                        renewal.healthScore === "green" && "bg-success-500",
                        renewal.healthScore === "yellow" && "bg-warning-500",
                        renewal.healthScore === "red" && "bg-error-500",
                        renewal.healthScore === "unknown" && "bg-content-tertiary"
                      )}
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Health Trends */}
          <div className="card-sf p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-content-primary text-lg font-semibold">Health Trends</h2>
              <Link
                href="/history"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-500 text-sm"
              >
                View history →
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="shimmer h-12 rounded-lg" />
                ))}
              </div>
            ) : !healthTrend?.recentChanges?.length ? (
              <div className="text-content-secondary py-8 text-center">
                <TrendingUp className="text-content-tertiary mx-auto mb-2 h-8 w-8" />
                <p>No recent changes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {healthTrend.recentChanges.slice(0, 5).map((change, i) => {
                  const isDowngrade =
                    (change.from === "green" && (change.to === "yellow" || change.to === "red")) ||
                    (change.from === "yellow" && change.to === "red")
                  const isUpgrade =
                    (change.to === "green" &&
                      (change.from === "yellow" || change.from === "red")) ||
                    (change.to === "yellow" && change.from === "red")

                  return (
                    <div
                      key={i}
                      className="border-border-default flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        {isDowngrade ? (
                          <ArrowDownRight className="text-error-500 h-4 w-4" />
                        ) : isUpgrade ? (
                          <ArrowUpRight className="text-success-500 h-4 w-4" />
                        ) : (
                          <Minus className="text-content-tertiary h-4 w-4" />
                        )}
                        <div>
                          <p className="text-content-primary text-sm font-medium">
                            {change.companyName}
                          </p>
                          <p className="text-content-secondary text-xs">
                            {change.from} → {change.to}
                          </p>
                        </div>
                      </div>
                      <span className="text-content-tertiary text-xs">
                        {new Date(change.date).toLocaleDateString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Phase 1: New Insights Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Stalled Onboardings */}
          <div className="card-sf p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-content-primary text-lg font-semibold">Stalled Onboardings</h2>
              {stalledOnboardings && stalledOnboardings.count > 0 && (
                <span className="bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {stalledOnboardings.count} stalled
                </span>
              )}
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="shimmer h-12 rounded-lg" />
                ))}
              </div>
            ) : !stalledOnboardings?.accounts?.length ? (
              <div className="text-content-secondary py-8 text-center">
                <Target className="text-content-tertiary mx-auto mb-2 h-8 w-8" />
                <p>All onboardings on track</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stalledOnboardings.accounts.slice(0, 4).map((account) => (
                  <Link
                    key={account.companyId}
                    href={`/accounts/${account.companyId}`}
                    className="border-border-default hover:bg-surface-hover flex items-center justify-between rounded-lg border p-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-content-primary truncate text-sm font-medium">
                        {account.companyName}
                      </p>
                      <p className="text-content-secondary truncate text-xs">
                        {account.overdueMilestones.length} overdue milestone
                        {account.overdueMilestones.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "ml-2 rounded-full px-2 py-0.5 text-xs font-medium",
                        account.severity === "critical" &&
                          "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
                        account.severity === "high" &&
                          "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
                        account.severity === "medium" &&
                          "bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400"
                      )}
                    >
                      {account.severity}
                    </span>
                  </Link>
                ))}
                {stalledOnboardings.mrrAtRisk > 0 && (
                  <p className="text-content-secondary mt-2 text-center text-xs">
                    ${stalledOnboardings.mrrAtRisk.toLocaleString()} MRR at risk
                  </p>
                )}
              </div>
            )}
          </div>

          {/* NPS Score */}
          <div className="card-sf p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-content-primary text-lg font-semibold">NPS Score</h2>
              {npsTrends?.trend && npsTrends.trend !== "unknown" && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    npsTrends.trend === "improving" && "text-success-600 dark:text-success-400",
                    npsTrends.trend === "declining" && "text-error-600 dark:text-error-400",
                    npsTrends.trend === "stable" && "text-content-secondary"
                  )}
                >
                  {npsTrends.trend === "improving" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : npsTrends.trend === "declining" ? (
                    <ArrowDownRight className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {npsTrends.trend}
                </span>
              )}
            </div>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="border-success-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
              </div>
            ) : !npsTrends || npsTrends.totalResponses === 0 ? (
              <div className="text-content-secondary py-8 text-center">
                <ThumbsUp className="text-content-tertiary mx-auto mb-2 h-8 w-8" />
                <p>No NPS data yet</p>
              </div>
            ) : (
              <div className="text-center">
                <div
                  className={cn(
                    "text-5xl font-bold",
                    npsTrends.currentNPS !== null &&
                      npsTrends.currentNPS >= 50 &&
                      "text-success-600 dark:text-success-400",
                    npsTrends.currentNPS !== null &&
                      npsTrends.currentNPS >= 0 &&
                      npsTrends.currentNPS < 50 &&
                      "text-warning-600 dark:text-warning-400",
                    npsTrends.currentNPS !== null &&
                      npsTrends.currentNPS < 0 &&
                      "text-error-600 dark:text-error-400"
                  )}
                >
                  {npsTrends.currentNPS ?? "—"}
                </div>
                <p className="text-content-secondary mt-1 text-sm">
                  {npsTrends.totalResponses} responses (30 days)
                </p>
                {npsTrends.recentDetractors > 0 && (
                  <div className="text-error-600 dark:text-error-400 mt-4 flex items-center justify-center gap-2 text-sm">
                    <ThumbsDown className="h-4 w-4" />
                    <span>
                      {npsTrends.recentDetractors} detractor
                      {npsTrends.recentDetractors !== 1 ? "s" : ""} need attention
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Champion Alerts */}
          <div className="card-sf p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-content-primary text-lg font-semibold">Relationship Alerts</h2>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="shimmer h-12 rounded-lg" />
                ))}
              </div>
            ) : !championAlerts ||
              (championAlerts.noChampion === 0 &&
                championAlerts.singleThreaded === 0 &&
                championAlerts.recentChampionLeft.length === 0) ? (
              <div className="text-content-secondary py-8 text-center">
                <Users className="text-content-tertiary mx-auto mb-2 h-8 w-8" />
                <p>All relationships healthy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {championAlerts.recentChampionLeft.length > 0 && (
                  <div className="border-error-200 bg-error-50 dark:border-error-900 dark:bg-error-950/30 rounded-lg border p-3">
                    <div className="text-error-700 dark:text-error-400 flex items-center gap-2 text-sm font-medium">
                      <UserX className="h-4 w-4" />
                      Champion Left
                    </div>
                    {championAlerts.recentChampionLeft.slice(0, 2).map((alert) => (
                      <Link
                        key={`${alert.companyId}-${alert.championName}`}
                        href={`/accounts/${alert.companyId}`}
                        className="text-error-600 dark:text-error-300 mt-2 block text-sm hover:underline"
                      >
                        {alert.championName} left {alert.companyName}
                      </Link>
                    ))}
                  </div>
                )}
                {championAlerts.noChampion > 0 && (
                  <div className="border-warning-200 bg-warning-50 dark:border-warning-900 dark:bg-warning-950/30 flex items-center justify-between rounded-lg border p-3">
                    <span className="text-warning-700 dark:text-warning-400 text-sm">
                      No champion identified
                    </span>
                    <span className="bg-warning-200 text-warning-800 dark:bg-warning-800 dark:text-warning-200 rounded-full px-2 py-0.5 text-xs font-medium">
                      {championAlerts.noChampion}
                    </span>
                  </div>
                )}
                {championAlerts.singleThreaded > 0 && (
                  <div className="border-info-200 bg-info-50 dark:border-info-900 dark:bg-info-950/30 flex items-center justify-between rounded-lg border p-3">
                    <span className="text-info-700 dark:text-info-400 text-sm">
                      Single-threaded accounts
                    </span>
                    <span className="bg-info-200 text-info-800 dark:bg-info-800 dark:text-info-200 rounded-full px-2 py-0.5 text-xs font-medium">
                      {championAlerts.singleThreaded}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        {(recentActivity.length > 0 || loading) && (
          <div className="card-sf p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-content-primary text-lg font-semibold">Recent Activity</h2>
              <Activity className="text-content-tertiary h-5 w-5" />
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="shimmer h-12 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.slice(0, 6).map((event) => (
                  <Link
                    key={event.id}
                    href={`/accounts/${event.companyId}`}
                    className="border-border-default hover:bg-surface-hover flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        event.source === "platform" &&
                          "bg-primary-100 text-primary-600 dark:bg-primary-900/30",
                        event.source === "nps" && "bg-info-100 text-info-600 dark:bg-info-900/30",
                        event.source === "hubspot" &&
                          "bg-warning-100 text-warning-600 dark:bg-warning-900/30",
                        event.source === "stripe" &&
                          "bg-success-100 text-success-600 dark:bg-success-900/30",
                        !["platform", "nps", "hubspot", "stripe"].includes(event.source) &&
                          "bg-bg-tertiary text-content-secondary"
                      )}
                    >
                      {event.source === "nps" ? (
                        <ThumbsUp className="h-4 w-4" />
                      ) : event.source === "platform" ? (
                        <Activity className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-content-primary truncate text-sm font-medium">
                        {event.title}
                      </p>
                      <p className="text-content-secondary text-xs">
                        {event.companyName} · {new Date(event.occurredAt).toLocaleDateString()}
                      </p>
                    </div>
                    {event.importance === "critical" && (
                      <span className="bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400 rounded-full px-2 py-0.5 text-xs font-medium">
                        Critical
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Accounts Needing Attention */}
        {(atRiskAccounts.length > 0 || loading) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-content-primary text-lg font-semibold">
                Accounts Needing Attention
              </h2>
              {atRiskAccounts.length > 3 && (
                <Link
                  href="/accounts?filter=at-risk"
                  className="text-success-600 hover:text-success-700 dark:text-success-400 dark:hover:text-success-300 text-sm font-medium"
                >
                  View all {atRiskAccounts.length} →
                </Link>
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
                atRiskAccounts
                  .slice(0, 3)
                  .map((account) => (
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
              <h2 className="text-content-primary text-lg font-semibold">Monitor List</h2>
              {monitorAccounts.length > 5 && (
                <Link
                  href="/accounts?filter=monitor"
                  className="text-success-600 hover:text-success-700 dark:text-success-400 dark:hover:text-success-300 text-sm font-medium"
                >
                  View all {monitorAccounts.length} →
                </Link>
              )}
            </div>
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="shimmer h-16 rounded-lg" />
                  ))}
                </div>
              ) : (
                monitorAccounts
                  .slice(0, 5)
                  .map((account) => (
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
