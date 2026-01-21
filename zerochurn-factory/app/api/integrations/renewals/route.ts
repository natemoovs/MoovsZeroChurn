import { NextRequest, NextResponse } from "next/server"
import { hubspot, metabase } from "@/lib/integrations"
import type { HubSpotCompany, HubSpotDeal } from "@/lib/integrations"

const ACCOUNT_DATA_QUERY_ID = 948

interface RenewalInfo {
  companyId: string
  companyName: string
  dealId: string
  dealName: string
  renewalDate: string
  daysUntilRenewal: number
  amount: number | null
  healthScore: "green" | "yellow" | "red" | "unknown"
  riskSignals: string[]
  mrr: number | null
  stage: string | null
}

interface MetabaseAccountData {
  companyName: string
  totalTrips: number
  daysSinceLastLogin: number | null
  churnStatus: string | null
  mrr: number | null
}

/**
 * Get upcoming renewals
 * GET /api/integrations/renewals?days=90
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const days = parseInt(searchParams.get("days") || "90", 10)

  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    return NextResponse.json({
      renewals: [],
      configured: false,
      error: "HubSpot not configured",
    })
  }

  try {
    // Get all customers and their deals
    const [customers, metabaseData] = await Promise.all([
      hubspot.listCustomers(),
      fetchMetabaseData(),
    ])

    // Build Metabase map for health scoring
    const metabaseMap = new Map<string, MetabaseAccountData>()
    for (const account of metabaseData) {
      if (account.companyName) {
        metabaseMap.set(account.companyName.toLowerCase(), account)
      }
    }

    // Fetch deals for each company (in batches to avoid rate limits)
    const renewals: RenewalInfo[] = []
    const now = new Date()
    const maxDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    // Process in batches of 10
    const batchSize = 10
    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize)

      const dealPromises = batch.map(async (company) => {
        try {
          const deals = await hubspot.getDeals(company.id)
          return { company, deals }
        } catch {
          return { company, deals: [] as HubSpotDeal[] }
        }
      })

      const results = await Promise.all(dealPromises)

      for (const { company, deals } of results) {
        for (const deal of deals) {
          if (!deal.properties.closedate) continue

          const closeDate = new Date(deal.properties.closedate)
          const daysUntil = Math.ceil(
            (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )

          // Only include renewals within the specified window
          if (closeDate >= now && closeDate <= maxDate) {
            const mb = metabaseMap.get(company.properties.name?.toLowerCase() || "")
            const { healthScore, riskSignals } = calculateHealth(company, mb)

            renewals.push({
              companyId: company.id,
              companyName: company.properties.name || "Unknown",
              dealId: deal.id,
              dealName: deal.properties.dealname,
              renewalDate: deal.properties.closedate,
              daysUntilRenewal: daysUntil,
              amount: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
              healthScore,
              riskSignals,
              mrr: mb?.mrr || null,
              stage: deal.properties.dealstage || null,
            })
          }
        }
      }

      // Small delay between batches
      if (i + batchSize < customers.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // Sort by renewal date
    renewals.sort(
      (a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime()
    )

    // Group by time window
    const next30 = renewals.filter((r) => r.daysUntilRenewal <= 30)
    const next60 = renewals.filter((r) => r.daysUntilRenewal > 30 && r.daysUntilRenewal <= 60)
    const next90 = renewals.filter((r) => r.daysUntilRenewal > 60 && r.daysUntilRenewal <= 90)

    // Calculate totals
    const totalAmount = renewals.reduce((sum, r) => sum + (r.amount || 0), 0)
    const atRiskAmount = renewals
      .filter((r) => r.healthScore === "red")
      .reduce((sum, r) => sum + (r.amount || 0), 0)

    return NextResponse.json({
      renewals,
      grouped: {
        next30Days: next30,
        next60Days: next60,
        next90Days: next90,
      },
      stats: {
        total: renewals.length,
        totalAmount,
        atRiskCount: renewals.filter((r) => r.healthScore === "red").length,
        atRiskAmount,
        byHealth: {
          green: renewals.filter((r) => r.healthScore === "green").length,
          yellow: renewals.filter((r) => r.healthScore === "yellow").length,
          red: renewals.filter((r) => r.healthScore === "red").length,
        },
      },
      configured: true,
    })
  } catch (error) {
    console.error("Renewals fetch error:", error)
    return NextResponse.json(
      { renewals: [], error: "Failed to fetch renewals" },
      { status: 500 }
    )
  }
}

async function fetchMetabaseData(): Promise<MetabaseAccountData[]> {
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
    }))
  } catch {
    return []
  }
}

function calculateHealth(
  company: HubSpotCompany,
  mb: MetabaseAccountData | undefined
): {
  healthScore: "green" | "yellow" | "red" | "unknown"
  riskSignals: string[]
} {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  if (mb) {
    if (mb.churnStatus?.toLowerCase().includes("churn")) {
      riskSignals.push("Churned")
    }
    if (mb.totalTrips === 0) {
      riskSignals.push("No trips")
    } else if (mb.totalTrips <= 5) {
      riskSignals.push("Low usage")
    } else if (mb.totalTrips > 20) {
      positiveSignals.push("Active usage")
    }
    if (mb.daysSinceLastLogin !== null && mb.daysSinceLastLogin > 60) {
      riskSignals.push(`Inactive ${mb.daysSinceLastLogin}d`)
    } else if (mb.daysSinceLastLogin !== null && mb.daysSinceLastLogin <= 7) {
      positiveSignals.push("Recent login")
    }
    if (mb.mrr && mb.mrr > 0) {
      positiveSignals.push("Paying")
    }
  }

  let healthScore: "green" | "yellow" | "red" | "unknown" = "unknown"

  if (riskSignals.some((r) => r.includes("Churned") || r.includes("Inactive"))) {
    healthScore = "red"
  } else if (riskSignals.length >= 2) {
    healthScore = "red"
  } else if (riskSignals.length === 1) {
    healthScore = "yellow"
  } else if (positiveSignals.length >= 2) {
    healthScore = "green"
  } else if (positiveSignals.length === 1) {
    healthScore = "green"
  }

  return { healthScore, riskSignals }
}
