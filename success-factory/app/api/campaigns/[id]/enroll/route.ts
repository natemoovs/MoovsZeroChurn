import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * POST /api/campaigns/[id]/enroll
 * Enroll companies in a campaign
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { companyIds } = body

    if (!companyIds?.length) {
      return NextResponse.json(
        { error: "companyIds required" },
        { status: 400 }
      )
    }

    // Verify campaign exists and is active
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (campaign.status !== "active" && campaign.status !== "draft") {
      return NextResponse.json(
        { error: "Campaign is not accepting enrollments" },
        { status: 400 }
      )
    }

    // Get companies
    const companies = await prisma.hubSpotCompany.findMany({
      where: {
        OR: companyIds.map((cid: string) => ({
          OR: [{ hubspotId: cid }, { id: cid }],
        })),
      },
    })

    if (companies.length === 0) {
      return NextResponse.json({ error: "No valid companies found" }, { status: 404 })
    }

    // Get first step
    const firstStep = campaign.steps[0]
    const firstStepId = firstStep?.id || null

    // Calculate next step due date
    const nextStepDue = firstStep
      ? new Date(
          Date.now() +
            (firstStep.delayDays * 24 * 60 * 60 * 1000) +
            (firstStep.delayHours * 60 * 60 * 1000)
        )
      : null

    // Enroll each company
    const enrollments = []
    for (const company of companies) {
      // Check if already enrolled
      const existing = await prisma.campaignEnrollment.findFirst({
        where: {
          campaignId: id,
          companyId: company.id,
          status: { in: ["active", "paused"] },
        },
      })

      if (existing) {
        continue // Skip already enrolled
      }

      const enrollment = await prisma.campaignEnrollment.create({
        data: {
          campaignId: id,
          companyId: company.id,
          status: "active",
          currentStepId: firstStepId,
          currentStepOrder: 1,
          nextStepDue,
        },
        include: {
          company: { select: { name: true, hubspotId: true } },
        },
      })

      enrollments.push(enrollment)
    }

    // If campaign was draft, activate it
    if (campaign.status === "draft" && enrollments.length > 0) {
      await prisma.campaign.update({
        where: { id },
        data: { status: "active" },
      })
    }

    return NextResponse.json({
      success: true,
      enrolled: enrollments.length,
      skipped: companies.length - enrollments.length,
      enrollments,
    })
  } catch (error) {
    console.error("[Campaign Enroll] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to enroll companies" },
      { status: 500 }
    )
  }
}
