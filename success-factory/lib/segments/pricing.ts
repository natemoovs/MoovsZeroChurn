/**
 * Moovs Pricing Intelligence
 *
 * Pricing tiers, add-ons, and plan-fit analysis based on the Platform Overview.
 * Identifies upsell opportunities and plan-segment misalignment.
 */

import { CustomerSegment, classifySegment } from "./icp"

// Pricing tiers from Platform Overview
export type PricingTier = "free" | "standard" | "pro" | "enterprise" | "unknown"

export interface PricingTierConfig {
  name: string
  monthlyPrice: number
  setupFee: number
  creditCardRate: string
  maxUsers: number | null // null = unlimited
  maxVehicles: number | null // null = unlimited
  maxDrivers: number | null // null = unlimited
  promoCodes: number | "unlimited"
  features: string[]
  bestFor: string
}

export interface AddOn {
  name: string
  code: string
  monthlyPrice: number
  description: string
  requiredTier: PricingTier[] // Which tiers can access this
}

// Pricing tiers from platform-overview.md
export const PRICING_TIERS: Record<PricingTier, PricingTierConfig> = {
  free: {
    name: "Free",
    monthlyPrice: 0,
    setupFee: 0,
    creditCardRate: "4% + $0.30",
    maxUsers: 3,
    maxVehicles: 10,
    maxDrivers: 10,
    promoCodes: 1,
    features: ["basic_booking", "basic_dispatch", "driver_app"],
    bestFor: "Operators starting out or testing Moovs",
  },
  standard: {
    name: "Standard",
    monthlyPrice: 149,
    setupFee: 299,
    creditCardRate: "3.4% + $0.30",
    maxUsers: 3,
    maxVehicles: null,
    maxDrivers: null,
    promoCodes: 1,
    features: ["unlimited_fleet", "customer_portal", "payments", "reporting"],
    bestFor: "Established operators with basic needs",
  },
  pro: {
    name: "Pro",
    monthlyPrice: 199,
    setupFee: 299,
    creditCardRate: "3% + $0.30",
    maxUsers: 5,
    maxVehicles: null,
    maxDrivers: null,
    promoCodes: "unlimited",
    features: ["unlimited_fleet", "unlimited_promos", "premium_addons", "advanced_reporting"],
    bestFor: "Growing operators ready to drive more revenue",
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: 499, // Starting at
    setupFee: 0, // Custom
    creditCardRate: "Custom",
    maxUsers: null,
    maxVehicles: null,
    maxDrivers: null,
    promoCodes: "unlimited",
    features: [
      "ai_scheduler",
      "contact_center",
      "bulk_import",
      "enterprise_integrations",
      "dedicated_am",
      "white_glove_migration",
    ],
    bestFor: "Advanced operators with multiple departments/locations",
  },
  unknown: {
    name: "Unknown",
    monthlyPrice: 0,
    setupFee: 0,
    creditCardRate: "Unknown",
    maxUsers: 0,
    maxVehicles: 0,
    maxDrivers: 0,
    promoCodes: 0,
    features: [],
    bestFor: "Unknown",
  },
}

// Add-ons from platform-overview.md
export const ADD_ONS: AddOn[] = [
  {
    name: "Branded Passenger App",
    code: "passenger_app",
    monthlyPrice: 499,
    description: "Operator's logo and colors on passenger app",
    requiredTier: ["standard", "pro", "enterprise"],
  },
  {
    name: "Shuttle Platform",
    code: "shuttle",
    monthlyPrice: 499,
    description: "Full shuttle operations management",
    requiredTier: ["standard", "pro", "enterprise"],
  },
  {
    name: "CRM Email Automation",
    code: "crm_automation",
    monthlyPrice: 299,
    description: "Advanced email workflows and automation",
    requiredTier: ["pro", "enterprise"],
  },
  {
    name: "Moovs Insights",
    code: "insights",
    monthlyPrice: 149,
    description: "Advanced analytics and reporting",
    requiredTier: ["pro", "enterprise"],
  },
  {
    name: "Google Tag Manager",
    code: "gtm",
    monthlyPrice: 99,
    description: "Tracking integration for marketing",
    requiredTier: ["pro", "enterprise"],
  },
]

/**
 * Identify pricing tier from plan name
 */
export function identifyPricingTier(planName: string | null): PricingTier {
  if (!planName) return "unknown"

  const plan = planName.toLowerCase()

  if (plan.includes("free") || plan.includes("trial")) return "free"
  if (plan.includes("enterprise") || plan.includes("custom")) return "enterprise"
  if (plan.includes("pro") || plan.includes("professional")) return "pro"
  if (plan.includes("standard") || plan.includes("basic")) return "standard"

  // Check for specific Lago plan codes
  if (plan.includes("starter")) return "free"
  if (plan.includes("growth")) return "pro"

  return "unknown"
}

/**
 * Get recommended tier based on segment and usage
 */
export function getRecommendedTier(
  segment: CustomerSegment,
  vehicleCount: number | null,
  driverCount: number | null,
  monthlyTrips: number | null
): PricingTier {
  // Enterprise segment should be on Enterprise plan
  if (segment === "enterprise") return "enterprise"

  // Mid-market typically needs Pro features
  if (segment === "mid_market") return "pro"

  // SMB decision based on usage
  if (segment === "smb") {
    // If hitting free tier limits, need Standard
    if ((vehicleCount && vehicleCount > 10) || (driverCount && driverCount > 10)) {
      return "standard"
    }
    // If high usage, might benefit from Pro
    if (monthlyTrips && monthlyTrips > 50) {
      return "pro"
    }
    return "standard"
  }

  // Free segment stays on free until they grow
  return "free"
}

/**
 * Check for plan-segment misalignment
 */
export interface PlanMisalignment {
  isMisaligned: boolean
  currentTier: PricingTier
  recommendedTier: PricingTier
  reason: string
  revenueImpact: "undermonetized" | "at_risk" | "aligned"
  urgency: "high" | "medium" | "low"
}

export function checkPlanMisalignment(
  mrr: number | null,
  currentPlan: string | null,
  vehicleCount: number | null,
  driverCount: number | null,
  monthlyTrips: number | null
): PlanMisalignment {
  const segment = classifySegment(mrr)
  const currentTier = identifyPricingTier(currentPlan)
  const recommendedTier = getRecommendedTier(segment, vehicleCount, driverCount, monthlyTrips)

  const tierOrder: Record<PricingTier, number> = {
    unknown: -1,
    free: 0,
    standard: 1,
    pro: 2,
    enterprise: 3,
  }

  const current = tierOrder[currentTier]
  const recommended = tierOrder[recommendedTier]

  if (current === recommended || currentTier === "unknown") {
    return {
      isMisaligned: false,
      currentTier,
      recommendedTier,
      reason: "Plan matches segment and usage",
      "revenueImpact": "aligned",
      urgency: "low",
    }
  }

  // Undermonetized: Customer should be on higher tier
  if (current < recommended) {
    let reason = ""
    let urgency: "high" | "medium" | "low" = "medium"

    if (segment === "enterprise" && currentTier !== "enterprise") {
      reason = `Enterprise customer ($${mrr?.toLocaleString() || "unknown"} MRR) on ${PRICING_TIERS[currentTier].name} plan - significant upsell opportunity`
      urgency = "high"
    } else if (segment === "mid_market" && currentTier === "free") {
      reason = `Mid-Market customer on Free plan - missing revenue opportunity`
      urgency = "high"
    } else if (currentTier === "free" && (vehicleCount && vehicleCount > 10 || driverCount && driverCount > 10)) {
      reason = `Exceeding Free tier limits (${vehicleCount} vehicles, ${driverCount} drivers) - upgrade conversation needed`
      urgency = "high"
    } else {
      reason = `Usage suggests ${PRICING_TIERS[recommendedTier].name} tier would be better fit`
      urgency = "medium"
    }

    return {
      isMisaligned: true,
      currentTier,
      recommendedTier,
      reason,
      "revenueImpact": "undermonetized",
      urgency,
    }
  }

  // Overmonetized: Customer on higher tier than needed (churn risk)
  return {
    isMisaligned: true,
    currentTier,
    recommendedTier,
    reason: `Customer on ${PRICING_TIERS[currentTier].name} but usage suggests ${PRICING_TIERS[recommendedTier].name} - potential churn risk if not getting value`,
    "revenueImpact": "at_risk",
    urgency: "medium",
  }
}

/**
 * Identify upsell opportunities based on usage patterns
 */
export interface UpsellOpportunity {
  type: "tier_upgrade" | "add_on"
  name: string
  currentValue: number
  potentialValue: number
  reason: string
  signals: string[]
}

export function identifyUpsellOpportunities(
  currentPlan: string | null,
  mrr: number | null,
  vehicleCount: number | null,
  driverCount: number | null,
  monthlyTrips: number | null,
  hasShuttle: boolean = false,
  hasPassengerApp: boolean = false
): UpsellOpportunity[] {
  const opportunities: UpsellOpportunity[] = []
  const currentTier = identifyPricingTier(currentPlan)
  const tierConfig = PRICING_TIERS[currentTier]
  const segment = classifySegment(mrr)

  // Tier upgrade opportunity
  const misalignment = checkPlanMisalignment(mrr, currentPlan, vehicleCount, driverCount, monthlyTrips)
  if (misalignment.isMisaligned && misalignment["revenueImpact"] === "undermonetized") {
    const recommendedConfig = PRICING_TIERS[misalignment.recommendedTier]
    opportunities.push({
      type: "tier_upgrade",
      name: `Upgrade to ${recommendedConfig.name}`,
      currentValue: tierConfig.monthlyPrice,
      potentialValue: recommendedConfig.monthlyPrice,
      reason: misalignment.reason,
      signals: [`Current: ${tierConfig.name}`, `Recommended: ${recommendedConfig.name}`],
    })
  }

  // Add-on opportunities
  if (currentTier !== "free") {
    // Shuttle Platform - if they have multiple vehicles and regular trips
    if (!hasShuttle && vehicleCount && vehicleCount >= 10 && monthlyTrips && monthlyTrips >= 100) {
      opportunities.push({
        type: "add_on",
        name: "Shuttle Platform",
        currentValue: 0,
        potentialValue: 499,
        reason: "High trip volume suggests shuttle operations could benefit from dedicated platform",
        signals: [`${vehicleCount} vehicles`, `${monthlyTrips} monthly trips`],
      })
    }

    // Branded Passenger App - for mid-market and enterprise
    if (!hasPassengerApp && (segment === "mid_market" || segment === "enterprise")) {
      opportunities.push({
        type: "add_on",
        name: "Branded Passenger App",
        currentValue: 0,
        potentialValue: 499,
        reason: `${segment === "enterprise" ? "Enterprise" : "Mid-Market"} customers benefit from branded experience`,
        signals: ["Professional customer experience", "Brand consistency"],
      })
    }

    // CRM Automation - for operators with high booking volume
    if (currentTier === "pro" || currentTier === "enterprise") {
      if (monthlyTrips && monthlyTrips >= 50) {
        opportunities.push({
          type: "add_on",
          name: "CRM Email Automation",
          currentValue: 0,
          potentialValue: 299,
          reason: "High booking volume would benefit from automated customer communications",
          signals: [`${monthlyTrips} monthly trips`, "Repeat customer potential"],
        })
      }
    }

    // Insights - for data-driven operators
    if ((currentTier === "pro" || currentTier === "enterprise") && monthlyTrips && monthlyTrips >= 30) {
      opportunities.push({
        type: "add_on",
        name: "Moovs Insights",
        currentValue: 0,
        potentialValue: 149,
        reason: "Sufficient data volume to benefit from advanced analytics",
        signals: ["Data-driven decisions", "Performance optimization"],
      })
    }
  }

  return opportunities
}

/**
 * Calculate total expansion potential for an account
 */
export function calculateExpansionPotential(
  currentPlan: string | null,
  mrr: number | null,
  vehicleCount: number | null,
  driverCount: number | null,
  monthlyTrips: number | null
): {
  currentMrr: number
  potentialMrr: number
  expansionOpportunity: number
  opportunities: UpsellOpportunity[]
} {
  const currentMrr = PRICING_TIERS[identifyPricingTier(currentPlan)].monthlyPrice
  const opportunities = identifyUpsellOpportunities(
    currentPlan,
    mrr,
    vehicleCount,
    driverCount,
    monthlyTrips
  )

  const potentialMrr = opportunities.reduce(
    (total, opp) => total + opp.potentialValue - opp.currentValue,
    currentMrr
  )

  return {
    currentMrr,
    potentialMrr,
    expansionOpportunity: potentialMrr - currentMrr,
    opportunities,
  }
}
