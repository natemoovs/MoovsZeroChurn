import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q") || ""

  try {
    // Search local database for companies
    const companies = await prisma.hubSpotCompany.findMany({
      where: query && query.length >= 2
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { domain: { contains: query, mode: "insensitive" } },
            ],
          }
        : {},
      orderBy: { mrr: "desc" },
      take: 20,
      select: {
        hubspotId: true,
        name: true,
        domain: true,
        industry: true,
      },
    })

    const results = companies.map((company) => ({
      id: company.hubspotId,
      name: company.name,
      domain: company.domain,
      industry: company.industry,
    }))

    return NextResponse.json({ companies: results, configured: true })
  } catch (error) {
    console.error("Company search error:", error)
    return NextResponse.json(
      { companies: [], configured: true, error: "Failed to fetch companies" },
      { status: 500 }
    )
  }
}
