"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AccountCard, AccountCardSkeleton } from "@/components/account-card"
import { HealthBar } from "@/components/health-chart"
import { Search, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

type HealthFilter = "all" | "at-risk" | "monitor" | "healthy"

interface Account {
  companyId: string
  companyName: string
  domain: string | null
  healthScore: "green" | "yellow" | "red" | "unknown"
  mrr: number | null
  plan: string | null
  riskSignals: string[]
  positiveSignals: string[]
}

function AccountsContent() {
  const searchParams = useSearchParams()
  const initialFilter = (searchParams.get("filter") as HealthFilter) || "all"
  const initialQuery = searchParams.get("q") || ""

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<HealthFilter>(initialFilter)
  const [searchQuery, setSearchQuery] = useState(initialQuery)

  useEffect(() => {
    fetch("/api/integrations/portfolio?segment=all")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.summaries || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filteredAccounts = accounts.filter((account) => {
    if (filter === "at-risk" && account.healthScore !== "red") return false
    if (filter === "monitor" && account.healthScore !== "yellow") return false
    if (filter === "healthy" && account.healthScore !== "green") return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        account.companyName.toLowerCase().includes(query) ||
        account.domain?.toLowerCase().includes(query)
      )
    }

    return true
  })

  const green = accounts.filter((a) => a.healthScore === "green").length
  const yellow = accounts.filter((a) => a.healthScore === "yellow").length
  const red = accounts.filter((a) => a.healthScore === "red").length

  const filterButtons: { value: HealthFilter; label: string; count?: number }[] = [
    { value: "all", label: "All", count: accounts.length },
    { value: "at-risk", label: "At Risk", count: red },
    { value: "monitor", label: "Monitor", count: yellow },
    { value: "healthy", label: "Healthy", count: green },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Accounts
          </h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            {accounts.length} total accounts in your portfolio
          </p>
        </div>
      </div>

      {/* Health Overview Bar */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <HealthBar green={green} yellow={yellow} red={red} />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                filter === btn.value
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              {btn.label}
              {btn.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs",
                    filter === btn.value
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : "bg-zinc-200/50 dark:bg-zinc-700/50"
                  )}
                >
                  {btn.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <AccountCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Filter className="h-6 w-6 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            No accounts found
          </h3>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            {searchQuery
              ? "Try adjusting your search query"
              : "No accounts match the selected filter"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((account) => (
            <AccountCard
              key={account.companyId}
              id={account.companyId}
              name={account.companyName}
              domain={account.domain}
              healthScore={account.healthScore}
              mrr={account.mrr}
              plan={account.plan}
              riskSignals={account.riskSignals}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AccountsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <AccountCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export default function AccountsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<AccountsLoading />}>
        <AccountsContent />
      </Suspense>
    </DashboardLayout>
  )
}
