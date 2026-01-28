"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export type BusinessSegment = "all" | "moovs" | "swoop"

interface BusinessSegmentContextType {
  segment: BusinessSegment
  setSegment: (segment: BusinessSegment) => void
  segmentLabel: string
}

const BusinessSegmentContext = createContext<BusinessSegmentContextType | undefined>(undefined)

const STORAGE_KEY = "success-factory-business-segment"

const segmentLabels: Record<BusinessSegment, string> = {
  all: "All Segments",
  moovs: "Moovs",
  swoop: "Swoop",
}

export function BusinessSegmentProvider({ children }: { children: ReactNode }) {
  const [segment, setSegmentState] = useState<BusinessSegment>("all")
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as BusinessSegment | null
    if (stored && ["all", "moovs", "swoop"].includes(stored)) {
      setSegmentState(stored)
    }
    setMounted(true)
  }, [])

  // Save to localStorage when changed
  const setSegment = (newSegment: BusinessSegment) => {
    setSegmentState(newSegment)
    localStorage.setItem(STORAGE_KEY, newSegment)
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <BusinessSegmentContext.Provider
      value={{
        segment,
        setSegment,
        segmentLabel: segmentLabels[segment],
      }}
    >
      {children}
    </BusinessSegmentContext.Provider>
  )
}

export function useBusinessSegment() {
  const context = useContext(BusinessSegmentContext)
  if (context === undefined) {
    throw new Error("useBusinessSegment must be used within a BusinessSegmentProvider")
  }
  return context
}
