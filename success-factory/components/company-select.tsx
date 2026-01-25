"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"

interface Company {
  id: string
  name: string
  domain: string | null
  industry: string | null
  mrr?: number | null
  healthScore?: string | null
}

interface CompanySelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function CompanySelect({
  value,
  onChange,
  placeholder = "Search customers...",
}: CompanySelectProps) {
  const [query, setQuery] = useState(value)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)

  // Fetch companies (with or without query)
  const fetchCompanies = useCallback(async (searchQuery: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/integrations/hubspot/companies?q=${encodeURIComponent(searchQuery)}`
      )
      const data = await response.json()
      setIsConfigured(data.configured)
      setCompanies(data.companies || [])
    } catch (error) {
      console.error("Error fetching companies:", error)
      setCompanies([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load initial companies on mount
  useEffect(() => {
    fetchCompanies("")
  }, [fetchCompanies])

  // Debounced search when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, fetchCompanies])

  const handleSelect = (company: Company) => {
    setQuery(company.name)
    onChange(company.name)
    setShowDropdown(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setQuery(newValue)
    onChange(newValue)
    setShowDropdown(true)
  }

  const handleFocus = () => {
    setShowDropdown(true)
  }

  const handleBlur = () => {
    // Delay to allow click on dropdown item
    setTimeout(() => setShowDropdown(false), 200)
  }

  const getHealthBadge = (score: string | null | undefined) => {
    if (!score) return null
    const colors: Record<string, string> = {
      green: "bg-success-500",
      yellow: "bg-warning-500",
      red: "bg-error-500",
    }
    return <span className={`h-2 w-2 rounded-full ${colors[score] || "bg-gray-400"}`} />
  }

  // If config check failed, just show a regular input
  if (isConfigured === false) {
    return (
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    )
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
      />

      {showDropdown && (
        <div className="border-border-default bg-bg-elevated absolute z-50 mt-1 w-full rounded-md border shadow-lg">
          {isLoading ? (
            <div className="text-content-secondary px-4 py-3 text-sm">Searching...</div>
          ) : companies.length > 0 ? (
            <ul className="max-h-60 overflow-auto py-1">
              {companies.map((company) => (
                <li
                  key={company.id}
                  className="hover:bg-surface-hover cursor-pointer px-4 py-2"
                  onClick={() => handleSelect(company)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getHealthBadge(company.healthScore)}
                      <span className="text-content-primary font-medium">{company.name}</span>
                    </div>
                    {company.mrr && company.mrr > 0 && (
                      <span className="text-content-tertiary text-xs">
                        ${company.mrr.toLocaleString()}/mo
                      </span>
                    )}
                  </div>
                  {company.domain && (
                    <div className="text-content-secondary ml-4 text-sm">{company.domain}</div>
                  )}
                </li>
              ))}
            </ul>
          ) : query.length >= 2 ? (
            <div className="text-content-secondary px-4 py-3 text-sm">
              No customers found. You can type the name manually.
            </div>
          ) : (
            <div className="text-content-secondary px-4 py-3 text-sm">
              Type to search customers...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
