import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hubspot, HubSpotCompany, getOwners } from "@/lib/integrations/hubspot"
import { metabase } from "@/lib/integrations"

// Metabase query ID for account data
const METABASE_QUERY_ID = 948

// Metabase data structure
interface MetabaseAccountData {
  companyName: string
  domain: string | null
  totalTrips: number
  daysSinceLastLogin: number | null
  churnStatus: string | null
  mrr: number | null
  plan: string | null
  customerSegment: string | null
}

interface OwnerMap {
  [key: string]: { name: string; email: string }
}

/**
 * Fetch account data from Metabase
 */
async function fetchMetabaseData(): Promise<MetabaseAccountData[]> {
  if (!process.env.METABASE_URL || !process.env.METABASE_API_KEY) {
    return []
  }

  const result = await metabase.runQuery(METABASE_QUERY_ID)
  const rows = metabase.rowsToObjects<Record<string, unknown>>(result)

  // Log column names for debugging
  console.log("Metabase columns:", Object.keys(rows[0] || {}))

  return rows.map((row) => ({
    companyName: (row.MOOVS_COMPANY_NAME as string) || "",
    // Try multiple possible domain column names
    domain: (row.DOMAIN as string) || (row.COMPANY_DOMAIN as string) || (row.WEBSITE as string) || null,
    totalTrips: (row.ALL_TRIPS_COUNT as number) || 0,
    daysSinceLastLogin: row.DAYS_SINCE_LAST_IDENTIFY as number | null,
    churnStatus: row.CHURN_STATUS as string | null,
    mrr: row.TOTAL_MRR_NUMERIC as number | null,
    plan: row.LAGO_PLAN_NAME as string | null,
    customerSegment: row.CUSTOMER_SEGMENT as string | null,
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

    // Login recency
    if (mbData.daysSinceLastLogin !== null) {
      if (mbData.daysSinceLastLogin > 60) {
        riskSignals.push(`No login in ${mbData.daysSinceLastLogin}d`)
      } else if (mbData.daysSinceLastLogin > 30) {
        riskSignals.push("Inactive 30+ days")
      } else if (mbData.daysSinceLastLogin <= 7) {
        positiveSignals.push("Recent login")
      }
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
    const metabaseByName = new Map<string, MetabaseAccountData>()
    const metabaseByDomain = new Map<string, MetabaseAccountData>()
    try {
      const metabaseData = await fetchMetabaseData()
      for (const account of metabaseData) {
        // Index by company name
        if (account.companyName) {
          metabaseByName.set(account.companyName.toLowerCase(), account)
        }
        // Also index by domain for fallback matching
        if (account.domain) {
          const cleanDomain = account.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0]
          metabaseByDomain.set(cleanDomain, account)
        }
      }
      console.log(`Loaded ${metabaseData.length} accounts from Metabase (${metabaseByName.size} by name, ${metabaseByDomain.size} by domain)`)
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
        // 1. Exact name match
        // 2. Domain match (since HubSpot often uses domain as company name)
        // 3. Try HubSpot name as domain (e.g., "tellurides.com")
        let mbData = metabaseByName.get(companyName.toLowerCase())
        if (!mbData && companyDomain) {
          mbData = metabaseByDomain.get(companyDomain)
        }
        if (!mbData) {
          // Try using company name as domain (for cases like "tellurides.com")
          const nameAsDomain = companyName.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0]
          mbData = metabaseByDomain.get(nameAsDomain)
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
        const daysSinceLastLogin = mbData?.daysSinceLastLogin ?? null
        const plan = mbData?.plan ?? props.plan_name ?? null
        const subscriptionStatus = mbData?.churnStatus ?? props.subscription_status ?? props.lifecyclestage

        // Calculate lastLoginAt from daysSinceLastLogin
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
