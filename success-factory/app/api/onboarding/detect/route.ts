import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  getMilestonesToComplete,
  getSegmentFromPlan,
  MILESTONES,
  type MilestoneDetectionData,
} from "@/lib/onboarding/milestones"

/**
 * POST /api/onboarding/detect
 * Batch detect and complete milestones for all companies
 * Called after HubSpot sync to auto-update onboarding status
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // Require CRON_SECRET for security
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get all companies with relevant data
    const companies = await prisma.hubSpotCompany.findMany({
      where: {
        // Only process companies that have some activity
        OR: [
          { totalTrips: { gt: 0 } },
          { vehiclesTotal: { gt: 0 } },
          { driversCount: { gt: 0 } },
          { setupScore: { gt: 0 } },
          { subscriptionLifetimeDays: { gt: 0 } },
        ],
      },
      select: {
        id: true,
        hubspotId: true,
        name: true,
        customerSegment: true,
        planCode: true,
        subscriptionLifetimeDays: true,
        vehiclesTotal: true,
        driversCount: true,
        membersCount: true,
        totalTrips: true,
        tripsLast30Days: true,
        setupScore: true,
        domain: true,
        daysSinceLastLogin: true,
        lastLoginAt: true,
        hubspotCreatedAt: true,
        createdAt: true,
      },
    })

    let totalDetected = 0
    let companiesUpdated = 0
    const results: { companyId: string; companyName: string; milestones: string[] }[] = []

    for (const company of companies) {
      const segment = company.customerSegment || getSegmentFromPlan(company.planCode)

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

      if (toComplete.length === 0) continue

      // Complete detected milestones
      const completedMilestones: string[] = []
      for (const { milestoneId, reason } of toComplete) {
        const def = MILESTONES.find((m) => m.id === milestoneId)
        if (!def) continue

        await prisma.onboardingMilestone.upsert({
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

        completedMilestones.push(milestoneId)
        totalDetected++
      }

      if (completedMilestones.length > 0) {
        companiesUpdated++
        results.push({
          companyId: company.hubspotId,
          companyName: company.name,
          milestones: completedMilestones,
        })
      }
    }

    console.log(
      `Milestone detection: ${totalDetected} milestones completed for ${companiesUpdated} companies`
    )

    return NextResponse.json({
      success: true,
      companiesProcessed: companies.length,
      companiesUpdated,
      milestonesCompleted: totalDetected,
      results: results.slice(0, 50), // Limit response size
    })
  } catch (error) {
    console.error("Milestone detection failed:", error)
    return NextResponse.json(
      { error: "Failed to detect milestones", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}
