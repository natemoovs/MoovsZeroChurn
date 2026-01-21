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

const CSM_ASSIGNMENTS: CSM[] = [
  { name: "Nate", email: "nate@moovs.com", segments: ["vip"] },
  { name: "Andrea", email: "andrea@moovs.com", segments: ["pro", "standard"] },
]

function assignCSM(segment: string | null): CSM | null {
  if (!segment) return null
  const normalized = segment.toLowerCase()

  // Free accounts have no CSM
  if (normalized.includes("free")) return null

  for (const csm of CSM_ASSIGNMENTS) {
    if (csm.segments.some(s => normalized.includes(s))) {
      return csm
    }
  }

  // Default: if paying but segment unclear, assign to Andrea
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

  for (const account of accounts) {
    const csm = assignCSM(account.customerSegment)
    if (csm) {
      const existing = accountsByCSM.get(csm.name) || []
      existing.push(account)
      accountsByCSM.set(csm.name, existing)
    } else if (!account.customerSegment?.toLowerCase().includes("free")) {
      // Only add to unassigned if not free
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            CSM Workload
          </h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Account assignments by Customer Success Manager
          </p>
        </div>

        {/* CSM Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {CSM_ASSIGNMENTS.map(csm => {
            const csmAccounts = accountsByCSM.get(csm.name) || []
            const metrics = getMetrics(csmAccounts)

            return (
              <div key={csm.name} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                {/* CSM Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <span className="text-lg font-semibold">{csm.name[0]}</span>
                    </div>
                    <div>
                      <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{csm.name}</h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {csm.segments.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {metrics.total} accounts
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4 border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-lg font-bold">${(metrics.totalMRR / 1000).toFixed(1)}k</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">MRR</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-lg font-bold">{metrics.healthy}</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Healthy</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                      <Users className="h-4 w-4" />
                      <span className="text-lg font-bold">{metrics.monitor}</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Monitor</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-lg font-bold">{metrics.atRisk}</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">At Risk</p>
                  </div>
                </div>

                {/* Account List */}
                <div className="max-h-80 overflow-y-auto">
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
                            className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                                {account.companyName}
                              </p>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {account.mrr ? `$${account.mrr.toLocaleString()}/mo` : "No MRR"}
                                {account.totalTrips ? ` · ${account.totalTrips} trips` : ""}
                              </p>
                            </div>
                            <div className="ml-3 flex items-center gap-2">
                              {account.riskSignals.length > 0 && (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {account.riskSignals[0]}
                                </span>
                              )}
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

        {/* Unassigned (if any non-free accounts without segment) */}
        {unassigned.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
              Unassigned ({unassigned.length})
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              These accounts need segment classification in Metabase.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
