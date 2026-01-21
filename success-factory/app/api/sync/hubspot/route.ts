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
 * Sync HubSpot companies to database
 * POST /api/sync/hubspot
 *
 * IMPORTANT: This sync is MOOVS-SPECIFIC. It only syncs customers that exist in
 * the CSM_MOOVS table (Metabase Card 1469), which contains only Moovs operators.
 * This filters out Swoop customers that also exist in the shared HubSpot.
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
    console.log("Starting MOOVS-ONLY HubSpot sync (filtering out Swoop)...")

    // Fetch owners for mapping (optional - may not have scope)
    const ownerMap: OwnerMap = {}
    try {
      const owners = await getOwners()
      for (const owner of owners) {
        ownerMap[owner.id] = {
          name: `${owner.firstName} ${owner.lastName}`.trim(),
          email: owner.email,
        }
      }
      console.log(`Loaded ${owners.length} owners`)
    } catch (ownerError) {
      console.log("Owner fetch skipped (missing scope or error):", ownerError)
    }

    // Fetch Metabase data for enrichment (usage metrics, MRR, etc.)
    // CSM_MOOVS is the SOURCE OF TRUTH for which customers are Moovs (not Swoop)
    const metabaseByHubspotId = new Map<string, MetabaseAccountData>()
    const metabaseByName = new Map<string, MetabaseAccountData>()
    const metabaseByEmail = new Map<string, MetabaseAccountData>()
    const metabaseByStripeId = new Map<string, MetabaseAccountData>()
    let moovsHubspotIds = new Set<string>() // HubSpot IDs that are confirmed Moovs customers

    try {
      const metabaseData = await fetchMetabaseData()
      for (const account of metabaseData) {
        // Primary: Index by HubSpot company ID (best match)
        if (account.hubspotCompanyId) {
          metabaseByHubspotId.set(account.hubspotCompanyId, account)
          moovsHubspotIds.add(account.hubspotCompanyId) // Track as Moovs customer
        }
        // Fallback: Index by company name
        if (account.companyName) {
          metabaseByName.set(account.companyName.toLowerCase(), account)
        }
        // Fallback: Index by email domain
        if (account.email) {
          const domain = account.email.split("@")[1]?.toLowerCase()
          if (domain) {
            metabaseByEmail.set(domain, account)
          }
        }
        // Index by Stripe account ID (for linking payment data)
        if (account.stripeAccountId) {
          metabaseByStripeId.set(account.stripeAccountId, account)
        }
      }
      console.log(`Loaded ${metabaseData.length} MOOVS accounts from CSM_MOOVS (${metabaseByHubspotId.size} by HS ID, ${metabaseByName.size} by name, ${metabaseByStripeId.size} by Stripe ID)`)
    } catch (metabaseError) {
      console.log("Metabase fetch skipped (not configured or error):", metabaseError)
      // If Metabase is not configured, we can't filter - return error
      if (!process.env.METABASE_URL || !process.env.METABASE_API_KEY) {
        console.log("WARNING: Without Metabase, cannot filter Moovs vs Swoop customers")
      }
    }

    // Fetch Stripe payment data
    let stripePaymentData = new Map<string, StripePaymentData>()
    try {
      stripePaymentData = await fetchStripePaymentData()
      console.log(`Loaded Stripe payment data for ${stripePaymentData.size} accounts`)
    } catch (stripeError) {
      console.log("Stripe data fetch skipped:", stripeError)
    }

    // Fetch all customers from HubSpot
    const allCompanies = await hubspot.listCustomers()
    console.log(`Found ${allCompanies.length} total customers in HubSpot (includes Swoop)`)

    // Filter to only Moovs customers (those with a match in CSM_MOOVS)
    // We check: 1) HubSpot ID in CSM_MOOVS, 2) Company name match, 3) Domain match
    const companies = allCompanies.filter(company => {
      const props = company.properties
      const companyName = props.name || ""
      const companyDomain = props.domain?.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0]

      // Check if this is a Moovs customer via any matching strategy
      if (moovsHubspotIds.has(company.id)) return true
      if (metabaseByName.has(companyName.toLowerCase())) return true
      if (companyDomain && metabaseByEmail.has(companyDomain)) return true

      return false
    })

    console.log(`Filtered to ${companies.length} MOOVS customers (${allCompanies.length - companies.length} Swoop/other filtered out)`)

    let synced = 0
    let failed = 0
    let metabaseMatches = 0
    let stripeMatches = 0

    // Process each company
    for (const company of companies) {
      try {
        const props = company.properties
        const companyName = props.name || "Unknown"
        const companyDomain = props.domain?.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0]

        // Get Metabase data for this company
        // Try multiple matching strategies:
        // 1. HubSpot company ID (best - CSM_MOOVS has HS_C_ID)
        // 2. Exact company name match
        // 3. Email domain match
        let mbData = metabaseByHubspotId.get(company.id)
        if (!mbData) {
          mbData = metabaseByName.get(companyName.toLowerCase())
        }
        if (!mbData && companyDomain) {
          mbData = metabaseByEmail.get(companyDomain)
        }

        // Track Metabase matches
        if (mbData) {
          metabaseMatches++
        }

        // Get Stripe payment data (if we have a Stripe account ID)
        let stripeData: StripePaymentData | undefined
        if (mbData?.stripeAccountId) {
          stripeData = stripePaymentData.get(mbData.stripeAccountId)
          if (stripeData) {
            stripeMatches++
          }
        }

        // Calculate weighted health score
        const health = calculateWeightedHealthScore(mbData, stripeData, company)

        // Parse dates safely
        const parseDate = (dateStr?: string): Date | null => {
          if (!dateStr) return null
          const date = new Date(dateStr)
          return isNaN(date.getTime()) ? null : date
        }

        // Get owner info
        const ownerId = props.hubspot_owner_id
        const owner = ownerId ? ownerMap[ownerId] : null

        // Use Metabase data for usage metrics (preferred), fall back to HubSpot
        const mrr = mbData?.mrr ?? (parseFloat(props.mrr || props.monthly_recurring_revenue || "0") || null)
        const totalTrips = mbData?.totalTrips ?? (parseInt(props.total_trips || "0", 10) || null)
        const daysSinceLastLogin = mbData?.daysSinceLastActivity ?? null
        const plan = mbData?.plan ?? props.plan_name ?? null
        const subscriptionStatus = mbData?.billingStatus ?? mbData?.churnStatus ?? props.subscription_status ?? props.lifecyclestage

        // Calculate lastLoginAt from daysSinceLastActivity
        const lastLoginAt = daysSinceLastLogin !== null
          ? new Date(Date.now() - daysSinceLastLogin * 24 * 60 * 60 * 1000)
          : parseDate(props.last_login_date)

        // Upsert company
        await prisma.hubSpotCompany.upsert({
          where: { hubspotId: company.id },
          update: {
            name: companyName,
            domain: props.domain,
            mrr,
            subscriptionStatus,
            plan,
            contractEndDate: parseDate(props.contract_end_date || props.renewal_date),
            totalTrips,
            lastLoginAt,
            daysSinceLastLogin,
            // Payment health fields
            paymentSuccessRate: stripeData?.successRate ?? null,
            failedPaymentCount: stripeData?.failedCharges ?? null,
            disputeCount: stripeData?.disputeCount ?? null,
            avgRiskScore: stripeData?.avgRiskScore ?? null,
            paymentHealth: health.paymentHealth !== "unknown" ? health.paymentHealth : null,
            totalChargeVolume: stripeData?.totalCharged ?? null,
            // CSM assignment
            ownerId: ownerId || null,
            ownerName: owner?.name || null,
            ownerEmail: owner?.email || null,
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
            industry: props.industry,
            city: props.city,
            state: props.state,
            country: props.country,
            employeeCount: parseInt(props.numberofemployees || "0", 10) || null,
            operatorId: mbData?.operatorId ?? null,
            stripeAccountId: mbData?.stripeAccountId ?? null,
            hubspotCreatedAt: parseDate(props.createdate),
            hubspotUpdatedAt: parseDate(props.hs_lastmodifieddate),
            lastSyncedAt: new Date(),
          },
          create: {
            hubspotId: company.id,
            name: companyName,
            domain: props.domain,
            mrr,
            subscriptionStatus,
            plan,
            contractEndDate: parseDate(props.contract_end_date || props.renewal_date),
            totalTrips,
            lastLoginAt,
            daysSinceLastLogin,
            // Payment health fields
            paymentSuccessRate: stripeData?.successRate ?? null,
            failedPaymentCount: stripeData?.failedCharges ?? null,
            disputeCount: stripeData?.disputeCount ?? null,
            avgRiskScore: stripeData?.avgRiskScore ?? null,
            paymentHealth: health.paymentHealth !== "unknown" ? health.paymentHealth : null,
            totalChargeVolume: stripeData?.totalCharged ?? null,
            // CSM assignment
            ownerId: ownerId || null,
            ownerName: owner?.name || null,
            ownerEmail: owner?.email || null,
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
            industry: props.industry,
            city: props.city,
            state: props.state,
            country: props.country,
            employeeCount: parseInt(props.numberofemployees || "0", 10) || null,
            operatorId: mbData?.operatorId ?? null,
            stripeAccountId: mbData?.stripeAccountId ?? null,
            hubspotCreatedAt: parseDate(props.createdate),
            hubspotUpdatedAt: parseDate(props.hs_lastmodifieddate),
            lastSyncedAt: new Date(),
          },
        })

        synced++
      } catch (err) {
        console.error(`Failed to sync company ${company.id}:`, err)
        failed++
      }
    }

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        recordsFound: companies.length,
        recordsSynced: synced,
        recordsFailed: failed,
        completedAt: new Date(),
      },
    })

    console.log(`Sync completed: ${synced} synced, ${failed} failed, ${metabaseMatches} enriched with Metabase, ${stripeMatches} with Stripe payment data`)

    return NextResponse.json({
      success: true,
      totalHubSpotCustomers: allCompanies.length,
      moovsCustomersFound: companies.length,
      swoopFiltered: allCompanies.length - companies.length,
      recordsSynced: synced,
      recordsFailed: failed,
      metabaseMatches,
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
