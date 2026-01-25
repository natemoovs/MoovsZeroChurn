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
        className="card-interactive flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <HealthDot score={healthScore} size="md" />
          <div>
            <p className="text-content-primary font-medium">{name}</p>
            <p className="text-content-secondary text-sm">
              {mrr ? `$${mrr.toLocaleString()}/mo` : "—"} · {plan || "Unknown plan"}
            </p>
          </div>
        </div>
        {riskSignals.length > 0 && (
          <span className="text-error-600 dark:text-error-500 text-sm">{riskSignals[0]}</span>
        )}
        <ChevronRight className="text-content-tertiary h-4 w-4" />
      </Link>
    )
  }

  return (
    <Link
      href={`/accounts/${id}`}
      className="group card-glow spotlight block overflow-hidden p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <div className="bg-bg-tertiary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12">
            <Building2 className="text-content-secondary h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-content-primary truncate font-semibold">{name}</h3>
              <HealthBadge score={healthScore} size="sm" />
            </div>
            {domain && <p className="text-content-secondary mt-0.5 truncate text-sm">{domain}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm sm:gap-4">
              <span className="text-content-secondary flex items-center gap-1">
                <DollarSign className="h-4 w-4 shrink-0" />
                {mrr ? `$${mrr.toLocaleString()}/mo` : "—"}
              </span>
              <span className="text-content-tertiary hidden sm:inline">·</span>
              <span className="text-content-secondary truncate">{plan || "Unknown plan"}</span>
            </div>
          </div>
        </div>
        <ChevronRight className="text-content-tertiary group-hover:text-content-secondary h-5 w-5 shrink-0 transition-colors" />
      </div>

      {riskSignals.length > 0 && (
        <div className="bg-error-50 mt-4 flex items-start gap-2 rounded-lg p-3">
          <AlertTriangle className="text-error-500 mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="text-error-600 dark:text-error-500 text-sm">
            {riskSignals.slice(0, 2).join(" · ")}
          </div>
        </div>
      )}
    </Link>
  )
}

export function AccountCardSkeleton() {
  return (
    <div className="card-sf p-5">
      <div className="flex items-start gap-4">
        <div className="shimmer h-12 w-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="shimmer h-5 w-32 rounded" />
          <div className="shimmer h-4 w-24 rounded" />
          <div className="shimmer h-4 w-40 rounded" />
        </div>
      </div>
    </div>
  )
}
