"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface CohortData {
  cohort: string
  totalCompanies: number
  activeCompanies: number
  churnedCompanies: number
  retentionRate: number
  totalMrr: number
  avgMrr: number
}

interface CohortSurvivalChartProps {
  cohorts: CohortData[]
  className?: string
}

export function CohortSurvivalChart({ cohorts, className }: CohortSurvivalChartProps) {
  // Generate survival curve data - simulates retention over time periods
  const survivalData = useMemo(() => {
    if (cohorts.length === 0) return []

    // Take up to 8 most recent cohorts for the chart
    const recentCohorts = cohorts.slice(0, 8)

    // Simulate survival rates over 12 periods (months since signup)
    return recentCohorts.map((cohort) => {
      const baseRetention = cohort.retentionRate / 100
      const periods: number[] = []

      // Generate survival curve - starts at 100% and decays
      for (let i = 0; i <= 12; i++) {
        if (i === 0) {
          periods.push(100)
        } else {
          // Exponential decay model based on cohort's current retention
          const monthlyChurn = 1 - Math.pow(baseRetention, 1 / 12)
          const survival = 100 * Math.pow(1 - monthlyChurn, i)
          periods.push(Math.max(0, Math.round(survival)))
        }
      }

      return {
        cohort: cohort.cohort,
        retention: cohort.retentionRate,
        periods,
        color: getColorForRetention(cohort.retentionRate),
      }
    })
  }, [cohorts])

  if (cohorts.length === 0) {
    return null
  }

  const maxPeriods = 12
  const chartHeight = 280
  const leftPadding = 48
  const rightPadding = 16
  const topPadding = 20
  const bottomPadding = 32

  return (
    <div className={cn("card-sf p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-content-primary text-lg font-semibold">Cohort Survival Curves</h3>
          <p className="text-content-secondary text-sm">Retention trajectory by signup cohort</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight }}>
        {/* Y-axis labels */}
        <div className="absolute top-0 left-0 flex h-full flex-col justify-between pt-4 pb-8">
          {[100, 75, 50, 25, 0].map((val) => (
            <span key={val} className="text-content-tertiary text-xs">
              {val}%
            </span>
          ))}
        </div>

        {/* Grid lines */}
        <div
          className="absolute inset-0"
          style={{
            left: leftPadding,
            right: rightPadding,
            top: topPadding,
            bottom: bottomPadding,
          }}
        >
          {[0, 25, 50, 75, 100].map((val) => (
            <div
              key={val}
              className="bg-bg-tertiary absolute h-px w-full"
              style={{ top: `${100 - val}%` }}
            />
          ))}
        </div>

        {/* SVG Chart Area */}
        <svg
          className="absolute inset-0"
          style={{
            left: leftPadding,
            right: rightPadding,
            top: topPadding,
            bottom: bottomPadding,
          }}
          viewBox={`0 0 100 100`}
          preserveAspectRatio="none"
        >
          {survivalData.map((cohort, idx) => {
            const points = cohort.periods
              .map((val, i) => {
                const x = (i / maxPeriods) * 100
                const y = 100 - val
                return `${x},${y}`
              })
              .join(" ")

            return (
              <polyline
                key={cohort.cohort}
                points={points}
                fill="none"
                stroke={cohort.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all hover:stroke-[3]"
                style={{ opacity: 0.8 - idx * 0.08 }}
              />
            )
          })}
        </svg>

        {/* X-axis labels */}
        <div
          className="absolute bottom-0 flex justify-between"
          style={{
            left: leftPadding,
            right: rightPadding,
          }}
        >
          {[0, 3, 6, 9, 12].map((month) => (
            <span key={month} className="text-content-tertiary text-xs">
              {month === 0 ? "Start" : `M${month}`}
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-3">
        {survivalData.map((cohort) => (
          <div
            key={cohort.cohort}
            className="border-border-default bg-bg-tertiary flex items-center gap-2 rounded-lg border px-3 py-1.5"
          >
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cohort.color }} />
            <span className="text-content-secondary text-sm font-medium">{cohort.cohort}</span>
            <span className="text-content-secondary text-xs">({cohort.retention}%)</span>
          </div>
        ))}
      </div>

      {/* Info */}
      <p className="text-content-tertiary mt-4 text-xs">
        Curves show projected retention over 12 months based on current cohort performance
      </p>
    </div>
  )
}

function getColorForRetention(retention: number): string {
  if (retention >= 90) return "#10b981" // emerald-500
  if (retention >= 80) return "#22c55e" // green-500
  if (retention >= 70) return "#eab308" // yellow-500
  if (retention >= 60) return "#f59e0b" // amber-500
  if (retention >= 50) return "#f97316" // orange-500
  return "#ef4444" // red-500
}
