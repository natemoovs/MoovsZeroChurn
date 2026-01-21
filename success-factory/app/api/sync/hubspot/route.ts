import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hubspot, HubSpotCompany, getOwners } from "@/lib/integrations/hubspot"
import { metabase } from "@/lib/integrations"

// Metabase query ID for CSM_MOOVS master customer view (Card 1469)
const METABASE_QUERY_ID = 1469

// Snowflake database ID in Metabase
const SNOWFLAKE_DB_ID = 2

// Metabase data structure (from CSM_MOOVS card)
interface MetabaseAccountData {
  // Identity
  operatorId: string | null
  companyName: string
  email: string | null
  hubspotCompanyId: string | null
  stripeAccountId: string | null
  // Billing
  mrr: number | null
  plan: string | null
  billingStatus: string | null
  // Usage
  totalTrips: number
  tripsLast30Days: number
  daysSinceLastActivity: number | null
  // Status
  churnStatus: string | null
  customerSegment: string | null
  engagementStatus: string | null
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
    // Billing
    mrr: (row.CALCULATED_MRR as number) || null,
    plan: (row.LAGO_PLAN_NAME as string) || null,
    billingStatus: (row.LAGO_STATUS as string) || (row.LAGO_CUSTOMER_STATUS as string) || null,
    // Usage
    totalTrips: (row.R_TOTAL_RESERVATIONS_COUNT as number) || 0,
    tripsLast30Days: (row.R_LAST_30_DAYS_RESERVATIONS_COUNT as number) || 0,
    daysSinceLastActivity: (row.DA_DAYS_SINCE_LAST_ASSIGNMENT as number) || null,
    // Status
    churnStatus: (row.HS_D_CHURN_STATUS as string) || null,
    customerSegment: (row.HS_C_PROPERTY_CUSTOMER_SEGMENT as string) || null,
    engagementStatus: (row.DA_ENGAGEMENT_STATUS as string) || null,
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

    let disputeMap = new Map<string, number>()
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

    // Positive signals
    if (stripeData.successRate >= 98 && stripeData.totalCharges >= 10) {
      positiveSignals.push("Excellent payment history")
    }
    if (stripeData.totalCharged > 10000) {
      positiveSignals.push("High payment volume")
    }
  } else if (mbData?.mrr && mbData.mrr > 0) {
    // If we have MRR but no Stripe data, assume payment is okay
    positiveSignals.push("Paying customer")
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
      } else if (mbData.daysSinceLastActivity <= 7) {
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
        } else if (recentVsHistorical >= 1.2) {
          // Growing 20%+ - POSITIVE
          engagementScore += 10
          positiveSignals.push("Growing usage")
        }
      } else if (mbData.tripsLast30Days === 0 && mbData.totalTrips > 10) {
        // Lower volume but stopped recently
        engagementScore -= 20
        riskSignals.push("No recent trips")
      }
    }

    // Positive signals for active usage
    if (mbData.tripsLast30Days > 10) {
      engagementScore += 10
      positiveSignals.push(`${mbData.tripsLast30Days} trips (30d)`)
    }

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
        positiveSignals.push("Engaged")
      }
    }

    // Churn status
    if (mbData.churnStatus && mbData.churnStatus.toLowerCase().includes("churn")) {
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
  let supportScore = 100 // Default to healthy since we don't have ticket data yet

  // TODO: Integrate Notion tickets
  // For now, assume no open tickets = good support health

  // =========================================================================
  // Growth Score (15% weight)
  // =========================================================================
  let growthScore = 50 // Neutral base

  if (mbData) {
    // High value customer
    if (mbData.mrr && mbData.mrr >= 200) {
      growthScore += 15
      positiveSignals.push("High value")
    } else if (mbData.mrr && mbData.mrr >= 100) {
      growthScore += 10
    }

    // Usage growth signals
    if (mbData.totalTrips > 50 && mbData.tripsLast30Days > 10) {
      growthScore += 10
    }

    // Plan tier
    if (mbData.plan) {
      const planLower = mbData.plan.toLowerCase()
      if (planLower.includes("enterprise") || planLower.includes("premium")) {
        growthScore += 15
        positiveSignals.push("Enterprise tier")
      } else if (planLower.includes("pro") || planLower.includes("professional")) {
        growthScore += 10
      } else if (planLower.includes("free") || planLower.includes("trial")) {
        growthScore -= 10
        if (mbData.totalTrips === 0) {
          riskSignals.push("Free + no usage")
        }
      }
    }
  }

  // Lifecycle stage from HubSpot
  const lifecycleStage = company.properties.lifecyclestage?.toLowerCase() || ""
  if (lifecycleStage === "customer") {
    growthScore += 5
    positiveSignals.push("Active customer")
  }

  growthScore = Math.max(0, Math.min(100, growthScore))

  // =========================================================================
  // Calculate weighted total (0-100)
  // =========================================================================
  const numericScore = Math.round(
    paymentScore * 0.40 +
    engagementScore * 0.25 +
    supportScore * 0.20 +
    growthScore * 0.15
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
  if (riskSignals.some(r =>
    r.includes("Churned") ||
    r.includes("Critical payment") ||
    r.includes("dispute")
  )) {
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

  // Allow if: no secret configured, or secret matches, or is Vercel cron, or dev mode
  const isAuthorized =
    !cronSecret ||  // No secret = allow (for testing)
    authHeader === `Bearer ${cronSecret}` ||
    request.headers.get("x-vercel-cron") === "1" ||
    process.env.NODE_ENV === "development"

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
    let ownerMap: OwnerMap = {}

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
          const domain = company.properties.domain.toLowerCase()
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

    // CSM Assignment based on MRR
    const CSM_ASSIGNMENTS = {
      enterprise: { name: "Nate", email: "nate@moovs.com" },
      mid_market: { name: "Andrea", email: "andrea@moovs.com" },
      smb: { name: "Andrea", email: "andrea@moovs.com" },
      free: { name: "Andrea", email: "andrea@moovs.com" },
      unknown: { name: "Andrea", email: "andrea@moovs.com" },
    }

    // Parse dates safely
    const parseDate = (dateStr?: string): Date | null => {
      if (!dateStr) return null
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? null : date
    }

    for (const mbData of metabaseOperators) {
      try {
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
        const recordId = hsCompany?.id || `operator-${mbData.operatorId || mbData.companyName.replace(/\s+/g, "-").toLowerCase()}`
        const companyName = mbData.companyName || hsCompany?.properties.name || "Unknown"

        // Calculate weighted health score
        const health = calculateWeightedHealthScore(mbData, stripeData, hsCompany || {
          id: recordId,
          properties: {},
        } as HubSpotCompany)

        // Get existing company for health change tracking
        const existingCompany = await prisma.hubSpotCompany.findUnique({
          where: { hubspotId: recordId },
          select: { id: true, healthScore: true, numericHealthScore: true },
        })

        // Determine segment for CSM assignment
        const customerMrr = mbData.mrr ?? 0
        const customerSegment = customerMrr >= 499 ? "enterprise"
          : customerMrr >= 100 ? "mid_market"
          : customerMrr > 0 ? "smb"
          : "free"

        const segmentCsm = CSM_ASSIGNMENTS[customerSegment]

        // Get HubSpot props (if available)
        const hsProps = hsCompany?.properties || {}

        // Calculate lastLoginAt from daysSinceLastActivity
        const lastLoginAt = mbData.daysSinceLastActivity !== null
          ? new Date(Date.now() - mbData.daysSinceLastActivity * 24 * 60 * 60 * 1000)
          : parseDate(hsProps.last_login_date)

        // Upsert company
        const upsertedCompany = await prisma.hubSpotCompany.upsert({
          where: { hubspotId: recordId },
          update: {
            name: companyName,
            domain: hsProps.domain || mbData.email?.split("@")[1] || null,
            mrr: mbData.mrr,
            subscriptionStatus: mbData.billingStatus || mbData.churnStatus || hsProps.subscription_status || null,
            plan: mbData.plan || hsProps.plan_name || null,
            contractEndDate: parseDate(hsProps.contract_end_date || hsProps.renewal_date),
            totalTrips: mbData.totalTrips,
            lastLoginAt,
            daysSinceLastLogin: mbData.daysSinceLastActivity,
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
            employeeCount: hsProps.numberofemployees ? parseInt(hsProps.numberofemployees, 10) : null,
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
            subscriptionStatus: mbData.billingStatus || mbData.churnStatus || hsProps.subscription_status || null,
            plan: mbData.plan || hsProps.plan_name || null,
            contractEndDate: parseDate(hsProps.contract_end_date || hsProps.renewal_date),
            totalTrips: mbData.totalTrips,
            lastLoginAt,
            daysSinceLastLogin: mbData.daysSinceLastActivity,
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
            employeeCount: hsProps.numberofemployees ? parseInt(hsProps.numberofemployees, 10) : null,
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
        const healthChanged = existingCompany &&
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

    console.log(`Sync completed: ${synced} synced, ${failed} failed`)
    console.log(`  - ${hubspotMatches} with HubSpot data, ${noHubspotRecord} without HubSpot`)
    console.log(`  - ${stripeMatches} with Stripe payment data`)

    return NextResponse.json({
      success: true,
      totalOperators: metabaseOperators.length,
      recordsSynced: synced,
      recordsFailed: failed,
      hubspotMatches,
      noHubspotRecord,
      stripeMatches,
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
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    )
  }
}
