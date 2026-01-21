import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Customer Search API
 *
 * GET /api/customer/search?q=<query>&limit=<limit>
 *
 * Search for customers by name, domain, email, operator ID, or Stripe account ID
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Search query must be at least 2 characters" },
      { status: 400 }
    )
  }

  try {
    // Search across multiple fields
    const companies = await prisma.hubSpotCompany.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { domain: { contains: query, mode: "insensitive" } },
          { operatorId: { contains: query, mode: "insensitive" } },
          { stripeAccountId: { contains: query, mode: "insensitive" } },
          { city: { contains: query, mode: "insensitive" } },
          { state: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        hubspotId: true,
        operatorId: true,
        stripeAccountId: true,
        name: true,
        domain: true,
        plan: true,
        mrr: true,
        healthScore: true,
        numericHealthScore: true,
        paymentHealth: true,
        totalTrips: true,
        city: true,
        state: true,
        ownerName: true,
        lastSyncedAt: true,
      },
      orderBy: [
        { mrr: { sort: "desc", nulls: "last" } },
        { name: "asc" },
      ],
      take: Math.min(limit, 100),
    })

    return NextResponse.json({
      query,
      count: companies.length,
      results: companies.map((c) => ({
        id: c.id,
        hubspotId: c.hubspotId,
        operatorId: c.operatorId,
        stripeAccountId: c.stripeAccountId,
        name: c.name,
        domain: c.domain,
        plan: c.plan,
        mrr: c.mrr,
        healthScore: c.healthScore,
        numericScore: c.numericHealthScore,
        paymentHealth: c.paymentHealth,
        totalTrips: c.totalTrips,
        location: c.city && c.state ? `${c.city}, ${c.state}` : c.state || c.city || null,
        csm: c.ownerName,
        lastSynced: c.lastSyncedAt,
      })),
    })
  } catch (error) {
    console.error("Customer search failed:", error)
    return NextResponse.json(
      { error: "Search failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}
