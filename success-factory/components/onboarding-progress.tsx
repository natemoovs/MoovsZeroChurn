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
        <Loader2 className="h-5 w-5 animate-spin text-content-tertiary" />
      </div>
    )
  }

  if (!status || !status.milestones?.length) {
    return null
  }

  const statusColors = {
    complete: "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
    on_track: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    at_risk: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
    stalled: "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
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
            <span className="font-medium text-content-secondary">
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
          <div className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
            <div
              className={cn(
                "h-full transition-all",
                status.status === "complete"
                  ? "bg-success-500"
                  : status.status === "stalled"
                  ? "bg-error-500"
                  : status.status === "at_risk"
                  ? "bg-warning-500"
                  : "bg-blue-500"
              )}
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-content-secondary">
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
          <h3 className="font-semibold text-content-primary">
            Onboarding Progress
          </h3>
          <p className="text-sm text-content-secondary">
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
      <div className="h-2.5 overflow-hidden rounded-full bg-bg-tertiary">
        <div
          className={cn(
            "h-full transition-all duration-500",
            status.status === "complete"
              ? "bg-success-500"
              : status.status === "stalled"
              ? "bg-error-500"
              : status.status === "at_risk"
              ? "bg-warning-500"
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
                ? "border-success-200 bg-success-50 dark:border-success-900 dark:bg-success-950/30"
                : milestone.isOverdue
                ? "border-error-200 bg-error-50 dark:border-error-900 dark:bg-error-950/30"
                : "border-border-default bg-bg-elevated"
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                milestone.completedAt
                  ? "bg-success-500 text-white"
                  : milestone.isOverdue
                  ? "bg-error-100 text-error-600 dark:bg-error-900/50 dark:text-error-400"
                  : "bg-bg-tertiary text-content-tertiary"
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
                    ? "text-success-700 dark:text-success-400"
                    : milestone.isOverdue
                    ? "text-error-700 dark:text-error-400"
                    : "text-content-primary"
                )}
              >
                {milestone.name}
              </p>
              <p className="text-sm text-content-secondary">
                {milestone.completedAt ? (
                  `Completed ${new Date(milestone.completedAt).toLocaleDateString()}`
                ) : milestone.isOverdue ? (
                  <span className="text-error-600 dark:text-error-400">
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
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-success-600 hover:bg-success-100 dark:text-success-400 dark:hover:bg-success-900/30"
              >
                Mark Complete
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Next Steps */}
      {status.nextMilestone && status.daysToNextDeadline !== null && (
        <div className="flex items-center gap-2 rounded-lg bg-bg-tertiary p-3 text-sm">
          <Clock className="h-4 w-4 text-content-secondary" />
          <span className="text-content-secondary">
            Next: <strong>{status.nextMilestone.name}</strong>
            {status.daysToNextDeadline > 0 ? (
              <> — {status.daysToNextDeadline} days remaining</>
            ) : (
              <span className="text-error-600 dark:text-error-400">
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
