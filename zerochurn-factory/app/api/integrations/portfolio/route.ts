import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Get portfolio health data from synced database
 * GET /api/integrations/portfolio?segment=enterprise|mid-market|smb|all
 *
 * Uses the HubSpotCompany table which is synced daily via /api/sync/hubspot
 */

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
  totalTrips?: number
  customerSegment?: string | null
  ownerId?: string | null
  ownerName?: string | null
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const segment = searchParams.get("segment") || "all"

  try {
    // Build filter based on segment
    const where = buildSegmentFilter(segment)

    // Query synced companies from database
    const companies = await prisma.hubSpotCompany.findMany({
      where,
      orderBy: [
        { healthScore: "asc" }, // red first (alphabetically red < yellow < green)
        { mrr: "desc" },
      ],
    })

    // Transform to summary format
    const summaries: CompanyHealthSummary[] = companies.map((company) => ({
      companyId: company.hubspotId,
      companyName: company.name,
      domain: company.domain,
      healthScore: (company.healthScore as "green" | "yellow" | "red" | "unknown") || "unknown",
      mrr: company.mrr,
      plan: company.plan,
      paymentStatus: getPaymentStatus(company.subscriptionStatus),
      lastActivity: company.lastLoginAt?.toISOString() || company.hubspotUpdatedAt?.toISOString() || null,
      contactCount: company.primaryContactEmail ? 1 : 0,
      riskSignals: company.riskSignals,
      positiveSignals: company.positiveSignals,
      customerSince: company.hubspotCreatedAt?.toISOString() || null,
      totalTrips: company.totalTrips || undefined,
      customerSegment: getSegmentFromMrr(company.mrr),
      ownerId: company.ownerId,
      ownerName: company.ownerName,
    }))

    // Sort by health score (red first, then yellow, then green)
    summaries.sort((a, b) => {
      const order = { red: 0, yellow: 1, unknown: 2, green: 3 }
      return order[a.healthScore] - order[b.healthScore]
    })

    // Get last sync time
    const lastSync = await prisma.syncLog.findFirst({
      where: { type: "companies", status: "completed" },
      orderBy: { completedAt: "desc" },
    })

    return NextResponse.json({
      summaries,
      total: companies.length,
      segment,
      configured: {
        hubspot: true, // Data comes from synced DB
        stripe: !!process.env.STRIPE_SECRET_KEY,
        metabase: !!process.env.METABASE_URL,
      },
      sync: {
        lastSyncAt: lastSync?.completedAt?.toISOString() || null,
        recordsSynced: lastSync?.recordsSynced || 0,
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

function buildSegmentFilter(segment: string): Record<string, unknown> {
  if (segment === "all") return {}

  switch (segment.toLowerCase()) {
    case "enterprise":
      return { mrr: { gte: 500 } }
    case "mid-market":
      return { mrr: { gte: 100, lt: 500 } }
    case "smb":
      return { mrr: { gte: 0, lt: 100 } }
    case "at-risk":
    case "at_risk":
      return { healthScore: "red" }
    case "healthy":
      return { healthScore: "green" }
    case "warning":
      return { healthScore: "yellow" }
    default:
      return {}
  }
}

function getPaymentStatus(subscriptionStatus: string | null): "current" | "overdue" | "at_risk" | "unknown" {
  if (!subscriptionStatus) return "unknown"

  const status = subscriptionStatus.toLowerCase()
  if (status === "active" || status === "paid") return "current"
  if (status === "past_due" || status === "overdue") return "overdue"
  if (status === "canceled" || status === "churned") return "at_risk"

  return "unknown"
}

function getSegmentFromMrr(mrr: number | null): string | null {
  if (mrr === null) return null
  if (mrr >= 500) return "Enterprise"
  if (mrr >= 100) return "Mid-Market"
  if (mrr > 0) return "SMB"
  return "Free"
}
