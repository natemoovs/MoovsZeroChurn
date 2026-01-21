"use client"

import Link from "next/link"
import { HealthBadge, HealthDot } from "./health-badge"
import { Building2, DollarSign, AlertTriangle, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type HealthScore = "green" | "yellow" | "red" | "unknown"

interface AccountCardProps {
  id: string
  name: string
  domain?: string | null
  healthScore: HealthScore
  mrr?: number | null
  plan?: string | null
  riskSignals?: string[]
  positiveSignals?: string[]
  variant?: "default" | "compact"
}

export function AccountCard({
  id,
  name,
  domain,
  healthScore,
  mrr,
  plan,
  riskSignals = [],
  variant = "default",
}: AccountCardProps) {
  if (variant === "compact") {
    return (
      <Link
        href={`/accounts/${id}`}
        className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      >
        <div className="flex items-center gap-3">
          <HealthDot score={healthScore} size="md" />
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{name}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {mrr ? `$${mrr.toLocaleString()}/mo` : "—"} · {plan || "Unknown plan"}
            </p>
          </div>
        </div>
        {riskSignals.length > 0 && (
          <span className="text-sm text-red-600 dark:text-red-400">
            {riskSignals[0]}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-zinc-400" />
      </Link>
    )
  }

  return (
    <Link
      href={`/accounts/${id}`}
      className="group block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Building2 className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {name}
              </h3>
              <HealthBadge score={healthScore} size="sm" />
            </div>
            {domain && (
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {domain}
              </p>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                <DollarSign className="h-4 w-4" />
                {mrr ? `$${mrr.toLocaleString()}/mo` : "—"}
              </span>
              <span className="text-zinc-400 dark:text-zinc-600">·</span>
              <span className="text-zinc-600 dark:text-zinc-400">
                {plan || "Unknown plan"}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-300 transition-colors group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
      </div>

      {riskSignals.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-950/50">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <div className="text-sm text-red-700 dark:text-red-400">
            {riskSignals.slice(0, 2).join(" · ")}
          </div>
        </div>
      )}
    </Link>
  )
}

export function AccountCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  )
}
