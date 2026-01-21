import { NextRequest, NextResponse } from "next/server"
import { hubspot } from "@/lib/integrations"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q") || ""

  // Check if HubSpot is configured
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    return NextResponse.json({ companies: [], configured: false })
  }

  try {
    const companies = query
      ? await hubspot.searchCompanies(query)
      : await hubspot.searchCompanies("*") // Get recent companies

    const results = companies.slice(0, 20).map((company) => ({
      id: company.id,
      name: company.properties.name || "Unknown",
      domain: company.properties.domain || null,
      industry: company.properties.industry || null,
    }))

    return NextResponse.json({ companies: results, configured: true })
  } catch (error) {
    console.error("HubSpot search error:", error)
    return NextResponse.json(
      { companies: [], configured: true, error: "Failed to fetch companies" },
      { status: 500 }
    )
  }
}
