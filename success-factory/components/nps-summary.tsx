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
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!data || data.distribution.total === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <MessageSquare className="mx-auto mb-2 h-8 w-8 text-zinc-400" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No NPS responses yet
        </p>
        {showSendButton && (
          <p className="mt-2 text-xs text-zinc-400">
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
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">NPS Score</h3>
          {trend !== "unknown" && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend === "improving" && "text-emerald-600 dark:text-emerald-400",
              trend === "declining" && "text-red-600 dark:text-red-400",
              trend === "stable" && "text-zinc-500 dark:text-zinc-400"
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
            npsScore !== null && npsScore >= 50 && "text-emerald-600 dark:text-emerald-400",
            npsScore !== null && npsScore >= 0 && npsScore < 50 && "text-amber-600 dark:text-amber-400",
            npsScore !== null && npsScore < 0 && "text-red-600 dark:text-red-400"
          )}>
            {npsScore !== null ? npsScore : "—"}
          </div>
          <div className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
            {distribution.total} responses
          </div>
        </div>

        {/* Distribution Bar */}
        <div className="mt-4">
          <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            {distribution.promoters > 0 && (
              <div
                className="bg-emerald-500"
                style={{ width: `${(distribution.promoters / distribution.total) * 100}%` }}
              />
            )}
            {distribution.passives > 0 && (
              <div
                className="bg-amber-500"
                style={{ width: `${(distribution.passives / distribution.total) * 100}%` }}
              />
            )}
            {distribution.detractors > 0 && (
              <div
                className="bg-red-500"
                style={{ width: `${(distribution.detractors / distribution.total) * 100}%` }}
              />
            )}
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3 text-emerald-500" />
              <span>{distribution.promoters} promoters</span>
            </div>
            <div className="flex items-center gap-1">
              <Minus className="h-3 w-3 text-amber-500" />
              <span>{distribution.passives} passives</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsDown className="h-3 w-3 text-red-500" />
              <span>{distribution.detractors} detractors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detractors Needing Follow-Up */}
      {detractorsNeedingFollowUp.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <div className="mb-3 flex items-center gap-2">
            <ThumbsDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h3 className="font-semibold text-red-900 dark:text-red-200">
              Detractors Needing Follow-Up
            </h3>
          </div>
          <div className="space-y-3">
            {detractorsNeedingFollowUp.slice(0, 3).map((response) => (
              <div
                key={response.id}
                className="rounded-lg border border-red-200 bg-white p-3 dark:border-red-800 dark:bg-red-950/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {response.contactName || response.contactEmail}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Score: {response.score}/10 • {formatDate(response.respondedAt!)}
                    </p>
                    {response.comment && (
                      <p className="mt-2 text-sm italic text-zinc-600 dark:text-zinc-300">
                        &quot;{response.comment}&quot;
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleFollowUp(response.id, "Reached out to address concerns")}
                    disabled={followingUp === response.id}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      "bg-red-600 text-white hover:bg-red-700",
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
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Responses
        </h3>
        <div className="space-y-3">
          {responses.slice(0, 5).map((response) => (
            <div
              key={response.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
            >
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                response.category === "promoter" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30",
                response.category === "passive" && "bg-amber-100 text-amber-600 dark:bg-amber-900/30",
                response.category === "detractor" && "bg-red-100 text-red-600 dark:bg-red-900/30"
              )}>
                {response.score !== null ? (
                  <span className="text-lg font-bold">{response.score}</span>
                ) : (
                  <Clock className="h-5 w-5 text-zinc-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {response.contactName || response.contactEmail}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {response.respondedAt ? formatDate(response.respondedAt) : "Pending response"}
                  {response.followedUpAt && (
                    <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="h-3 w-3" />
                      Followed up
                    </span>
                  )}
                </p>
              </div>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                response.category === "promoter" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                response.category === "passive" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                response.category === "detractor" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                !response.category && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              )}>
                {response.category || "pending"}
              </span>
            </div>
          ))}
        </div>

        {pending > 0 && (
          <p className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
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
