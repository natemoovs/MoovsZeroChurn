import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Record follow-up on an NPS response
 * PATCH /api/nps/[id]/followup
 * Body: { notes }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    const body = await request.json()
    const { notes } = body as { notes?: string }

    const survey = await prisma.nPSSurvey.update({
      where: { id },
      data: {
        followedUpAt: new Date(),
        followUpNotes: notes,
      },
    })

    // Log activity event
    await prisma.activityEvent.create({
      data: {
        companyId: survey.companyId,
        source: "nps",
        eventType: "nps_followup",
        title: `NPS follow-up completed`,
        description: survey.category === "detractor"
          ? `Followed up with detractor (score: ${survey.score})`
          : `Followed up on NPS response (score: ${survey.score})`,
        importance: survey.category === "detractor" ? "high" : "normal",
        occurredAt: new Date(),
        metadata: {
          surveyId: survey.id,
          score: survey.score,
          category: survey.category,
          contactEmail: survey.contactEmail,
        },
      },
    })

    return NextResponse.json({ success: true, survey })
  } catch (error) {
    console.error("NPS follow-up error:", error)
    return NextResponse.json(
      { error: "Failed to record follow-up" },
      { status: 500 }
    )
  }
}
