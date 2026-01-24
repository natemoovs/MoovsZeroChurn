import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/campaigns/[id]
 * Get a specific campaign with all details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
        enrollments: {
          include: {
            company: {
              select: { name: true, hubspotId: true, healthScore: true },
            },
          },
          orderBy: { enrolledAt: "desc" },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Calculate stats
    const stats = {
      totalEnrolled: campaign.enrollments.length,
      active: campaign.enrollments.filter((e) => e.status === "active").length,
      completed: campaign.enrollments.filter((e) => e.status === "completed").length,
      paused: campaign.enrollments.filter((e) => e.status === "paused").length,
      exited: campaign.enrollments.filter((e) => e.status === "exited").length,
    }

    return NextResponse.json({ campaign, stats })
  } catch (error) {
    console.error("[Campaign] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get campaign" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/campaigns/[id]
 * Update campaign status or details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, name, description, triggerConditions } = body

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (triggerConditions) updateData.triggerConditions = triggerConditions

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
      },
    })

    return NextResponse.json({ success: true, campaign })
  } catch (error) {
    console.error("[Campaign] Update Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update campaign" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/campaigns/[id]
 * Delete a campaign
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Delete in transaction
    await prisma.$transaction([
      prisma.campaignEnrollment.deleteMany({ where: { campaignId: id } }),
      prisma.campaignStep.deleteMany({ where: { campaignId: id } }),
      prisma.campaign.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Campaign] Delete Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete campaign" },
      { status: 500 }
    )
  }
}
