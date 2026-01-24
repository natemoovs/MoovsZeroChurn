"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Users, TrendingUp, AlertTriangle, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Account {
  companyId: string
  companyName: string
  domain: string | null
  healthScore: "green" | "yellow" | "red" | "unknown"
  mrr: number | null
  plan: string | null
  customerSegment: string | null
  riskSignals: string[]
  totalTrips?: number
}

interface CSM {
  name: string
  email: string
  segments: string[]
}

// CSM Assignments based on customer segment
// Nate handles Enterprise accounts ($499+ MRR)
// Andrea handles Mid-Market and SMB accounts
const CSM_ASSIGNMENTS: CSM[] = [
  { name: "Nate", email: "nate@moovs.com", segments: ["enterprise"] },
  { name: "Andrea", email: "andrea@moovs.com", segments: ["mid-market", "smb"] },
]

function assignCSM(segment: string | null, mrr: number | null): CSM | null {
  // Free accounts (no MRR) have no dedicated CSM
  if (!mrr || mrr <= 0) return null

  const normalized = segment?.toLowerCase() || ""

  // First try to match by segment name
  for (const csm of CSM_ASSIGNMENTS) {
    if (csm.segments.some(s => normalized.includes(s))) {
      return csm
    }
  }

  // Fallback: assign by MRR threshold if segment not set
  // Enterprise: $499+ MRR, everyone else to Andrea
  if (mrr >= 499) {
    return CSM_ASSIGNMENTS[0] // Nate
  }

  // Default: Mid-Market and SMB go to Andrea
  return CSM_ASSIGNMENTS[1]
}

function HealthBadge({ score }: { score: string }) {
  const colors = {
    green: "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
    yellow: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
    red: "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
    unknown: "bg-bg-secondary text-content-secondary",
  }
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", colors[score as keyof typeof colors] || colors.unknown)}>
      {score}
    </span>
  )
}

export default function TeamPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/integrations/portfolio?segment=all")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.summaries || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Group accounts by CSM
  const accountsByCSM = new Map<string, Account[]>()
  const unassigned: Account[] = []
  const freeAccounts: Account[] = []

  for (const account of accounts) {
    const csm = assignCSM(account.customerSegment, account.mrr)
    if (csm) {
      const existing = accountsByCSM.get(csm.name) || []
      existing.push(account)
      accountsByCSM.set(csm.name, existing)
    } else if (!account.mrr || account.mrr <= 0) {
      // Free accounts (no CSM assigned)
      freeAccounts.push(account)
    } else {
      // Paying accounts without proper assignment
      unassigned.push(account)
    }
  }

  // Calculate metrics per CSM
  function getMetrics(csmAccounts: Account[]) {
    const totalMRR = csmAccounts.reduce((sum, a) => sum + (a.mrr || 0), 0)
    const atRisk = csmAccounts.filter(a => a.healthScore === "red").length
    const healthy = csmAccounts.filter(a => a.healthScore === "green").length
    const monitor = csmAccounts.filter(a => a.healthScore === "yellow").length
    return { totalMRR, atRisk, healthy, monitor, total: csmAccounts.length }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="shimmer h-8 w-48 rounded" />
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map(i => (
              <div key={i} className="shimmer h-96 rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-content-primary sm:text-2xl">
            CSM Workload
          </h1>
          <p className="mt-1 text-sm text-content-secondary sm:text-base">
            Account assignments by Customer Success Manager
          </p>
        </div>

        {/* CSM Cards */}
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          {CSM_ASSIGNMENTS.map(csm => {
            const csmAccounts = accountsByCSM.get(csm.name) || []
            const metrics = getMetrics(csmAccounts)

            return (
              <div key={csm.name} className="card-sf min-w-0 overflow-hidden">
                {/* CSM Header */}
                <div className="border-b border-border-default p-4">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400">
                        <span className="text-lg font-semibold">{csm.name[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-content-primary">{csm.name}</h2>
                        <p className="truncate text-sm text-content-secondary">
                          {csm.name === "Nate" ? "Enterprise ($499+ MRR)" : "Mid-Market & SMB"}
                        </p>
                      </div>
                    </div>
                    <span className="self-start rounded-full bg-bg-secondary px-3 py-1 text-sm font-medium text-content-primary sm:self-auto">
                      {metrics.total} accounts
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 border-b border-border-default p-3 min-[400px]:grid-cols-4 sm:gap-4 sm:p-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-0.5 text-success-600 sm:gap-1 dark:text-success-400">
                      <DollarSign className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                      <span className="text-sm font-bold sm:text-lg">${(metrics.totalMRR / 1000).toFixed(1)}k</span>
                    </div>
                    <p className="text-[10px] text-content-secondary sm:text-xs">MRR</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-0.5 text-success-600 sm:gap-1 dark:text-success-400">
                      <TrendingUp className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                      <span className="text-sm font-bold sm:text-lg">{metrics.healthy}</span>
                    </div>
                    <p className="text-[10px] text-content-secondary sm:text-xs">Healthy</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-0.5 text-warning-600 sm:gap-1 dark:text-warning-400">
                      <Users className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                      <span className="text-sm font-bold sm:text-lg">{metrics.monitor}</span>
                    </div>
                    <p className="text-[10px] text-content-secondary sm:text-xs">Monitor</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-0.5 text-error-600 sm:gap-1 dark:text-error-400">
                      <AlertTriangle className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                      <span className="text-sm font-bold sm:text-lg">{metrics.atRisk}</span>
                    </div>
                    <p className="text-[10px] text-content-secondary sm:text-xs">At Risk</p>
                  </div>
                </div>

                {/* Account List */}
                <div className="max-h-80 overflow-x-hidden overflow-y-auto">
                  {csmAccounts.length === 0 ? (
                    <div className="p-8 text-center text-content-secondary">
                      No accounts assigned
                    </div>
                  ) : (
                    <div className="divide-y divide-border-default">
                      {csmAccounts
                        .sort((a, b) => {
                          const order = { red: 0, yellow: 1, unknown: 2, green: 3 }
                          return order[a.healthScore] - order[b.healthScore]
                        })
                        .map(account => (
                          <Link
                            key={account.companyId}
                            href={`/accounts/${account.companyId}`}
                            className="block min-w-0 p-4 hover:bg-bg-secondary active:bg-bg-tertiary"
                          >
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-content-primary">
                                  {account.companyName}
                                </p>
                                <p className="mt-0.5 truncate text-sm text-content-secondary">
                                  {account.mrr ? `$${account.mrr.toLocaleString()}/mo` : "No MRR"}
                                  {account.totalTrips ? ` · ${account.totalTrips} trips` : ""}
                                </p>
                                {account.riskSignals.length > 0 && (
                                  <p className="mt-1 truncate text-xs text-content-secondary">
                                    {account.riskSignals[0]}
                                  </p>
                                )}
                              </div>
                              <HealthBadge score={account.healthScore} />
                            </div>
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Free Accounts (no CSM assigned) */}
        {freeAccounts.length > 0 && (
          <div className="card-sf p-4">
            <h3 className="mb-3 font-semibold text-content-primary">
              Free Accounts ({freeAccounts.length})
            </h3>
            <p className="text-sm text-content-secondary">
              Accounts with no MRR. No dedicated CSM assigned.
            </p>
          </div>
        )}

        {/* Unassigned (if any paying accounts without proper assignment) */}
        {unassigned.length > 0 && (
          <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-900/20">
            <h3 className="mb-3 font-semibold text-content-primary">
              Needs Assignment ({unassigned.length})
            </h3>
            <p className="text-sm text-content-secondary">
              These paying accounts need CSM assignment review.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
