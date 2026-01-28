"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Swords,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Plus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CompetitorStats {
  totalEncounters: number
  wins: number
  losses: number
  noDecision: number
  winRate: number
  wonValue: number
  lostValue: number
}

interface LossReason {
  reason: string
  count: number
}

interface FeatureGap {
  feature: string
  count: number
}

interface Competitor {
  id: string
  name: string
  website: string | null
  description: string | null
  strengths: string[]
  weaknesses: string[]
  battlecardUrl: string | null
  stats: CompetitorStats
  topLossReasons: LossReason[]
  topFeatureGaps: FeatureGap[]
}

interface Summary {
  totalCompetitors: number
  totalEncounters: number
  totalWins: number
  totalLosses: number
  overallWinRate: number
}

interface CompetitiveData {
  period: string
  summary: Summary
  competitors: Competitor[]
}

interface IntelEntry {
  id: string
  competitorId: string
  competitorName: string
  outcome: "won" | "lost" | "no_decision"
  companyName: string | null
  dealAmount: number | null
  title: string
  details: string | null
  reportedAt: string
}

type Period = "30d" | "90d" | "180d" | "365d" | "all"

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

export default function CompetitivePage() {
  const [data, setData] = useState<CompetitiveData | null>(null)
  const [recentIntel, setRecentIntel] = useState<IntelEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>("90d")
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null)
  const [showAddIntel, setShowAddIntel] = useState(false)
  const [newIntel, setNewIntel] = useState({
    competitorName: "",
    companyName: "",
    outcome: "won" as "won" | "lost" | "no_decision",
    dealAmount: "",
    details: "",
    lossReasons: "",
    featureGaps: "",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [period])

  async function fetchData() {
    try {
      setLoading(true)
      const [compRes, intelRes] = await Promise.all([
        fetch(`/api/competitive?period=${period}`),
        fetch("/api/competitive/intel?limit=10"),
      ])
      const compData = await compRes.json()
      const intelData = await intelRes.json()
      setData(compData)
      setRecentIntel(intelData.intel || [])
    } catch (error) {
      console.error("Failed to fetch competitive data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function submitIntel() {
    if (!newIntel.competitorName || !newIntel.outcome) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/competitive/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitorName: newIntel.competitorName,
          companyName: newIntel.companyName || null,
          outcome: newIntel.outcome,
          dealAmount: newIntel.dealAmount ? parseFloat(newIntel.dealAmount) : null,
          details: newIntel.details || null,
          lossReasons: newIntel.lossReasons
            ? newIntel.lossReasons.split(",").map((r) => r.trim())
            : [],
          featureGaps: newIntel.featureGaps
            ? newIntel.featureGaps.split(",").map((g) => g.trim())
            : [],
        }),
      })

      if (res.ok) {
        setNewIntel({
          competitorName: "",
          companyName: "",
          outcome: "won",
          dealAmount: "",
          details: "",
          lossReasons: "",
          featureGaps: "",
        })
        setShowAddIntel(false)
        await fetchData()
      }
    } catch (error) {
      console.error("Failed to submit intel:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const periodOptions: { value: Period; label: string }[] = [
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "180d", label: "6 Months" },
    { value: "365d", label: "1 Year" },
    { value: "all", label: "All Time" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Swords className="text-primary-600 dark:text-primary-400 h-6 w-6" />
              <h1 className="text-content-primary text-2xl font-bold">Competitive Intel</h1>
            </div>
            <p className="text-content-secondary mt-1">Track wins and losses against competitors</p>
          </div>
          <div className="flex items-center gap-3">
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
              onClick={() => setShowAddIntel(true)}
              className="bg-success-600 hover:bg-success-700 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Log Win/Loss
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="shimmer h-24 rounded-xl" />
            ))}
          </div>
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 dark:bg-primary-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Target className="text-primary-600 dark:text-primary-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Competitors</p>
                  <p className="text-content-primary text-xl font-bold">
                    {data.summary.totalCompetitors}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="bg-accent-100 dark:bg-accent-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Swords className="text-accent-600 dark:text-accent-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-content-secondary text-sm">Encounters</p>
                  <p className="text-content-primary text-xl font-bold">
                    {data.summary.totalEncounters}
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
                  <p className="text-content-secondary text-sm">Wins</p>
                  <p className="text-content-primary text-xl font-bold">{data.summary.totalWins}</p>
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
                    {data.summary.overallWinRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Add Intel Modal */}
        {showAddIntel && (
          <div className="card-sf border-primary-500 border p-6">
            <h2 className="text-content-primary mb-4 text-lg font-semibold">
              Log Competitive Intel
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-content-secondary mb-1 block text-sm font-medium">
                  Competitor Name *
                </label>
                <input
                  type="text"
                  value={newIntel.competitorName}
                  onChange={(e) => setNewIntel({ ...newIntel, competitorName: e.target.value })}
                  placeholder="e.g., Acme Corp"
                  className="border-border-default bg-bg-elevated placeholder:text-content-tertiary focus:border-primary-500 focus:ring-primary-500/20 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="text-content-secondary mb-1 block text-sm font-medium">
                  Customer/Prospect
                </label>
                <input
                  type="text"
                  value={newIntel.companyName}
                  onChange={(e) => setNewIntel({ ...newIntel, companyName: e.target.value })}
                  placeholder="Company name"
                  className="border-border-default bg-bg-elevated placeholder:text-content-tertiary focus:border-primary-500 focus:ring-primary-500/20 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="text-content-secondary mb-1 block text-sm font-medium">
                  Outcome *
                </label>
                <select
                  value={newIntel.outcome}
                  onChange={(e) =>
                    setNewIntel({
                      ...newIntel,
                      outcome: e.target.value as "won" | "lost" | "no_decision",
                    })
                  }
                  className="border-border-default bg-bg-elevated focus:border-primary-500 focus:ring-primary-500/20 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
                >
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="no_decision">No Decision</option>
                </select>
              </div>
              <div>
                <label className="text-content-secondary mb-1 block text-sm font-medium">
                  Deal Amount
                </label>
                <input
                  type="number"
                  value={newIntel.dealAmount}
                  onChange={(e) => setNewIntel({ ...newIntel, dealAmount: e.target.value })}
                  placeholder="$0"
                  className="border-border-default bg-bg-elevated placeholder:text-content-tertiary focus:border-primary-500 focus:ring-primary-500/20 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
                />
              </div>
              {newIntel.outcome === "lost" && (
                <>
                  <div className="sm:col-span-2">
                    <label className="text-content-secondary mb-1 block text-sm font-medium">
                      Loss Reasons (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newIntel.lossReasons}
                      onChange={(e) => setNewIntel({ ...newIntel, lossReasons: e.target.value })}
                      placeholder="e.g., Price, Features, Support"
                      className="border-border-default bg-bg-elevated placeholder:text-content-tertiary focus:border-primary-500 focus:ring-primary-500/20 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-content-secondary mb-1 block text-sm font-medium">
                      Feature Gaps (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newIntel.featureGaps}
                      onChange={(e) => setNewIntel({ ...newIntel, featureGaps: e.target.value })}
                      placeholder="e.g., Mobile app, Reporting, Integrations"
                      className="border-border-default bg-bg-elevated placeholder:text-content-tertiary focus:border-primary-500 focus:ring-primary-500/20 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
                    />
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <label className="text-content-secondary mb-1 block text-sm font-medium">
                  Notes
                </label>
                <textarea
                  value={newIntel.details}
                  onChange={(e) => setNewIntel({ ...newIntel, details: e.target.value })}
                  placeholder="Any additional context..."
                  rows={2}
                  className="border-border-default bg-bg-elevated placeholder:text-content-tertiary focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAddIntel(false)}
                className="bg-bg-secondary text-content-primary hover:bg-bg-tertiary rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitIntel}
                disabled={submitting || !newIntel.competitorName}
                className="bg-success-600 hover:bg-success-700 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Intel"}
              </button>
            </div>
          </div>
        )}

        {/* Competitor Cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-32 rounded-xl" />
            ))}
          </div>
        ) : data && data.competitors.length > 0 ? (
          <div className="space-y-4">
            {data.competitors.map((comp) => {
              const isExpanded = expandedCompetitor === comp.id
              return (
                <div key={comp.id} className="card-sf overflow-hidden">
                  {/* Summary Row */}
                  <button
                    onClick={() => setExpandedCompetitor(isExpanded ? null : comp.id)}
                    className="hover:bg-bg-secondary flex w-full items-center justify-between p-4 text-left transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-content-primary text-lg font-semibold">{comp.name}</h3>
                        {comp.website && (
                          <a
                            href={comp.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 text-sm"
                          >
                            {comp.website.replace(/^https?:\/\//, "")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-content-primary text-lg font-bold">
                            {comp.stats.totalEncounters}
                          </p>
                          <p className="text-content-tertiary text-xs">encounters</p>
                        </div>
                        <div className="text-center">
                          <p className="text-success-600 dark:text-success-400 text-lg font-bold">
                            {comp.stats.wins}
                          </p>
                          <p className="text-content-tertiary text-xs">wins</p>
                        </div>
                        <div className="text-center">
                          <p className="text-error-600 dark:text-error-400 text-lg font-bold">
                            {comp.stats.losses}
                          </p>
                          <p className="text-content-tertiary text-xs">losses</p>
                        </div>
                        <div
                          className={cn(
                            "flex h-10 w-16 items-center justify-center rounded-lg text-lg font-bold",
                            comp.stats.winRate >= 50
                              ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                              : comp.stats.winRate >= 30
                                ? "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                                : "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                          )}
                        >
                          {comp.stats.winRate}%
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="text-content-tertiary h-5 w-5" />
                      ) : (
                        <ChevronDown className="text-content-tertiary h-5 w-5" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-border-default border-t p-4">
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Value Summary */}
                        <div className="bg-bg-secondary rounded-lg p-4">
                          <h4 className="text-content-primary mb-3 font-medium">Revenue Impact</h4>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <p className="text-content-tertiary text-xs">Won Value</p>
                              <p className="text-success-600 dark:text-success-400 text-xl font-bold">
                                {formatCompact(comp.stats.wonValue)}
                              </p>
                            </div>
                            <div className="flex-1">
                              <p className="text-content-tertiary text-xs">Lost Value</p>
                              <p className="text-error-600 dark:text-error-400 text-xl font-bold">
                                {formatCompact(comp.stats.lostValue)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="bg-bg-secondary rounded-lg p-4">
                          <h4 className="text-content-primary mb-3 font-medium">
                            Known Attributes
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-content-tertiary mb-1 text-xs">Their Strengths</p>
                              {comp.strengths.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {comp.strengths.slice(0, 3).map((s) => (
                                    <span
                                      key={s}
                                      className="bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400 rounded px-1.5 py-0.5 text-xs"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-content-tertiary text-sm">-</p>
                              )}
                            </div>
                            <div>
                              <p className="text-content-tertiary mb-1 text-xs">Their Weaknesses</p>
                              {comp.weaknesses.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {comp.weaknesses.slice(0, 3).map((w) => (
                                    <span
                                      key={w}
                                      className="bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 rounded px-1.5 py-0.5 text-xs"
                                    >
                                      {w}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-content-tertiary text-sm">-</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Top Loss Reasons */}
                        <div className="bg-bg-secondary rounded-lg p-4">
                          <h4 className="text-content-primary mb-3 font-medium">
                            Top Loss Reasons
                          </h4>
                          {comp.topLossReasons.length > 0 ? (
                            <div className="space-y-2">
                              {comp.topLossReasons.map((reason) => (
                                <div
                                  key={reason.reason}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-content-secondary text-sm">
                                    {reason.reason}
                                  </span>
                                  <span className="bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400 rounded px-2 py-0.5 text-xs font-medium">
                                    {reason.count}x
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-content-tertiary text-sm">No loss data yet</p>
                          )}
                        </div>

                        {/* Feature Gaps */}
                        <div className="bg-bg-secondary rounded-lg p-4">
                          <h4 className="text-content-primary mb-3 font-medium">Feature Gaps</h4>
                          {comp.topFeatureGaps.length > 0 ? (
                            <div className="space-y-2">
                              {comp.topFeatureGaps.map((gap) => (
                                <div
                                  key={gap.feature}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-content-secondary text-sm">
                                    {gap.feature}
                                  </span>
                                  <span className="bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 rounded px-2 py-0.5 text-xs font-medium">
                                    {gap.count}x
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-content-tertiary text-sm">
                              No feature gaps recorded
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Battlecard Link */}
                      {comp.battlecardUrl && (
                        <div className="mt-4">
                          <a
                            href={comp.battlecardUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 inline-flex items-center gap-1 text-sm font-medium"
                          >
                            View Battlecard
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card-sf p-12 text-center">
            <div className="bg-bg-secondary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Swords className="text-content-tertiary h-6 w-6" />
            </div>
            <h3 className="text-content-primary text-lg font-medium">No competitors tracked</h3>
            <p className="text-content-secondary mt-1">
              Click &quot;Log Win/Loss&quot; to start tracking competitive intel
            </p>
          </div>
        )}

        {/* Recent Intel Feed */}
        {recentIntel.length > 0 && (
          <div className="card-sf">
            <div className="border-border-default border-b px-6 py-4">
              <h2 className="text-content-primary text-lg font-semibold">Recent Intel</h2>
            </div>
            <div className="divide-border-default divide-y">
              {recentIntel.map((intel) => (
                <div key={intel.id} className="flex items-center gap-4 px-6 py-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      intel.outcome === "won"
                        ? "bg-success-100 dark:bg-success-900/30"
                        : intel.outcome === "lost"
                          ? "bg-error-100 dark:bg-error-900/30"
                          : "bg-bg-secondary"
                    )}
                  >
                    {intel.outcome === "won" ? (
                      <CheckCircle2 className="text-success-600 dark:text-success-400 h-4 w-4" />
                    ) : intel.outcome === "lost" ? (
                      <XCircle className="text-error-600 dark:text-error-400 h-4 w-4" />
                    ) : (
                      <AlertCircle className="text-content-tertiary h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-content-primary truncate text-sm font-medium">
                      {intel.title}
                    </p>
                    <p className="text-content-tertiary text-xs">
                      vs {intel.competitorName}
                      {intel.companyName && ` • ${intel.companyName}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-content-primary text-sm font-medium">
                      {intel.dealAmount ? formatCurrency(intel.dealAmount) : "-"}
                    </p>
                    <p className="text-content-tertiary text-xs">
                      {new Date(intel.reportedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
