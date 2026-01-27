import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, isAuthError } from "@/lib/auth/api-middleware"
import { snowflake } from "@/lib/integrations"

/**
 * Customer Search API
 *
 * GET /api/customer/search?q=<query>&limit=<limit>&expanded=<true|false>
 *
 * Search for customers by:
 * - Company name, domain, operator ID, Stripe account ID, city, state (HubSpot)
 * - Trip ID, request ID, order number, customer email/phone, charge ID (Snowflake - when expanded=true)
 */
export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const limit = parseInt(searchParams.get("limit") || "20", 10)
  const expanded = searchParams.get("expanded") === "true"

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Search query must be at least 2 characters" },
      { status: 400 }
    )
  }

  try {
    // Search HubSpot companies
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
      orderBy: [{ mrr: { sort: "desc", nulls: "last" } }, { name: "asc" }],
      take: Math.min(limit, 100),
    })

    const hubspotResults = companies.map((c) => ({
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
      lastSynced: c.lastSyncedAt as Date | null,
      matchType: "operator" as "operator" | "trip" | "quote" | "charge" | "customer",
      matchField: null as string | null,
      matchValue: null as string | null,
      matchInfo: null as string | null,
    }))

    // If expanded search is enabled and Snowflake is configured, also search there
    let expandedResults: typeof hubspotResults = []
    if (expanded && snowflake.isConfigured()) {
      try {
        const snowflakeResults = await snowflake.expandedSearch(query, limit)

        // Map Snowflake results to the same format, looking up HubSpot info
        for (const sr of snowflakeResults) {
          // Skip if we already have this operator from HubSpot results
          if (hubspotResults.some((r) => r.operatorId === sr.operator_id)) {
            // But add match info to the existing result if it's a more specific match
            const existing = hubspotResults.find((r) => r.operatorId === sr.operator_id)
            if (existing && sr.match_type !== "operator") {
              existing.matchType = sr.match_type
              existing.matchField = sr.match_field
              existing.matchValue = sr.match_value
              existing.matchInfo = sr.additional_info || null
            }
            continue
          }

          // Look up HubSpot company by operator ID to get full details
          const hubspotCompany = await prisma.hubSpotCompany.findFirst({
            where: { operatorId: sr.operator_id },
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
          })

          if (hubspotCompany) {
            expandedResults.push({
              id: hubspotCompany.id,
              hubspotId: hubspotCompany.hubspotId,
              operatorId: hubspotCompany.operatorId,
              stripeAccountId: hubspotCompany.stripeAccountId,
              name: hubspotCompany.name,
              domain: hubspotCompany.domain,
              plan: hubspotCompany.plan,
              mrr: hubspotCompany.mrr,
              healthScore: hubspotCompany.healthScore,
              numericScore: hubspotCompany.numericHealthScore,
              paymentHealth: hubspotCompany.paymentHealth,
              totalTrips: hubspotCompany.totalTrips,
              location:
                hubspotCompany.city && hubspotCompany.state
                  ? `${hubspotCompany.city}, ${hubspotCompany.state}`
                  : hubspotCompany.state || hubspotCompany.city || null,
              csm: hubspotCompany.ownerName,
              lastSynced: hubspotCompany.lastSyncedAt,
              matchType: sr.match_type,
              matchField: sr.match_field,
              matchValue: sr.match_value,
              matchInfo: sr.additional_info || null,
            })
          } else {
            // No HubSpot record, create minimal entry from Snowflake data
            expandedResults.push({
              id: sr.operator_id,
              hubspotId: "",
              operatorId: sr.operator_id,
              stripeAccountId: sr.stripe_account_id,
              name: sr.company_name,
              domain: null,
              plan: null,
              mrr: sr.mrr,
              healthScore: null,
              numericScore: null,
              paymentHealth: null,
              totalTrips: null,
              location: null,
              csm: null,
              lastSynced: null as Date | null,
              matchType: sr.match_type,
              matchField: sr.match_field,
              matchValue: sr.match_value,
              matchInfo: sr.additional_info || null,
            })
          }
        }
      } catch (snowflakeError) {
        console.error("Snowflake expanded search failed:", snowflakeError)
        // Continue with HubSpot results only
      }
    }

    // Combine and deduplicate results
    const allResults = [...hubspotResults, ...expandedResults]
    const uniqueResults = allResults.filter(
      (result, index, self) =>
        index === self.findIndex((r) => r.operatorId === result.operatorId || r.id === result.id)
    )

    // Sort by MRR descending, with matched items potentially boosted
    uniqueResults.sort((a, b) => {
      // Boost exact matches to the top
      const aIsExactMatch = a.matchType !== "operator"
      const bIsExactMatch = b.matchType !== "operator"
      if (aIsExactMatch && !bIsExactMatch) return -1
      if (!aIsExactMatch && bIsExactMatch) return 1

      // Then sort by MRR
      const aMrr = a.mrr ?? -Infinity
      const bMrr = b.mrr ?? -Infinity
      return bMrr - aMrr
    })

    return NextResponse.json({
      query,
      count: uniqueResults.length,
      expanded,
      results: uniqueResults.slice(0, limit),
    })
  } catch (error) {
    console.error("Customer search failed:", error)
    return NextResponse.json(
      { error: "Search failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}
