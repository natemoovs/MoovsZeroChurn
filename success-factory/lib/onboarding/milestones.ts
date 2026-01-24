/**
 * Onboarding Milestone Configuration and Utilities
 *
 * Defines milestones per customer segment with target completion days.
 * Used to track time-to-value and identify stalled onboardings.
 */

export interface MilestoneDefinition {
  id: string
  name: string
  description: string
  targetDays: number
  requiredFor: ("free" | "smb" | "mid_market" | "enterprise")[]
}

// Milestone definitions with segment-specific requirements
export const MILESTONES: MilestoneDefinition[] = [
  {
    id: "first_login",
    name: "First Login",
    description: "Customer logged into Moovs for the first time",
    targetDays: 1,
    requiredFor: ["free", "smb", "mid_market", "enterprise"],
  },
  {
    id: "profile_complete",
    name: "Profile Complete",
    description: "Company profile and settings configured",
    targetDays: 3,
    requiredFor: ["free", "smb", "mid_market", "enterprise"],
  },
  {
    id: "first_vehicle",
    name: "First Vehicle Added",
    description: "Added at least one vehicle to fleet",
    targetDays: 7,
    requiredFor: ["free", "smb", "mid_market", "enterprise"],
  },
  {
    id: "first_driver",
    name: "First Driver Added",
    description: "Added at least one driver",
    targetDays: 7,
    requiredFor: ["smb", "mid_market", "enterprise"],
  },
  {
    id: "first_trip",
    name: "First Trip Created",
    description: "Created their first trip/reservation",
    targetDays: 14,
    requiredFor: ["free", "smb", "mid_market", "enterprise"],
  },
  {
    id: "first_payment",
    name: "First Payment Processed",
    description: "Processed first customer payment through Moovs",
    targetDays: 30,
    requiredFor: ["free", "smb", "mid_market", "enterprise"],
  },
  {
    id: "portal_setup",
    name: "Customer Portal Setup",
    description: "Configured customer-facing booking portal",
    targetDays: 30,
    requiredFor: ["mid_market", "enterprise"],
  },
  {
    id: "first_recurring",
    name: "First Recurring Booking",
    description: "Set up first recurring/scheduled service",
    targetDays: 60,
    requiredFor: ["enterprise"],
  },
  {
    id: "api_integration",
    name: "API Integration",
    description: "Connected via API for integrations",
    targetDays: 90,
    requiredFor: ["enterprise"],
  },
]

/**
 * Get milestones required for a given segment
 */
export function getMilestonesForSegment(segment: string): MilestoneDefinition[] {
  const normalizedSegment = segment?.toLowerCase().replace("-", "_") || "free"

  return MILESTONES.filter(m =>
    m.requiredFor.includes(normalizedSegment as "free" | "smb" | "mid_market" | "enterprise")
  )
}

/**
 * Calculate onboarding progress percentage
 */
export function calculateOnboardingProgress(
  completedMilestones: string[],
  segment: string
): number {
  const required = getMilestonesForSegment(segment)
  if (required.length === 0) return 100

  const completedCount = required.filter(m =>
    completedMilestones.includes(m.id)
  ).length

  return Math.round((completedCount / required.length) * 100)
}

/**
 * Get the next milestone to complete
 */
export function getNextMilestone(
  completedMilestones: string[],
  segment: string
): MilestoneDefinition | null {
  const required = getMilestonesForSegment(segment)

  return required.find(m => !completedMilestones.includes(m.id)) || null
}

/**
 * Check if a milestone is overdue based on signup date
 */
export function isMilestoneOverdue(
  milestone: MilestoneDefinition,
  signupDate: Date,
  completedAt: Date | null
): boolean {
  if (completedAt) return false

  const daysSinceSignup = Math.floor(
    (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysSinceSignup > milestone.targetDays
}

/**
 * Get onboarding status summary
 */
export function getOnboardingStatus(
  completedMilestones: string[],
  segment: string,
  signupDate: Date
): {
  progress: number
  status: "on_track" | "at_risk" | "stalled" | "complete"
  overdueMilestones: MilestoneDefinition[]
  nextMilestone: MilestoneDefinition | null
  daysToNextDeadline: number | null
} {
  const required = getMilestonesForSegment(segment)
  const progress = calculateOnboardingProgress(completedMilestones, segment)

  const overdue = required.filter(m =>
    isMilestoneOverdue(m, signupDate,
      completedMilestones.includes(m.id) ? new Date() : null
    )
  )

  const nextMilestone = getNextMilestone(completedMilestones, segment)

  let daysToNextDeadline: number | null = null
  if (nextMilestone) {
    const daysSinceSignup = Math.floor(
      (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    daysToNextDeadline = nextMilestone.targetDays - daysSinceSignup
  }

  let status: "on_track" | "at_risk" | "stalled" | "complete"
  if (progress === 100) {
    status = "complete"
  } else if (overdue.length >= 2) {
    status = "stalled"
  } else if (overdue.length === 1 || (daysToNextDeadline !== null && daysToNextDeadline <= 2)) {
    status = "at_risk"
  } else {
    status = "on_track"
  }

  return {
    progress,
    status,
    overdueMilestones: overdue,
    nextMilestone,
    daysToNextDeadline,
  }
}

/**
 * Map Moovs plan codes to segments
 */
export function getSegmentFromPlan(planCode: string | null): string {
  if (!planCode) return "free"
  const code = planCode.toLowerCase()

  if (code === "vip-monthly" || code.includes("enterprise")) return "enterprise"
  if (code.startsWith("pro-")) return "mid_market"
  if (code.startsWith("standard-")) return "smb"
  return "free"
}
