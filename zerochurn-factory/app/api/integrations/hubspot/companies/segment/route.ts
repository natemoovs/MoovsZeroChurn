import { NextRequest, NextResponse } from "next/server"
import { hubspot } from "@/lib/integrations"

/**
 * Get all companies filtered by segment (based on lifecycle stage or custom properties)
 *
 * Segments map to Moovs customer tiers:
 * - enterprise: $1M+ revenue or Enterprise plan
 * - mid-market: $250K-$1M revenue or Pro plan
 * - smb: $50K-$250K revenue or Standard/Free plan
 * - shuttle: Shuttle platform customers
 * - all: All companies
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const segment = searchParams.get("segment") || "all"
  const limit = parseInt(searchParams.get("limit") || "50", 10)

  // Check if HubSpot is configured
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    return NextResponse.json({ companies: [], configured: false })
  }

  try {
    // For now, search all and filter client-side
    // In production, you'd use HubSpot filters based on custom properties
    const allCompanies = await hubspot.searchCompanies("*")

    // Filter by segment based on lifecycle stage or other indicators
    // This is a simplified version - in production you'd have custom properties
    const filtered = allCompanies.filter((company) => {
      if (segment === "all") return true

      const stage = company.properties.lifecyclestage?.toLowerCase() || ""
      const revenue = parseFloat(company.properties.annualrevenue || "0")

      switch (segment) {
        case "enterprise":
          // Enterprise: $1M+ or "customer" lifecycle with high revenue indicators
          return revenue >= 1000000 || stage === "customer"
        case "mid-market":
          // Mid-market: $250K-$1M
          return revenue >= 250000 && revenue < 1000000
        case "smb":
          // SMB: $50K-$250K
          return revenue >= 50000 && revenue < 250000
        case "shuttle":
          // Shuttle: Would need custom property, for now check industry
          return company.properties.industry?.toLowerCase().includes("shuttle")
        default:
          return true
      }
    })

    const results = filtered.slice(0, limit).map((company) => ({
      id: company.id,
      name: company.properties.name || "Unknown",
      domain: company.properties.domain || null,
      industry: company.properties.industry || null,
      revenue: company.properties.annualrevenue || null,
      lifecycleStage: company.properties.lifecyclestage || null,
      city: company.properties.city || null,
      state: company.properties.state || null,
      createDate: company.properties.createdate || null,
    }))

    return NextResponse.json({
      companies: results,
      total: filtered.length,
      segment,
      configured: true,
    })
  } catch (error) {
    console.error("HubSpot segment search error:", error)
    return NextResponse.json(
      { companies: [], configured: true, error: "Failed to fetch companies" },
      { status: 500 }
    )
  }
}
