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
      customerSegment: getSegmentFromPlan(company.plan),
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
  // Base filter: exclude churned/terminated accounts with no MRR
  // These are kept in DB for history but shouldn't show in active portfolio
  const excludeChurned = {
    NOT: {
      AND: [
        {
          OR: [
            { subscriptionStatus: { contains: "churn", mode: "insensitive" } },
            { subscriptionStatus: { contains: "terminated", mode: "insensitive" } },
            { subscriptionStatus: { contains: "cancelled", mode: "insensitive" } },
            { subscriptionStatus: { contains: "canceled", mode: "insensitive" } },
          ],
        },
        {
          OR: [
            { mrr: null },
            { mrr: { lte: 0 } },
          ],
        },
      ],
    },
  }

  // Special case: show churned accounts
  if (segment.toLowerCase() === "churned") {
    return {
      OR: [
        { subscriptionStatus: { contains: "churn", mode: "insensitive" } },
        { subscriptionStatus: { contains: "terminated", mode: "insensitive" } },
        { subscriptionStatus: { contains: "cancelled", mode: "insensitive" } },
        { subscriptionStatus: { contains: "canceled", mode: "insensitive" } },
      ],
    }
  }

  if (segment === "all") return excludeChurned

  switch (segment.toLowerCase()) {
    case "enterprise":
      // VIP/Elite plans = Enterprise segment
      return {
        AND: [
          excludeChurned,
          {
            OR: [
              { plan: { contains: "VIP", mode: "insensitive" } },
              { plan: { contains: "Elite", mode: "insensitive" } },
            ],
          },
        ],
      }
    case "mid-market":
      // Pro plans = Mid-Market segment
      return {
        AND: [
          excludeChurned,
          { plan: { contains: "Pro", mode: "insensitive" } },
          {
            NOT: {
              OR: [
                { plan: { contains: "VIP", mode: "insensitive" } },
                { plan: { contains: "Elite", mode: "insensitive" } },
              ],
            },
          },
        ],
      }
    case "smb":
      // Everything else that's not VIP/Elite/Pro = SMB
      return {
        AND: [
          excludeChurned,
          {
            NOT: {
              OR: [
                { plan: { contains: "VIP", mode: "insensitive" } },
                { plan: { contains: "Elite", mode: "insensitive" } },
                { plan: { contains: "Pro", mode: "insensitive" } },
              ],
            },
          },
        ],
      }
    case "at-risk":
    case "at_risk":
      return { AND: [excludeChurned, { healthScore: "red" }] }
    case "healthy":
      return { AND: [excludeChurned, { healthScore: "green" }] }
    case "warning":
      return { AND: [excludeChurned, { healthScore: "yellow" }] }
    default:
      return excludeChurned
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

function getSegmentFromPlan(plan: string | null): string | null {
  if (!plan) return null
  const planLower = plan.toLowerCase()
  if (planLower.includes("vip") || planLower.includes("elite")) return "Enterprise"
  if (planLower.includes("pro")) return "Mid-Market"
  return "SMB"
}
