import { NextResponse } from "next/server"
import { metabase } from "@/lib/integrations"

// Query IDs from Metabase
const ACCOUNT_DATA_QUERY_ID = 948 // "Moovs Account Data - Detail"
const AT_RISK_QUERY_ID = 1479 // "Accounts without a trip over 30 days"

interface AccountUsageData {
  companyName: string
  hubspotCompanyName: string | null
  operatorId: string | null
  hubspotCompanyId: string | null
  // Usage metrics
  totalTrips: number
  daysSinceLastLogin: number | null
  vehiclesTotal: number | null
  driversCount: number | null
  // Risk & health
  churnStatus: string | null
  predictiveRiskScore: number | null
  predictiveRiskLevel: string | null
  actualRiskScore: number | null
  actualRiskLevel: string | null
  engagementStatus: string | null
  // Revenue
  mrr: number | null
  plan: string | null
  customerSegment: string | null
  // Activity
  daysSinceLastTrip: number | null
  last30DaysReservations: number | null
}

/**
 * Get account usage data from Metabase
 * GET /api/integrations/metabase/accounts
 */
export async function GET() {
  if (!process.env.METABASE_URL || !process.env.METABASE_API_KEY) {
    return NextResponse.json({
      configured: false,
      error: "Metabase not configured",
    })
  }

  try {
    // Run both queries in parallel
    const [accountDataResult, atRiskResult] = await Promise.all([
      metabase.runQuery(ACCOUNT_DATA_QUERY_ID),
      metabase.runQuery(AT_RISK_QUERY_ID),
    ])

    // Convert to objects
    const accountData = metabase.rowsToObjects<Record<string, unknown>>(accountDataResult)
    const atRiskData = metabase.rowsToObjects<Record<string, unknown>>(atRiskResult)

    // Build a map of at-risk accounts by company name for quick lookup
    const atRiskMap = new Map<string, Record<string, unknown>>()
    for (const row of atRiskData) {
      const name = (row.P_COMPANY_NAME as string)?.toLowerCase()
      if (name) {
        atRiskMap.set(name, row)
      }
    }

    // Process account data
    const accounts: AccountUsageData[] = accountData.map((row) => {
      const companyName = row.MOOVS_COMPANY_NAME as string
      const atRisk = atRiskMap.get(companyName?.toLowerCase())

      return {
        companyName: companyName || "Unknown",
        hubspotCompanyName: row.HUBSPOT_COMPANY_NAME as string | null,
        operatorId: row.OPERATOR_ID as string | null,
        hubspotCompanyId: (atRisk?.HS_C_ID as string) || null,
        // Usage metrics
        totalTrips: (row.ALL_TRIPS_COUNT as number) || 0,
        daysSinceLastLogin: row.DAYS_SINCE_LAST_IDENTIFY as number | null,
        vehiclesTotal: row.VEHICLES_TOTAL as number | null,
        driversCount: row.DRIVERS_COUNT as number | null,
        // Risk & health
        churnStatus: row.CHURN_STATUS as string | null,
        predictiveRiskScore: row.PREDICTIVE_RISK_SCORE as number | null,
        predictiveRiskLevel: row.PREDICTIVE_RISK_LEVEL as string | null,
        actualRiskScore: row.ACTUAL_RISK_SCORE as number | null,
        actualRiskLevel: row.ACTUAL_RISK_LEVEL as string | null,
        engagementStatus: (atRisk?.DA_ENGAGEMENT_STATUS as string) || null,
        // Revenue
        mrr: (row.TOTAL_MRR_NUMERIC as number) || (atRisk?.CALCULATED_MRR as number) || null,
        plan: row.LAGO_PLAN_NAME as string | null,
        customerSegment: row.CUSTOMER_SEGMENT as string | null,
        // Activity
        daysSinceLastTrip: (atRisk?.["Days Since Last Created Trip"] as number) || null,
        last30DaysReservations: (atRisk?.R_LAST_30_DAYS_RESERVATIONS_COUNT as number) || null,
      }
    })

    // Summary stats
    const stats = {
      total: accounts.length,
      atRisk: atRiskData.length,
      byRiskLevel: {
        high: accounts.filter((a) => a.predictiveRiskLevel?.toLowerCase() === "high").length,
        medium: accounts.filter((a) => a.predictiveRiskLevel?.toLowerCase() === "medium").length,
        low: accounts.filter((a) => a.predictiveRiskLevel?.toLowerCase() === "low").length,
      },
      byEngagement: {
        inactive: accounts.filter((a) => a.engagementStatus === "Inactive").length,
        lowActivity: accounts.filter((a) => a.engagementStatus === "Low Activity").length,
      },
      totalMrr: accounts.reduce((sum, a) => sum + (a.mrr || 0), 0),
    }

    return NextResponse.json({
      configured: true,
      accounts,
      stats,
      queryInfo: {
        accountDataQueryId: ACCOUNT_DATA_QUERY_ID,
        atRiskQueryId: AT_RISK_QUERY_ID,
        accountDataRows: accountDataResult.row_count,
        atRiskRows: atRiskResult.row_count,
      },
    })
  } catch (error) {
    console.error("Metabase accounts error:", error)
    return NextResponse.json(
      {
        configured: true,
        error: error instanceof Error ? error.message : "Failed to fetch Metabase data",
      },
      { status: 500 }
    )
  }
}
