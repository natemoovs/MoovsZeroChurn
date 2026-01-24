"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Brain,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Shield,
  DollarSign,
  Target,
  ChevronRight,
  RefreshCw,
  Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RiskFactor {
  factor: string
  impact: "high" | "medium" | "low"
  score: number
  description: string
}

interface ChurnPrediction {
  companyId: string
  companyName: string
  domain: string | null
  segment: string | null
  mrr: number | null
  churnProbability: number
  confidence: "high" | "medium" | "low"
  riskFactors: RiskFactor[]
  protectiveFactors: RiskFactor[]
  trend: "improving" | "stable" | "declining"
  predictedChurnDate: string | null
  recommendedActions: string[]
}

interface PredictionSummary {
  totalAccounts: number
  highRisk: number
  mediumRisk: number
  lowRisk: number
  atRiskMrr: number
  avgChurnProbability: number
}

type RiskFilter = "all" | "high" | "medium" | "low"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getRiskColor(probability: number): string {
  if (probability >= 70) return "text-red-600 dark:text-red-400"
  if (probability >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-emerald-600 dark:text-emerald-400"
}

function getRiskBgColor(probability: number): string {
  if (probability >= 70) return "bg-red-500"
  if (probability >= 40) return "bg-amber-500"
  return "bg-emerald-500"
}

function getConfidenceBadge(confidence: string): string {
  switch (confidence) {
    case "high":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
  }
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<ChurnPrediction[]>([])
  const [summary, setSummary] = useState<PredictionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all")
  const [selectedPrediction, setSelectedPrediction] = useState<ChurnPrediction | null>(null)

  useEffect(() => {
    fetchPredictions()
  }, [])

  async function fetchPredictions() {
    setLoading(true)
    try {
      const res = await fetch("/api/churn-prediction")
      const data = await res.json()
      setPredictions(data.predictions || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error("Failed to fetch predictions:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPredictions = predictions.filter((p) => {
    if (riskFilter === "high") return p.churnProbability >= 70
    if (riskFilter === "medium") return p.churnProbability >= 40 && p.churnProbability < 70
    if (riskFilter === "low") return p.churnProbability < 40
    return true
  })

  const filterButtons: { value: RiskFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: summary?.totalAccounts || 0 },
    { value: "high", label: "High Risk", count: summary?.highRisk || 0 },
    { value: "medium", label: "Medium Risk", count: summary?.mediumRisk || 0 },
    { value: "low", label: "Low Risk", count: summary?.lowRisk || 0 },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Churn Predictions
              </h1>
            </div>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              ML-powered churn probability analysis
            </p>
          </div>
          <button
            onClick={fetchPredictions}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh Model
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/50">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    High Risk
                  </p>
                  <p className="text-2xl font-bold text-red-800 dark:text-red-300">
                    {summary.highRisk}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                  <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Medium Risk
                  </p>
                  <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                    {summary.mediumRisk}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    Low Risk
                  </p>
                  <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                    {summary.lowRisk}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <DollarSign className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    At-Risk MRR
                  </p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(summary.atRiskMrr)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Filter */}
        <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setRiskFilter(btn.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                riskFilter === btn.value
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              {btn.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  riskFilter === btn.value
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "bg-zinc-200/50 dark:bg-zinc-700/50"
                )}
              >
                {btn.count}
              </span>
            </button>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Predictions List */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Accounts by Risk
                </h2>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="space-y-2 p-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
                      />
                    ))}
                  </div>
                ) : filteredPredictions.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                    No accounts match this filter
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredPredictions.map((prediction) => (
                      <button
                        key={prediction.companyId}
                        onClick={() => setSelectedPrediction(prediction)}
                        className={cn(
                          "flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                          selectedPrediction?.companyId === prediction.companyId &&
                            "bg-purple-50 dark:bg-purple-950/30"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                              {prediction.companyName}
                            </p>
                            {prediction.trend === "declining" && (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            {prediction.trend === "improving" && (
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                            )}
                          </div>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {formatCurrency(prediction.mrr || 0)} MRR
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "text-lg font-bold",
                              getRiskColor(prediction.churnProbability)
                            )}
                          >
                            {prediction.churnProbability}%
                          </div>
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prediction Detail */}
          <div className="lg:col-span-2">
            {selectedPrediction ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        href={`/accounts/${selectedPrediction.companyId}`}
                        className="text-xl font-bold text-zinc-900 hover:text-purple-600 dark:text-zinc-100 dark:hover:text-purple-400"
                      >
                        {selectedPrediction.companyName}
                      </Link>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {selectedPrediction.segment || "Unknown segment"} •{" "}
                        {formatCurrency(selectedPrediction.mrr || 0)} MRR
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-3xl font-bold",
                            getRiskColor(selectedPrediction.churnProbability)
                          )}
                        >
                          {selectedPrediction.churnProbability}%
                        </span>
                        {selectedPrediction.trend === "declining" && (
                          <TrendingDown className="h-6 w-6 text-red-500" />
                        )}
                        {selectedPrediction.trend === "improving" && (
                          <TrendingUp className="h-6 w-6 text-emerald-500" />
                        )}
                        {selectedPrediction.trend === "stable" && (
                          <Minus className="h-6 w-6 text-zinc-400" />
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Churn Probability
                      </p>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          getConfidenceBadge(selectedPrediction.confidence)
                        )}
                      >
                        {selectedPrediction.confidence} confidence
                      </span>
                    </div>
                  </div>

                  {/* Risk meter */}
                  <div className="mt-4">
                    <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className={cn(
                          "transition-all",
                          getRiskBgColor(selectedPrediction.churnProbability)
                        )}
                        style={{ width: `${selectedPrediction.churnProbability}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-zinc-400">
                      <span>Low Risk</span>
                      <span>High Risk</span>
                    </div>
                  </div>

                  {selectedPrediction.predictedChurnDate && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        Predicted churn window: by{" "}
                        {new Date(selectedPrediction.predictedChurnDate).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Risk & Protective Factors */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Risk Factors */}
                  <div className="rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-zinc-900">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      Risk Factors
                    </h3>
                    {selectedPrediction.riskFactors.length === 0 ? (
                      <p className="text-sm text-zinc-500">No significant risk factors</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedPrediction.riskFactors.map((factor, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-red-100 bg-red-50/50 p-3 dark:border-red-900/30 dark:bg-red-950/20"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-red-800 dark:text-red-300">
                                {factor.factor}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  factor.impact === "high"
                                    ? "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                )}
                              >
                                {factor.impact}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                              {factor.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Protective Factors */}
                  <div className="rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-900/50 dark:bg-zinc-900">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                      <Shield className="h-4 w-4" />
                      Protective Factors
                    </h3>
                    {selectedPrediction.protectiveFactors.length === 0 ? (
                      <p className="text-sm text-zinc-500">No protective factors identified</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedPrediction.protectiveFactors.map((factor, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-emerald-800 dark:text-emerald-300">
                                {factor.factor}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  factor.impact === "high"
                                    ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                )}
                              >
                                {factor.impact}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                              {factor.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommended Actions */}
                {selectedPrediction.recommendedActions.length > 0 && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-900/50 dark:bg-purple-950/30">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold text-purple-700 dark:text-purple-400">
                      <Lightbulb className="h-4 w-4" />
                      Recommended Actions
                    </h3>
                    <ul className="space-y-2">
                      {selectedPrediction.recommendedActions.map((action, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-96 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-center">
                  <Brain className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                  <p className="mt-4 text-zinc-500 dark:text-zinc-400">
                    Select an account to view prediction details
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
