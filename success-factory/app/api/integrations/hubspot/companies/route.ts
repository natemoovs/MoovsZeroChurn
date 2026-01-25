import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q") || ""

  try {
    let companies

    if (query && query.length >= 2) {
      // Split query into words for better matching
      const words = query.trim().split(/\s+/).filter(w => w.length >= 2)

      // Build search conditions for each word
      const searchConditions = words.flatMap(word => [
        { name: { contains: word, mode: "insensitive" as const } },
        { domain: { contains: word, mode: "insensitive" as const } },
      ])

      companies = await prisma.hubSpotCompany.findMany({
        where: {
          OR: searchConditions,
        },
        orderBy: { mrr: "desc" },
        take: 20,
        select: {
          hubspotId: true,
          name: true,
          domain: true,
          industry: true,
          mrr: true,
          healthScore: true,
        },
      })
    } else {
      // No query - show recent high-value customers
      companies = await prisma.hubSpotCompany.findMany({
        where: {
          mrr: { gt: 0 },
        },
        orderBy: { mrr: "desc" },
        take: 20,
        select: {
          hubspotId: true,
          name: true,
          domain: true,
          industry: true,
          mrr: true,
          healthScore: true,
        },
      })
    }

    const results = companies.map((company) => ({
      id: company.hubspotId,
      name: company.name,
      domain: company.domain,
      industry: company.industry,
      mrr: company.mrr,
      healthScore: company.healthScore,
    }))

    return NextResponse.json({
      companies: results,
      configured: true,
      total: results.length,
    })
  } catch (error) {
    console.error("Company search error:", error)
    return NextResponse.json(
      { companies: [], configured: true, error: "Failed to fetch companies" },
      { status: 500 }
    )
  }
}
