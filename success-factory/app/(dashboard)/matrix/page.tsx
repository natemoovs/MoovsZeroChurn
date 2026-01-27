"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Search,
  Building2,
  ExternalLink,
  AlertTriangle,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface OperatorResult {
  id: string
  hubspotId: string
  operatorId: string | null
  stripeAccountId: string | null
  name: string
  domain: string | null
  plan: string | null
  mrr: number | null
  healthScore: string | null
  numericScore: number | null
  paymentHealth: string | null
  totalTrips: number | null
  location: string | null
  csm: string | null
  lastSynced: string | null
  // Expanded search fields
  matchType?: "operator" | "trip" | "quote" | "charge" | "customer"
  matchField?: string | null
  matchValue?: string | null
  matchInfo?: string | null
}

function getMatchTypeLabel(matchType: string | undefined) {
  switch (matchType) {
    case "trip":
      return { label: "Trip", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }
    case "quote":
      return { label: "Quote", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" }
    case "charge":
      return { label: "Charge", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" }
    case "customer":
      return { label: "Customer", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" }
    default:
      return null
  }
}

type SortField = "name" | "mrr" | "totalTrips" | "numericScore"
type SortDirection = "asc" | "desc"

function getHealthColor(health: string | null) {
  switch (health?.toLowerCase()) {
    case "green":
      return "bg-success-100 text-success-700 dark:bg-success-50 dark:text-success-500"
    case "yellow":
      return "bg-warning-100 text-warning-700 dark:bg-warning-50 dark:text-warning-500"
    case "red":
      return "bg-error-100 text-error-700 dark:bg-error-50 dark:text-error-500"
    default:
      return "bg-bg-tertiary text-content-tertiary"
  }
}

function getPaymentHealthColor(health: string | null) {
  switch (health?.toLowerCase()) {
    case "good":
      return "text-success-600 dark:text-success-400"
    case "at_risk":
      return "text-warning-600 dark:text-warning-400"
    case "critical":
      return "text-error-600 dark:text-error-400"
    default:
      return "text-content-tertiary"
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-content-tertiary hover:text-content-primary inline-flex items-center gap-1 text-xs transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? <Check className="text-success-500 h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

export default function OperatorHubPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<OperatorResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [sortField, setSortField] = useState<SortField>("mrr")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [selectedRow, setSelectedRow] = useState<string | null>(null)

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      if (query.length === 0) {
        setResults([])
        setHasSearched(false)
      }
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    try {
      // Use expanded search to include trips, quotes, charges, customers
      const res = await fetch(`/api/customer/search?q=${encodeURIComponent(query)}&limit=50&expanded=true`)
      const data = await res.json()
      setResults(data.results || [])
    } catch (error) {
      console.error("Search failed:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search effect - triggers search 300ms after user stops typing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clear any existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set a new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      handleSearch(searchQuery)
    }, 300)

    // Cleanup on unmount or when searchQuery changes
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery, handleSearch])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    let aVal: number | string | null = a[sortField]
    let bVal: number | string | null = b[sortField]

    // Handle nulls
    if (aVal === null) aVal = sortDirection === "asc" ? Infinity : -Infinity
    if (bVal === null) bVal = sortDirection === "asc" ? Infinity : -Infinity

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }

    if (sortDirection === "asc") {
      return (aVal as number) - (bVal as number)
    }
    return (bVal as number) - (aVal as number)
  })

  const handleRowClick = (result: OperatorResult) => {
    setSelectedRow(result.id)
    // Navigate to Operator Hub detail page
    router.push(`/matrix/${result.hubspotId}`)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    )
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-content-primary text-2xl font-bold sm:text-3xl">Operator Hub</h1>
          <p className="text-content-secondary mt-1">
            Search operators by name, trip ID, quote ID, charge ID, customer email, and more
          </p>
        </div>

        {/* Search Bar */}
        <div className="card-sf mb-6 p-4">
          <div className="relative">
            {isLoading ? (
              <Loader2 className="text-primary-500 absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 animate-spin" />
            ) : (
              <Search className="text-content-tertiary absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, trip ID, quote ID, charge ID, customer email, phone..."
              className="input-sf h-12 w-full !pr-4 !pl-12 text-base"
              autoFocus
            />
            {searchQuery.length > 0 && searchQuery.length < 2 && (
              <span className="text-content-tertiary absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                Type {2 - searchQuery.length} more character{searchQuery.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="text-content-tertiary mt-2 text-xs">
            Searches operators, trips, quotes, charges, and customers. Results update as you type.
          </p>
        </div>

        {/* Results */}
        <div className="card-sf flex-1 overflow-hidden">
          {!hasSearched ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Building2 className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
                <h3 className="text-content-primary text-lg font-medium">Search for Operators</h3>
                <p className="text-content-secondary mt-1 max-w-sm">
                  Search by company name, trip ID, quote ID, charge ID, customer email, phone number,
                  Stripe account, or location.
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="text-warning-500 mx-auto mb-4 h-12 w-12" />
                <h3 className="text-content-primary text-lg font-medium">No Results Found</h3>
                <p className="text-content-secondary mt-1 max-w-sm">
                  No operators matched &quot;{searchQuery}&quot;. Try a different search term or
                  check the spelling.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {/* Results Header */}
              <div className="border-border-default flex items-center justify-between border-b px-4 py-3">
                <span className="text-content-secondary text-sm">
                  Found <strong className="text-content-primary">{results.length}</strong> operators
                </span>
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="text-content-secondary hover:text-content-primary flex items-center gap-1 text-sm transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-bg-secondary sticky top-0">
                    <tr className="border-border-default border-b">
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort("name")}
                          className="text-content-secondary hover:text-content-primary flex items-center gap-1 text-xs font-semibold tracking-wider uppercase"
                        >
                          Company
                          <SortIcon field="name" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <span className="text-content-secondary text-xs font-semibold tracking-wider uppercase">
                          IDs
                        </span>
                      </th>
                      <th className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleSort("numericScore")}
                          className="text-content-secondary hover:text-content-primary mx-auto flex items-center gap-1 text-xs font-semibold tracking-wider uppercase"
                        >
                          Health
                          <SortIcon field="numericScore" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort("mrr")}
                          className="text-content-secondary hover:text-content-primary ml-auto flex items-center gap-1 text-xs font-semibold tracking-wider uppercase"
                        >
                          MRR
                          <SortIcon field="mrr" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort("totalTrips")}
                          className="text-content-secondary hover:text-content-primary ml-auto flex items-center gap-1 text-xs font-semibold tracking-wider uppercase"
                        >
                          Trips
                          <SortIcon field="totalTrips" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <span className="text-content-secondary text-xs font-semibold tracking-wider uppercase">
                          Plan
                        </span>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <span className="text-content-secondary text-xs font-semibold tracking-wider uppercase">
                          CSM
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResults.map((result) => (
                      <tr
                        key={result.id}
                        onClick={() => handleRowClick(result)}
                        className={cn(
                          "border-border-default cursor-pointer border-b transition-colors",
                          selectedRow === result.id
                            ? "bg-primary-50 dark:bg-primary-950"
                            : "hover:bg-surface-hover"
                        )}
                      >
                        {/* Company */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-bg-tertiary flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg">
                              <Building2 className="text-content-tertiary h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-content-primary truncate font-medium">
                                  {result.name}
                                </p>
                                {/* Show match type badge for expanded search results */}
                                {result.matchType && result.matchType !== "operator" && (
                                  <span
                                    className={cn(
                                      "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
                                      getMatchTypeLabel(result.matchType)?.color
                                    )}
                                  >
                                    {getMatchTypeLabel(result.matchType)?.label}
                                  </span>
                                )}
                              </div>
                              {/* Show match info for expanded results */}
                              {result.matchType && result.matchType !== "operator" && result.matchValue && (
                                <p className="text-content-secondary mt-0.5 truncate text-xs">
                                  {result.matchField}: <span className="font-mono">{result.matchValue}</span>
                                  {result.matchInfo && <span className="text-content-tertiary ml-1">({result.matchInfo})</span>}
                                </p>
                              )}
                              {result.domain && (
                                <a
                                  href={`https://${result.domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-xs"
                                >
                                  {result.domain}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              {result.location && (
                                <p className="text-content-tertiary text-xs">{result.location}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* IDs */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {result.operatorId && (
                              <div className="flex items-center gap-2">
                                <span className="bg-bg-tertiary rounded px-1.5 py-0.5 font-mono text-xs">
                                  {result.operatorId.slice(0, 8)}...
                                </span>
                                <CopyButton text={result.operatorId} label="Operator ID" />
                              </div>
                            )}
                            {result.stripeAccountId && (
                              <div className="flex items-center gap-2">
                                <span className="text-content-tertiary font-mono text-xs">
                                  {result.stripeAccountId.slice(0, 12)}...
                                </span>
                                <CopyButton text={result.stripeAccountId} label="Stripe ID" />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Health */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                                getHealthColor(result.healthScore)
                              )}
                            >
                              {result.healthScore || "Unknown"}
                            </span>
                            {result.numericScore !== null && (
                              <span className="text-content-tertiary text-xs">
                                {result.numericScore}/100
                              </span>
                            )}
                            {result.paymentHealth && (
                              <span
                                className={cn(
                                  "flex items-center gap-1 text-xs",
                                  getPaymentHealthColor(result.paymentHealth)
                                )}
                              >
                                <CreditCard className="h-3 w-3" />
                                {result.paymentHealth.replace("_", " ")}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* MRR */}
                        <td className="px-4 py-3 text-right">
                          {result.mrr !== null ? (
                            <span className="text-content-primary font-medium">
                              ${result.mrr.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-content-tertiary">-</span>
                          )}
                        </td>

                        {/* Trips */}
                        <td className="px-4 py-3 text-right">
                          {result.totalTrips !== null ? (
                            <span className="text-content-primary">
                              {result.totalTrips.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-content-tertiary">-</span>
                          )}
                        </td>

                        {/* Plan */}
                        <td className="px-4 py-3">
                          {result.plan ? (
                            <span className="bg-bg-tertiary text-content-secondary inline-block rounded px-2 py-0.5 text-xs">
                              {result.plan}
                            </span>
                          ) : (
                            <span className="text-content-tertiary">-</span>
                          )}
                        </td>

                        {/* CSM */}
                        <td className="px-4 py-3">
                          {result.csm ? (
                            <span className="text-content-secondary text-sm">{result.csm}</span>
                          ) : (
                            <span className="text-content-tertiary">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
