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
            className="stroke-zinc-100 dark:stroke-zinc-800"
            strokeWidth="3"
          />
          {/* Green segment */}
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            className="stroke-emerald-500"
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
            className="stroke-amber-500"
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
            className="stroke-red-500"
            strokeWidth="3"
            strokeDasharray={`${redPercent} ${100 - redPercent}`}
            strokeDashoffset={`${-(greenPercent + yellowPercent)}`}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {total}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            accounts
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {green} Healthy
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {yellow} Monitor
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {red} At Risk
          </span>
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
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${greenPercent}%` }}
        />
        <div
          className="bg-amber-500 transition-all"
          style={{ width: `${yellowPercent}%` }}
        />
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${redPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{green} healthy</span>
        <span>{yellow} monitor</span>
        <span>{red} at risk</span>
      </div>
    </div>
  )
}
