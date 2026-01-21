import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Valid journey stages
const VALID_STAGES = [
  "onboarding",
  "adoption",
  "growth",
  "maturity",
  "renewal",
  "at_risk",
  "churned",
] as const

type JourneyStage = (typeof VALID_STAGES)[number]

/**
 * Get all journey stages or filter by stage
 * GET /api/journey?stage=at_risk
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const stage = searchParams.get("stage")

  try {
    const journeys = await prisma.customerJourney.findMany({
      where: stage ? { stage } : undefined,
      orderBy: { stageChangedAt: "desc" },
      include: {
        history: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    })

    // Group by stage for summary
    const byStage = journeys.reduce(
      (acc, j) => {
        acc[j.stage] = (acc[j.stage] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({
      journeys,
      summary: byStage,
      total: journeys.length,
    })
  } catch (error) {
    console.error("Journey fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch journeys" },
      { status: 500 }
    )
  }
}

/**
 * Create or update a journey stage for a company
 * POST /api/journey
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, companyName, stage, reason, changedBy } = body

    if (!companyId || !companyName || !stage) {
      return NextResponse.json(
        { error: "companyId, companyName, and stage are required" },
        { status: 400 }
      )
    }

    if (!VALID_STAGES.includes(stage as JourneyStage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` },
        { status: 400 }
      )
    }

    // Check if journey exists
    const existing = await prisma.customerJourney.findUnique({
      where: { companyId },
    })

    if (existing) {
      // Update existing journey
      const journey = await prisma.customerJourney.update({
        where: { companyId },
        data: {
          stage,
          previousStage: existing.stage,
          stageChangedAt: new Date(),
          metadata: {
            reason,
            changedBy,
            previousStage: existing.stage,
          },
        },
      })

      // Record history
      await prisma.journeyStageHistory.create({
        data: {
          journeyId: journey.id,
          fromStage: existing.stage,
          toStage: stage,
          changedBy,
          reason,
        },
      })

      return NextResponse.json(journey)
    } else {
      // Create new journey
      const journey = await prisma.customerJourney.create({
        data: {
          companyId,
          companyName,
          stage,
          metadata: { reason, changedBy },
          history: {
            create: {
              toStage: stage,
              changedBy,
              reason,
            },
          },
        },
        include: {
          history: true,
        },
      })

      return NextResponse.json(journey)
    }
  } catch (error) {
    console.error("Journey create/update error:", error)
    return NextResponse.json(
      { error: "Failed to update journey" },
      { status: 500 }
    )
  }
}
