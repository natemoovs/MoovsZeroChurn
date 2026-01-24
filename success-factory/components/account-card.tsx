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
            <p className="font-medium text-content-primary">{name}</p>
            <p className="text-sm text-content-secondary">
              {mrr ? `$${mrr.toLocaleString()}/mo` : "—"} · {plan || "Unknown plan"}
            </p>
          </div>
        </div>
        {riskSignals.length > 0 && (
          <span className="text-sm text-error-600 dark:text-error-500">
            {riskSignals[0]}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-content-tertiary" />
      </Link>
    )
  }

  return (
    <Link
      href={`/accounts/${id}`}
      className="group block overflow-hidden card-glow spotlight p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary sm:h-12 sm:w-12">
            <Building2 className="h-5 w-5 text-content-secondary sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-content-primary">
                {name}
              </h3>
              <HealthBadge score={healthScore} size="sm" />
            </div>
            {domain && (
              <p className="mt-0.5 truncate text-sm text-content-secondary">
                {domain}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm sm:gap-4">
              <span className="flex items-center gap-1 text-content-secondary">
                <DollarSign className="h-4 w-4 shrink-0" />
                {mrr ? `$${mrr.toLocaleString()}/mo` : "—"}
              </span>
              <span className="hidden text-content-tertiary sm:inline">·</span>
              <span className="truncate text-content-secondary">
                {plan || "Unknown plan"}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-content-tertiary transition-colors group-hover:text-content-secondary" />
      </div>

      {riskSignals.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-error-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error-500" />
          <div className="text-sm text-error-600 dark:text-error-500">
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
        <div className="h-12 w-12 shimmer rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 shimmer rounded" />
          <div className="h-4 w-24 shimmer rounded" />
          <div className="h-4 w-40 shimmer rounded" />
        </div>
      </div>
    </div>
  )
}
