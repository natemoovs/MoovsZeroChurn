import { NextRequest, NextResponse } from "next/server"
import { metabase } from "@/lib/integrations/metabase"
import { prisma } from "@/lib/db"
import { isAuthenticated } from "@/lib/auth/server"

// Dashboard identifiers
const PRIVATE_DASHBOARD_ID = 402 // Moovs CSM Dashboard (requires METABASE_API_KEY)
const PUBLIC_DASHBOARD_TOKEN = "a5f94698-23ff-4785-8448-403523a1c21f" // Public version

// Column mappings from dashboard to our schema
interface SubscriptionRow {
  "Lago Plan Code"?: string
  "Lago Plan Name"?: string
  "Lago Waterfall Event"?: string
  "Lago Lifetime Days"?: number
  "Lago External Customer ID"?: string
  "P Company Name"?: string
  "P Plan"?: string
  "P General Email"?: string
  "P Stripe Account ID"?: string
  "P Custom Domain"?: string
  "P Vehicles Total"?: number
  "P Total Members"?: number
  "P Drivers Count"?: number
  "P Setup Score"?: number
  "Hs C ID"?: number | string
  "Hs C Property Name"?: string
  "Hs C Property Customer Segment"?: string
  "Hs D Owner Name"?: string
  "Hs D Churn Status"?: string
  "Hs D Stage Name"?: string
  "R Total Reservations Count"?: number
  "R Last 30 Days Reservations Count"?: number
  "Days Since Last Created Trip"?: number
  "Calculated Mrr"?: number
  "Da Days Since Last Assignment"?: number
  "Da Engagement Status"?: string
}

/**
 * Get segment from Lago plan code
 */
function getSegmentFromPlanCode(planCode: string | null | undefined): string {
  if (!planCode) return "free"
  const code = planCode.toLowerCase()
  if (code === "vip-monthly") return "enterprise"
  if (code.startsWith("pro-")) return "mid_market"
  if (code.startsWith("standard-")) return "smb"
  return "free"
}

/**
 * Calculate health score from subscription data
 */
function calculateHealthScore(row: SubscriptionRow): {
  healthScore: "green" | "yellow" | "red" | "unknown"
  riskSignals: string[]
  positiveSignals: string[]
} {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  // Churn status
  const churnStatus = row["Hs D Churn Status"]?.toLowerCase() || ""
  if (churnStatus.includes("churn")) {
    riskSignals.push("Churned")
  }

  // Waterfall event
  const event = row["Lago Waterfall Event"]?.toLowerCase() || ""
  if (event === "churn") {
    riskSignals.push("Subscription churned")
  } else if (event.includes("contraction")) {
    riskSignals.push("Downgraded plan")
  }

  // Engagement
  const engagement = row["Da Engagement Status"]?.toLowerCase() || ""
  if (engagement.includes("inactive")) {
    riskSignals.push(`Engagement: ${row["Da Engagement Status"]}`)
  } else if (engagement.includes("active today") || engagement.includes("active this week")) {
    positiveSignals.push("Recently active")
  }

  // Usage
  const daysSinceTrip = row["Days Since Last Created Trip"]
  if (daysSinceTrip !== undefined && daysSinceTrip > 60) {
    riskSignals.push(`No trips in ${daysSinceTrip}d`)
  } else if (daysSinceTrip !== undefined && daysSinceTrip <= 7) {
    positiveSignals.push("Recent trip activity")
  }

  const totalTrips = row["R Total Reservations Count"] || 0
  const tripsLast30 = row["R Last 30 Days Reservations Count"] || 0

  if (totalTrips === 0) {
    riskSignals.push("No trips")
  } else if (totalTrips > 100) {
    positiveSignals.push(`${totalTrips} total trips`)
  }

  if (tripsLast30 > 10) {
    positiveSignals.push(`${tripsLast30} trips (30d)`)
  } else if (tripsLast30 === 0 && totalTrips > 20) {
    riskSignals.push("Usage stopped")
  }

  // MRR
  const mrr = row["Calculated Mrr"] || 0
  if (mrr >= 200) {
    positiveSignals.push("High value customer")
  } else if (mrr === 0 && totalTrips > 0) {
    riskSignals.push("MRR dropped to zero")
  }

  // Plan
  const planCode = row["Lago Plan Code"]?.toLowerCase() || ""
  if (planCode.includes("pro") || planCode.includes("vip")) {
    positiveSignals.push("Premium plan")
  }

  // Determine health score
  let healthScore: "green" | "yellow" | "red" | "unknown" = "unknown"

  const hasChurnSignal = riskSignals.some((s) => s.includes("Churned") || s.includes("churn"))
  const hasInactiveSignal = riskSignals.some(
    (s) => s.includes("Inactive") || s.includes("stopped") || s.includes("No trips")
  )

  if (hasChurnSignal) {
    healthScore = "red"
  } else if (hasInactiveSignal && riskSignals.length > 1) {
    healthScore = "red"
  } else if (riskSignals.length > 2) {
    healthScore = "yellow"
  } else if (riskSignals.length > 0 && positiveSignals.length < 2) {
    healthScore = "yellow"
  } else if (positiveSignals.length >= 2) {
    healthScore = "green"
  } else if (mrr > 0 && tripsLast30 > 0) {
    healthScore = "green"
  } else {
    healthScore = "yellow"
  }

  return { healthScore, riskSignals, positiveSignals }
}

/**
 * Sync data from Metabase public dashboard
 * GET /api/sync/metabase-dashboard - Preview dashboard data
 * POST /api/sync/metabase-dashboard - Sync to database
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get("token") || PUBLIC_DASHBOARD_TOKEN

  try {
    console.log(`Fetching public dashboard: ${token}`)

    const dashboardData = await metabase.getPublicDashboardData(token)

    return NextResponse.json({
      success: true,
      dashboard: {
        name: dashboardData.dashboardName,
        id: dashboardData.dashboardId,
        syncedAt: dashboardData.syncedAt,
      },
      cardCount: Object.keys(dashboardData.cards).length,
      cards: Object.entries(dashboardData.cards).map(([name, data]) => ({
        name,
        cardId: data.cardId,
        display: data.display,
        rowCount: data.rowCount,
        columns: data.columns,
        error: data.error,
        preview: data.rows.slice(0, 5),
      })),
    })
  } catch (error) {
    console.error("Dashboard fetch failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}

/**
 * Sync dashboard data to database
 * POST /api/sync/metabase-dashboard
 *
 * Uses private API (dashboard 402) if METABASE_API_KEY is set,
 * otherwise falls back to public dashboard
 */
export async function POST(request: NextRequest) {
  const userLoggedIn = await isAuthenticated()
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  const isAuthorized =
    process.env.NODE_ENV === "development" ||
    userLoggedIn ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    request.headers.get("x-vercel-cron") === "1"

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))

    // Prefer private dashboard if METABASE_API_KEY is configured
    const usePrivate = !!process.env.METABASE_API_KEY && !body.usePublic
    const dashboardId = body.dashboardId || PRIVATE_DASHBOARD_ID
    const publicToken = body.token || PUBLIC_DASHBOARD_TOKEN

    let dashboardData: Awaited<ReturnType<typeof metabase.getDashboardData>>

    if (usePrivate) {
      console.log(`Syncing private dashboard ${dashboardId} to database`)
      dashboardData = await metabase.getDashboardData(dashboardId)
    } else {
      console.log(`Syncing public dashboard to database: ${publicToken}`)
      dashboardData = await metabase.getPublicDashboardData(publicToken)
    }

    // Find the subscriptions card (main data table)
    // Look for card with subscription-like columns
    let subscriptionRows: SubscriptionRow[] = []

    for (const [cardName, cardData] of Object.entries(dashboardData.cards)) {
      // Check if this card has subscription data columns
      const hasSubscriptionCols =
        cardData.columns.some((c) => c.includes("Lago") || c.includes("Company Name")) &&
        cardData.columns.some((c) => c.includes("Mrr") || c.includes("MRR"))

      if (hasSubscriptionCols && cardData.rows.length > 0) {
        console.log(`Found subscription data in card: ${cardName} (${cardData.rows.length} rows)`)
        subscriptionRows = cardData.rows as SubscriptionRow[]
        break
      }
    }

    if (subscriptionRows.length === 0) {
      // Try the first card with data
      for (const [cardName, cardData] of Object.entries(dashboardData.cards)) {
        if (cardData.rows.length > 0) {
          console.log(`Using card: ${cardName} (${cardData.rows.length} rows)`)
          subscriptionRows = cardData.rows as SubscriptionRow[]
          break
        }
      }
    }

    if (subscriptionRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No subscription data found in dashboard",
        cards: Object.keys(dashboardData.cards),
      })
    }

    // Deduplicate by operator ID (keep latest per operator)
    const operatorMap = new Map<string, SubscriptionRow>()
    for (const row of subscriptionRows) {
      const operatorId =
        row["Lago External Customer ID"] ||
        row["P Company Name"]?.replace(/\s+/g, "-").toLowerCase() ||
        ""
      if (!operatorId) continue

      const existing = operatorMap.get(operatorId)
      if (!existing) {
        operatorMap.set(operatorId, row)
      } else {
        // Keep the one with higher MRR or more recent data
        const existingMrr = existing["Calculated Mrr"] || 0
        const newMrr = row["Calculated Mrr"] || 0
        if (newMrr > existingMrr) {
          operatorMap.set(operatorId, row)
        }
      }
    }

    console.log(`Processing ${operatorMap.size} unique operators`)

    // CSM assignments
    const CSM_ASSIGNMENTS: Record<string, { name: string; email: string }> = {
      enterprise: { name: "Nate", email: "nate@moovs.com" },
      mid_market: { name: "Andrea", email: "andrea@moovs.com" },
      smb: { name: "Andrea", email: "andrea@moovs.com" },
      free: { name: "Andrea", email: "andrea@moovs.com" },
    }

    let synced = 0
    let skipped = 0
    let failed = 0

    for (const [operatorId, row] of operatorMap) {
      try {
        // Skip churned with no MRR
        const isChurned = row["Hs D Churn Status"]?.toLowerCase().includes("churn")
        const mrr = row["Calculated Mrr"] || 0

        if (isChurned && mrr <= 0) {
          skipped++
          continue
        }

        // Calculate health
        const health = calculateHealthScore(row)

        // Build record ID
        const hubspotId = row["Hs C ID"]
        const recordId = hubspotId
          ? String(hubspotId).replace(/\.0+$/, "")
          : `operator-${operatorId}`

        const segment = getSegmentFromPlanCode(row["Lago Plan Code"])
        const csm = CSM_ASSIGNMENTS[segment] || CSM_ASSIGNMENTS.smb

        const companyName = row["P Company Name"] || row["Hs C Property Name"] || "Unknown"
        const domain = row["P Custom Domain"] || row["P General Email"]?.split("@")[1] || null

        // Upsert to database
        await prisma.hubSpotCompany.upsert({
          where: { hubspotId: recordId },
          update: {
            name: companyName,
            domain,
            mrr,
            plan: row["Lago Plan Name"] || null,
            planCode: row["Lago Plan Code"] || null,
            customerSegment: segment,
            totalTrips: row["R Total Reservations Count"] || 0,
            daysSinceLastLogin: row["Days Since Last Created Trip"] || null,
            ownerName: row["Hs D Owner Name"] || csm.name,
            ownerEmail: csm.email,
            healthScore: health.healthScore,
            riskSignals: health.riskSignals,
            positiveSignals: health.positiveSignals,
            operatorId,
            stripeAccountId: row["P Stripe Account ID"] || null,
            primaryContactEmail: row["P General Email"] || null,
            hasHubSpotRecord: !!hubspotId,
            hubspotRecordId: hubspotId ? String(hubspotId).replace(/\.0+$/, "") : null,
            subscriptionStatus: row["Lago Waterfall Event"] || row["Hs D Churn Status"] || null,
            lastSyncedAt: new Date(),
          },
          create: {
            hubspotId: recordId,
            name: companyName,
            domain,
            mrr,
            plan: row["Lago Plan Name"] || null,
            planCode: row["Lago Plan Code"] || null,
            customerSegment: segment,
            totalTrips: row["R Total Reservations Count"] || 0,
            daysSinceLastLogin: row["Days Since Last Created Trip"] || null,
            ownerName: row["Hs D Owner Name"] || csm.name,
            ownerEmail: csm.email,
            healthScore: health.healthScore,
            riskSignals: health.riskSignals,
            positiveSignals: health.positiveSignals,
            operatorId,
            stripeAccountId: row["P Stripe Account ID"] || null,
            primaryContactEmail: row["P General Email"] || null,
            hasHubSpotRecord: !!hubspotId,
            hubspotRecordId: hubspotId ? String(hubspotId).replace(/\.0+$/, "") : null,
            subscriptionStatus: row["Lago Waterfall Event"] || row["Hs D Churn Status"] || null,
            lastSyncedAt: new Date(),
          },
        })

        synced++
      } catch (err) {
        console.error(`Failed to sync operator ${operatorId}:`, err)
        failed++
      }
    }

    console.log(`Dashboard sync complete: ${synced} synced, ${skipped} skipped, ${failed} failed`)

    return NextResponse.json({
      success: true,
      dashboardName: dashboardData.dashboardName,
      dashboardId: dashboardData.dashboardId,
      syncedAt: dashboardData.syncedAt,
      totalRows: subscriptionRows.length,
      uniqueOperators: operatorMap.size,
      synced,
      skipped,
      failed,
    })
  } catch (error) {
    console.error("Dashboard sync failed:", error)
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}
