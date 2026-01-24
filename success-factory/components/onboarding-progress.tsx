"use client"

import { useEffect, useState } from "react"
import { Check, Circle, AlertTriangle, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Milestone {
  id: string
  name: string
  description: string
  targetDays: number
  isRequired: boolean
  completedAt: string | null
  isOverdue: boolean
}

interface OnboardingStatus {
  companyId: string
  companyName: string
  segment: string
  signupDate: string
  milestones: Milestone[]
  progress: number
  status: "on_track" | "at_risk" | "stalled" | "complete"
  nextMilestone: { id: string; name: string } | null
  daysToNextDeadline: number | null
}

interface OnboardingProgressProps {
  companyId: string
  compact?: boolean
  onComplete?: (milestone: string) => void
}

export function OnboardingProgress({
  companyId,
  compact = false,
  onComplete,
}: OnboardingProgressProps) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/onboarding/${companyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setStatus(data)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [companyId])

  const handleComplete = async (milestone: string) => {
    setCompleting(milestone)
    try {
      const res = await fetch(`/api/onboarding/${companyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", milestone }),
      })
      if (res.ok) {
        // Refresh status
        const updated = await fetch(`/api/onboarding/${companyId}`).then((r) =>
          r.json()
        )
        setStatus(updated)
        onComplete?.(milestone)
      }
    } catch (e) {
      console.error("Failed to complete milestone:", e)
    }
    setCompleting(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!status || !status.milestones?.length) {
    return null
  }

  const statusColors = {
    complete: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    on_track: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    at_risk: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    stalled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  const statusLabels = {
    complete: "Complete",
    on_track: "On Track",
    at_risk: "At Risk",
    stalled: "Stalled",
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Onboarding
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                statusColors[status.status]
              )}
            >
              {statusLabels[status.status]}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className={cn(
                "h-full transition-all",
                status.status === "complete"
                  ? "bg-emerald-500"
                  : status.status === "stalled"
                  ? "bg-red-500"
                  : status.status === "at_risk"
                  ? "bg-amber-500"
                  : "bg-blue-500"
              )}
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {status.progress}% complete
            {status.nextMilestone && ` • Next: ${status.nextMilestone.name}`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Onboarding Progress
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {status.progress}% complete •{" "}
            {status.milestones.filter((m) => m.completedAt).length} of{" "}
            {status.milestones.length} milestones
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium",
            statusColors[status.status]
          )}
        >
          {statusLabels[status.status]}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className={cn(
            "h-full transition-all duration-500",
            status.status === "complete"
              ? "bg-emerald-500"
              : status.status === "stalled"
              ? "bg-red-500"
              : status.status === "at_risk"
              ? "bg-amber-500"
              : "bg-blue-500"
          )}
          style={{ width: `${status.progress}%` }}
        />
      </div>

      {/* Milestones List */}
      <div className="space-y-2">
        {status.milestones.map((milestone) => (
          <div
            key={milestone.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3",
              milestone.completedAt
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                : milestone.isOverdue
                ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                milestone.completedAt
                  ? "bg-emerald-500 text-white"
                  : milestone.isOverdue
                  ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
              )}
            >
              {completing === milestone.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : milestone.completedAt ? (
                <Check className="h-4 w-4" />
              ) : milestone.isOverdue ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-medium",
                  milestone.completedAt
                    ? "text-emerald-700 dark:text-emerald-400"
                    : milestone.isOverdue
                    ? "text-red-700 dark:text-red-400"
                    : "text-zinc-900 dark:text-zinc-100"
                )}
              >
                {milestone.name}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {milestone.completedAt ? (
                  `Completed ${new Date(milestone.completedAt).toLocaleDateString()}`
                ) : milestone.isOverdue ? (
                  <span className="text-red-600 dark:text-red-400">
                    Overdue (target: {milestone.targetDays} days)
                  </span>
                ) : (
                  `Target: ${milestone.targetDays} days`
                )}
              </p>
            </div>

            {/* Action */}
            {!milestone.completedAt && (
              <button
                onClick={() => handleComplete(milestone.id)}
                disabled={completing === milestone.id}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
              >
                Mark Complete
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Next Steps */}
      {status.nextMilestone && status.daysToNextDeadline !== null && (
        <div className="flex items-center gap-2 rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
          <Clock className="h-4 w-4 text-zinc-500" />
          <span className="text-zinc-600 dark:text-zinc-400">
            Next: <strong>{status.nextMilestone.name}</strong>
            {status.daysToNextDeadline > 0 ? (
              <> — {status.daysToNextDeadline} days remaining</>
            ) : (
              <span className="text-red-600 dark:text-red-400">
                {" "}
                — Overdue by {Math.abs(status.daysToNextDeadline)} days
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
