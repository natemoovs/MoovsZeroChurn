/**
 * Service Type Classification
 *
 * Distinguishes between Black Car and Shuttle Platform customers
 * based on the ICP knowledge base.
 *
 * Key Question: "Do passengers book the entire vehicle or individual seats?"
 * - Entire vehicle → Black Car
 * - Individual seats → Shuttle Platform
 */

export type ServiceType = "black_car" | "shuttle" | "hybrid" | "unknown"
export type ShuttleVariation = "university" | "corporate" | "operator" | "unknown"

export interface ServiceTypeProfile {
  type: ServiceType
  shuttleVariation?: ShuttleVariation
  characteristics: string[]
  keyPainPoints: string[]
  routeType: string
  customerType: string
  pricingModel: string
  minPrice: number // Starting monthly price
}

// Service type profiles from ICP knowledge
export const SERVICE_TYPE_PROFILES: Record<ServiceType, ServiceTypeProfile> = {
  black_car: {
    type: "black_car",
    characteristics: [
      "Entire vehicle bookings",
      "Point-to-point, custom routes",
      "Individual executives, VIPs, or corporate accounts",
      "Hourly, one-way, or round-trip pricing",
      "Manual dispatch coordination",
    ],
    keyPainPoints: [
      "Manual dispatch chaos",
      "Looking unprofessional",
      "Can't grow beyond capacity",
      "No visibility into performance",
      "Driver coordination via phone/text",
    ],
    routeType: "Point-to-point, custom",
    customerType: "Executives, VIPs, individuals",
    pricingModel: "Hourly, one-way, round-trip",
    minPrice: 0, // Free tier available
  },
  shuttle: {
    type: "shuttle",
    characteristics: [
      "Individual seat bookings",
      "Fixed routes with timetables",
      "Commuters, students, employees",
      "Per-seat or program-based pricing",
      "Route and schedule management",
    ],
    keyPainPoints: [
      "Route & schedule management complexity",
      "Capacity management & overbooking",
      "No real-time visibility for riders",
      "Multi-stakeholder reporting gaps",
      "Technology fragmentation",
    ],
    routeType: "Fixed routes with timetables",
    customerType: "Commuters, students, employees",
    pricingModel: "Per-seat or program-based",
    minPrice: 499, // Shuttle starts at $499/mo
  },
  hybrid: {
    type: "hybrid",
    characteristics: [
      "Both vehicle and seat bookings",
      "Mixed service types",
      "Corporate + shuttle programs",
    ],
    keyPainPoints: [
      "Managing two different service models",
      "Separate tools for each",
      "Unified reporting challenges",
    ],
    routeType: "Mixed",
    customerType: "Mixed",
    pricingModel: "Combined",
    minPrice: 499,
  },
  unknown: {
    type: "unknown",
    characteristics: [],
    keyPainPoints: [],
    routeType: "Unknown",
    customerType: "Unknown",
    pricingModel: "Unknown",
    minPrice: 0,
  },
}

// Shuttle variations from ICP
export const SHUTTLE_VARIATIONS: Record<
  ShuttleVariation,
  {
    name: string
    primaryDriver: string
    salesCycle: string
    keyStakeholders: string[]
    uniquePains: string[]
  }
> = {
  university: {
    name: "University Programs",
    primaryDriver: "Student experience & safety",
    salesCycle: "4-6 months (RFP process)",
    keyStakeholders: ["Campus Services", "Transportation Director", "Student Government"],
    uniquePains: [
      "Student safety concerns",
      "Late-night shuttle requirements",
      "Academic calendar alignment",
      "Budget cycles tied to fiscal year",
    ],
  },
  corporate: {
    name: "Corporate Programs",
    primaryDriver: "Employee retention & ROI",
    salesCycle: "3-4 months",
    keyStakeholders: ["HR", "Facilities", "CFO"],
    uniquePains: [
      "Employee commute stress",
      "Parking constraints",
      "Sustainability goals",
      "Demonstrating ROI to leadership",
    ],
  },
  operator: {
    name: "Third-Party Operators",
    primaryDriver: "Win contracts & margins",
    salesCycle: "2-3 months",
    keyStakeholders: ["Owner", "Operations Manager"],
    uniquePains: [
      "Managing multiple client contracts",
      "Route profitability",
      "Driver utilization across programs",
      "Client reporting requirements",
    ],
  },
  unknown: {
    name: "Unknown",
    primaryDriver: "Unknown",
    salesCycle: "Unknown",
    keyStakeholders: [],
    uniquePains: [],
  },
}

/**
 * Classify service type based on available signals
 */
export function classifyServiceType(signals: {
  hasShuttlePlatform?: boolean
  hasFixedRoutes?: boolean
  hasSeatBookings?: boolean
  planName?: string | null
  tripType?: string | null
  vehicleTypes?: string[]
}): ServiceType {
  // Direct shuttle platform indicator
  if (signals.hasShuttlePlatform) {
    return "shuttle"
  }

  // Plan name indicators
  if (signals.planName) {
    const plan = signals.planName.toLowerCase()
    if (plan.includes("shuttle")) return "shuttle"
    if (plan.includes("transit")) return "shuttle"
  }

  // Trip type indicators
  if (signals.tripType) {
    const type = signals.tripType.toLowerCase()
    if (type.includes("shuttle") || type.includes("commuter")) return "shuttle"
    if (type.includes("black car") || type.includes("sedan") || type.includes("limo"))
      return "black_car"
  }

  // Fixed routes + seat bookings = shuttle
  if (signals.hasFixedRoutes && signals.hasSeatBookings) {
    return "shuttle"
  }

  // Vehicle type indicators
  if (signals.vehicleTypes && signals.vehicleTypes.length > 0) {
    const types = signals.vehicleTypes.map((v) => v.toLowerCase()).join(" ")
    if (types.includes("bus") || types.includes("coach") || types.includes("transit")) {
      return "shuttle"
    }
    if (types.includes("sedan") || types.includes("suv") || types.includes("limo")) {
      return "black_car"
    }
  }

  return "unknown"
}

/**
 * Identify shuttle variation based on customer type
 */
export function identifyShuttleVariation(signals: {
  industry?: string | null
  customerName?: string | null
  domainKeywords?: string[]
}): ShuttleVariation {
  const combined = [
    signals.industry || "",
    signals.customerName || "",
    ...(signals.domainKeywords || []),
  ]
    .join(" ")
    .toLowerCase()

  // University indicators
  if (
    combined.includes("university") ||
    combined.includes("college") ||
    combined.includes("campus") ||
    combined.includes("edu") ||
    combined.includes("student")
  ) {
    return "university"
  }

  // Corporate indicators
  if (
    combined.includes("corporate") ||
    combined.includes("employee") ||
    combined.includes("commuter") ||
    combined.includes("office") ||
    combined.includes("headquarters")
  ) {
    return "corporate"
  }

  // Operator indicators (running contracts for others)
  if (
    combined.includes("transportation company") ||
    combined.includes("transit") ||
    combined.includes("operator") ||
    combined.includes("contract")
  ) {
    return "operator"
  }

  return "unknown"
}

/**
 * Get service-type specific recommendations
 */
export function getServiceTypeRecommendations(
  serviceType: ServiceType,
  riskSignals: string[]
): string[] {
  const recommendations: string[] = []
  const signalsLower = riskSignals.map((s) => s.toLowerCase()).join(" ")

  if (serviceType === "shuttle") {
    if (signalsLower.includes("route") || signalsLower.includes("schedule")) {
      recommendations.push(
        "Review route optimization - complex schedules may be causing operational issues"
      )
    }
    if (signalsLower.includes("rider") || signalsLower.includes("passenger")) {
      recommendations.push(
        "Check rider satisfaction - shuttle programs live or die on rider experience"
      )
    }
    if (signalsLower.includes("contract") || signalsLower.includes("renewal")) {
      recommendations.push("Prepare program performance report for contract renewal discussion")
    }
    recommendations.push(
      "Shuttle programs have high retention once established - focus on program success"
    )
  }

  if (serviceType === "black_car") {
    if (signalsLower.includes("corporate") || signalsLower.includes("account")) {
      recommendations.push("Review corporate account health - these drive recurring revenue")
    }
    if (signalsLower.includes("dispatch") || signalsLower.includes("manual")) {
      recommendations.push("Discuss automation features to reduce dispatch burden")
    }
    if (signalsLower.includes("professional") || signalsLower.includes("customer")) {
      recommendations.push("Ensure they're using customer portal and automated communications")
    }
  }

  return recommendations.slice(0, 3)
}

/**
 * Calculate service type fit score
 * Returns a score indicating how well their current plan fits their service type
 */
export function calculateServiceTypeFit(
  serviceType: ServiceType,
  currentPlanPrice: number,
  features: string[]
): {
  fitScore: number // 0-100
  gaps: string[]
  recommendations: string[]
} {
  const profile = SERVICE_TYPE_PROFILES[serviceType]
  const gaps: string[] = []
  const recommendations: string[] = []

  // Check minimum price
  if (currentPlanPrice < profile.minPrice) {
    gaps.push(
      `${profile.type === "shuttle" ? "Shuttle Platform" : "Service"} requires minimum $${profile.minPrice}/mo plan`
    )
    recommendations.push(`Upgrade discussion needed - current plan below ${serviceType} minimum`)
  }

  // Check critical features
  if (serviceType === "shuttle") {
    const shuttleFeatures = ["route_management", "seat_booking", "rider_app", "real_time_tracking"]
    const missing = shuttleFeatures.filter((f) => !features.includes(f))
    if (missing.length > 0) {
      gaps.push(`Missing shuttle features: ${missing.join(", ")}`)
      recommendations.push("Review shuttle platform feature adoption")
    }
  }

  if (serviceType === "black_car") {
    const blackCarFeatures = ["dispatch", "driver_app", "customer_portal", "payments"]
    const missing = blackCarFeatures.filter((f) => !features.includes(f))
    if (missing.length > 0) {
      gaps.push(`Missing black car features: ${missing.join(", ")}`)
      recommendations.push("Review core feature adoption")
    }
  }

  // Calculate fit score
  const fitScore = Math.max(0, 100 - gaps.length * 25)

  return { fitScore, gaps, recommendations }
}
