import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hubspot, HubSpotCompany, getOwners } from "@/lib/integrations/hubspot"
import { metabase } from "@/lib/integrations"
import { isAuthenticated } from "@/lib/auth/server"
import { detectAndCompleteMilestones } from "@/lib/onboarding/detect-milestones"

// Metabase query ID for CSM_MOOVS master customer view (Card 1469)
const METABASE_QUERY_ID = 1469

// Snowflake database ID in Metabase
const SNOWFLAKE_DB_ID = 2

// Metabase data structure (from CSM_MOOVS card 1469)
interface MetabaseAccountData {
  // Identity
  operatorId: string | null
  companyName: string
  email: string | null
  hubspotCompanyId: string | null
  stripeAccountId: string | null
  customDomain: string | null
  // Billing
  mrr: number | null
  plan: string | null // Lago Plan Name (e.g., "Pro (Annual)")
  planCode: string | null // Lago Plan Code (e.g., "pro-annual")
  billingStatus: string | null
  subscriptionLifetimeDays: number | null // Lago Lifetime Days
  waterfallEvent: string | null // Lago Waterfall Event
  // Usage
  totalTrips: number
  tripsLast30Days: number
  daysSinceLastActivity: number | null
  daysSinceLastTrip: number | null // Days Since Last Created Trip
  lastTripCreatedAt: string | null // R Last Trip Created At
  // Fleet/Product
  vehiclesTotal: number | null
  membersCount: number | null
  driversCount: number | null
  setupScore: number | null
  // Status
  churnStatus: string | null
  customerSegment: string | null
  engagementStatus: string | null
  // Deal Info
  dealStage: string | null
  dealPipeline: string | null
  dealCloseDate: string | null
  dealAmount: number | null
  dealOwnerName: string | null
  // Location
  latitude: string | null
  longitude: string | null
}

// Stripe payment data structure
interface StripePaymentData {
  stripeAccountId: string
  totalCharges: number
  successfulCharges: number
  failedCharges: number
  totalCharged: number
  totalRefunded: number
  disputeCount: number
  avgRiskScore: number | null
  successRate: number
}

interface OwnerMap {
  [key: string]: { name: string; email: string }
}

/**
 * Derive customer segment from Lago Plan Code
 * - Enterprise: vip-monthly
 * - Mid-Market: pro-monthly, pro-annual, pro-legacy
 * - SMB: standard-monthly, standard-annual
 * - Free: null or unknown plan
 */
function getSegmentFromPlanCode(
  planCode: string | null
): "enterprise" | "mid_market" | "smb" | "free" {
  if (!planCode) return "free"
  const code = planCode.toLowerCase()

  if (code === "vip-monthly") return "enterprise"
  if (code.startsWith("pro-")) return "mid_market"
  if (code.startsWith("standard-")) return "smb"

  return "free"
}

/**
 * Fetch account data from Metabase CSM_MOOVS view
 */
async function fetchMetabaseData(): Promise<MetabaseAccountData[]> {
  if (!process.env.METABASE_URL || !process.env.METABASE_API_KEY) {
    console.log("Metabase not configured (missing METABASE_URL or METABASE_API_KEY)")
    return []
  }

  const result = await metabase.runQuery(METABASE_QUERY_ID)
  const rows = metabase.rowsToObjects<Record<string, unknown>>(result)

  // Log column names for debugging
  console.log("Metabase CSM_MOOVS columns:", Object.keys(rows[0] || {}))
  console.log("Sample row:", JSON.stringify(rows[0] || {}).slice(0, 500))

  return rows.map((row) => ({
    // Identity - from CSM_MOOVS fields
    operatorId: (row.LAGO_EXTERNAL_CUSTOMER_ID as string) || null,
    companyName: (row.P_COMPANY_NAME as string) || "",
    email: (row.P_GENERAL_EMAIL as string) || null,
    hubspotCompanyId: (row.HS_C_ID as string) || null,
    stripeAccountId: (row.P_STRIPE_ACCOUNT_ID as string) || null,
    customDomain: (row.P_CUSTOM_DOMAIN as string) || null,
    // Billing
    mrr: (row.CALCULATED_MRR as number) || null,
    plan: (row.LAGO_PLAN_NAME as string) || null,
    planCode: (row.LAGO_PLAN_CODE as string) || null,
    billingStatus: (row.LAGO_STATUS as string) || (row.LAGO_CUSTOMER_STATUS as string) || null,
    subscriptionLifetimeDays: (row.LAGO_LIFETIME_DAYS as number) || null,
    waterfallEvent: (row.LAGO_WATERFALL_EVENT as string) || null,
    // Usage
    totalTrips: (row.R_TOTAL_RESERVATIONS_COUNT as number) || 0,
    tripsLast30Days: (row.R_LAST_30_DAYS_RESERVATIONS_COUNT as number) || 0,
    daysSinceLastActivity: (row.DA_DAYS_SINCE_LAST_ASSIGNMENT as number) || null,
    daysSinceLastTrip: (row.DAYS_SINCE_LAST_CREATED_TRIP as number) || null,
    lastTripCreatedAt: (row.R_LAST_TRIP_CREATED_AT as string) || null,
    // Fleet/Product
    vehiclesTotal: (row.P_VEHICLES_TOTAL as number) || null,
    membersCount: (row.P_TOTAL_MEMBERS as number) || null,
    driversCount: (row.P_DRIVERS_COUNT as number) || null,
    setupScore: (row.P_SETUP_SCORE as number) || null,
    // Status
    churnStatus: (row.HS_D_CHURN_STATUS as string) || null,
    customerSegment: (row.HS_C_PROPERTY_CUSTOMER_SEGMENT as string) || null,
    engagementStatus: (row.DA_ENGAGEMENT_STATUS as string) || null,
    // Deal Info
    dealStage: (row.HS_D_STAGE_NAME as string) || null,
    dealPipeline: (row.HS_D_PIPELINE_SEGMENT as string) || null,
    dealCloseDate: (row.HS_D_CLOSE_DATE as string) || null,
    dealAmount: (row.HS_D_CLOSED_AMOUNT as number) || null,
    dealOwnerName: (row.HS_D_OWNER_NAME as string) || null,
    // Location
    latitude: (row.LATITUDE as string) || null,
    longitude: (row.LONGITUDE as string) || null,
  }))
}

/**
 * Fetch Stripe payment data from Metabase (raw Stripe tables)
 * This queries STRIPE_MOOVS.CHARGE aggregated by operator
 */
async function fetchStripePaymentData(): Promise<Map<string, StripePaymentData>> {
  if (!process.env.METABASE_URL || !process.env.METABASE_API_KEY) {
    console.log("Metabase not configured, skipping Stripe data")
    return new Map()
  }

  try {
    // Query Stripe charges aggregated by connected account (operator)
    // Using raw tables as documented in STRIPE_GUIDE.md
    const sql = `
      SELECT
        CONNECTED_ACCOUNT_ID as stripe_account_id,
        COUNT(*) as total_charges,
        SUM(CASE WHEN STATUS = 'succeeded' THEN 1 ELSE 0 END) as successful_charges,
        SUM(CASE WHEN STATUS = 'failed' THEN 1 ELSE 0 END) as failed_charges,
        SUM(AMOUNT) / 100.0 as total_charged_dollars,
        SUM(AMOUNT_REFUNDED) / 100.0 as total_refunded_dollars,
        AVG(CASE WHEN OUTCOME_RISK_SCORE IS NOT NULL THEN OUTCOME_RISK_SCORE ELSE NULL END) as avg_risk_score,
        ROUND(SUM(CASE WHEN STATUS = 'succeeded' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate_pct
      FROM STRIPE_MOOVS.CHARGE
      WHERE CONNECTED_ACCOUNT_ID IS NOT NULL
        AND CREATED >= DATEADD(day, -90, CURRENT_DATE())
      GROUP BY CONNECTED_ACCOUNT_ID
      HAVING COUNT(*) > 0
    `

    const result = await metabase.runCustomQuery(SNOWFLAKE_DB_ID, sql)
    const rows = metabase.rowsToObjects<Record<string, unknown>>(result)

    console.log(`Fetched Stripe payment data for ${rows.length} accounts`)

    // Also fetch dispute counts
    const disputeSql = `
      SELECT
        c.CONNECTED_ACCOUNT_ID as stripe_account_id,
        COUNT(DISTINCT d.ID) as dispute_count
      FROM STRIPE_MOOVS.DISPUTE d
      JOIN STRIPE_MOOVS.CHARGE c ON d.CHARGE_ID = c.ID
      WHERE c.CONNECTED_ACCOUNT_ID IS NOT NULL
        AND d.CREATED >= DATEADD(day, -90, CURRENT_DATE())
      GROUP BY c.CONNECTED_ACCOUNT_ID
    `

    const disputeMap = new Map<string, number>()
    try {
      const disputeResult = await metabase.runCustomQuery(SNOWFLAKE_DB_ID, disputeSql)
      const disputeRows = metabase.rowsToObjects<Record<string, unknown>>(disputeResult)
      for (const row of disputeRows) {
        const accountId = row.stripe_account_id as string
        disputeMap.set(accountId, (row.dispute_count as number) || 0)
      }
      console.log(`Fetched dispute data for ${disputeMap.size} accounts`)
    } catch (disputeErr) {
      console.log("Dispute query failed (table may not exist):", disputeErr)
    }

    // Build map indexed by Stripe account ID
    const paymentMap = new Map<string, StripePaymentData>()
    for (const row of rows) {
      const accountId = row.stripe_account_id as string
      if (!accountId) continue

      paymentMap.set(accountId, {
        stripeAccountId: accountId,
        totalCharges: (row.total_charges as number) || 0,
        successfulCharges: (row.successful_charges as number) || 0,
        failedCharges: (row.failed_charges as number) || 0,
        totalCharged: (row.total_charged_dollars as number) || 0,
        totalRefunded: (row.total_refunded_dollars as number) || 0,
        disputeCount: disputeMap.get(accountId) || 0,
        avgRiskScore: (row.avg_risk_score as number) || null,
        successRate: (row.success_rate_pct as number) || 100,
      })
    }

    return paymentMap
  } catch (err) {
    console.error("Failed to fetch Stripe payment data:", err)
    return new Map()
  }
}

/**
 * Calculate weighted health score (0-100) based on 4 dimensions
 * Based on RESEARCH_GUIDE.md scoring algorithm
 */
function calculateWeightedHealthScore(
  mbData: MetabaseAccountData | undefined,
  stripeData: StripePaymentData | undefined,
  company: HubSpotCompany
): {
  numericScore: number
  healthScore: string // green, yellow, red, unknown
  paymentScore: number
  engagementScore: number
  supportScore: number
  growthScore: number
  riskSignals: string[]
  positiveSignals: string[]
  paymentHealth: string
} {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  // =========================================================================
  // EARLY DETECTION: Is this account churned or severely inactive?
  // This affects what positive signals we can add
  // =========================================================================
  const isChurned = mbData?.churnStatus?.toLowerCase().includes("churn") || false
  const _isInactive = mbData?.engagementStatus?.toLowerCase().includes("inactive") || false // Used for future engagement analysis
  const isSeverelyInactive = (mbData?.daysSinceLastActivity ?? 0) > 90

  // =========================================================================
  // Payment Health Score (40% weight)
  // =========================================================================
  let paymentScore = 100 // Start at 100

  if (stripeData) {
    // Deductions for payment issues
    if (stripeData.successRate < 95) {
      paymentScore -= 10
      riskSignals.push(`Payment success rate ${stripeData.successRate.toFixed(1)}%`)
    }
    if (stripeData.successRate < 80) {
      paymentScore -= 15 // Additional deduction
      riskSignals.push("Critical payment failure rate")
    }

    if (stripeData.failedCharges > 0) {
      paymentScore -= Math.min(stripeData.failedCharges * 5, 25) // -5 per failure, max -25
      if (stripeData.failedCharges >= 3) {
        riskSignals.push(`${stripeData.failedCharges} failed payments (90d)`)
      }
    }

    if (stripeData.disputeCount > 0) {
      paymentScore -= stripeData.disputeCount * 15 // -15 per dispute
      riskSignals.push(`${stripeData.disputeCount} dispute(s)`)
    }

    if (stripeData.avgRiskScore && stripeData.avgRiskScore > 50) {
      paymentScore -= 10
      riskSignals.push("Elevated risk scores")
    }

    // Positive signals (only if not churned)
    if (!isChurned) {
      if (stripeData.successRate >= 98 && stripeData.totalCharges >= 10) {
        positiveSignals.push("Excellent payment history")
      }
      if (stripeData.totalCharged > 10000) {
        positiveSignals.push("High payment volume")
      }
    }
  } else if (mbData?.mrr && mbData.mrr > 0) {
    // If we have MRR but no Stripe data
    // Don't say "Paying customer" if they're churned - that's contradictory
    if (!isChurned && !isSeverelyInactive) {
      positiveSignals.push("Paying customer")
    }
  } else {
    // No payment data at all
    paymentScore = 50 // Neutral
  }

  paymentScore = Math.max(0, Math.min(100, paymentScore))

  // Determine payment health status
  let paymentHealth = "unknown"
  if (stripeData || (mbData?.mrr && mbData.mrr > 0)) {
    if (paymentScore >= 80) paymentHealth = "good"
    else if (paymentScore >= 50) paymentHealth = "at_risk"
    else paymentHealth = "critical"
  }

  // =========================================================================
  // Engagement Score (25% weight)
  // =========================================================================
  let engagementScore = 100

  if (mbData) {
    // Deductions for inactivity
    if (mbData.daysSinceLastActivity !== null) {
      if (mbData.daysSinceLastActivity > 60) {
        engagementScore -= 30
        riskSignals.push(`No activity in ${mbData.daysSinceLastActivity}d`)
      } else if (mbData.daysSinceLastActivity > 30) {
        engagementScore -= 15
        riskSignals.push("Inactive 30+ days")
      } else if (mbData.daysSinceLastActivity <= 7 && !isChurned) {
        positiveSignals.push("Recent activity")
      }
    }

    // Reservation-based engagement
    if (mbData.totalTrips === 0) {
      engagementScore -= 20
      riskSignals.push("No trips")
    } else if (mbData.totalTrips <= 5) {
      engagementScore -= 10
      riskSignals.push("Low usage")
    }

    // TREND DETECTION - This is critical for early churn warning
    // Calculate expected monthly rate and compare to recent activity
    if (mbData.totalTrips > 0) {
      // Estimate historical monthly average (assuming 12+ months of data for established customers)
      // A rough heuristic: if totalTrips > 60, assume 6+ months history
      const estimatedMonthsActive = Math.max(1, Math.min(12, Math.ceil(mbData.totalTrips / 10)))
      const historicalMonthlyAvg = mbData.totalTrips / estimatedMonthsActive

      // Compare recent 30-day activity to historical average
      if (historicalMonthlyAvg > 5) {
        // Only check trends for customers with meaningful volume
        const recentVsHistorical = mbData.tripsLast30Days / historicalMonthlyAvg

        if (mbData.tripsLast30Days === 0 && mbData.totalTrips > 20) {
          // Complete stop after being active - HIGH RISK
          engagementScore -= 30
          riskSignals.push("Usage stopped (was active)")
        } else if (recentVsHistorical < 0.3 && mbData.totalTrips > 30) {
          // Down 70%+ from average - SEVERE DECLINE
          engagementScore -= 25
          riskSignals.push(`Usage down ${Math.round((1 - recentVsHistorical) * 100)}%`)
        } else if (recentVsHistorical < 0.5 && mbData.totalTrips > 20) {
          // Down 50%+ - MODERATE DECLINE
          engagementScore -= 15
          riskSignals.push("Declining usage")
        } else if (recentVsHistorical >= 1.2 && !isChurned) {
          // Growing 20%+ - POSITIVE (only if not churned)
          engagementScore += 10
          positiveSignals.push("Growing usage")
        }
      } else if (mbData.tripsLast30Days === 0 && mbData.totalTrips > 10) {
        // Lower volume but stopped recently
        engagementScore -= 20
        riskSignals.push("No recent trips")
      }
    }

    // Positive signals for active usage (only if not churned/inactive)
    if (mbData.tripsLast30Days > 10 && !isChurned) {
      engagementScore += 10
      positiveSignals.push(`${mbData.tripsLast30Days} trips (30d)`)
    }

    // Historical trips as context (not contradictory - it's past data)
    if (mbData.totalTrips > 100) {
      positiveSignals.push(`${mbData.totalTrips} total trips`)
    }

    // Engagement status from CSM_MOOVS
    if (mbData.engagementStatus) {
      const status = mbData.engagementStatus.toLowerCase()
      if (status.includes("churn") || status.includes("inactive")) {
        engagementScore -= 20
        riskSignals.push(`Engagement: ${mbData.engagementStatus}`)
      } else if (status.includes("active") || status.includes("engaged")) {
        if (!isChurned) {
          positiveSignals.push("Engaged")
        }
      }
    }

    // Fleet/Product adoption signals - indicates platform stickiness
    const hasFleet = (mbData.vehiclesTotal ?? 0) > 0
    const hasTeam = (mbData.membersCount ?? 0) > 1 || (mbData.driversCount ?? 0) > 0

    if (hasFleet && hasTeam && !isChurned) {
      // Well-adopted platform
      engagementScore += 5
      if ((mbData.vehiclesTotal ?? 0) >= 10) {
        positiveSignals.push(`${mbData.vehiclesTotal} vehicles`)
      }
      if ((mbData.driversCount ?? 0) >= 5) {
        positiveSignals.push(`${mbData.driversCount} drivers`)
      }
    } else if (!hasFleet && !hasTeam && mbData.totalTrips > 0) {
      // Using product but no fleet setup - adoption risk
      engagementScore -= 5
      riskSignals.push("Limited platform adoption")
    }

    // Setup score - onboarding completion
    if (mbData.setupScore !== null && mbData.setupScore !== undefined) {
      if (mbData.setupScore < 30) {
        engagementScore -= 10
        riskSignals.push(`Low setup completion (${mbData.setupScore}%)`)
      } else if (mbData.setupScore >= 80 && !isChurned) {
        engagementScore += 5
        positiveSignals.push("Fully onboarded")
      }
    }

    // Churn status - this is definitive
    if (isChurned) {
      engagementScore -= 30
      riskSignals.push("Churned")
    }
  } else {
    // No engagement data - use HubSpot fallback
    const lastModified = company.properties.hs_lastmodifieddate
    if (lastModified) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceUpdate > 180) {
        engagementScore -= 40
        riskSignals.push("Inactive 6+ months")
      } else if (daysSinceUpdate > 90) {
        engagementScore -= 25
        riskSignals.push("Inactive 3+ months")
      }
    } else {
      engagementScore = 50 // Unknown, neutral
    }
  }

  engagementScore = Math.max(0, Math.min(100, engagementScore))

  // =========================================================================
  // Support Score (20% weight) - Placeholder until Notion integration
  // =========================================================================
  const supportScore = 100 // Default to healthy since we don't have ticket data yet

  // TODO: Integrate Notion tickets
  // For now, assume no open tickets = good support health

  // =========================================================================
  // Growth Score (15% weight)
  // =========================================================================
  let growthScore = 50 // Neutral base

  if (mbData) {
    // High value customer (only if not churned - historical value isn't current)
    if (mbData.mrr && mbData.mrr >= 200 && !isChurned) {
      growthScore += 15
      positiveSignals.push("High value")
    } else if (mbData.mrr && mbData.mrr >= 100 && !isChurned) {
      growthScore += 10
    }

    // Usage growth signals (only if not churned)
    if (mbData.totalTrips > 50 && mbData.tripsLast30Days > 10 && !isChurned) {
      growthScore += 10
    }

    // Plan tier
    if (mbData.plan) {
      const planLower = mbData.plan.toLowerCase()
      if (planLower.includes("enterprise") || planLower.includes("premium")) {
        growthScore += 15
        if (!isChurned) {
          positiveSignals.push("Enterprise tier")
        }
      } else if (planLower.includes("pro") || planLower.includes("professional")) {
        growthScore += 10
      } else if (planLower.includes("free") || planLower.includes("trial")) {
        growthScore -= 10
        if (mbData.totalTrips === 0) {
          riskSignals.push("Free + no usage")
        }
      }
    }

    // Subscription tenure - longer relationships are stickier
    if (mbData.subscriptionLifetimeDays !== null && mbData.subscriptionLifetimeDays !== undefined) {
      if (mbData.subscriptionLifetimeDays >= 365 && !isChurned) {
        growthScore += 10
        positiveSignals.push("1+ year customer")
      } else if (mbData.subscriptionLifetimeDays >= 180 && !isChurned) {
        growthScore += 5
      } else if (mbData.subscriptionLifetimeDays < 90 && mbData.engagementStatus?.toLowerCase().includes("inactive")) {
        // New customer going inactive early - high risk
        growthScore -= 15
        riskSignals.push("Early churn risk (new + inactive)")
      }
    }

    // Deal intelligence - expansion potential vs churn risk
    if (mbData.dealStage) {
      const stageLower = mbData.dealStage.toLowerCase()
      if (stageLower.includes("expansion") || stageLower.includes("upsell")) {
        growthScore += 15
        if (!isChurned) {
          positiveSignals.push("Expansion opportunity")
        }
      } else if (stageLower.includes("churn") || stageLower.includes("cancel")) {
        growthScore -= 20
        riskSignals.push(`Deal stage: ${mbData.dealStage}`)
      } else if (stageLower.includes("renewal")) {
        // Renewal stage - depends on other signals
        if (mbData.engagementStatus?.toLowerCase().includes("active")) {
          growthScore += 5
        }
      }
    }

    // Large deal amount indicates strategic account
    if (mbData.dealAmount && mbData.dealAmount >= 5000 && !isChurned) {
      growthScore += 10
      positiveSignals.push(`$${Math.round(mbData.dealAmount / 1000)}k deal`)
    }

    // Fleet size as growth indicator
    if ((mbData.vehiclesTotal ?? 0) >= 20 && !isChurned) {
      growthScore += 5
      positiveSignals.push("Large fleet")
    }
  }

  // NOTE: We intentionally ignore HubSpot's lifecycleStage here.
  // HubSpot has no "ex-customer" stage - once "customer", always "customer"
  // even after they churn. Metabase churnStatus is the source of truth.

  growthScore = Math.max(0, Math.min(100, growthScore))

  // =========================================================================
  // Calculate weighted total (0-100)
  // =========================================================================
  const numericScore = Math.round(
    paymentScore * 0.4 + engagementScore * 0.25 + supportScore * 0.2 + growthScore * 0.15
  )

  // Convert to health category
  let healthScore: string
  if (numericScore >= 80) {
    healthScore = "green"
  } else if (numericScore >= 60) {
    healthScore = "yellow"
  } else if (numericScore >= 40) {
    healthScore = "yellow" // Still yellow, but lower
  } else if (numericScore > 0) {
    healthScore = "red"
  } else {
    healthScore = "unknown"
  }

  // Override to red for critical signals
  if (
    riskSignals.some(
      (r) => r.includes("Churned") || r.includes("Critical payment") || r.includes("dispute")
    )
  ) {
    healthScore = "red"
  }

  return {
    numericScore,
    healthScore,
    paymentScore,
    engagementScore,
    supportScore,
    growthScore,
    riskSignals,
    positiveSignals,
    paymentHealth,
  }
}

/**
 * Sync operators to database - METABASE FIRST
 * POST /api/sync/hubspot
 *
 * IMPORTANT: This sync is now METABASE-FIRST. CSM_MOOVS (Card 1469) is the source
 * of truth for all active Moovs operators. HubSpot is used for enrichment only.
 * This ensures ALL active operators show up, even those without HubSpot records.
 */
export async function POST(request: NextRequest) {
  // Verify this is a cron job or authorized request
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // Check if user is logged in (for manual sync from settings page)
  const userLoggedIn = await isAuthenticated()

  // Auth: require valid CRON_SECRET, Vercel cron header, dev mode, or logged-in user
  const isAuthorized =
    process.env.NODE_ENV === "development" ||
    request.headers.get("x-vercel-cron") === "1" ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    userLoggedIn // Allow logged-in users to trigger sync

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Create sync log
  const syncLog = await prisma.syncLog.create({
    data: {
      type: "companies",
      status: "running",
    },
  })

  try {
    console.log("Starting METABASE-FIRST sync (all active operators)...")

    // =========================================================================
    // STEP 1: Fetch Metabase data - THIS IS THE MASTER LIST
    // =========================================================================
    let metabaseOperators: MetabaseAccountData[] = []
    try {
      metabaseOperators = await fetchMetabaseData()
      console.log(`Loaded ${metabaseOperators.length} operators from CSM_MOOVS (source of truth)`)
    } catch (metabaseError) {
      console.error("Metabase fetch failed:", metabaseError)
      throw new Error("Cannot sync without Metabase data - CSM_MOOVS is required")
    }

    if (metabaseOperators.length === 0) {
      throw new Error("No operators found in CSM_MOOVS - check Metabase connection")
    }

    // =========================================================================
    // STEP 2: Fetch HubSpot data FOR ENRICHMENT ONLY
    // =========================================================================
    const hubspotById = new Map<string, HubSpotCompany>()
    const hubspotByName = new Map<string, HubSpotCompany>()
    const hubspotByDomain = new Map<string, HubSpotCompany>()
    const ownerMap: OwnerMap = {}

    try {
      // Fetch owners
      try {
        const owners = await getOwners()
        for (const owner of owners) {
          ownerMap[owner.id] = {
            name: `${owner.firstName} ${owner.lastName}`.trim(),
            email: owner.email,
          }
        }
        console.log(`Loaded ${owners.length} HubSpot owners`)
      } catch (ownerError) {
        console.log("Owner fetch skipped:", ownerError)
      }

      // Fetch companies
      const allCompanies = await hubspot.listCustomers()
      console.log(`Loaded ${allCompanies.length} HubSpot companies for enrichment`)

      for (const company of allCompanies) {
        // Index by ID
        hubspotById.set(company.id, company)
        // Index by name (lowercase)
        if (company.properties.name) {
          hubspotByName.set(company.properties.name.toLowerCase(), company)
        }
        // Index by domain
        if (company.properties.domain) {
          const domain = company.properties.domain
            .toLowerCase()
            .replace(/^(https?:\/\/)?(www\.)?/, "")
            .split("/")[0]
          hubspotByDomain.set(domain, company)
        }
      }
    } catch (hubspotError) {
      console.log("HubSpot fetch failed (will sync without enrichment):", hubspotError)
    }

    // =========================================================================
    // STEP 3: Fetch Stripe payment data
    // =========================================================================
    let stripePaymentData = new Map<string, StripePaymentData>()
    try {
      stripePaymentData = await fetchStripePaymentData()
      console.log(`Loaded Stripe payment data for ${stripePaymentData.size} accounts`)
    } catch (stripeError) {
      console.log("Stripe data fetch skipped:", stripeError)
    }

    // =========================================================================
    // STEP 4: Process each METABASE operator (master list)
    // =========================================================================
    let synced = 0
    let failed = 0
    let hubspotMatches = 0
    let stripeMatches = 0
    let noHubspotRecord = 0
    let skippedChurned = 0

    // CSM Assignment based on MRR
    const CSM_ASSIGNMENTS = {
      enterprise: { name: "Nate", email: "nate@moovs.com" },
      mid_market: { name: "Andrea", email: "andrea@moovs.com" },
      smb: { name: "Andrea", email: "andrea@moovs.com" },
      free: { name: "Andrea", email: "andrea@moovs.com" },
      unknown: { name: "Andrea", email: "andrea@moovs.com" },
    }

    // Parse dates safely
    const parseDate = (dateStr?: string | null): Date | null => {
      if (!dateStr) return null
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? null : date
    }

    for (const mbData of metabaseOperators) {
      try {
        // =====================================================================
        // FILTER: Skip churned/terminated accounts - they shouldn't be in active portfolio
        // =====================================================================
        const churnStatus = mbData.churnStatus?.toLowerCase() || ""
        const billingStatus = mbData.billingStatus?.toLowerCase() || ""

        const isChurned =
          churnStatus.includes("churn") ||
          churnStatus.includes("cancelled") ||
          churnStatus.includes("canceled")
        const isTerminated =
          billingStatus.includes("terminated") ||
          billingStatus.includes("cancelled") ||
          billingStatus.includes("canceled")

        // Skip if churned AND has no MRR (fully dead account)
        // Keep if churned but still has MRR (might be pending cancellation)
        if ((isChurned || isTerminated) && (!mbData.mrr || mbData.mrr <= 0)) {
          skippedChurned++
          continue
        }

        // Find matching HubSpot company (for enrichment)
        let hsCompany: HubSpotCompany | undefined

        // Try matching strategies in order of reliability:
        // 1. Direct HubSpot ID from CSM_MOOVS
        if (mbData.hubspotCompanyId) {
          hsCompany = hubspotById.get(mbData.hubspotCompanyId)
        }
        // 2. Company name match
        if (!hsCompany && mbData.companyName) {
          hsCompany = hubspotByName.get(mbData.companyName.toLowerCase())
        }
        // 3. Email domain match
        if (!hsCompany && mbData.email) {
          const domain = mbData.email.split("@")[1]?.toLowerCase()
          if (domain) {
            hsCompany = hubspotByDomain.get(domain)
          }
        }

        if (hsCompany) {
          hubspotMatches++
        } else {
          noHubspotRecord++
        }

        // Get Stripe payment data
        let stripeData: StripePaymentData | undefined
        if (mbData.stripeAccountId) {
          stripeData = stripePaymentData.get(mbData.stripeAccountId)
          if (stripeData) {
            stripeMatches++
          }
        }

        // Determine unique ID - use HubSpot ID if available, otherwise synthetic ID
        const hasHubSpotRecord = !!hsCompany
        const actualHubSpotId = hsCompany?.id || null
        const recordId =
          hsCompany?.id ||
          `operator-${mbData.operatorId || mbData.companyName.replace(/\s+/g, "-").toLowerCase()}`
        const companyName = mbData.companyName || hsCompany?.properties.name || "Unknown"

        // Calculate weighted health score
        const health = calculateWeightedHealthScore(
          mbData,
          stripeData,
          hsCompany ||
            ({
              id: recordId,
              properties: {},
            } as HubSpotCompany)
        )

        // Get existing company for health change tracking
        const existingCompany = await prisma.hubSpotCompany.findUnique({
          where: { hubspotId: recordId },
          select: { id: true, healthScore: true, numericHealthScore: true },
        })

        // Determine segment based on Lago Plan Code
        const customerSegment = getSegmentFromPlanCode(mbData.planCode)
        const segmentCsm = CSM_ASSIGNMENTS[customerSegment]

        // Get HubSpot props (if available) - cast to Record for safe access
        const hsProps: Record<string, string | undefined> = hsCompany?.properties || {}

        // Calculate lastLoginAt from daysSinceLastActivity
        const lastLoginAt =
          mbData.daysSinceLastActivity !== null
            ? new Date(Date.now() - mbData.daysSinceLastActivity * 24 * 60 * 60 * 1000)
            : parseDate(hsProps.last_login_date)

        // Upsert company
        const upsertedCompany = await prisma.hubSpotCompany.upsert({
          where: { hubspotId: recordId },
          update: {
            name: companyName,
            domain: hsProps.domain || mbData.email?.split("@")[1] || null,
            mrr: mbData.mrr,
            subscriptionStatus:
              mbData.billingStatus || mbData.churnStatus || hsProps.subscription_status || null,
            plan: mbData.plan || hsProps.plan_name || null,
            planCode: mbData.planCode,
            customerSegment,
            contractEndDate: parseDate(hsProps.contract_end_date || hsProps.renewal_date),
            totalTrips: mbData.totalTrips,
            tripsLast30Days: mbData.tripsLast30Days,
            lastLoginAt,
            lastTripCreatedAt: parseDate(mbData.lastTripCreatedAt),
            daysSinceLastLogin: mbData.daysSinceLastTrip ?? mbData.daysSinceLastActivity,
            daysSinceLastAssignment: mbData.daysSinceLastActivity,
            engagementStatus: mbData.engagementStatus,
            // Fleet/Product metrics
            vehiclesTotal: mbData.vehiclesTotal,
            membersCount: mbData.membersCount,
            driversCount: mbData.driversCount,
            setupScore: mbData.setupScore,
            subscriptionLifetimeDays: mbData.subscriptionLifetimeDays,
            // Deal info
            dealStage: mbData.dealStage,
            dealPipeline: mbData.dealPipeline,
            dealCloseDate: parseDate(mbData.dealCloseDate),
            dealAmount: mbData.dealAmount,
            // Location
            latitude: mbData.latitude,
            longitude: mbData.longitude,
            // Payment health fields
            paymentSuccessRate: stripeData?.successRate ?? null,
            failedPaymentCount: stripeData?.failedCharges ?? null,
            disputeCount: stripeData?.disputeCount ?? null,
            avgRiskScore: stripeData?.avgRiskScore ?? null,
            paymentHealth: health.paymentHealth !== "unknown" ? health.paymentHealth : null,
            totalChargeVolume: stripeData?.totalCharged ?? null,
            // CSM assignment
            ownerId: hsProps.hubspot_owner_id || null,
            ownerName: segmentCsm.name,
            ownerEmail: segmentCsm.email,
            // Health scores
            healthScore: health.healthScore,
            numericHealthScore: health.numericScore,
            riskSignals: health.riskSignals,
            positiveSignals: health.positiveSignals,
            paymentScore: health.paymentScore,
            engagementScore: health.engagementScore,
            supportScore: health.supportScore,
            growthScore: health.growthScore,
            // Metadata
            industry: hsProps.industry || null,
            city: hsProps.city || null,
            state: hsProps.state || null,
            country: hsProps.country || null,
            employeeCount: hsProps.numberofemployees
              ? parseInt(hsProps.numberofemployees, 10)
              : null,
            operatorId: mbData.operatorId,
            stripeAccountId: mbData.stripeAccountId,
            primaryContactEmail: mbData.email,
            hasHubSpotRecord,
            hubspotRecordId: actualHubSpotId,
            hubspotCreatedAt: parseDate(hsProps.createdate),
            hubspotUpdatedAt: parseDate(hsProps.hs_lastmodifieddate),
            lastSyncedAt: new Date(),
          },
          create: {
            hubspotId: recordId,
            name: companyName,
            domain: hsProps.domain || mbData.email?.split("@")[1] || null,
            mrr: mbData.mrr,
            subscriptionStatus:
              mbData.billingStatus || mbData.churnStatus || hsProps.subscription_status || null,
            plan: mbData.plan || hsProps.plan_name || null,
            planCode: mbData.planCode,
            customerSegment,
            contractEndDate: parseDate(hsProps.contract_end_date || hsProps.renewal_date),
            totalTrips: mbData.totalTrips,
            tripsLast30Days: mbData.tripsLast30Days,
            lastLoginAt,
            lastTripCreatedAt: parseDate(mbData.lastTripCreatedAt),
            daysSinceLastLogin: mbData.daysSinceLastTrip ?? mbData.daysSinceLastActivity,
            daysSinceLastAssignment: mbData.daysSinceLastActivity,
            engagementStatus: mbData.engagementStatus,
            // Fleet/Product metrics
            vehiclesTotal: mbData.vehiclesTotal,
            membersCount: mbData.membersCount,
            driversCount: mbData.driversCount,
            setupScore: mbData.setupScore,
            subscriptionLifetimeDays: mbData.subscriptionLifetimeDays,
            // Deal info
            dealStage: mbData.dealStage,
            dealPipeline: mbData.dealPipeline,
            dealCloseDate: parseDate(mbData.dealCloseDate),
            dealAmount: mbData.dealAmount,
            // Location
            latitude: mbData.latitude,
            longitude: mbData.longitude,
            // Payment health fields
            paymentSuccessRate: stripeData?.successRate ?? null,
            failedPaymentCount: stripeData?.failedCharges ?? null,
            disputeCount: stripeData?.disputeCount ?? null,
            avgRiskScore: stripeData?.avgRiskScore ?? null,
            paymentHealth: health.paymentHealth !== "unknown" ? health.paymentHealth : null,
            totalChargeVolume: stripeData?.totalCharged ?? null,
            // CSM assignment
            ownerId: hsProps.hubspot_owner_id || null,
            ownerName: segmentCsm.name,
            ownerEmail: segmentCsm.email,
            // Health scores
            healthScore: health.healthScore,
            numericHealthScore: health.numericScore,
            riskSignals: health.riskSignals,
            positiveSignals: health.positiveSignals,
            paymentScore: health.paymentScore,
            engagementScore: health.engagementScore,
            supportScore: health.supportScore,
            growthScore: health.growthScore,
            // Metadata
            industry: hsProps.industry || null,
            city: hsProps.city || null,
            state: hsProps.state || null,
            country: hsProps.country || null,
            employeeCount: hsProps.numberofemployees
              ? parseInt(hsProps.numberofemployees, 10)
              : null,
            operatorId: mbData.operatorId,
            stripeAccountId: mbData.stripeAccountId,
            primaryContactEmail: mbData.email,
            hasHubSpotRecord,
            hubspotRecordId: actualHubSpotId,
            hubspotCreatedAt: parseDate(hsProps.createdate),
            hubspotUpdatedAt: parseDate(hsProps.hs_lastmodifieddate),
            lastSyncedAt: new Date(),
          },
        })

        // Log health change if it changed
        const healthChanged =
          existingCompany &&
          (existingCompany.healthScore !== health.healthScore ||
            Math.abs((existingCompany.numericHealthScore || 0) - health.numericScore) >= 10)

        if (healthChanged || !existingCompany) {
          await prisma.healthChangeLog.create({
            data: {
              companyId: upsertedCompany.id,
              previousScore: existingCompany?.healthScore || null,
              newScore: health.healthScore,
              previousNumericScore: existingCompany?.numericHealthScore || null,
              newNumericScore: health.numericScore,
              riskSignals: health.riskSignals,
              trigger: "sync",
            },
          })
        }

        synced++
      } catch (err) {
        console.error(`Failed to sync operator ${mbData.companyName}:`, err)
        failed++
      }
    }

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        recordsFound: metabaseOperators.length,
        recordsSynced: synced,
        recordsFailed: failed,
        completedAt: new Date(),
      },
    })

    // NOTE: Churned accounts are kept in DB for historical reference
    // They are filtered out in portfolio views, not deleted

    console.log(
      `Sync completed: ${synced} synced, ${failed} failed, ${skippedChurned} churned skipped`
    )
    console.log(`  - ${hubspotMatches} with HubSpot data, ${noHubspotRecord} without HubSpot`)
    console.log(`  - ${stripeMatches} with Stripe payment data`)

    // Auto-detect onboarding milestones from synced data
    let milestonesDetected = 0
    let companiesWithMilestones = 0
    try {
      const milestoneResult = await detectAndCompleteMilestones()
      milestonesDetected = milestoneResult.milestonesCompleted
      companiesWithMilestones = milestoneResult.companiesUpdated
      console.log(
        `  - ${milestonesDetected} onboarding milestones auto-completed for ${companiesWithMilestones} companies`
      )
    } catch (err) {
      console.error("Milestone detection failed (non-critical):", err)
    }

    return NextResponse.json({
      success: true,
      totalOperators: metabaseOperators.length,
      activeOperatorsSynced: synced,
      churnedSkipped: skippedChurned,
      recordsFailed: failed,
      hubspotMatches,
      noHubspotRecord,
      stripeMatches,
      milestonesDetected,
      companiesWithMilestones,
    })
  } catch (error) {
    console.error("Sync failed:", error)

    // Update sync log with error
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    })

    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}

/**
 * Get sync status
 * GET /api/sync/hubspot
 */
export async function GET() {
  try {
    // Get last sync
    const lastSync = await prisma.syncLog.findFirst({
      where: { type: "companies" },
      orderBy: { startedAt: "desc" },
    })

    // Get company count
    const companyCount = await prisma.hubSpotCompany.count()

    // Get health distribution
    const healthDist = await prisma.hubSpotCompany.groupBy({
      by: ["healthScore"],
      _count: true,
    })

    // Get payment health distribution
    const paymentHealthDist = await prisma.hubSpotCompany.groupBy({
      by: ["paymentHealth"],
      _count: true,
    })

    // Get average numeric health score
    const avgScore = await prisma.hubSpotCompany.aggregate({
      _avg: { numericHealthScore: true },
    })

    return NextResponse.json({
      lastSync,
      totalCompanies: companyCount,
      healthDistribution: healthDist.reduce(
        (acc, h) => ({ ...acc, [h.healthScore || "unknown"]: h._count }),
        {} as Record<string, number>
      ),
      paymentHealthDistribution: paymentHealthDist.reduce(
        (acc, h) => ({ ...acc, [h.paymentHealth || "unknown"]: h._count }),
        {} as Record<string, number>
      ),
      averageHealthScore: avgScore._avg.numericHealthScore,
    })
  } catch (error) {
    console.error("Failed to get sync status:", error)
    return NextResponse.json({ error: "Failed to get sync status" }, { status: 500 })
  }
}
