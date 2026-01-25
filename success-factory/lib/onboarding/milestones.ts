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

  return MILESTONES.filter((m) =>
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

  const completedCount = required.filter((m) => completedMilestones.includes(m.id)).length

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

  return required.find((m) => !completedMilestones.includes(m.id)) || null
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

  const daysSinceSignup = Math.floor((Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24))

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

  const overdue = required.filter((m) =>
    isMilestoneOverdue(m, signupDate, completedMilestones.includes(m.id) ? new Date() : null)
  )

  const nextMilestone = getNextMilestone(completedMilestones, segment)

  let daysToNextDeadline: number | null = null
  if (nextMilestone) {
    const daysSinceSignup = Math.floor((Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24))
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

/**
 * Data from Card 1469 (Metabase) that can be used to detect milestones
 */
export interface MilestoneDetectionData {
  // Basic info
  subscriptionLifetimeDays?: number | null
  // Usage metrics
  vehiclesTotal?: number | null
  driversCount?: number | null
  membersCount?: number | null
  totalTrips?: number | null
  tripsLast30Days?: number | null
  // Setup & portal
  setupScore?: number | null
  customDomain?: string | null
  // Activity
  daysSinceLastLogin?: number | null
  lastLoginAt?: Date | null
  createdAt?: Date | null
}

/**
 * Extrapolate which milestones are likely complete based on Card 1469 data
 * Returns an array of milestone IDs that appear to be completed
 */
export function detectCompletedMilestones(data: MilestoneDetectionData): {
  milestoneId: string
  confidence: "high" | "medium" | "low"
  reason: string
}[] {
  const detected: { milestoneId: string; confidence: "high" | "medium" | "low"; reason: string }[] =
    []

  // first_login - if they have any activity data, they've logged in
  if (
    data.lastLoginAt ||
    data.daysSinceLastLogin !== null ||
    (data.totalTrips && data.totalTrips > 0)
  ) {
    detected.push({
      milestoneId: "first_login",
      confidence: "high",
      reason: data.lastLoginAt
        ? "Has login timestamp"
        : data.totalTrips
          ? "Has trip activity"
          : "Has activity tracking",
    })
  }

  // profile_complete - setupScore indicates profile/settings progress
  if (data.setupScore !== null && data.setupScore !== undefined) {
    if (data.setupScore >= 50) {
      detected.push({
        milestoneId: "profile_complete",
        confidence: data.setupScore >= 70 ? "high" : "medium",
        reason: `Setup score is ${data.setupScore}%`,
      })
    }
  } else if ((data.membersCount ?? 0) > 1 || data.customDomain) {
    // Fallback: if they have team members or custom domain, profile is likely complete
    detected.push({
      milestoneId: "profile_complete",
      confidence: "medium",
      reason: data.customDomain ? "Has custom domain" : "Has team members",
    })
  }

  // first_vehicle - vehiclesTotal > 0
  if (data.vehiclesTotal && data.vehiclesTotal > 0) {
    detected.push({
      milestoneId: "first_vehicle",
      confidence: "high",
      reason: `Has ${data.vehiclesTotal} vehicle(s)`,
    })
  }

  // first_driver - driversCount > 0
  if (data.driversCount && data.driversCount > 0) {
    detected.push({
      milestoneId: "first_driver",
      confidence: "high",
      reason: `Has ${data.driversCount} driver(s)`,
    })
  }

  // first_trip - totalTrips > 0
  if (data.totalTrips && data.totalTrips > 0) {
    detected.push({
      milestoneId: "first_trip",
      confidence: "high",
      reason: `Has ${data.totalTrips} total trip(s)`,
    })
  }

  // first_payment - if they're on a paid plan with lifetime > 30 days, they've paid
  if (data.subscriptionLifetimeDays && data.subscriptionLifetimeDays >= 30) {
    detected.push({
      milestoneId: "first_payment",
      confidence: "high",
      reason: `Subscription active for ${data.subscriptionLifetimeDays} days`,
    })
  }

  // portal_setup - custom domain or high setup score indicates portal configured
  if (data.customDomain) {
    detected.push({
      milestoneId: "portal_setup",
      confidence: "high",
      reason: `Custom domain configured: ${data.customDomain}`,
    })
  } else if (data.setupScore && data.setupScore >= 80) {
    detected.push({
      milestoneId: "portal_setup",
      confidence: "medium",
      reason: `High setup score (${data.setupScore}%) suggests portal configured`,
    })
  }

  // first_recurring - if they have steady trip volume, likely have recurring bookings
  if (data.totalTrips && data.totalTrips >= 20 && data.tripsLast30Days && data.tripsLast30Days >= 5) {
    detected.push({
      milestoneId: "first_recurring",
      confidence: "medium",
      reason: `Consistent usage: ${data.tripsLast30Days} trips/month, ${data.totalTrips} total`,
    })
  }

  // api_integration - can't detect from current data, would need API usage metrics
  // Skip for now

  return detected
}

/**
 * Get milestones that should be marked complete for a company
 * Filters by segment requirements and confidence threshold
 */
export function getMilestonesToComplete(
  data: MilestoneDetectionData,
  segment: string,
  existingCompleted: string[],
  minConfidence: "high" | "medium" | "low" = "medium"
): { milestoneId: string; reason: string }[] {
  const detected = detectCompletedMilestones(data)
  const requiredMilestones = getMilestonesForSegment(segment)
  const requiredIds = new Set(requiredMilestones.map((m) => m.id))

  const confidenceOrder = { high: 3, medium: 2, low: 1 }
  const minConfidenceLevel = confidenceOrder[minConfidence]

  return detected
    .filter((d) => {
      // Must be required for this segment
      if (!requiredIds.has(d.milestoneId)) return false
      // Must not already be completed
      if (existingCompleted.includes(d.milestoneId)) return false
      // Must meet confidence threshold
      if (confidenceOrder[d.confidence] < minConfidenceLevel) return false
      return true
    })
    .map((d) => ({ milestoneId: d.milestoneId, reason: d.reason }))
}
