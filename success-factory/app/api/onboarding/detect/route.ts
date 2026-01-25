import { NextRequest, NextResponse } from "next/server"
import { detectAndCompleteMilestones } from "@/lib/onboarding/detect-milestones"

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
    const result = await detectAndCompleteMilestones()

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("Milestone detection failed:", error)
    return NextResponse.json(
      { error: "Failed to detect milestones", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}
