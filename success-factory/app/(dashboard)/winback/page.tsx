"use client"

import { useState, useEffect } from "react"
import {
  RotateCcw,
  DollarSign,
  Calendar,
  TrendingDown,
  Mail,
  Phone,
  MessageSquare,
  Filter,
  Search,
  ChevronRight,
  Clock,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"

interface ChurnedAccount {
  id: string
  hubspotId: string
  name: string
  domain: string | null
  mrr: number | null // Last known MRR before churn
  plan: string | null
  totalTrips: number
  primaryContactEmail: string | null
  primaryContactName: string | null
  churnedAt: string | null // When billingStatus became "churn"
  daysSinceChurn: number | null
  previousHealthScore: string | null
  riskSignals: string[]
  subscriptionLifetimeDays: number | null
}

interface WinbackStats {
  totalChurned: number
  lostMrr: number
  avgLifetimeDays: number
  recentChurns: number // Last 30 days
  highValueChurns: number // MRR > $100
}

type SortField = "name" | "mrr" | "daysSinceChurn" | "totalTrips" | "subscriptionLifetimeDays"
type SortOrder = "asc" | "desc"

export default function WinbackPage() {
  const [accounts, setAccounts] = useState<ChurnedAccount[]>([])
  const [stats, setStats] = useState<WinbackStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("mrr")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [filter, setFilter] = useState<"all" | "recent" | "high-value">("all")

  useEffect(() => {
    fetchChurnedAccounts()
  }, [])

  const fetchChurnedAccounts = async () => {
    try {
      const res = await fetch("/api/winback")
      const data = await res.json()
      setAccounts(data.accounts || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error("Failed to fetch churned accounts:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAccounts = accounts
    .filter((account) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !account.name.toLowerCase().includes(query) &&
          !account.domain?.toLowerCase().includes(query) &&
          !account.primaryContactEmail?.toLowerCase().includes(query)
        ) {
          return false
        }
      }

      // Category filter
      if (filter === "recent" && (account.daysSinceChurn === null || account.daysSinceChurn > 30)) {
        return false
      }
      if (filter === "high-value" && (!account.mrr || account.mrr < 100)) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      let aVal: number | string | null = a[sortField]
      let bVal: number | string | null = b[sortField]

      // Handle nulls
      if (aVal === null) aVal = sortOrder === "asc" ? Infinity : -Infinity
      if (bVal === null) bVal = sortOrder === "asc" ? Infinity : -Infinity

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      return sortOrder === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="border-content-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-content-primary text-2xl font-bold">Win-Back Campaigns</h1>
        <p className="text-content-secondary mt-1">
          Re-engage churned customers with targeted outreach
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-border-default bg-bg-primary rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-bg-tertiary rounded-lg p-2">
                <RotateCcw className="text-content-secondary h-5 w-5" />
              </div>
              <div>
                <p className="text-content-secondary text-sm">Total Churned</p>
                <p className="text-content-primary text-2xl font-bold">{stats.totalChurned}</p>
              </div>
            </div>
          </div>

          <div className="border-border-default bg-bg-primary rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-error-100 dark:bg-error-900/30 rounded-lg p-2">
                <DollarSign className="text-error-600 dark:text-error-400 h-5 w-5" />
              </div>
              <div>
                <p className="text-content-secondary text-sm">Lost MRR</p>
                <p className="text-error-600 dark:text-error-400 text-2xl font-bold">
                  ${stats.lostMrr.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="border-border-default bg-bg-primary rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-warning-100 dark:bg-warning-900/30 rounded-lg p-2">
                <Clock className="text-warning-600 dark:text-warning-400 h-5 w-5" />
              </div>
              <div>
                <p className="text-content-secondary text-sm">Recent (30d)</p>
                <p className="text-content-primary text-2xl font-bold">{stats.recentChurns}</p>
              </div>
            </div>
          </div>

          <div className="border-border-default bg-bg-primary rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-accent-100 dark:bg-accent-900/30 rounded-lg p-2">
                <Zap className="text-accent-600 dark:text-accent-400 h-5 w-5" />
              </div>
              <div>
                <p className="text-content-secondary text-sm">High Value ($100+)</p>
                <p className="text-content-primary text-2xl font-bold">{stats.highValueChurns}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {[
            { value: "all", label: "All Churned", count: accounts.length },
            { value: "recent", label: "Recent (30d)", count: stats?.recentChurns || 0 },
            { value: "high-value", label: "High Value", count: stats?.highValueChurns || 0 },
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value as typeof filter)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === btn.value
                  ? "bg-content-primary text-bg-primary"
                  : "bg-bg-secondary text-content-secondary hover:bg-bg-tertiary"
              )}
            >
              {btn.label} ({btn.count})
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="text-content-tertiary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, domain, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border-default bg-bg-secondary text-content-primary placeholder:text-content-tertiary focus:ring-primary-500 w-full rounded-lg border py-2 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none sm:w-80"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="border-border-default bg-bg-primary overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-border-default bg-bg-secondary border-b">
                <th
                  className="text-content-secondary cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
                  onClick={() => handleSort("name")}
                >
                  Company {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="text-content-secondary cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
                  onClick={() => handleSort("mrr")}
                >
                  Lost MRR {sortField === "mrr" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="text-content-secondary cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
                  onClick={() => handleSort("daysSinceChurn")}
                >
                  Days Since {sortField === "daysSinceChurn" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="text-content-secondary cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
                  onClick={() => handleSort("totalTrips")}
                >
                  Total Usage {sortField === "totalTrips" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="text-content-secondary cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
                  onClick={() => handleSort("subscriptionLifetimeDays")}
                >
                  Tenure{" "}
                  {sortField === "subscriptionLifetimeDays" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-content-secondary px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                  Contact
                </th>
                <th className="text-content-secondary px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-border-default divide-y">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-content-secondary px-4 py-8 text-center">
                    {searchQuery || filter !== "all"
                      ? "No churned accounts match your filters"
                      : "No churned accounts found"}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-bg-secondary transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <Link
                          href={`/accounts/${account.hubspotId}`}
                          className="text-content-primary hover:text-primary-600 font-medium"
                        >
                          {account.name}
                        </Link>
                        {account.domain && (
                          <p className="text-content-tertiary text-xs">{account.domain}</p>
                        )}
                        {account.plan && (
                          <span className="text-content-secondary bg-bg-tertiary mt-1 inline-block rounded px-1.5 py-0.5 text-xs">
                            {account.plan}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {account.mrr ? (
                        <span className="text-error-600 dark:text-error-400 font-medium">
                          ${account.mrr.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-content-tertiary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {account.daysSinceChurn !== null ? (
                        <span
                          className={cn(
                            "font-medium",
                            account.daysSinceChurn <= 30
                              ? "text-warning-600 dark:text-warning-400"
                              : "text-content-secondary"
                          )}
                        >
                          {account.daysSinceChurn}d ago
                        </span>
                      ) : (
                        <span className="text-content-tertiary">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-content-primary">
                        {account.totalTrips.toLocaleString()} trips
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {account.subscriptionLifetimeDays ? (
                        <span className="text-content-secondary">
                          {Math.round(account.subscriptionLifetimeDays / 30)} months
                        </span>
                      ) : (
                        <span className="text-content-tertiary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {account.primaryContactEmail ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={`mailto:${account.primaryContactEmail}`}
                            className="text-content-tertiary hover:text-content-primary transition-colors"
                            title={account.primaryContactEmail}
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-content-tertiary text-xs">No contact</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/accounts/${account.hubspotId}`}
                          className="text-content-secondary hover:text-content-primary inline-flex items-center gap-1 text-sm transition-colors"
                        >
                          View
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Win-Back Tips */}
      <div className="border-border-default bg-bg-primary rounded-lg border p-4">
        <h3 className="text-content-primary mb-3 font-medium">Win-Back Best Practices</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex gap-3">
            <div className="bg-success-100 dark:bg-success-900/30 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <Clock className="text-success-600 dark:text-success-400 h-4 w-4" />
            </div>
            <div>
              <p className="text-content-primary text-sm font-medium">Act Fast</p>
              <p className="text-content-secondary text-xs">
                Contact within 30 days of churn for 3x higher win-back rates
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-info-100 dark:bg-info-900/30 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <MessageSquare className="text-info-600 dark:text-info-400 h-4 w-4" />
            </div>
            <div>
              <p className="text-content-primary text-sm font-medium">Personalize</p>
              <p className="text-content-secondary text-xs">
                Reference their usage history and specific pain points
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-accent-100 dark:bg-accent-900/30 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <Zap className="text-accent-600 dark:text-accent-400 h-4 w-4" />
            </div>
            <div>
              <p className="text-content-primary text-sm font-medium">Offer Value</p>
              <p className="text-content-secondary text-xs">
                Share new features, special pricing, or dedicated support
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  )
}
