import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  getMilestonesForSegment,
  getOnboardingStatus,
  getSegmentFromPlan,
  getMilestonesToComplete,
  MILESTONES,
  type MilestoneDetectionData,
} from "@/lib/onboarding/milestones"

/**
 * GET /api/onboarding/[companyId]
 * Get onboarding status and milestones for a company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params

    // Get company info
    const company = await prisma.hubSpotCompany.findFirst({
      where: {
        OR: [{ hubspotId: companyId }, { id: companyId }],
      },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const segment = company.customerSegment || getSegmentFromPlan(company.planCode)

    // Get existing milestones
    const milestones = await prisma.onboardingMilestone.findMany({
      where: { companyId: company.hubspotId },
      orderBy: { createdAt: "asc" },
    })

    // Get required milestones for segment
    const requiredMilestones = getMilestonesForSegment(segment)

    // Build milestone status
    const milestoneStatus = requiredMilestones.map((def) => {
      const existing = milestones.find((m) => m.milestone === def.id)
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        targetDays: def.targetDays,
        isRequired: true,
        completedAt: existing?.completedAt || null,
        isOverdue: existing?.isOverdue || false,
      }
    })

    // Calculate overall status
    const completedIds = milestones.filter((m) => m.completedAt).map((m) => m.milestone)

    const signupDate = company.hubspotCreatedAt || company.createdAt
    const status = getOnboardingStatus(completedIds, segment, signupDate)

    return NextResponse.json({
      companyId: company.hubspotId,
      companyName: company.name,
      segment,
      signupDate,
      milestones: milestoneStatus,
      ...status,
    })
  } catch (error) {
    console.error("Failed to get onboarding status:", error)
    return NextResponse.json({ error: "Failed to get onboarding status" }, { status: 500 })
  }
}

/**
 * POST /api/onboarding/[companyId]
 * Initialize or complete a milestone
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const body = await request.json()
    const { action, milestone } = body

    // Get company info
    const company = await prisma.hubSpotCompany.findFirst({
      where: {
        OR: [{ hubspotId: companyId }, { id: companyId }],
      },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const segment = company.customerSegment || getSegmentFromPlan(company.planCode)

    if (action === "initialize") {
      // Initialize all milestones for the company
      const requiredMilestones = getMilestonesForSegment(segment)
      const signupDate = company.hubspotCreatedAt || company.createdAt

      const created = await Promise.all(
        requiredMilestones.map(async (def) => {
          const daysSinceSignup = Math.floor(
            (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
          )

          return prisma.onboardingMilestone.upsert({
            where: {
              companyId_milestone: {
                companyId: company.hubspotId,
                milestone: def.id,
              },
            },
            update: {
              isOverdue: daysSinceSignup > def.targetDays,
            },
            create: {
              companyId: company.hubspotId,
              companyName: company.name,
              milestone: def.id,
              targetDays: def.targetDays,
              isRequired: true,
              isOverdue: daysSinceSignup > def.targetDays,
            },
          })
        })
      )

      return NextResponse.json({
        success: true,
        initialized: created.length,
        milestones: created,
      })
    }

    if (action === "complete" && milestone) {
      // Complete a specific milestone (manual override)
      const def = MILESTONES.find((m) => m.id === milestone)
      if (!def) {
        return NextResponse.json({ error: "Invalid milestone" }, { status: 400 })
      }

      const notes = body.notes || body.reason || null

      const updated = await prisma.onboardingMilestone.upsert({
        where: {
          companyId_milestone: {
            companyId: company.hubspotId,
            milestone,
          },
        },
        update: {
          completedAt: new Date(),
          isOverdue: false,
          notes,
        },
        create: {
          companyId: company.hubspotId,
          companyName: company.name,
          milestone,
          targetDays: def.targetDays,
          isRequired: true,
          completedAt: new Date(),
          isOverdue: false,
          notes,
        },
      })

      // Log activity event
      await prisma.activityEvent.create({
        data: {
          companyId: company.hubspotId,
          source: "platform",
          eventType: "milestone_completed",
          title: `Completed: ${def.name}`,
          description: notes || def.description,
          importance: "normal",
          occurredAt: new Date(),
          metadata: { milestone, targetDays: def.targetDays, manual: true },
        },
      })

      return NextResponse.json({ success: true, milestone: updated })
    }

    if (action === "detect") {
      // Auto-detect milestones from synced company data
      const detectionData: MilestoneDetectionData = {
        subscriptionLifetimeDays: company.subscriptionLifetimeDays,
        vehiclesTotal: company.vehiclesTotal,
        driversCount: company.driversCount,
        membersCount: company.membersCount,
        totalTrips: company.totalTrips,
        tripsLast30Days: company.tripsLast30Days,
        setupScore: company.setupScore,
        customDomain: company.domain,
        daysSinceLastLogin: company.daysSinceLastLogin,
        lastLoginAt: company.lastLoginAt,
        createdAt: company.hubspotCreatedAt || company.createdAt,
      }

      // Get already completed milestones
      const existingMilestones = await prisma.onboardingMilestone.findMany({
        where: { companyId: company.hubspotId, completedAt: { not: null } },
      })
      const completedIds = existingMilestones.map((m) => m.milestone)

      // Detect milestones to complete (medium confidence threshold)
      const toComplete = getMilestonesToComplete(detectionData, segment, completedIds, "medium")

      if (toComplete.length === 0) {
        return NextResponse.json({
          success: true,
          detected: 0,
          message: "No new milestones detected",
          existingCompleted: completedIds,
        })
      }

      // Complete detected milestones
      const completed = await Promise.all(
        toComplete.map(async ({ milestoneId, reason }) => {
          const def = MILESTONES.find((m) => m.id === milestoneId)!

          const milestone = await prisma.onboardingMilestone.upsert({
            where: {
              companyId_milestone: {
                companyId: company.hubspotId,
                milestone: milestoneId,
              },
            },
            update: {
              completedAt: new Date(),
              isOverdue: false,
              notes: `Auto-detected: ${reason}`,
            },
            create: {
              companyId: company.hubspotId,
              companyName: company.name,
              milestone: milestoneId,
              targetDays: def.targetDays,
              isRequired: true,
              completedAt: new Date(),
              isOverdue: false,
              notes: `Auto-detected: ${reason}`,
            },
          })

          // Log activity event
          await prisma.activityEvent.create({
            data: {
              companyId: company.hubspotId,
              source: "system",
              eventType: "milestone_completed",
              title: `Auto-completed: ${def.name}`,
              description: reason,
              importance: "low",
              occurredAt: new Date(),
              metadata: { milestone: milestoneId, reason, autoDetected: true },
            },
          })

          return { milestoneId, reason }
        })
      )

      return NextResponse.json({
        success: true,
        detected: completed.length,
        completed,
        existingCompleted: completedIds,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Failed to update onboarding:", error)
    return NextResponse.json({ error: "Failed to update onboarding" }, { status: 500 })
  }
}
