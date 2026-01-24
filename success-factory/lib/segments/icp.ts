/**
 * Moovs ICP Segment Intelligence
 *
 * Customer segmentation based on the ICP knowledge base.
 * Plan type is the PRIMARY indicator for segment classification.
 *
 * Segments by Plan:
 * - SMB: Starter (Monthly/Annual) - standard-monthly, standard-annual
 * - Mid-Market: Pro (Monthly/Annual/Legacy) - pro-monthly, pro-annual, pro-legacy
 * - Enterprise: Elite (Monthly) - vip-monthly
 *
 * Revenue thresholds (fallback when plan unknown):
 * - SMB Black Car: $50K-$250K annual ($4K-$21K MRR)
 * - Mid-Market Black Car: $250K-$1M annual ($21K-$83K MRR)
 * - Enterprise Black Car: $1M+ annual ($83K+ MRR)
 */

export type CustomerSegment = "smb" | "mid_market" | "enterprise" | "free" | "unknown"

// ServiceType is defined in service-types.ts - using inline here to avoid circular imports
type IcpServiceType = "black_car" | "shuttle" | "unknown"

export interface SegmentProfile {
  segment: CustomerSegment
  serviceType: IcpServiceType
  revenueRange: { min: number; max: number | null }
  typicalPainPoints: string[]
  churnIndicators: string[]
  retentionIndicators: string[]
  expansionOpportunities: string[]
  engagementExpectations: {
    minMonthlyTrips: number
    expectedLoginFrequency: string // daily, weekly, monthly
    criticalFeatures: string[]
  }
  salesMotion: string
  budgetRange: { min: number; max: number }
  salesCycleDays: number
}

// MRR thresholds (monthly, derived from annual)
const MRR_THRESHOLDS = {
  SMB_MIN: 4000, // $50K/12
  SMB_MAX: 21000, // $250K/12
  MID_MARKET_MAX: 83000, // $1M/12
} as const

/**
 * Classify customer segment based on MRR (fallback method)
 * Used when plan information is not available
 */
export function classifySegment(mrr: number | null): CustomerSegment {
  if (mrr === null || mrr === 0) return "free"
  if (mrr < MRR_THRESHOLDS.SMB_MIN) return "free"
  if (mrr <= MRR_THRESHOLDS.SMB_MAX) return "smb"
  if (mrr <= MRR_THRESHOLDS.MID_MARKET_MAX) return "mid_market"
  return "enterprise"
}

/**
 * Classify customer segment based on plan type (PRIMARY method)
 * Falls back to MRR-based classification if plan is unknown
 *
 * Plan mapping:
 * - SMB: Starter (standard-monthly, standard-annual)
 * - Mid-Market: Pro (pro-monthly, pro-annual, pro-legacy)
 * - Enterprise: Elite (vip-monthly)
 */
export function classifySegmentByPlanOrMrr(plan: string | null, mrr: number | null): CustomerSegment {
  if (plan) {
    const planLower = plan.toLowerCase()

    // Exact Lago plan code matching
    if (planLower === "standard-monthly" || planLower === "standard-annual") return "smb"
    if (planLower === "pro-monthly" || planLower === "pro-annual" || planLower === "pro-legacy") return "mid_market"
    if (planLower === "vip-monthly") return "enterprise"

    // Fuzzy matching for variations
    if (planLower.includes("vip") || planLower.includes("elite")) return "enterprise"
    if (planLower.includes("pro")) return "mid_market"
    if (planLower.includes("standard") || planLower.includes("starter")) return "smb"
    if (planLower.includes("free") || planLower.includes("trial")) return "free"
  }

  // Fallback to MRR-based classification
  return classifySegment(mrr)
}

/**
 * Get segment-specific profile with pain points, indicators, etc.
 */
export function getSegmentProfile(segment: CustomerSegment): SegmentProfile {
  switch (segment) {
    case "smb":
      return {
        segment: "smb",
        serviceType: "black_car",
        revenueRange: { min: 50000, max: 250000 },
        typicalPainPoints: [
          "Everything is manual - dispatch, quoting, billing",
          "Looking unprofessional to customers",
          "Can't grow beyond current capacity",
          "No visibility into business performance",
          "Customer tracking is chaos",
        ],
        churnIndicators: [
          "Free plan with zero usage (44.7% start free)",
          "No online booking setup",
          "Zero trips in 30+ days",
          "Never upgraded from free plan after 90 days",
          "No drivers added",
          "Payment issues on $150-250/mo plan",
        ],
        retentionIndicators: [
          "Growth mindset - wants to expand",
          "Professional orientation - uses booking page",
          "Active driver management",
          "Upgraded from free to paid",
          "Regular usage of core features",
        ],
        expansionOpportunities: [
          "Plan upgrade: Free → Standard → Pro",
          "Fleet growth: 1-3 → 5+ vehicles",
          "Service expansion: adding limo",
          "Graduate to Mid-Market segment",
        ],
        engagementExpectations: {
          minMonthlyTrips: 10,
          expectedLoginFrequency: "weekly",
          criticalFeatures: ["online_booking", "driver_app", "confirmations"],
        },
        salesMotion: "PLG/self-serve",
        budgetRange: { min: 150, max: 250 },
        salesCycleDays: 30,
      }

    case "mid_market":
      return {
        segment: "mid_market",
        serviceType: "black_car",
        revenueRange: { min: 250000, max: 1000000 },
        typicalPainPoints: [
          "Outgrowing current tools",
          "Managing 6-19 vehicles is complex",
          "Driver coordination challenges",
          "Need better reporting for decisions",
          "Corporate clients need more professionalism",
        ],
        churnIndicators: [
          "Usage decline >30% month-over-month",
          "Stopped adding new drivers",
          "Not using advanced features (affiliates, APIs)",
          "Corporate client loss visible in trip data",
          "Support tickets increasing",
          "Considering competitor (demo requests elsewhere)",
        ],
        retentionIndicators: [
          "Adding vehicles/drivers regularly",
          "Using affiliate management",
          "Active API integrations",
          "Regular corporate client trips",
          "Upgrading plan features",
        ],
        expansionOpportunities: [
          "Enterprise upgrade as they hit $1M",
          "Additional integrations (QuickBooks, etc.)",
          "Marketing campaign add-ons",
          "Geographic expansion support",
        ],
        engagementExpectations: {
          minMonthlyTrips: 50,
          expectedLoginFrequency: "daily",
          criticalFeatures: ["dispatch", "driver_management", "reporting", "corporate_portal"],
        },
        salesMotion: "Sales-assisted",
        budgetRange: { min: 250, max: 500 },
        salesCycleDays: 45,
      }

    case "enterprise":
      return {
        segment: "enterprise",
        serviceType: "black_car",
        revenueRange: { min: 1000000, max: null },
        typicalPainPoints: [
          "Disconnected systems - 5-10+ tools, no single source of truth",
          "Manual scheduling - 3-4 hours daily for 150+ trips",
          "Trip intake chaos - processing manifests, CSVs, PDFs",
          "Affiliate management complexity",
          "Migration fear - worried about disrupting operations",
        ],
        churnIndicators: [
          "Trip volume decline >20%",
          "Key corporate contracts ending",
          "Migration to competitor discussions",
          "Executive sponsor change",
          "Support escalations increasing",
          "API usage dropping",
          "Not adopting new features",
        ],
        retentionIndicators: [
          "High API usage",
          "Multiple integrations active",
          "Corporate contracts with SLAs",
          "Multi-location operations",
          "Case study/reference participation",
          "Regular QBRs attended",
        ],
        expansionOpportunities: [
          "AI contact center add-on",
          "Advanced analytics package",
          "Additional location deployments",
          "Acquisition integration support",
          "Marketing campaign services",
        ],
        engagementExpectations: {
          minMonthlyTrips: 300,
          expectedLoginFrequency: "daily",
          criticalFeatures: ["ai_dispatch", "affiliate_network", "api_integrations", "enterprise_reporting"],
        },
        salesMotion: "High-touch enterprise",
        budgetRange: { min: 2500, max: 8000 },
        salesCycleDays: 120,
      }

    case "free":
      return {
        segment: "free",
        serviceType: "black_car",
        revenueRange: { min: 0, max: 50000 },
        typicalPainPoints: [
          "Just starting out / testing the waters",
          "Part-time or side business",
          "Not sure if ready to commit",
          "Price sensitive",
        ],
        churnIndicators: [
          "Never completed onboarding",
          "Zero trips created",
          "No drivers added",
          "Haven't logged in for 30+ days",
          "Never set up online booking",
        ],
        retentionIndicators: [
          "Active trial usage",
          "Completed onboarding",
          "Added first driver",
          "Created first trips",
          "Engaged with support/resources",
        ],
        expansionOpportunities: [
          "Convert to paid (SMB) plan",
          "Demonstrate value through usage",
        ],
        engagementExpectations: {
          minMonthlyTrips: 1,
          expectedLoginFrequency: "monthly",
          criticalFeatures: ["basic_booking", "quotes"],
        },
        salesMotion: "PLG/nurture",
        budgetRange: { min: 0, max: 0 },
        salesCycleDays: 14,
      }

    default:
      return {
        segment: "unknown",
        serviceType: "unknown",
        revenueRange: { min: 0, max: null },
        typicalPainPoints: [],
        churnIndicators: [],
        retentionIndicators: [],
        expansionOpportunities: [],
        engagementExpectations: {
          minMonthlyTrips: 0,
          expectedLoginFrequency: "unknown",
          criticalFeatures: [],
        },
        salesMotion: "Unknown",
        budgetRange: { min: 0, max: 0 },
        salesCycleDays: 0,
      }
  }
}

/**
 * Get segment-specific recommendations based on risk signals
 */
export function getSegmentRecommendations(
  segment: CustomerSegment,
  riskSignals: string[],
  healthScore: number
): string[] {
  const profile = getSegmentProfile(segment)
  const recommendations: string[] = []

  // Check for segment-specific churn indicators
  const signalsLower = riskSignals.map((s) => s.toLowerCase()).join(" ")

  switch (segment) {
    case "smb":
      if (signalsLower.includes("free") || signalsLower.includes("no usage")) {
        recommendations.push("Send activation email with quick win tutorial")
        recommendations.push("Offer 1:1 onboarding call to drive first value")
      }
      if (signalsLower.includes("inactive") || signalsLower.includes("login")) {
        recommendations.push("Trigger re-engagement sequence highlighting time savings")
      }
      if (healthScore < 50) {
        recommendations.push("Check if they're struggling with setup - offer guided setup call")
      }
      break

    case "mid_market":
      if (signalsLower.includes("decline") || signalsLower.includes("drop")) {
        recommendations.push("Schedule check-in to understand business changes")
        recommendations.push("Review if they need additional training on features")
      }
      if (signalsLower.includes("support") || signalsLower.includes("ticket")) {
        recommendations.push("Escalate support tickets to ensure quick resolution")
        recommendations.push("Consider assigning dedicated success manager")
      }
      if (healthScore < 60) {
        recommendations.push("Prepare growth playbook showing path to next tier")
      }
      break

    case "enterprise":
      if (signalsLower.includes("executive") || signalsLower.includes("sponsor")) {
        recommendations.push("Identify new executive sponsor immediately")
        recommendations.push("Schedule executive business review")
      }
      if (signalsLower.includes("contract") || signalsLower.includes("renewal")) {
        recommendations.push("Prepare value realization report for renewal")
        recommendations.push("Identify expansion opportunities before renewal")
      }
      if (signalsLower.includes("competitor")) {
        recommendations.push("Urgent: Schedule defensive meeting with decision makers")
        recommendations.push("Prepare competitive differentiation materials")
      }
      if (healthScore < 70) {
        recommendations.push("Schedule QBR to address concerns proactively")
        recommendations.push("Involve executive sponsor in recovery plan")
      }
      break

    case "free":
      if (signalsLower.includes("inactive") || signalsLower.includes("never")) {
        recommendations.push("Send onboarding reminder with video tutorial")
        recommendations.push("Consider automated nurture sequence")
      }
      recommendations.push("Monitor for conversion readiness signals")
      break
  }

  // Add generic recommendations based on health
  if (healthScore < 40) {
    recommendations.push("Create immediate action plan - health critical")
  }

  return [...new Set(recommendations)].slice(0, 5)
}

/**
 * Calculate segment-adjusted health score
 * Different segments have different engagement expectations
 */
export function calculateSegmentAdjustedScore(
  baseScore: number,
  segment: CustomerSegment,
  actualMonthlyTrips: number,
  daysSinceLastLogin: number | null
): { adjustedScore: number; adjustments: string[] } {
  const profile = getSegmentProfile(segment)
  let adjustedScore = baseScore
  const adjustments: string[] = []

  // Adjust based on trip volume vs expectations
  const expectedTrips = profile.engagementExpectations.minMonthlyTrips
  if (expectedTrips > 0) {
    const tripRatio = actualMonthlyTrips / expectedTrips

    if (tripRatio < 0.3) {
      adjustedScore -= 15
      adjustments.push(`Usage far below ${segment} segment expectations`)
    } else if (tripRatio < 0.5) {
      adjustedScore -= 10
      adjustments.push(`Usage below ${segment} segment expectations`)
    } else if (tripRatio > 1.5) {
      adjustedScore += 5
      adjustments.push(`Strong usage for ${segment} segment`)
    }
  }

  // Adjust based on login frequency expectations
  if (daysSinceLastLogin !== null) {
    const expectedFrequency = profile.engagementExpectations.expectedLoginFrequency

    if (expectedFrequency === "daily" && daysSinceLastLogin > 7) {
      adjustedScore -= 10
      adjustments.push(`Enterprise/Mid-Market should login daily, last login ${daysSinceLastLogin} days ago`)
    } else if (expectedFrequency === "weekly" && daysSinceLastLogin > 21) {
      adjustedScore -= 10
      adjustments.push(`SMB should login weekly, last login ${daysSinceLastLogin} days ago`)
    }
  }

  // Free plan specific
  if (segment === "free" && actualMonthlyTrips === 0) {
    adjustedScore -= 20
    adjustments.push("Free plan with zero usage - activation needed")
  }

  return {
    adjustedScore: Math.max(0, Math.min(100, adjustedScore)),
    adjustments,
  }
}

/**
 * Get segment display name
 */
export function getSegmentDisplayName(segment: CustomerSegment): string {
  switch (segment) {
    case "smb":
      return "SMB"
    case "mid_market":
      return "Mid-Market"
    case "enterprise":
      return "Enterprise"
    case "free":
      return "Free/Trial"
    default:
      return "Unknown"
  }
}

/**
 * Check if customer shows expansion potential
 */
export function checkExpansionPotential(
  segment: CustomerSegment,
  mrr: number | null,
  totalTrips: number | null,
  growthRate: number | null // month-over-month trip growth rate
): { potential: boolean; nextSegment: CustomerSegment | null; signals: string[] } {
  const signals: string[] = []

  // SMB → Mid-Market
  if (segment === "smb") {
    if (mrr && mrr > MRR_THRESHOLDS.SMB_MAX * 0.8) {
      signals.push("MRR approaching Mid-Market threshold")
    }
    if (totalTrips && totalTrips > 80) {
      signals.push("Trip volume suggests growth beyond SMB")
    }
    if (growthRate && growthRate > 0.15) {
      signals.push("Strong month-over-month growth")
    }
    return {
      potential: signals.length >= 2,
      nextSegment: signals.length >= 2 ? "mid_market" : null,
      signals,
    }
  }

  // Mid-Market → Enterprise
  if (segment === "mid_market") {
    if (mrr && mrr > MRR_THRESHOLDS.MID_MARKET_MAX * 0.8) {
      signals.push("MRR approaching Enterprise threshold")
    }
    if (totalTrips && totalTrips > 250) {
      signals.push("Trip volume at Enterprise level")
    }
    if (growthRate && growthRate > 0.10) {
      signals.push("Consistent growth trajectory")
    }
    return {
      potential: signals.length >= 2,
      nextSegment: signals.length >= 2 ? "enterprise" : null,
      signals,
    }
  }

  // Free → SMB
  if (segment === "free") {
    if (totalTrips && totalTrips > 5) {
      signals.push("Active usage on free plan")
    }
    if (growthRate && growthRate > 0) {
      signals.push("Growing usage")
    }
    return {
      potential: signals.length >= 1,
      nextSegment: signals.length >= 1 ? "smb" : null,
      signals,
    }
  }

  return { potential: false, nextSegment: null, signals: [] }
}
