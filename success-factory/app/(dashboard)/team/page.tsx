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
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    unknown: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
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
          <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map(i => (
              <div key={i} className="h-96 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
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
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            CSM Workload
          </h1>
          <p className="mt-1 text-sm text-zinc-500 sm:text-base dark:text-zinc-400">
            Account assignments by Customer Success Manager
          </p>
        </div>

        {/* CSM Cards */}
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          {CSM_ASSIGNMENTS.map(csm => {
            const csmAccounts = accountsByCSM.get(csm.name) || []
            const metrics = getMetrics(csmAccounts)

            return (
              <div key={csm.name} className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                {/* CSM Header */}
                <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <span className="text-lg font-semibold">{csm.name[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{csm.name}</h2>
                        <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                          {csm.name === "Nate" ? "Enterprise ($499+ MRR)" : "Mid-Market & SMB"}
                        </p>
                      </div>
                    </div>
                    <span className="self-start rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 sm:self-auto dark:bg-zinc-800 dark:text-zinc-300">
                      {metrics.total} accounts
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 border-b border-zinc-200 p-3 min-[400px]:grid-cols-4 sm:gap-4 sm:p-4 dark:border-zinc-800">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-0.5 text-emerald-600 sm:gap-1 dark:text-emerald-400">
                      <DollarSign className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                      <span className="text-sm font-bold sm:text-lg">${(metrics.totalMRR / 1000).toFixed(1)}k</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 sm:text-xs dark:text-zinc-400">MRR</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-0.5 text-emerald-600 sm:gap-1 dark:text-emerald-400">
                      <TrendingUp className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                      <span className="text-sm font-bold sm:text-lg">{metrics.healthy}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 sm:text-xs dark:text-zinc-400">Healthy</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-0.5 text-amber-600 sm:gap-1 dark:text-amber-400">
                      <Users className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                      <span className="text-sm font-bold sm:text-lg">{metrics.monitor}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 sm:text-xs dark:text-zinc-400">Monitor</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-0.5 text-red-600 sm:gap-1 dark:text-red-400">
                      <AlertTriangle className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                      <span className="text-sm font-bold sm:text-lg">{metrics.atRisk}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 sm:text-xs dark:text-zinc-400">At Risk</p>
                  </div>
                </div>

                {/* Account List */}
                <div className="max-h-80 overflow-x-hidden overflow-y-auto">
                  {csmAccounts.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                      No accounts assigned
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {csmAccounts
                        .sort((a, b) => {
                          const order = { red: 0, yellow: 1, unknown: 2, green: 3 }
                          return order[a.healthScore] - order[b.healthScore]
                        })
                        .map(account => (
                          <Link
                            key={account.companyId}
                            href={`/accounts/${account.companyId}`}
                            className="block min-w-0 p-4 hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-800/50 dark:active:bg-zinc-800"
                          >
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                                  {account.companyName}
                                </p>
                                <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                                  {account.mrr ? `$${account.mrr.toLocaleString()}/mo` : "No MRR"}
                                  {account.totalTrips ? ` · ${account.totalTrips} trips` : ""}
                                </p>
                                {account.riskSignals.length > 0 && (
                                  <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
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
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
              Free Accounts ({freeAccounts.length})
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Accounts with no MRR. No dedicated CSM assigned.
            </p>
          </div>
        )}

        {/* Unassigned (if any paying accounts without proper assignment) */}
        {unassigned.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
              Needs Assignment ({unassigned.length})
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              These paying accounts need CSM assignment review.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
