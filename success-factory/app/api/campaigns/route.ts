import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth/api-middleware"

/**
 * GET /api/campaigns
 * Get all campaigns
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const ownerEmail = searchParams.get("ownerEmail")

    const campaigns = await prisma.campaign.findMany({
      where: {
        ...(status && { status }),
        ...(ownerEmail && { ownerEmail }),
      },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
        enrollments: {
          include: {
            company: {
              select: { name: true, hubspotId: true },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error("[Campaigns] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get campaigns" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/campaigns
 * Create a new campaign with steps
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const {
      name,
      description,
      triggerType,
      triggerConditions,
      steps,
      ownerEmail,
      ownerName,
    } = body

    if (!name || !steps?.length) {
      return NextResponse.json(
        { error: "name and steps required" },
        { status: 400 }
      )
    }

    // Create campaign with steps in a transaction
    const campaign = await prisma.$transaction(async (tx) => {
      const newCampaign = await tx.campaign.create({
        data: {
          name,
          description,
          triggerType: triggerType || "manual",
          triggerConditions: triggerConditions || {},
          status: "draft",
          ownerEmail,
          ownerName,
        },
      })

      // Create steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        await tx.campaignStep.create({
          data: {
            campaignId: newCampaign.id,
            stepOrder: i + 1,
            type: step.type, // email, task, wait, condition
            name: step.name,
            config: step.config || {},
            delayDays: step.delayDays || 0,
            delayHours: step.delayHours || 0,
          },
        })
      }

      return newCampaign
    })

    // Fetch complete campaign with steps
    const completeCampaign = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
      },
    })

    return NextResponse.json({
      success: true,
      campaign: completeCampaign,
    })
  } catch (error) {
    console.error("[Campaigns] Create Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create campaign" },
      { status: 500 }
    )
  }
}
