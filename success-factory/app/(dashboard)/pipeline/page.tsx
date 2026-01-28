"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  Users,
  DollarSign,
  Target,
  ArrowRight,
  RefreshCw,
  BarChart3,
  Filter,
  X,
  ExternalLink,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { HubSpotActions } from "@/components/hubspot-actions"

interface PipelineSummary {
  totalDeals: number
  totalValue: number
  openDeals: number
  openValue: number
  wonDeals: number
  wonValue: number
  lostDeals: number
  lostValue: number
  winRate: number
  avgDealSize: number
  avgDaysToClose: number
}

interface StageData {
  id: string
  name: string
  displayOrder: number
  dealCount: number
  totalValue: number
  conversionRate: number
  avgTimeInStage: number
}

interface StalledDeal {
  id: string
  name: string
  companyName: string | null
  amount: number | null
  stageName: string
  daysInStage: number
  ownerName: string | null
}

interface OwnerStat {
  ownerId: string
  ownerName: string
  totalDeals: number
  wonDeals: number
  lostDeals: number
  openDeals: number
  winRate: number
  totalValue: number
  avgDaysToClose: number
}

interface LossReason {
  reason: string
  count: number
  percentage: number
}

interface StageDeal {
  id: string
  hubspotId: string
  name: string
  companyName: string | null
  amount: number | null
  ownerName: string | null
  daysInCurrentStage: number | null
  createDate: string | null
}

interface DealAnalytics {
  period: string
  summary: PipelineSummary
  stageConversion: StageData[]
  stalledDeals: StalledDeal[]
  ownerPerformance: OwnerStat[]
  lossReasons: LossReason[]
}

type Period = "30d" | "90d" | "180d" | "365d" | "all"

interface Pipeline {
  id: string
  name: string
}

function formatCurrency(value: number | null): string {
  if (value === null) return "-"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

export default function PipelinePage() {
  const [analytics, setAnalytics] = useState<DealAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [period, setPeriod] = useState<Period>("90d")
  const [activeTab, setActiveTab] = useState<"funnel" | "stalled" | "reps" | "losses">("funnel")
  const [selectedStage, setSelectedStage] = useState<StageData | null>(null)
  const [stageDeals, setStageDeals] = useState<StageDeal[]>([])
  const [stageDealsLoading, setStageDealsLoading] = useState(false)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string>("all")

  useEffect(() => {
    fetchPipelines()
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [period, selectedPipeline])

  async function fetchPipelines() {
    try {
      const res = await fetch("/api/pipelines")
      const data = await res.json()
      setPipelines(data.pipelines || [])
    } catch (error) {
      console.error("Failed to fetch pipelines:", error)
    }
  }

  async function fetchAnalytics() {
    try {
      setLoading(true)
      const pipelineParam = selectedPipeline !== "all" ? `&pipelineId=${selectedPipeline}` : ""
      const res = await fetch(`/api/analytics/deals?period=${period}${pipelineParam}`)
      const data = await res.json()

      // Transform API response to match UI interface
      const stageVelocityMap = new Map(
        (data.stageVelocity || []).map((sv: { stageId: string; avgDays: number }) => [
          sv.stageId,
          sv.avgDays,
        ])
      )

      // Calculate total lost deals for percentage calculations
      const totalLostDeals = data.summary?.lostDeals || 0

      const transformed: DealAnalytics = {
        period: data.period,
        summary: {
          totalDeals: data.summary?.totalDeals || 0,
          totalValue: data.summary?.totalPipelineValue || 0,
          openDeals: data.summary?.openDeals || 0,
          openValue: data.summary?.totalPipelineValue || 0,
          wonDeals: data.summary?.wonDeals || 0,
          wonValue: data.summary?.wonValue || 0,
          lostDeals: data.summary?.lostDeals || 0,
          lostValue: (data.summary?.totalPipelineValue || 0) - (data.summary?.wonValue || 0),
          winRate: data.summary?.winRate || 0,
          avgDealSize:
            data.summary?.totalDeals > 0
              ? Math.round((data.summary?.totalPipelineValue || 0) / data.summary.totalDeals)
              : 0,
          avgDaysToClose: data.velocity?.avgDaysToClose || 0,
        },
        stageConversion: (data.stageConversion || []).map(
          (stage: {
            stageId: string
            stageName: string
            displayOrder: number
            dealsReached: number
            dealCount: number
            totalValue: number
            conversionToNext: number | null
          }) => ({
            id: stage.stageId,
            name: stage.stageName || "Unknown Stage",
            displayOrder: stage.displayOrder,
            dealCount: stage.dealCount || stage.dealsReached || 0,
            totalValue: stage.totalValue || 0,
            conversionRate: stage.conversionToNext || 0,
            avgTimeInStage: stageVelocityMap.get(stage.stageId) || 0,
          })
        ),
        stalledDeals: (data.stalledDeals || []).map(
          (deal: {
            id: string
            name: string
            companyName: string | null
            amount: number | null
            stageName: string
            daysInCurrentStage: number
            ownerName: string | null
          }) => ({
            id: deal.id,
            name: deal.name,
            companyName: deal.companyName,
            amount: deal.amount,
            stageName: deal.stageName,
            daysInStage: deal.daysInCurrentStage,
            ownerName: deal.ownerName,
          })
        ),
        ownerPerformance: (data.ownerPerformance || []).map(
          (rep: {
            ownerId: string
            ownerName: string
            totalDeals: number
            wonDeals: number
            wonValue: number
            winRate: number
          }) => ({
            ownerId: rep.ownerId,
            ownerName: rep.ownerName,
            totalDeals: rep.totalDeals,
            wonDeals: rep.wonDeals,
            lostDeals: rep.totalDeals - rep.wonDeals,
            openDeals: 0, // Not available from current API
            winRate: rep.winRate,
            totalValue: rep.wonValue,
            avgDaysToClose: data.velocity?.avgDaysToClose || 0,
          })
        ),
        lossReasons: (data.lossReasons || []).map(
          (reason: { reason: string; count: number; lostValue: number }) => ({
            reason: reason.reason,
            count: reason.count,
            percentage: totalLostDeals > 0 ? Math.round((reason.count / totalLostDeals) * 100) : 0,
          })
        ),
      }

      setAnalytics(transformed)
    } catch (error) {
      console.error("Failed to fetch pipeline analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  async function syncDeals() {
    setSyncing(true)
    try {
      await fetch("/api/sync/deals", { method: "POST" })
      await fetchAnalytics()
    } catch (error) {
      console.error("Failed to sync deals:", error)
    } finally {
      setSyncing(false)
    }
  }

  async function fetchStageDeals(stage: StageData) {
    setSelectedStage(stage)
    setStageDealsLoading(true)
    setStageDeals([])
    try {
      const res = await fetch(`/api/analytics/deals/by-stage?stageId=${stage.id}&period=${period}`)
      const data = await res.json()
      setStageDeals(data.deals || [])
    } catch (error) {
      console.error("Failed to fetch stage deals:", error)
    } finally {
      setStageDealsLoading(false)
    }
  }

  function closeStageModal() {
    setSelectedStage(null)
    setStageDeals([])
  }

  const periodOptions: { value: Period; label: string }[] = [
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "180d", label: "6 Months" },
    { value: "365d", label: "1 Year" },
    { value: "all", label: "All Time" },
  ]

  const tabs = [
    { id: "funnel" as const, label: "Stage Funnel", icon: BarChart3 },
    { id: "stalled" as const, label: "Stalled Deals", icon: AlertTriangle },
    { id: "reps" as const, label: "Rep Performance", icon: Users },
    { id: "losses" as const, label: "Loss Analysis", icon: Target },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-content-primary text-2xl font-bold">Sales Pipeline</h1>
            <p className="text-content-secondary mt-1">Deal velocity and conversion analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <HubSpotActions entityType="deals" />
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="border-border-default bg-bg-elevated text-content-primary focus:border-primary-500 focus:ring-primary-500/20 h-9 rounded-lg border px-3 text-sm outline-none focus:ring-2"
            >
              <option value="all">All Pipelines</option>
              <option value="moovs">Moovs Only</option>
              <option value="swoop">Swoop Only</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="border-border-default bg-bg-elevated text-content-primary focus:border-primary-500 focus:ring-primary-500/20 h-9 rounded-lg border px-3 text-sm outline-none focus:ring-2"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={syncDeals}
              disabled={syncing}
              className="bg-primary-600 hover:bg-primary-700 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              {syncing ? "Syncing..." : "Sync Deals"}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="shimmer h-24 rounded-xl" />
            ))}
          </div>
        ) : analytics ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 dark:bg-primary-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <DollarSign className="text-primary-600 dark:text-primary-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Pipeline Value</p>
                  <p className="text-content-primary text-xl font-bold">
                    {formatCompact(analytics.summary.openValue)}
                  </p>
                  <p className="text-content-tertiary text-xs">
                    {analytics.summary.openDeals} open deals
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="bg-success-100 dark:bg-success-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <TrendingUp className="text-success-600 dark:text-success-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Won Value</p>
                  <p className="text-content-primary text-xl font-bold">
                    {formatCompact(analytics.summary.wonValue)}
                  </p>
                  <p className="text-content-tertiary text-xs">
                    {analytics.summary.wonDeals} deals closed
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="bg-warning-100 dark:bg-warning-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Target className="text-warning-600 dark:text-warning-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Win Rate</p>
                  <p className="text-content-primary text-xl font-bold">
                    {analytics.summary.winRate}%
                  </p>
                  <p className="text-content-tertiary text-xs">
                    {analytics.summary.wonDeals}W / {analytics.summary.lostDeals}L
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="bg-accent-100 dark:bg-accent-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Clock className="text-accent-600 dark:text-accent-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Avg Days to Close</p>
                  <p className="text-content-primary text-xl font-bold">
                    {analytics.summary.avgDaysToClose}
                  </p>
                  <p className="text-content-tertiary text-xs">
                    Avg deal: {formatCompact(analytics.summary.avgDealSize)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="border-border-default bg-bg-secondary flex flex-wrap gap-1 rounded-lg border p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-bg-elevated text-content-primary shadow-sm"
                  : "text-content-secondary hover:text-content-primary"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="shimmer h-64 rounded-xl" />
        ) : analytics ? (
          <>
            {/* Stage Funnel */}
            {activeTab === "funnel" && (
              <div className="card-sf p-6">
                <h2 className="text-content-primary mb-4 text-lg font-semibold">
                  Stage Conversion Funnel
                </h2>
                <div className="space-y-3">
                  {analytics.stageConversion
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((stage, idx, arr) => {
                      const maxDeals = Math.max(...arr.map((s) => s.dealCount))
                      const widthPercent = maxDeals > 0 ? (stage.dealCount / maxDeals) * 100 : 0

                      return (
                        <button
                          key={stage.id}
                          onClick={() => fetchStageDeals(stage)}
                          className="group block w-full text-left"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-content-primary group-hover:text-primary-600 dark:group-hover:text-primary-400 font-medium transition-colors">
                                {stage.name}
                              </span>
                              <span className="bg-bg-secondary text-content-tertiary rounded px-1.5 py-0.5 text-xs">
                                {stage.dealCount} deals
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-content-secondary">
                                {formatCompact(stage.totalValue)}
                              </span>
                              <span className="text-content-tertiary">
                                ~{stage.avgTimeInStage}d avg
                              </span>
                              {idx < arr.length - 1 && (
                                <span
                                  className={cn(
                                    "font-medium",
                                    stage.conversionRate >= 50
                                      ? "text-success-600 dark:text-success-400"
                                      : stage.conversionRate >= 25
                                        ? "text-warning-600 dark:text-warning-400"
                                        : "text-error-600 dark:text-error-400"
                                  )}
                                >
                                  {stage.conversionRate}% →
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="bg-bg-secondary h-8 overflow-hidden rounded-lg">
                            <div
                              className="bg-primary-500 group-hover:bg-primary-600 flex h-full items-center justify-end pr-2 transition-all"
                              style={{ width: `${Math.max(widthPercent, 5)}%` }}
                            >
                              {widthPercent > 20 && (
                                <span className="text-xs font-medium text-white">
                                  {formatCompact(stage.totalValue)}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Stalled Deals */}
            {activeTab === "stalled" && (
              <div className="card-sf">
                <div className="border-border-default flex items-center justify-between border-b px-6 py-4">
                  <h2 className="text-content-primary text-lg font-semibold">
                    Stalled Deals ({analytics.stalledDeals.length})
                  </h2>
                  <p className="text-content-tertiary text-sm">Deals stuck in stage 14+ days</p>
                </div>
                {analytics.stalledDeals.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="bg-success-100 dark:bg-success-900/30 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                      <TrendingUp className="text-success-600 dark:text-success-400 h-6 w-6" />
                    </div>
                    <h3 className="text-content-primary text-lg font-medium">No stalled deals</h3>
                    <p className="text-content-secondary mt-1">All deals are progressing well</p>
                  </div>
                ) : (
                  <div className="divide-border-default divide-y">
                    {analytics.stalledDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className="hover:bg-bg-secondary flex items-center justify-between px-6 py-4 transition-colors"
                      >
                        <div>
                          <h3 className="text-content-primary font-medium">{deal.name}</h3>
                          <p className="text-content-secondary text-sm">
                            {deal.companyName || "Unknown company"}
                          </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-content-primary font-medium">
                              {formatCurrency(deal.amount)}
                            </p>
                            <p className="text-content-tertiary text-xs">{deal.stageName}</p>
                          </div>
                          <div
                            className={cn(
                              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                              deal.daysInStage > 30
                                ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            {deal.daysInStage}d stuck
                          </div>
                          <div className="text-content-tertiary text-sm">
                            {deal.ownerName || "Unassigned"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rep Performance */}
            {activeTab === "reps" && (
              <div className="card-sf overflow-x-auto">
                <div className="border-border-default border-b px-6 py-4">
                  <h2 className="text-content-primary text-lg font-semibold">
                    Sales Rep Performance
                  </h2>
                </div>
                {analytics.ownerPerformance.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="bg-bg-secondary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                      <Users className="text-content-tertiary h-6 w-6" />
                    </div>
                    <h3 className="text-content-primary text-lg font-medium">No rep data</h3>
                    <p className="text-content-secondary mt-1">Sync deals to see rep performance</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-border-default border-b">
                        <th className="text-content-secondary px-6 py-3 text-left text-sm font-medium">
                          Rep
                        </th>
                        <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                          Total
                        </th>
                        <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                          Won
                        </th>
                        <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                          Lost
                        </th>
                        <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                          Win Rate
                        </th>
                        <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                          Value Won
                        </th>
                        <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                          Avg Days
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.ownerPerformance
                        .sort((a, b) => b.wonDeals - a.wonDeals)
                        .map((rep, idx) => (
                          <tr
                            key={rep.ownerId}
                            className={cn(
                              "border-border-default hover:bg-bg-secondary border-b transition-colors",
                              idx === analytics.ownerPerformance.length - 1 && "border-b-0"
                            )}
                          >
                            <td className="px-6 py-3">
                              <p className="text-content-primary font-medium">{rep.ownerName}</p>
                              <p className="text-content-tertiary text-xs">{rep.openDeals} open</p>
                            </td>
                            <td className="text-content-secondary px-4 py-3 text-right">
                              {rep.totalDeals}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-success-600 dark:text-success-400 font-medium">
                                {rep.wonDeals}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-error-600 dark:text-error-400">
                                {rep.lostDeals}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={cn(
                                  "font-medium",
                                  rep.winRate >= 40
                                    ? "text-success-600 dark:text-success-400"
                                    : rep.winRate >= 25
                                      ? "text-warning-600 dark:text-warning-400"
                                      : "text-error-600 dark:text-error-400"
                                )}
                              >
                                {rep.winRate}%
                              </span>
                            </td>
                            <td className="text-content-primary px-4 py-3 text-right font-medium">
                              {formatCompact(rep.totalValue)}
                            </td>
                            <td className="text-content-secondary px-4 py-3 text-right">
                              {rep.avgDaysToClose}d
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Loss Analysis */}
            {activeTab === "losses" && (
              <div className="card-sf p-6">
                <h2 className="text-content-primary mb-4 text-lg font-semibold">
                  Top Loss Reasons
                </h2>
                {analytics.lossReasons.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-content-secondary">No loss data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.lossReasons.map((reason, idx) => (
                      <div key={reason.reason}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-content-primary font-medium">{reason.reason}</span>
                          <span className="text-content-secondary text-sm">
                            {reason.count} deals ({reason.percentage}%)
                          </span>
                        </div>
                        <div className="bg-bg-secondary h-3 overflow-hidden rounded-full">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              idx === 0
                                ? "bg-error-500"
                                : idx === 1
                                  ? "bg-error-400"
                                  : "bg-error-300"
                            )}
                            style={{ width: `${reason.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Stage Deals Modal */}
      {selectedStage && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-10 pb-10">
          <div className="bg-bg-primary border-border-default m-4 w-full max-w-3xl rounded-xl border shadow-xl">
            {/* Header */}
            <div className="border-border-default flex items-center justify-between border-b p-4">
              <div>
                <h3 className="text-content-primary text-lg font-semibold">{selectedStage.name}</h3>
                <p className="text-content-secondary text-sm">
                  {selectedStage.dealCount} deals &middot; {formatCompact(selectedStage.totalValue)}{" "}
                  total value
                </p>
              </div>
              <button
                onClick={closeStageModal}
                className="text-content-tertiary hover:text-content-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto">
              {stageDealsLoading ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="shimmer h-16 rounded-lg" />
                  ))}
                </div>
              ) : stageDeals.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-content-secondary">No deals found in this stage</p>
                </div>
              ) : (
                <div className="divide-border-default divide-y">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="hover:bg-bg-secondary flex items-center justify-between gap-4 p-4 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-content-primary truncate font-medium">{deal.name}</h4>
                          {deal.hubspotId && (
                            <a
                              href={`https://app.hubspot.com/contacts/deals/${deal.hubspotId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-content-tertiary hover:text-primary-500 flex-shrink-0"
                              title="Open in HubSpot"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="text-content-secondary mt-1 flex items-center gap-3 text-sm">
                          {deal.companyName && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {deal.companyName}
                            </span>
                          )}
                          {deal.ownerName && <span>{deal.ownerName}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-content-primary font-medium">
                            {formatCurrency(deal.amount)}
                          </p>
                          {deal.daysInCurrentStage !== null && (
                            <p
                              className={cn(
                                "text-xs",
                                deal.daysInCurrentStage > 14
                                  ? "text-warning-600 dark:text-warning-400"
                                  : "text-content-tertiary"
                              )}
                            >
                              {deal.daysInCurrentStage}d in stage
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-border-default flex justify-end border-t p-4">
              <button onClick={closeStageModal} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
