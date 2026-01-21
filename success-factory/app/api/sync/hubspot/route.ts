import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hubspot, HubSpotCompany, getOwners } from "@/lib/integrations/hubspot"
import { metabase } from "@/lib/integrations"

// Metabase query ID for CSM_MOOVS master customer view (Card 1469)
const METABASE_QUERY_ID = 1469

// Metabase data structure (from CSM_MOOVS card)
interface MetabaseAccountData {
  // Identity
  operatorId: string | null
  companyName: string
  email: string | null
  hubspotCompanyId: string | null
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
 * Calculate health score with Metabase enrichment
 */
function calculateHealthScoreEnriched(
  company: HubSpotCompany,
  mbData: MetabaseAccountData | undefined
): {
  score: string
  riskSignals: string[]
  positiveSignals: string[]
} {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  const props = company.properties

  // --- Metabase-based signals (product usage data) - PREFERRED ---
  if (mbData) {
    // Churn status (explicit)
    if (mbData.churnStatus && mbData.churnStatus.toLowerCase().includes("churn")) {
      riskSignals.push("Churned")
    }

    // Usage signals based on trips
    if (mbData.totalTrips > 100) {
      positiveSignals.push(`${mbData.totalTrips} trips`)
    } else if (mbData.totalTrips > 20) {
      positiveSignals.push("Active usage")
    } else if (mbData.totalTrips > 0 && mbData.totalTrips <= 5) {
      riskSignals.push("Low usage")
    } else if (mbData.totalTrips === 0) {
      riskSignals.push("No trips")
    }

    // Activity recency (days since last driver assignment in CSM_MOOVS)
    if (mbData.daysSinceLastActivity !== null) {
      if (mbData.daysSinceLastActivity > 60) {
        riskSignals.push(`No activity in ${mbData.daysSinceLastActivity}d`)
      } else if (mbData.daysSinceLastActivity > 30) {
        riskSignals.push("Inactive 30+ days")
      } else if (mbData.daysSinceLastActivity <= 7) {
        positiveSignals.push("Recent activity")
      }
    }

    // Engagement status from CSM_MOOVS
    if (mbData.engagementStatus) {
      const status = mbData.engagementStatus.toLowerCase()
      if (status.includes("churn") || status.includes("inactive")) {
        riskSignals.push(`Engagement: ${mbData.engagementStatus}`)
      } else if (status.includes("active") || status.includes("engaged")) {
        positiveSignals.push("Engaged")
      }
    }

    // Recent activity (trips in last 30 days)
    if (mbData.tripsLast30Days > 10) {
      positiveSignals.push(`${mbData.tripsLast30Days} trips (30d)`)
    } else if (mbData.tripsLast30Days > 0) {
      positiveSignals.push("Active recently")
    }

    // MRR / paying status
    if (mbData.mrr && mbData.mrr > 0) {
      positiveSignals.push("Paying customer")
      if (mbData.mrr >= 200) {
        positiveSignals.push("High value")
      }
    } else if (mbData.plan?.toLowerCase().includes("free")) {
      if (mbData.totalTrips === 0) {
        riskSignals.push("Free + no usage")
      }
    }
  }

  // --- HubSpot-based signals (fallback when no Metabase data) ---
  const lifecycleStage = props.lifecyclestage?.toLowerCase() || ""
  if (lifecycleStage === "customer") {
    positiveSignals.push("Active customer")
  }

  // Activity recency from HubSpot (only if no Metabase data)
  if (!mbData) {
    const lastModified = props.hs_lastmodifieddate
    if (lastModified) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24)
      )
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
  let score = "unknown"

  // Churned or severe issues = red
  if (riskSignals.some((r) =>
    r.includes("Churned") ||
    r.includes("6+ months") ||
    (r.includes("No login in") && parseInt(r.match(/\d+/)?.[0] || "0") > 60)
  )) {
    score = "red"
  } else if (riskSignals.length >= 2) {
    // Multiple risk signals = red
    score = "red"
  } else if (riskSignals.length === 1 && positiveSignals.length < 2) {
    // One risk, few positives = yellow
    score = "yellow"
  } else if (positiveSignals.length >= 3) {
    // Many positive signals = green
    score = "green"
  } else if (positiveSignals.length >= 2 && riskSignals.length === 0) {
    // Multiple positives, no risk = green
    score = "green"
  } else if (positiveSignals.length === 1 && riskSignals.length === 0) {
    // One positive, no risk = green
    score = "green"
  } else if (mbData && mbData.totalTrips > 10 && mbData.mrr && mbData.mrr > 0) {
    // Paying with decent usage = green
    score = "green"
  } else if (riskSignals.length === 0 && positiveSignals.length === 0) {
    // No data = unknown
    score = "unknown"
  } else {
    score = "yellow"
  }

  return { score, riskSignals, positiveSignals }
}

/**
 * Sync HubSpot companies to database
 * POST /api/sync/hubspot
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
    console.log("Starting HubSpot sync...")

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
      // Continue without owner data - not critical
    }

    // Fetch Metabase data for enrichment (usage metrics, MRR, etc.)
    const metabaseByHubspotId = new Map<string, MetabaseAccountData>()
    const metabaseByName = new Map<string, MetabaseAccountData>()
    const metabaseByEmail = new Map<string, MetabaseAccountData>()
    try {
      const metabaseData = await fetchMetabaseData()
      for (const account of metabaseData) {
        // Primary: Index by HubSpot company ID (best match)
        if (account.hubspotCompanyId) {
          metabaseByHubspotId.set(account.hubspotCompanyId, account)
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
      }
      console.log(`Loaded ${metabaseData.length} accounts from Metabase (${metabaseByHubspotId.size} by HS ID, ${metabaseByName.size} by name)`)
    } catch (metabaseError) {
      console.log("Metabase fetch skipped (not configured or error):", metabaseError)
      // Continue without Metabase data - HubSpot data will still sync
    }

    // Fetch all customers from HubSpot
    const companies = await hubspot.listCustomers()
    console.log(`Found ${companies.length} customers in HubSpot`)

    let synced = 0
    let failed = 0
    let metabaseMatches = 0

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

        // Calculate health score with Metabase enrichment
        const health = calculateHealthScoreEnriched(company, mbData)

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
            ownerId: ownerId || null,
            ownerName: owner?.name || null,
            ownerEmail: owner?.email || null,
            healthScore: health.score,
            riskSignals: health.riskSignals,
            positiveSignals: health.positiveSignals,
            industry: props.industry,
            city: props.city,
            state: props.state,
            country: props.country,
            employeeCount: parseInt(props.numberofemployees || "0", 10) || null,
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
            ownerId: ownerId || null,
            ownerName: owner?.name || null,
            ownerEmail: owner?.email || null,
            healthScore: health.score,
            riskSignals: health.riskSignals,
            positiveSignals: health.positiveSignals,
            industry: props.industry,
            city: props.city,
            state: props.state,
            country: props.country,
            employeeCount: parseInt(props.numberofemployees || "0", 10) || null,
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

    console.log(`Sync completed: ${synced} synced, ${failed} failed, ${metabaseMatches} enriched with Metabase`)

    return NextResponse.json({
      success: true,
      recordsFound: companies.length,
      recordsSynced: synced,
      recordsFailed: failed,
      metabaseMatches,
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

    return NextResponse.json({
      lastSync,
      totalCompanies: companyCount,
      healthDistribution: healthDist.reduce(
        (acc, h) => ({ ...acc, [h.healthScore || "unknown"]: h._count }),
        {} as Record<string, number>
      ),
    })
  } catch (error) {
    console.error("Failed to get sync status:", error)
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    )
  }
}
