"use client"

import { useEffect, useState } from "react"
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2,
  Send,
  MessageSquare,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NPSResponse {
  id: string
  companyId: string
  companyName: string
  contactEmail: string
  contactName: string | null
  score: number | null
  category: string | null
  comment: string | null
  triggerType: string
  sentAt: string
  respondedAt: string | null
  followedUpAt: string | null
  followUpNotes: string | null
}

interface NPSSummaryData {
  npsScore: number | null
  distribution: {
    promoters: number
    passives: number
    detractors: number
    total: number
  }
  responses: NPSResponse[]
  recentComments: NPSResponse[]
  pending: number
  period: { days: number; since: string }
}

interface NPSSummaryProps {
  companyId: string
  showSendButton?: boolean
}

export function NPSSummary({ companyId, showSendButton = true }: NPSSummaryProps) {
  const [data, setData] = useState<NPSSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [followingUp, setFollowingUp] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/nps?companyId=${companyId}&days=365`)
      .then((res) => res.json())
      .then((result) => {
        if (!result.error) {
          setData(result)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [companyId])

  const handleFollowUp = async (surveyId: string, notes?: string) => {
    setFollowingUp(surveyId)
    try {
      const res = await fetch(`/api/nps/${surveyId}/followup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      if (res.ok) {
        // Refresh data
        const result = await fetch(`/api/nps?companyId=${companyId}&days=365`).then(r => r.json())
        if (!result.error) setData(result)
      }
    } catch (error) {
      console.error("Follow-up failed:", error)
    }
    setFollowingUp(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-content-tertiary" />
      </div>
    )
  }

  if (!data || data.distribution.total === 0) {
    return (
      <div className="card-sf p-6 text-center">
        <MessageSquare className="mx-auto mb-2 h-8 w-8 text-content-tertiary" />
        <p className="text-sm text-content-secondary">
          No NPS responses yet
        </p>
        {showSendButton && (
          <p className="mt-2 text-xs text-content-tertiary">
            Send an NPS survey to collect feedback
          </p>
        )}
      </div>
    )
  }

  const { npsScore, distribution, responses, pending } = data

  // Calculate trend from responses
  const recentResponses = responses.filter(r => r.score !== null).slice(0, 3)
  const olderResponses = responses.filter(r => r.score !== null).slice(3, 6)
  const recentAvg = recentResponses.length > 0
    ? recentResponses.reduce((sum, r) => sum + (r.score || 0), 0) / recentResponses.length
    : null
  const olderAvg = olderResponses.length > 0
    ? olderResponses.reduce((sum, r) => sum + (r.score || 0), 0) / olderResponses.length
    : null
  const trend = recentAvg && olderAvg
    ? recentAvg > olderAvg ? "improving" : recentAvg < olderAvg ? "declining" : "stable"
    : "unknown"

  // Find detractors that need follow-up
  const detractorsNeedingFollowUp = responses.filter(
    r => r.category === "detractor" && r.respondedAt && !r.followedUpAt
  )

  return (
    <div className="space-y-4">
      {/* NPS Score Card */}
      <div className="card-sf p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-content-primary">NPS Score</h3>
          {trend !== "unknown" && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend === "improving" && "text-success-600 dark:text-success-400",
              trend === "declining" && "text-error-600 dark:text-error-400",
              trend === "stable" && "text-content-secondary"
            )}>
              {trend === "improving" ? <TrendingUp className="h-3 w-3" /> :
               trend === "declining" ? <TrendingDown className="h-3 w-3" /> :
               <Minus className="h-3 w-3" />}
              {trend}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-end gap-4">
          <div className={cn(
            "text-5xl font-bold",
            npsScore !== null && npsScore >= 50 && "text-success-600 dark:text-success-400",
            npsScore !== null && npsScore >= 0 && npsScore < 50 && "text-warning-600 dark:text-warning-400",
            npsScore !== null && npsScore < 0 && "text-error-600 dark:text-error-400"
          )}>
            {npsScore !== null ? npsScore : "—"}
          </div>
          <div className="mb-1 text-sm text-content-secondary">
            {distribution.total} responses
          </div>
        </div>

        {/* Distribution Bar */}
        <div className="mt-4">
          <div className="flex h-3 overflow-hidden rounded-full bg-bg-tertiary">
            {distribution.promoters > 0 && (
              <div
                className="bg-success-500"
                style={{ width: `${(distribution.promoters / distribution.total) * 100}%` }}
              />
            )}
            {distribution.passives > 0 && (
              <div
                className="bg-warning-500"
                style={{ width: `${(distribution.passives / distribution.total) * 100}%` }}
              />
            )}
            {distribution.detractors > 0 && (
              <div
                className="bg-error-500"
                style={{ width: `${(distribution.detractors / distribution.total) * 100}%` }}
              />
            )}
          </div>
          <div className="mt-2 flex justify-between text-xs text-content-secondary">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3 text-success-500" />
              <span>{distribution.promoters} promoters</span>
            </div>
            <div className="flex items-center gap-1">
              <Minus className="h-3 w-3 text-warning-500" />
              <span>{distribution.passives} passives</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsDown className="h-3 w-3 text-error-500" />
              <span>{distribution.detractors} detractors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detractors Needing Follow-Up */}
      {detractorsNeedingFollowUp.length > 0 && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-900 dark:bg-error-950/30">
          <div className="mb-3 flex items-center gap-2">
            <ThumbsDown className="h-5 w-5 text-error-600 dark:text-error-400" />
            <h3 className="font-semibold text-error-900 dark:text-error-200">
              Detractors Needing Follow-Up
            </h3>
          </div>
          <div className="space-y-3">
            {detractorsNeedingFollowUp.slice(0, 3).map((response) => (
              <div
                key={response.id}
                className="rounded-lg border border-error-200 bg-bg-elevated p-3 dark:border-error-800 dark:bg-error-950/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-content-primary">
                      {response.contactName || response.contactEmail}
                    </p>
                    <p className="text-sm text-content-secondary">
                      Score: {response.score}/10 • {formatDate(response.respondedAt!)}
                    </p>
                    {response.comment && (
                      <p className="mt-2 text-sm italic text-content-secondary">
                        &quot;{response.comment}&quot;
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleFollowUp(response.id, "Reached out to address concerns")}
                    disabled={followingUp === response.id}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      "bg-error-600 text-white hover:bg-error-700",
                      "disabled:opacity-50"
                    )}
                  >
                    {followingUp === response.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Mark Followed Up"
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Responses */}
      <div className="card-sf p-5">
        <h3 className="mb-3 font-semibold text-content-primary">
          Recent Responses
        </h3>
        <div className="space-y-3">
          {responses.slice(0, 5).map((response) => (
            <div
              key={response.id}
              className="flex items-center gap-3 rounded-lg border border-border-default p-3"
            >
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                response.category === "promoter" && "bg-success-100 text-success-600 dark:bg-success-900/30",
                response.category === "passive" && "bg-warning-100 text-warning-600 dark:bg-warning-900/30",
                response.category === "detractor" && "bg-error-100 text-error-600 dark:bg-error-900/30"
              )}>
                {response.score !== null ? (
                  <span className="text-lg font-bold">{response.score}</span>
                ) : (
                  <Clock className="h-5 w-5 text-content-tertiary" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-content-primary">
                  {response.contactName || response.contactEmail}
                </p>
                <p className="text-sm text-content-secondary">
                  {response.respondedAt ? formatDate(response.respondedAt) : "Pending response"}
                  {response.followedUpAt && (
                    <span className="ml-2 inline-flex items-center gap-1 text-success-600 dark:text-success-400">
                      <CheckCircle className="h-3 w-3" />
                      Followed up
                    </span>
                  )}
                </p>
              </div>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                response.category === "promoter" && "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
                response.category === "passive" && "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
                response.category === "detractor" && "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
                !response.category && "bg-bg-tertiary text-content-secondary"
              )}>
                {response.category || "pending"}
              </span>
            </div>
          ))}
        </div>

        {pending > 0 && (
          <p className="mt-3 text-center text-sm text-content-secondary">
            {pending} surveys pending response
          </p>
        )}
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}
