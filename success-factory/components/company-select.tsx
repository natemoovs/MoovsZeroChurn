"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"

interface Company {
  id: string
  name: string
  domain: string | null
  industry: string | null
}

interface CompanySelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function CompanySelect({
  value,
  onChange,
  placeholder = "Search companies...",
}: CompanySelectProps) {
  const [query, setQuery] = useState(value)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)

  // Debounced search
  const searchCompanies = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setCompanies([])
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/integrations/hubspot/companies?q=${encodeURIComponent(searchQuery)}`
      )
      const data = await response.json()
      setIsConfigured(data.configured)
      setCompanies(data.companies || [])
    } catch (error) {
      console.error("Error searching companies:", error)
      setCompanies([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Check if HubSpot is configured on mount
  useEffect(() => {
    fetch("/api/integrations/hubspot/companies?q=")
      .then((res) => res.json())
      .then((data) => setIsConfigured(data.configured))
      .catch(() => setIsConfigured(false))
  }, [])

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query && query !== value) {
        searchCompanies(query)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, value, searchCompanies])

  const handleSelect = (company: Company) => {
    const displayValue = company.domain ? `${company.name} (${company.domain})` : company.name
    setQuery(displayValue)
    onChange(displayValue)
    setShowDropdown(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setQuery(newValue)
    onChange(newValue)
    setShowDropdown(true)
  }

  const handleFocus = () => {
    if (companies.length > 0 || (query && query.length >= 2)) {
      setShowDropdown(true)
    }
  }

  const handleBlur = () => {
    // Delay to allow click on dropdown item
    setTimeout(() => setShowDropdown(false), 200)
  }

  // If HubSpot isn't configured, just show a regular input
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
        placeholder={isConfigured ? "Type to search HubSpot..." : placeholder}
      />

      {showDropdown && query.length >= 2 && (
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
                  <div className="text-content-primary font-medium">{company.name}</div>
                  {(company.domain || company.industry) && (
                    <div className="text-content-secondary text-sm">
                      {[company.domain, company.industry].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-content-secondary px-4 py-3 text-sm">
              No companies found. Type more to search or enter manually.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
