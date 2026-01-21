import { NextRequest, NextResponse } from "next/server"
import { hubspot, metabase } from "@/lib/integrations"
import type { HubSpotCompany } from "@/lib/integrations"

// Metabase query IDs
const ACCOUNT_DATA_QUERY_ID = 948 // "Moovs Account Data - Detail"

// ============================================================================
// Cache - stores portfolio data for 5 minutes to avoid rate limits
// ============================================================================
interface CacheEntry {
  data: {
    companies: HubSpotCompany[]
    metabase: MetabaseAccountData[]
  }
  timestamp: number
}

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
let portfolioCache: CacheEntry | null = null

function isCacheValid(): boolean {
  if (!portfolioCache) return false
  return Date.now() - portfolioCache.timestamp < CACHE_TTL_MS
}

function getCache() {
  if (isCacheValid()) {
    return portfolioCache!.data
  }
  return null
}

function setCache(companies: HubSpotCompany[], metabaseData: MetabaseAccountData[]) {
  portfolioCache = {
    data: { companies, metabase: metabaseData },
    timestamp: Date.now(),
  }
}

interface MetabaseAccountData {
  companyName: string
  totalTrips: number
  daysSinceLastLogin: number | null
  churnStatus: string | null
  mrr: number | null
  plan: string | null
  customerSegment: string | null
}

interface CompanyHealthSummary {
  companyId: string
  companyName: string
  domain: string | null
  healthScore: "green" | "yellow" | "red" | "unknown"
  mrr: number | null
  plan: string | null
  paymentStatus: "current" | "overdue" | "at_risk" | "unknown"
  lastActivity: string | null
  contactCount: number
  riskSignals: string[]
  positiveSignals: string[]
  customerSince: string | null
  // Metabase-enriched fields
  totalTrips?: number
  customerSegment?: string | null
}

/**
 * Get portfolio health data for a segment
 * GET /api/integrations/portfolio?segment=enterprise|mid-market|smb|all
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const segment = searchParams.get("segment") || "all"
  const forceRefresh = searchParams.get("refresh") === "true"

  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    return NextResponse.json({
      summaries: [],
      configured: { hubspot: false, stripe: false, metabase: false },
      error: "HubSpot not configured",
    })
  }

  try {
    // Check cache first (unless force refresh requested)
    let allCompanies: HubSpotCompany[]
    let metabaseData: MetabaseAccountData[]
    const cached = !forceRefresh ? getCache() : null

    if (cached) {
      // Use cached data
      allCompanies = cached.companies
      metabaseData = cached.metabase
    } else {
      // Fetch fresh data from HubSpot and Metabase in parallel
      const [companies, mbData] = await Promise.all([
        hubspot.searchCompanies("*"),
        fetchMetabaseAccountData(),
      ])
      allCompanies = companies
      metabaseData = mbData

      // Update cache
      setCache(allCompanies, metabaseData)
    }

    // Build a map of Metabase data by company name for quick lookup
    const metabaseMap = new Map<string, MetabaseAccountData>()
    for (const account of metabaseData) {
      if (account.companyName) {
        metabaseMap.set(account.companyName.toLowerCase(), account)
      }
    }

    // Filter by segment
    const filtered = filterBySegment(allCompanies, segment)

    // Health scoring with Metabase enrichment
    const summaries: CompanyHealthSummary[] = filtered.map((company) => {
      const companyName = company.properties.name?.toLowerCase() || ""
      const metabaseAccount = metabaseMap.get(companyName)
      return enrichedHealthScore(company, metabaseAccount)
    })

    // Sort by health score (red first, then yellow, then green)
    summaries.sort((a, b) => {
      const order = { red: 0, yellow: 1, unknown: 2, green: 3 }
      return order[a.healthScore] - order[b.healthScore]
    })

    return NextResponse.json({
      summaries,
      total: filtered.length,
      segment,
      configured: {
        hubspot: true,
        stripe: !!process.env.STRIPE_SECRET_KEY,
        metabase: metabaseData.length > 0,
      },
      cache: {
        hit: !!cached,
        ageMinutes: portfolioCache ? Math.round((Date.now() - portfolioCache.timestamp) / 60000) : 0,
        ttlMinutes: 60,
      },
    })
  } catch (error) {
    console.error("Portfolio fetch error:", error)
    return NextResponse.json(
      { summaries: [], error: "Failed to fetch portfolio data" },
      { status: 500 }
    )
  }
}

/**
 * Fetch account data from Metabase
 */
async function fetchMetabaseAccountData(): Promise<MetabaseAccountData[]> {
  if (!process.env.METABASE_URL || !process.env.METABASE_API_KEY) {
    return []
  }

  try {
    const result = await metabase.runQuery(ACCOUNT_DATA_QUERY_ID)
    const rows = metabase.rowsToObjects<Record<string, unknown>>(result)

    return rows.map((row) => ({
      companyName: (row.MOOVS_COMPANY_NAME as string) || "",
      totalTrips: (row.ALL_TRIPS_COUNT as number) || 0,
      daysSinceLastLogin: row.DAYS_SINCE_LAST_IDENTIFY as number | null,
      churnStatus: row.CHURN_STATUS as string | null,
      mrr: row.TOTAL_MRR_NUMERIC as number | null,
      plan: row.LAGO_PLAN_NAME as string | null,
      customerSegment: row.CUSTOMER_SEGMENT as string | null,
    }))
  } catch (error) {
    console.error("Metabase fetch error:", error)
    return []
  }
}

/**
 * Health score with Metabase enrichment
 */
function enrichedHealthScore(
  company: HubSpotCompany,
  mb: MetabaseAccountData | undefined
): CompanyHealthSummary {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  const lifecycleStage = company.properties.lifecyclestage?.toLowerCase() || ""
  const lastModified = company.properties.hs_lastmodifieddate
  const notesLastUpdated = company.properties.notes_last_updated

  // --- Metabase-based signals (product usage data) ---
  if (mb) {
    // Churn status (explicit)
    if (mb.churnStatus && mb.churnStatus.toLowerCase().includes("churn")) {
      riskSignals.push("Churned")
    }

    // Usage signals based on trips
    if (mb.totalTrips > 100) {
      positiveSignals.push(`${mb.totalTrips} trips`)
    } else if (mb.totalTrips > 20) {
      positiveSignals.push("Active usage")
    } else if (mb.totalTrips > 0 && mb.totalTrips <= 5) {
      riskSignals.push("Low usage")
    } else if (mb.totalTrips === 0) {
      riskSignals.push("No trips")
    }

    // Login recency
    if (mb.daysSinceLastLogin !== null) {
      if (mb.daysSinceLastLogin > 60) {
        riskSignals.push(`No login in ${mb.daysSinceLastLogin}d`)
      } else if (mb.daysSinceLastLogin > 30) {
        riskSignals.push("Inactive 30+ days")
      } else if (mb.daysSinceLastLogin <= 7) {
        positiveSignals.push("Recent login")
      }
    }

    // MRR / paying status
    if (mb.mrr && mb.mrr > 0) {
      positiveSignals.push("Paying customer")
      if (mb.mrr >= 200) {
        positiveSignals.push("High value")
      }
    } else if (mb.plan?.toLowerCase().includes("free")) {
      // Free plan with no usage is risky
      if (mb.totalTrips === 0) {
        riskSignals.push("Free + no usage")
      }
    }
  }

  // --- HubSpot-based signals (fallback) ---
  if (lifecycleStage === "customer") {
    positiveSignals.push("Active customer")
  }

  // Activity recency from HubSpot (only if no Metabase data)
  if (!mb) {
    const daysSinceUpdate = lastModified
      ? Math.floor((Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24))
      : null

    if (daysSinceUpdate !== null) {
      if (daysSinceUpdate > 180) {
        riskSignals.push("Inactive 6+ months")
      } else if (daysSinceUpdate > 90) {
        riskSignals.push("Inactive 3+ months")
      } else if (daysSinceUpdate <= 30) {
        positiveSignals.push("Recent activity")
      }
    }
  }

  // --- Calculate health score based on signals ---
  let healthScore: "green" | "yellow" | "red" | "unknown" = "unknown"

  // Churned or severe issues = red
  if (riskSignals.some((r) =>
    r.includes("Churned") ||
    r.includes("6+ months") ||
    r.includes("No login in") && parseInt(r.match(/\d+/)?.[0] || "0") > 60
  )) {
    healthScore = "red"
  } else if (riskSignals.length >= 2) {
    // Multiple risk signals = red
    healthScore = "red"
  } else if (riskSignals.length === 1 && positiveSignals.length < 2) {
    // One risk, few positives = yellow
    healthScore = "yellow"
  } else if (positiveSignals.length >= 3) {
    // Many positive signals = green
    healthScore = "green"
  } else if (positiveSignals.length >= 2 && riskSignals.length === 0) {
    // Multiple positives, no risk = green
    healthScore = "green"
  } else if (positiveSignals.length === 1 && riskSignals.length === 0) {
    // One positive, no risk = green
    healthScore = "green"
  } else if (mb && mb.totalTrips > 10 && mb.mrr && mb.mrr > 0) {
    // Paying with decent usage = green
    healthScore = "green"
  } else if (riskSignals.length === 0 && positiveSignals.length === 0) {
    // No data = unknown
    healthScore = "unknown"
  } else {
    healthScore = "yellow"
  }

  return {
    companyId: company.id,
    companyName: company.properties.name || "Unknown",
    domain: company.properties.domain || null,
    healthScore,
    mrr: mb?.mrr || null,
    plan: mb?.plan || lifecycleStage || null,
    paymentStatus: mb?.mrr && mb.mrr > 0 ? "current" : "unknown",
    lastActivity: notesLastUpdated || lastModified || null,
    contactCount: 0,
    riskSignals,
    positiveSignals,
    customerSince: company.properties.createdate || null,
    totalTrips: mb?.totalTrips,
    customerSegment: mb?.customerSegment,
  }
}

function filterBySegment(companies: HubSpotCompany[], segment: string): HubSpotCompany[] {
  if (segment === "all") return companies

  return companies.filter((company) => {
    const revenue = parseFloat(company.properties.annualrevenue || "0")
    const stage = company.properties.lifecyclestage?.toLowerCase() || ""

    switch (segment.toLowerCase()) {
      case "enterprise":
        return revenue >= 1000000 || stage === "customer"
      case "mid-market":
        return revenue >= 250000 && revenue < 1000000
      case "smb":
        return revenue >= 50000 && revenue < 250000
      case "smb/mid-market":
      case "smb-mid-market":
        return revenue >= 50000 && revenue < 1000000
      default:
        return true
    }
  })
}
