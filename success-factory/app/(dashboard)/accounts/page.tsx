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
  const urlFilter = (searchParams.get("filter") as HealthFilter) || "all"
  const urlQuery = searchParams.get("q") || ""

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<HealthFilter>(urlFilter)
  const [searchQuery, setSearchQuery] = useState(urlQuery)

  // Sync filter and search with URL params when they change
  useEffect(() => {
    setFilter(urlFilter)
  }, [urlFilter])

  useEffect(() => {
    setSearchQuery(urlQuery)
  }, [urlQuery])

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
          <h1 className="text-content-primary text-2xl font-bold">Accounts</h1>
          <p className="text-content-secondary mt-1">
            {accounts.length} total accounts in your portfolio
          </p>
        </div>
      </div>

      {/* Health Overview Bar */}
      <div className="card-sf p-4">
        <HealthBar green={green} yellow={yellow} red={red} />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-content-tertiary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-sf h-10 w-full !pr-4 !pl-12"
          />
        </div>

        <div className="border-border-default bg-bg-secondary flex flex-wrap gap-1 rounded-lg border p-1">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={cn(
                "transition-all-smooth flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:px-3 sm:text-sm",
                filter === btn.value
                  ? "bg-bg-elevated text-content-primary shadow-sm"
                  : "text-content-secondary hover:text-content-primary"
              )}
            >
              {btn.label}
              {btn.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs",
                    filter === btn.value ? "bg-bg-tertiary" : "bg-surface-muted"
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
        <div className="card-sf p-12 text-center">
          <div className="bg-bg-tertiary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Filter className="text-content-tertiary h-6 w-6" />
          </div>
          <h3 className="text-content-primary text-lg font-medium">No accounts found</h3>
          <p className="text-content-secondary mt-1">
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
      <div className="shimmer h-8 w-32 rounded" />
      <div className="shimmer h-12 w-full rounded-xl" />
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
