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
  hubspotId: string
  name: string
  companyName: string | null
  amount: number | null
  stageId: string | null
  stageName: string
  daysInStage: number
  daysInPipeline: number | null
  ownerName: string | null
  ownerId: string | null
  contactCount: number
  hasChampion: boolean
  hasDecisionMaker: boolean
  hasExecutiveSponsor: boolean
  multiThreadingScore: number | null
  competitorNames: string[]
}

interface StalledSummary {
  totalCount: number
  totalValue: number
  agingBuckets: {
    "14-30": { count: number; value: number }
    "30-60": { count: number; value: number }
    "60+": { count: number; value: number }
  }
  byStage: Array<{
    stageId: string
    stageName: string
    count: number
    value: number
    avgDays: number
  }>
  byOwner: Array<{
    ownerId: string
    ownerName: string
    count: number
    value: number
    avgDays: number
  }>
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
  lostValue: number
  percentage: number
}

interface LossAnalysis {
  totalLostValue: number
  totalLostDeals: number
  avgLossSize: number
  avgDaysToLoss: number
  stageOfLoss: {
    early: { count: number; value: number; percentage: number; stageNames: string[] }
    mid: { count: number; value: number; percentage: number; stageNames: string[] }
    late: { count: number; value: number; percentage: number; stageNames: string[] }
  }
  competitorLosses: Array<{
    competitor: string
    count: number
    value: number
  }>
  byOwner: Array<{
    ownerId: string
    ownerName: string
    count: number
    value: number
    totalDeals: number
    lossRate: number
  }>
  timeToLoss: {
    under30: { count: number; value: number; topReason: string }
    days30to60: { count: number; value: number; topReason: string }
    days60to90: { count: number; value: number; topReason: string }
    over90: { count: number; value: number; topReason: string }
  }
  trend: Array<{
    week: string
    count: number
    value: number
  }>
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
  stalledSummary: StalledSummary
  ownerPerformance: OwnerStat[]
  lossReasons: LossReason[]
  lossAnalysis: LossAnalysis
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
  const [stalledView, setStalledView] = useState<"list" | "stage" | "owner">("list")
  const [lossView, setLossView] = useState<"reasons" | "stage" | "owner" | "trend">("reasons")
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
            hubspotId: string
            name: string
            companyName: string | null
            amount: number | null
            stageId: string | null
            stageName: string
            daysInCurrentStage: number
            daysInPipeline: number | null
            ownerName: string | null
            ownerId: string | null
            contactCount: number
            hasChampion: boolean
            hasDecisionMaker: boolean
            hasExecutiveSponsor: boolean
            multiThreadingScore: number | null
            competitorNames: string[]
          }) => ({
            id: deal.id,
            hubspotId: deal.hubspotId,
            name: deal.name,
            companyName: deal.companyName,
            amount: deal.amount,
            stageId: deal.stageId,
            stageName: deal.stageName || "Unknown",
            daysInStage: deal.daysInCurrentStage,
            daysInPipeline: deal.daysInPipeline,
            ownerName: deal.ownerName,
            ownerId: deal.ownerId,
            contactCount: deal.contactCount,
            hasChampion: deal.hasChampion,
            hasDecisionMaker: deal.hasDecisionMaker,
            hasExecutiveSponsor: deal.hasExecutiveSponsor,
            multiThreadingScore: deal.multiThreadingScore,
            competitorNames: deal.competitorNames || [],
          })
        ),
        stalledSummary: data.stalledSummary || {
          totalCount: 0,
          totalValue: 0,
          agingBuckets: { "14-30": { count: 0, value: 0 }, "30-60": { count: 0, value: 0 }, "60+": { count: 0, value: 0 } },
          byStage: [],
          byOwner: [],
        },
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
          (reason: { reason: string; count: number; lostValue: number; percentage: number }) => ({
            reason: reason.reason,
            count: reason.count,
            lostValue: reason.lostValue || 0,
            percentage: reason.percentage || 0,
          })
        ),
        lossAnalysis: data.lossAnalysis || {
          totalLostValue: 0,
          totalLostDeals: 0,
          avgLossSize: 0,
          avgDaysToLoss: 0,
          stageOfLoss: {
            early: { count: 0, value: 0, percentage: 0, stageNames: [] },
            mid: { count: 0, value: 0, percentage: 0, stageNames: [] },
            late: { count: 0, value: 0, percentage: 0, stageNames: [] },
          },
          competitorLosses: [],
          byOwner: [],
          timeToLoss: {
            under30: { count: 0, value: 0, topReason: "" },
            days30to60: { count: 0, value: 0, topReason: "" },
            days60to90: { count: 0, value: 0, topReason: "" },
            over90: { count: 0, value: 0, topReason: "" },
          },
          trend: [],
        },
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
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="card-sf p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-error-100 dark:bg-error-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                        <AlertTriangle className="text-error-600 dark:text-error-400 h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-content-secondary text-sm">Value at Risk</p>
                        <p className="text-content-primary text-xl font-bold">
                          {formatCompact(analytics.stalledSummary.totalValue)}
                        </p>
                        <p className="text-content-tertiary text-xs">
                          {analytics.stalledSummary.totalCount} deals
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="card-sf p-4">
                    <p className="text-content-secondary mb-1 text-xs">14-30 days</p>
                    <p className="text-warning-600 dark:text-warning-400 text-lg font-bold">
                      {formatCompact(analytics.stalledSummary.agingBuckets["14-30"].value)}
                    </p>
                    <p className="text-content-tertiary text-xs">
                      {analytics.stalledSummary.agingBuckets["14-30"].count} deals
                    </p>
                  </div>
                  <div className="card-sf p-4">
                    <p className="text-content-secondary mb-1 text-xs">30-60 days</p>
                    <p className="text-orange-600 dark:text-orange-400 text-lg font-bold">
                      {formatCompact(analytics.stalledSummary.agingBuckets["30-60"].value)}
                    </p>
                    <p className="text-content-tertiary text-xs">
                      {analytics.stalledSummary.agingBuckets["30-60"].count} deals
                    </p>
                  </div>
                  <div className="card-sf p-4">
                    <p className="text-content-secondary mb-1 text-xs">60+ days</p>
                    <p className="text-error-600 dark:text-error-400 text-lg font-bold">
                      {formatCompact(analytics.stalledSummary.agingBuckets["60+"].value)}
                    </p>
                    <p className="text-content-tertiary text-xs">
                      {analytics.stalledSummary.agingBuckets["60+"].count} deals
                    </p>
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex gap-2">
                  {[
                    { id: "list" as const, label: "All Deals" },
                    { id: "stage" as const, label: "By Stage" },
                    { id: "owner" as const, label: "By Owner" },
                  ].map((view) => (
                    <button
                      key={view.id}
                      onClick={() => setStalledView(view.id)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        stalledView === view.id
                          ? "bg-content-primary text-bg-primary"
                          : "bg-bg-secondary text-content-secondary hover:bg-bg-tertiary"
                      )}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>

                <div className="card-sf">
                  {analytics.stalledDeals.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="bg-success-100 dark:bg-success-900/30 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                        <TrendingUp className="text-success-600 dark:text-success-400 h-6 w-6" />
                      </div>
                      <h3 className="text-content-primary text-lg font-medium">No stalled deals</h3>
                      <p className="text-content-secondary mt-1">All deals are progressing well</p>
                    </div>
                  ) : stalledView === "stage" ? (
                    <div className="divide-border-default divide-y">
                      {analytics.stalledSummary.byStage.map((stage) => (
                        <div key={stage.stageId} className="p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div>
                              <span className="text-content-primary font-medium">{stage.stageName}</span>
                              <span className="text-content-tertiary ml-2 text-sm">
                                {stage.count} deals &middot; avg {stage.avgDays}d stuck
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-content-primary font-bold">{formatCompact(stage.value)}</p>
                              <p className="text-content-tertiary text-xs">value at risk</p>
                            </div>
                          </div>
                          <div className="bg-bg-secondary h-2 overflow-hidden rounded-full">
                            <div
                              className="bg-error-500 h-full rounded-full"
                              style={{
                                width: `${Math.min((stage.value / analytics.stalledSummary.totalValue) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : stalledView === "owner" ? (
                    <div className="divide-border-default divide-y">
                      {analytics.stalledSummary.byOwner.map((owner) => (
                        <div key={owner.ownerId} className="p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div>
                              <span className="text-content-primary font-medium">{owner.ownerName}</span>
                              <span className="text-content-tertiary ml-2 text-sm">
                                {owner.count} deals &middot; avg {owner.avgDays}d stuck
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-content-primary font-bold">{formatCompact(owner.value)}</p>
                              <p className="text-content-tertiary text-xs">value at risk</p>
                            </div>
                          </div>
                          <div className="bg-bg-secondary h-2 overflow-hidden rounded-full">
                            <div
                              className="bg-error-500 h-full rounded-full"
                              style={{
                                width: `${Math.min((owner.value / analytics.stalledSummary.totalValue) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="divide-border-default divide-y">
                      {analytics.stalledDeals.map((deal) => (
                        <div
                          key={deal.id}
                          className="hover:bg-bg-secondary flex items-center justify-between px-4 py-3 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-content-primary truncate font-medium">{deal.name}</h3>
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
                            <p className="text-content-secondary text-sm">
                              {deal.companyName || "Unknown"} &middot; {deal.stageName}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              {deal.contactCount <= 1 && (
                                <span className="bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 rounded px-1.5 py-0.5 text-xs">
                                  Single-threaded
                                </span>
                              )}
                              {deal.competitorNames.length > 0 && (
                                <span className="bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400 rounded px-1.5 py-0.5 text-xs">
                                  Competitive
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-content-primary font-medium">
                                {formatCurrency(deal.amount)}
                              </p>
                              <p className="text-content-tertiary text-xs">
                                {deal.ownerName || "Unassigned"}
                              </p>
                            </div>
                            <div
                              className={cn(
                                "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                                deal.daysInStage >= 60
                                  ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                  : deal.daysInStage >= 30
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                    : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                              )}
                            >
                              <Clock className="h-3 w-3" />
                              {deal.daysInStage}d
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="card-sf p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-error-100 dark:bg-error-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                        <DollarSign className="text-error-600 dark:text-error-400 h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-content-secondary text-sm">Lost Value</p>
                        <p className="text-error-600 dark:text-error-400 text-xl font-bold">
                          {formatCompact(analytics.lossAnalysis.totalLostValue)}
                        </p>
                        <p className="text-content-tertiary text-xs">
                          {analytics.lossAnalysis.totalLostDeals} deals
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="card-sf p-4">
                    <p className="text-content-secondary mb-1 text-sm">Avg Loss Size</p>
                    <p className="text-content-primary text-lg font-bold">
                      {formatCompact(analytics.lossAnalysis.avgLossSize)}
                    </p>
                  </div>
                  <div className="card-sf p-4">
                    <p className="text-content-secondary mb-1 text-sm">Loss Rate</p>
                    <p className="text-content-primary text-lg font-bold">
                      {analytics.summary.winRate > 0 ? 100 - analytics.summary.winRate : 0}%
                    </p>
                  </div>
                  <div className="card-sf p-4">
                    <p className="text-content-secondary mb-1 text-sm">Avg Days to Loss</p>
                    <p className="text-content-primary text-lg font-bold">
                      {analytics.lossAnalysis.avgDaysToLoss}d
                    </p>
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex gap-2">
                  {[
                    { id: "reasons" as const, label: "By Reason" },
                    { id: "stage" as const, label: "By Stage" },
                    { id: "owner" as const, label: "By Owner" },
                    { id: "trend" as const, label: "Trend" },
                  ].map((view) => (
                    <button
                      key={view.id}
                      onClick={() => setLossView(view.id)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        lossView === view.id
                          ? "bg-content-primary text-bg-primary"
                          : "bg-bg-secondary text-content-secondary hover:bg-bg-tertiary"
                      )}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>

                <div className="card-sf">
                  {analytics.lossReasons.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-content-secondary">No loss data available</p>
                    </div>
                  ) : lossView === "reasons" ? (
                    <div className="p-6">
                      <h3 className="text-content-primary mb-4 font-semibold">Loss Reasons (by value)</h3>
                      <div className="space-y-4">
                        {analytics.lossReasons.map((reason) => (
                          <div key={reason.reason}>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-content-primary font-medium">{reason.reason}</span>
                              <div className="text-right">
                                <span className="text-error-600 dark:text-error-400 font-medium">
                                  {formatCompact(reason.lostValue)}
                                </span>
                                <span className="text-content-tertiary ml-2 text-sm">
                                  ({reason.count} deals, {reason.percentage}%)
                                </span>
                              </div>
                            </div>
                            <div className="bg-bg-secondary h-3 overflow-hidden rounded-full">
                              <div
                                className="bg-error-500 h-full rounded-full transition-all"
                                style={{ width: `${reason.percentage}%` }}
                              />
                            </div>
                            {reason.reason.toLowerCase().includes("competitor") &&
                              analytics.lossAnalysis.competitorLosses.length > 0 && (
                                <div className="border-border-default mt-2 ml-4 border-l-2 pl-3">
                                  {analytics.lossAnalysis.competitorLosses.slice(0, 3).map((comp) => (
                                    <div
                                      key={comp.competitor}
                                      className="text-content-secondary flex items-center justify-between text-sm"
                                    >
                                      <span>{comp.competitor}</span>
                                      <span>
                                        {formatCompact(comp.value)} ({comp.count})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : lossView === "stage" ? (
                    <div className="p-6">
                      <h3 className="text-content-primary mb-4 font-semibold">Stage of Loss</h3>
                      <div className="space-y-6">
                        {[
                          { key: "early" as const, label: "Early Stage", hint: "Likely qualification issues" },
                          { key: "mid" as const, label: "Mid Stage", hint: "Likely pricing/value issues" },
                          { key: "late" as const, label: "Late Stage", hint: "Likely competitive/champion issues" },
                        ].map(({ key, label, hint }) => {
                          const data = analytics.lossAnalysis.stageOfLoss[key]
                          return (
                            <div key={key}>
                              <div className="mb-2 flex items-center justify-between">
                                <div>
                                  <span className="text-content-primary font-medium">{label}</span>
                                  <p className="text-content-tertiary text-xs">
                                    {data.stageNames.slice(0, 3).join(", ") || "No stages"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-error-600 dark:text-error-400 font-bold">
                                    {formatCompact(data.value)}
                                  </p>
                                  <p className="text-content-tertiary text-xs">
                                    {data.count} deals ({data.percentage}%)
                                  </p>
                                </div>
                              </div>
                              <div className="bg-bg-secondary h-3 overflow-hidden rounded-full">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    key === "early"
                                      ? "bg-warning-500"
                                      : key === "mid"
                                        ? "bg-orange-500"
                                        : "bg-error-500"
                                  )}
                                  style={{ width: `${data.percentage}%` }}
                                />
                              </div>
                              <p className="text-content-tertiary mt-1 text-xs italic">{hint}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : lossView === "owner" ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-border-default border-b">
                            <th className="text-content-secondary px-6 py-3 text-left text-sm font-medium">
                              Owner
                            </th>
                            <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                              Lost Deals
                            </th>
                            <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                              Lost Value
                            </th>
                            <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                              Total Deals
                            </th>
                            <th className="text-content-secondary px-4 py-3 text-right text-sm font-medium">
                              Loss Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-border-default divide-y">
                          {analytics.lossAnalysis.byOwner.map((owner) => (
                            <tr key={owner.ownerId} className="hover:bg-bg-secondary">
                              <td className="text-content-primary px-6 py-3 font-medium">
                                {owner.ownerName}
                              </td>
                              <td className="text-content-secondary px-4 py-3 text-right">
                                {owner.count}
                              </td>
                              <td className="text-error-600 dark:text-error-400 px-4 py-3 text-right font-medium">
                                {formatCompact(owner.value)}
                              </td>
                              <td className="text-content-secondary px-4 py-3 text-right">
                                {owner.totalDeals}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={cn(
                                    "font-medium",
                                    owner.lossRate > 50
                                      ? "text-error-600 dark:text-error-400"
                                      : owner.lossRate > 35
                                        ? "text-warning-600 dark:text-warning-400"
                                        : "text-success-600 dark:text-success-400"
                                  )}
                                >
                                  {owner.lossRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6">
                      <h3 className="text-content-primary mb-4 font-semibold">Loss Trend (12 Weeks)</h3>
                      {analytics.lossAnalysis.trend.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex h-40 items-end gap-1">
                            {analytics.lossAnalysis.trend.map((week) => {
                              const maxValue = Math.max(
                                ...analytics.lossAnalysis.trend.map((w) => w.value),
                                1
                              )
                              const height = (week.value / maxValue) * 100
                              return (
                                <div
                                  key={week.week}
                                  className="group relative flex flex-1 flex-col items-center"
                                >
                                  <div className="absolute -top-8 hidden text-xs group-hover:block">
                                    <div className="bg-bg-tertiary text-content-primary rounded px-2 py-1">
                                      {formatCompact(week.value)}
                                    </div>
                                  </div>
                                  <div
                                    className="bg-error-500 hover:bg-error-600 w-full rounded-t transition-all"
                                    style={{ height: `${Math.max(height, 4)}%` }}
                                  />
                                  <span className="text-content-tertiary mt-1 text-xs">{week.week}</span>
                                </div>
                              )
                            })}
                          </div>
                          <div className="border-border-default border-t pt-4">
                            <p className="text-content-secondary text-sm">
                              4-week average:{" "}
                              <span className="text-content-primary font-medium">
                                {formatCompact(
                                  analytics.lossAnalysis.trend
                                    .slice(-4)
                                    .reduce((sum, w) => sum + w.value, 0) / 4
                                )}
                                /week
                              </span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-content-secondary text-center">No trend data available</p>
                      )}
                    </div>
                  )}
                </div>
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
