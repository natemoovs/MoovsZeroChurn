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
  if (probability >= 70) return "text-error-600 dark:text-error-400"
  if (probability >= 40) return "text-warning-600 dark:text-warning-400"
  return "text-success-600 dark:text-success-400"
}

function getRiskBgColor(probability: number): string {
  if (probability >= 70) return "bg-error-500"
  if (probability >= 40) return "bg-warning-500"
  return "bg-success-500"
}

function getConfidenceBadge(confidence: string): string {
  switch (confidence) {
    case "high":
      return "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
    case "medium":
      return "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
    default:
      return "bg-bg-secondary text-content-secondary"
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
              <Brain className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              <h1 className="text-2xl font-bold text-content-primary">
                Churn Predictions
              </h1>
            </div>
            <p className="mt-1 text-content-secondary">
              ML-powered churn probability analysis
            </p>
          </div>
          <button
            onClick={fetchPredictions}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh Model
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-900/50 dark:bg-error-950/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error-100 dark:bg-error-900/50">
                  <AlertTriangle className="h-5 w-5 text-error-600 dark:text-error-400" />
                </div>
                <div>
                  <p className="text-sm text-error-700 dark:text-error-400">
                    High Risk
                  </p>
                  <p className="text-2xl font-bold text-error-800 dark:text-error-300">
                    {summary.highRisk}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-900/50 dark:bg-warning-950/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100 dark:bg-warning-900/50">
                  <Target className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                </div>
                <div>
                  <p className="text-sm text-warning-700 dark:text-warning-400">
                    Medium Risk
                  </p>
                  <p className="text-2xl font-bold text-warning-800 dark:text-warning-300">
                    {summary.mediumRisk}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-success-200 bg-success-50 p-4 dark:border-success-900/50 dark:bg-success-950/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-900/50">
                  <Shield className="h-5 w-5 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <p className="text-sm text-success-700 dark:text-success-400">
                    Low Risk
                  </p>
                  <p className="text-2xl font-bold text-success-800 dark:text-success-300">
                    {summary.lowRisk}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-sf p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-secondary">
                  <DollarSign className="h-5 w-5 text-content-secondary" />
                </div>
                <div>
                  <p className="text-sm text-content-secondary">
                    At-Risk MRR
                  </p>
                  <p className="text-2xl font-bold text-content-primary">
                    {formatCurrency(summary.atRiskMrr)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Filter */}
        <div className="flex flex-wrap gap-1 rounded-lg border border-border-default bg-bg-secondary p-1">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setRiskFilter(btn.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                riskFilter === btn.value
                  ? "bg-bg-elevated text-content-primary shadow-sm"
                  : "text-content-secondary hover:text-content-primary"
              )}
            >
              {btn.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  riskFilter === btn.value
                    ? "bg-bg-secondary"
                    : "bg-bg-tertiary"
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
            <div className="card-sf">
              <div className="border-b border-border-default p-4">
                <h2 className="font-semibold text-content-primary">
                  Accounts by Risk
                </h2>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="space-y-2 p-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="shimmer h-16 rounded-lg"
                      />
                    ))}
                  </div>
                ) : filteredPredictions.length === 0 ? (
                  <div className="p-8 text-center text-content-secondary">
                    No accounts match this filter
                  </div>
                ) : (
                  <div className="divide-y divide-border-default">
                    {filteredPredictions.map((prediction) => (
                      <button
                        key={prediction.companyId}
                        onClick={() => setSelectedPrediction(prediction)}
                        className={cn(
                          "flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-bg-secondary",
                          selectedPrediction?.companyId === prediction.companyId &&
                            "bg-primary-50 dark:bg-primary-950/30"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-content-primary">
                              {prediction.companyName}
                            </p>
                            {prediction.trend === "declining" && (
                              <TrendingDown className="h-4 w-4 text-error-500" />
                            )}
                            {prediction.trend === "improving" && (
                              <TrendingUp className="h-4 w-4 text-success-500" />
                            )}
                          </div>
                          <p className="text-sm text-content-secondary">
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
                          <ChevronRight className="h-4 w-4 text-content-tertiary" />
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
                <div className="card-sf p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        href={`/accounts/${selectedPrediction.companyId}`}
                        className="text-xl font-bold text-content-primary hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        {selectedPrediction.companyName}
                      </Link>
                      <p className="mt-1 text-sm text-content-secondary">
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
                          <TrendingDown className="h-6 w-6 text-error-500" />
                        )}
                        {selectedPrediction.trend === "improving" && (
                          <TrendingUp className="h-6 w-6 text-success-500" />
                        )}
                        {selectedPrediction.trend === "stable" && (
                          <Minus className="h-6 w-6 text-content-tertiary" />
                        )}
                      </div>
                      <p className="text-sm text-content-secondary">
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
                    <div className="flex h-3 overflow-hidden rounded-full bg-bg-secondary">
                      <div
                        className={cn(
                          "transition-all",
                          getRiskBgColor(selectedPrediction.churnProbability)
                        )}
                        style={{ width: `${selectedPrediction.churnProbability}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-content-tertiary">
                      <span>Low Risk</span>
                      <span>High Risk</span>
                    </div>
                  </div>

                  {selectedPrediction.predictedChurnDate && (
                    <div className="mt-4 rounded-lg border border-error-200 bg-error-50 p-3 dark:border-error-900/50 dark:bg-error-950/30">
                      <p className="text-sm font-medium text-error-700 dark:text-error-400">
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
                  <div className="rounded-xl border border-error-200 bg-bg-elevated p-4 dark:border-error-900/50">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold text-error-700 dark:text-error-400">
                      <AlertTriangle className="h-4 w-4" />
                      Risk Factors
                    </h3>
                    {selectedPrediction.riskFactors.length === 0 ? (
                      <p className="text-sm text-content-secondary">No significant risk factors</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedPrediction.riskFactors.map((factor, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-error-100 bg-error-50/50 p-3 dark:border-error-900/30 dark:bg-error-950/20"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-error-800 dark:text-error-300">
                                {factor.factor}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  factor.impact === "high"
                                    ? "bg-error-200 text-error-800 dark:bg-error-900/50 dark:text-error-300"
                                    : "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                )}
                              >
                                {factor.impact}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-error-600 dark:text-error-400">
                              {factor.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Protective Factors */}
                  <div className="rounded-xl border border-success-200 bg-bg-elevated p-4 dark:border-success-900/50">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold text-success-700 dark:text-success-400">
                      <Shield className="h-4 w-4" />
                      Protective Factors
                    </h3>
                    {selectedPrediction.protectiveFactors.length === 0 ? (
                      <p className="text-sm text-content-secondary">No protective factors identified</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedPrediction.protectiveFactors.map((factor, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-success-100 bg-success-50/50 p-3 dark:border-success-900/30 dark:bg-success-950/20"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-success-800 dark:text-success-300">
                                {factor.factor}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  factor.impact === "high"
                                    ? "bg-success-200 text-success-800 dark:bg-success-900/50 dark:text-success-300"
                                    : "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                                )}
                              >
                                {factor.impact}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-success-600 dark:text-success-400">
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
                  <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-900/50 dark:bg-primary-950/30">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold text-primary-700 dark:text-primary-400">
                      <Lightbulb className="h-4 w-4" />
                      Recommended Actions
                    </h3>
                    <ul className="space-y-2">
                      {selectedPrediction.recommendedActions.map((action, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-sm text-primary-700 dark:text-primary-300"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="card-sf flex h-96 items-center justify-center">
                <div className="text-center">
                  <Brain className="mx-auto h-12 w-12 text-content-tertiary" />
                  <p className="mt-4 text-content-secondary">
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
