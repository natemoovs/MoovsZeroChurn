"use client"

import { cn } from "@/lib/utils"

interface HealthChartProps {
  green: number
  yellow: number
  red: number
  className?: string
}

export function HealthChart({ green, yellow, red, className }: HealthChartProps) {
  const total = green + yellow + red
  if (total === 0) return null

  const greenPercent = (green / total) * 100
  const yellowPercent = (yellow / total) * 100
  const redPercent = (red / total) * 100

  return (
    <div className={cn("space-y-4", className)}>
      {/* Donut Chart */}
      <div className="relative mx-auto h-40 w-40">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          {/* Background circle */}
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            className="stroke-border-default"
            strokeWidth="3"
          />
          {/* Green segment */}
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            className="stroke-success-500"
            strokeWidth="3"
            strokeDasharray={`${greenPercent} ${100 - greenPercent}`}
            strokeDashoffset="0"
          />
          {/* Yellow segment */}
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            className="stroke-warning-500"
            strokeWidth="3"
            strokeDasharray={`${yellowPercent} ${100 - yellowPercent}`}
            strokeDashoffset={`${-greenPercent}`}
          />
          {/* Red segment */}
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            className="stroke-error-500"
            strokeWidth="3"
            strokeDasharray={`${redPercent} ${100 - redPercent}`}
            strokeDashoffset={`${-(greenPercent + yellowPercent)}`}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-content-primary text-3xl font-bold">{total}</span>
          <span className="text-content-secondary text-xs">accounts</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <span className="bg-success-500 h-3 w-3 rounded-full" />
          <span className="text-content-secondary text-sm">{green} Healthy</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-warning-500 h-3 w-3 rounded-full" />
          <span className="text-content-secondary text-sm">{yellow} Monitor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-error-500 h-3 w-3 rounded-full" />
          <span className="text-content-secondary text-sm">{red} At Risk</span>
        </div>
      </div>
    </div>
  )
}

export function HealthBar({ green, yellow, red }: HealthChartProps) {
  const total = green + yellow + red
  if (total === 0) return null

  const greenPercent = (green / total) * 100
  const yellowPercent = (yellow / total) * 100
  const redPercent = (red / total) * 100

  return (
    <div className="space-y-2">
      <div className="bg-bg-tertiary flex h-3 w-full overflow-hidden rounded-full">
        <div className="bg-success-500 transition-all" style={{ width: `${greenPercent}%` }} />
        <div className="bg-warning-500 transition-all" style={{ width: `${yellowPercent}%` }} />
        <div className="bg-error-500 transition-all" style={{ width: `${redPercent}%` }} />
      </div>
      <div className="text-content-secondary flex flex-wrap justify-between gap-1 text-xs">
        <span>{green} healthy</span>
        <span>{yellow} monitor</span>
        <span>{red} at risk</span>
      </div>
    </div>
  )
}
