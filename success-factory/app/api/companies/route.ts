import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, isAuthError } from "@/lib/auth/api-middleware"

/**
 * Get companies from database (synced from HubSpot)
 * GET /api/companies?health=red&owner=123&search=acme&page=1&limit=50
 */
export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const { searchParams } = new URL(request.url)

  const health = searchParams.get("health")
  const ownerId = searchParams.get("owner")
  const search = searchParams.get("search")
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)

  // Validate sortBy to prevent accessing unintended fields
  const ALLOWED_SORT_FIELDS = ["name", "mrr", "healthScore", "createdAt", "hubspotCreatedAt", "daysSinceLastLogin", "totalTrips"]
  const rawSortBy = searchParams.get("sortBy") || "name"
  const sortBy = ALLOWED_SORT_FIELDS.includes(rawSortBy) ? rawSortBy : "name"
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc"

  try {
    // Build where clause
    const where: Record<string, unknown> = {}

    if (health && health !== "all") {
      where.healthScore = health
    }

    if (ownerId) {
      where.ownerId = ownerId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { domain: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get total count
    const total = await prisma.hubSpotCompany.count({ where })

    // Get companies
    const companies = await prisma.hubSpotCompany.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    })

    // Get health distribution
    const healthDistribution = await prisma.hubSpotCompany.groupBy({
      by: ["healthScore"],
      _count: true,
      where: ownerId ? { ownerId } : undefined,
    })

    // Get last sync info
    const lastSync = await prisma.syncLog.findFirst({
      where: { type: "companies", status: "completed" },
      orderBy: { completedAt: "desc" },
    })

    return NextResponse.json({
      companies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      healthDistribution: healthDistribution.reduce(
        (acc, h) => ({ ...acc, [h.healthScore || "unknown"]: h._count }),
        {} as Record<string, number>
      ),
      lastSyncedAt: lastSync?.completedAt,
    })
  } catch (error) {
    console.error("Failed to fetch companies:", error)
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    )
  }
}

/**
 * Get a single company by HubSpot ID
 * This endpoint still calls HubSpot for real-time data like communications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hubspotId } = body as { hubspotId: string }

    if (!hubspotId) {
      return NextResponse.json({ error: "hubspotId required" }, { status: 400 })
    }

    // Get from database
    const company = await prisma.hubSpotCompany.findUnique({
      where: { hubspotId },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Get journey stage
    const journey = await prisma.customerJourney.findUnique({
      where: { companyId: hubspotId },
    })

    // Get recent NPS
    const recentNps = await prisma.nPSSurvey.findFirst({
      where: { companyId: hubspotId, respondedAt: { not: null } },
      orderBy: { respondedAt: "desc" },
    })

    // Get recent AI prediction
    const prediction = await prisma.aIPrediction.findFirst({
      where: { companyId: hubspotId },
      orderBy: { createdAt: "desc" },
    })

    // Get pending tasks
    const pendingTasks = await prisma.task.count({
      where: { companyId: hubspotId, status: { in: ["pending", "in_progress"] } },
    })

    return NextResponse.json({
      company,
      journey,
      nps: recentNps
        ? { score: recentNps.score, category: recentNps.category, respondedAt: recentNps.respondedAt }
        : null,
      aiPrediction: prediction
        ? { riskScore: prediction.riskScore, riskLevel: prediction.riskLevel, reasoning: prediction.reasoning }
        : null,
      pendingTasks,
    })
  } catch (error) {
    console.error("Failed to fetch company:", error)
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    )
  }
}
