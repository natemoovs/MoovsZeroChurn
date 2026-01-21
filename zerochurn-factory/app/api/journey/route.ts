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

// Map journey stages to playbook triggers
const STAGE_TO_TRIGGER: Record<string, string> = {
  at_risk: "journey_to_at_risk",
  churned: "journey_to_churned",
  renewal: "journey_to_renewal",
  growth: "journey_to_growth",
}

// Playbook action type
interface PlaybookAction {
  type: "create_task"
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  dueInDays?: number
}

/**
 * Execute playbooks based on journey stage change
 */
async function executeJourneyPlaybooks(
  trigger: string,
  context: { companyId: string; companyName: string; fromStage?: string; toStage: string }
) {
  try {
    const playbooks = await prisma.playbook.findMany({
      where: {
        trigger,
        isActive: true,
      },
    })

    for (const playbook of playbooks) {
      const actions = playbook.actions as unknown as PlaybookAction[]

      for (const action of actions) {
        if (action.type === "create_task") {
          const dueDate = action.dueInDays
            ? new Date(Date.now() + action.dueInDays * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

          await prisma.task.create({
            data: {
              companyId: context.companyId,
              companyName: context.companyName,
              title: action.title
                .replace("{companyName}", context.companyName)
                .replace("{toStage}", context.toStage)
                .replace("{fromStage}", context.fromStage || "unknown"),
              description: action.description
                ?.replace("{companyName}", context.companyName)
                .replace("{toStage}", context.toStage)
                .replace("{fromStage}", context.fromStage || "unknown"),
              priority: action.priority || "medium",
              status: "pending",
              dueDate,
              playbookId: playbook.id,
              metadata: {
                trigger,
                fromStage: context.fromStage,
                toStage: context.toStage,
                createdBy: "playbook",
              },
            },
          })
        }
      }
    }
  } catch (error) {
    console.error("Journey playbook execution error:", error)
  }
}

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

      // Trigger playbooks if stage has a trigger
      const trigger = STAGE_TO_TRIGGER[stage]
      if (trigger) {
        await executeJourneyPlaybooks(trigger, {
          companyId,
          companyName,
          fromStage: existing.stage,
          toStage: stage,
        })
      }

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
