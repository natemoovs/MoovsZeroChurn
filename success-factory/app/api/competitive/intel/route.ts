/**
 * Competitive Intel API
 *
 * GET /api/competitive/intel - Get recent competitive intel entries
 * POST /api/competitive/intel - Log a new win/loss against a competitor
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { CompetitiveIntel, Competitor } from "@prisma/client"

type IntelWithCompetitor = CompetitiveIntel & { competitor: Pick<Competitor, "name"> }

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const competitorId = searchParams.get("competitorId")
    const outcome = searchParams.get("outcome") // won, lost, no_decision
    const limit = parseInt(searchParams.get("limit") || "50")

    // Build filters
    const filters: Record<string, unknown> = {}
    if (competitorId) filters.competitorId = competitorId
    if (outcome) filters.outcome = outcome

    const intel = await prisma.competitiveIntel.findMany({
      where: filters,
      include: {
        competitor: {
          select: { name: true },
        },
      },
      orderBy: { reportedAt: "desc" },
      take: limit,
    })

    return NextResponse.json({
      count: intel.length,
      intel: intel.map((i: IntelWithCompetitor) => ({
        ...i,
        competitorName: i.competitor.name,
      })),
    })
  } catch (error) {
    console.error("Get competitive intel error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      competitorId,
      competitorName, // Can provide name if competitorId not known
      dealId,
      companyId,
      companyName,
      outcome,
      dealAmount,
      intelType = "win_loss",
      title,
      details,
      winReasons,
      lossReasons,
      featureGaps,
      pricingNotes,
      source,
      reportedBy,
    } = body

    // Validate required fields
    if (!outcome || !["won", "lost", "no_decision"].includes(outcome)) {
      return NextResponse.json(
        { error: "Valid outcome is required (won, lost, or no_decision)" },
        { status: 400 }
      )
    }

    // Find or create competitor
    let competitor
    if (competitorId) {
      competitor = await prisma.competitor.findUnique({ where: { id: competitorId } })
      if (!competitor) {
        return NextResponse.json({ error: "Competitor not found" }, { status: 404 })
      }
    } else if (competitorName) {
      // Try to find by name, or create new
      competitor = await prisma.competitor.findFirst({
        where: { name: { equals: competitorName, mode: "insensitive" } },
      })
      if (!competitor) {
        competitor = await prisma.competitor.create({
          data: { name: competitorName },
        })
      }
    } else {
      return NextResponse.json(
        { error: "Either competitorId or competitorName is required" },
        { status: 400 }
      )
    }

    // Create intel record
    const intel = await prisma.competitiveIntel.create({
      data: {
        competitorId: competitor.id,
        dealId,
        companyId,
        companyName,
        outcome,
        dealAmount: dealAmount ? parseFloat(dealAmount) : null,
        intelType,
        title:
          title ||
          `${outcome === "won" ? "Won" : outcome === "lost" ? "Lost" : "No decision"} vs ${competitor.name}`,
        details,
        winReasons: winReasons || [],
        lossReasons: lossReasons || [],
        featureGaps: featureGaps || [],
        pricingNotes,
        source,
        reportedBy,
      },
      include: {
        competitor: {
          select: { name: true },
        },
      },
    })

    // If this is a loss, update competitor with any new feature gaps
    if (outcome === "lost" && featureGaps && featureGaps.length > 0) {
      const existingStrengths = competitor.strengths
      const newStrengths = featureGaps.filter((gap: string) => !existingStrengths.includes(gap))
      if (newStrengths.length > 0) {
        await prisma.competitor.update({
          where: { id: competitor.id },
          data: {
            strengths: [...existingStrengths, ...newStrengths],
          },
        })
      }
    }

    return NextResponse.json(
      {
        ...intel,
        competitorName: intel.competitor.name,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create competitive intel error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
