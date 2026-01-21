import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hubspot, HubSpotCompany, getOwners } from "@/lib/integrations/hubspot"

// Custom properties for Moovs - adjust these based on your HubSpot setup
const CUSTOM_PROPERTIES = [
  "name", "domain", "industry", "numberofemployees",
  "city", "state", "country", "lifecyclestage",
  "hubspot_owner_id", "createdate", "hs_lastmodifieddate",
  // Moovs custom properties - add yours here
  "mrr", "monthly_recurring_revenue", "contract_end_date", "renewal_date",
  "total_trips", "last_login_date", "subscription_status", "plan_name",
]

interface OwnerMap {
  [key: string]: { name: string; email: string }
}

/**
 * Calculate health score based on company data
 */
function calculateHealthScore(company: HubSpotCompany): {
  score: string
  riskSignals: string[]
  positiveSignals: string[]
} {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  const props = company.properties

  // Check last login / activity
  const lastLogin = props.last_login_date
  if (lastLogin) {
    const daysSinceLogin = Math.floor(
      (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceLogin > 60) {
      riskSignals.push(`No login in ${daysSinceLogin} days`)
    } else if (daysSinceLogin > 30) {
      riskSignals.push(`Last login ${daysSinceLogin} days ago`)
    } else if (daysSinceLogin < 7) {
      positiveSignals.push("Recent activity")
    }
  }

  // Check usage (trips)
  const totalTrips = parseInt(props.total_trips || "0", 10)
  if (totalTrips === 0) {
    riskSignals.push("No usage recorded")
  } else if (totalTrips < 5) {
    riskSignals.push("Low usage")
  } else if (totalTrips > 50) {
    positiveSignals.push("High usage")
  }

  // Check renewal date
  const renewalDate = props.contract_end_date || props.renewal_date
  if (renewalDate) {
    const daysToRenewal = Math.floor(
      (new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (daysToRenewal < 0) {
      riskSignals.push("Contract expired")
    } else if (daysToRenewal < 30) {
      riskSignals.push(`Renewal in ${daysToRenewal} days`)
    } else if (daysToRenewal > 180) {
      positiveSignals.push("Long-term contract")
    }
  }

  // Check MRR
  const mrr = parseFloat(props.mrr || props.monthly_recurring_revenue || "0")
  if (mrr > 1000) {
    positiveSignals.push("High-value account")
  }

  // Determine score
  let score = "green"
  if (riskSignals.length >= 3) {
    score = "red"
  } else if (riskSignals.length >= 1) {
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

  // Allow if: has cron secret, or is internal request, or no auth required in dev
  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    request.headers.get("x-vercel-cron") === "1" ||
    process.env.NODE_ENV === "development"

  if (!isAuthorized && process.env.NODE_ENV === "production") {
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

    // Fetch owners first for mapping
    const owners = await getOwners()
    const ownerMap: OwnerMap = {}
    for (const owner of owners) {
      ownerMap[owner.id] = {
        name: `${owner.firstName} ${owner.lastName}`.trim(),
        email: owner.email,
      }
    }

    // Fetch all customers from HubSpot
    const companies = await hubspot.listCustomers()
    console.log(`Found ${companies.length} customers in HubSpot`)

    let synced = 0
    let failed = 0

    // Process each company
    for (const company of companies) {
      try {
        const props = company.properties
        const health = calculateHealthScore(company)

        // Parse dates safely
        const parseDate = (dateStr?: string): Date | null => {
          if (!dateStr) return null
          const date = new Date(dateStr)
          return isNaN(date.getTime()) ? null : date
        }

        // Get owner info
        const ownerId = props.hubspot_owner_id
        const owner = ownerId ? ownerMap[ownerId] : null

        // Calculate days since last login
        const lastLoginDate = parseDate(props.last_login_date)
        const daysSinceLastLogin = lastLoginDate
          ? Math.floor((Date.now() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24))
          : null

        // Upsert company
        await prisma.hubSpotCompany.upsert({
          where: { hubspotId: company.id },
          update: {
            name: props.name || "Unknown",
            domain: props.domain,
            mrr: parseFloat(props.mrr || props.monthly_recurring_revenue || "0") || null,
            subscriptionStatus: props.subscription_status || props.lifecyclestage,
            plan: props.plan_name,
            contractEndDate: parseDate(props.contract_end_date || props.renewal_date),
            totalTrips: parseInt(props.total_trips || "0", 10) || null,
            lastLoginAt: lastLoginDate,
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
            name: props.name || "Unknown",
            domain: props.domain,
            mrr: parseFloat(props.mrr || props.monthly_recurring_revenue || "0") || null,
            subscriptionStatus: props.subscription_status || props.lifecyclestage,
            plan: props.plan_name,
            contractEndDate: parseDate(props.contract_end_date || props.renewal_date),
            totalTrips: parseInt(props.total_trips || "0", 10) || null,
            lastLoginAt: lastLoginDate,
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

    console.log(`Sync completed: ${synced} synced, ${failed} failed`)

    return NextResponse.json({
      success: true,
      recordsFound: companies.length,
      recordsSynced: synced,
      recordsFailed: failed,
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
