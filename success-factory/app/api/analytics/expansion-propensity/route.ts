/**
 * Expansion Propensity Scoring API
 *
 * GET /api/analytics/expansion-propensity - Get ranked list of accounts by expansion likelihood
 * POST /api/analytics/expansion-propensity - Recalculate scores for all or specific accounts
 *
 * Scoring factors:
 * - Usage growth velocity (trips, vehicles, drivers)
 * - Engagement patterns (login frequency, feature adoption)
 * - Customer health (payment, support, overall score)
 * - Tenure and loyalty signals
 * - Plan-segment fit (undermonetized = high propensity)
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPlanMisalignment, identifyUpsellOpportunities } from "@/lib/segments/pricing"

interface CompanyData {
  id: string
  hubspotId: string
  name: string
  mrr: number | null
  plan: string | null
  planCode: string | null
  customerSegment: string | null
  healthScore: string | null
  numericHealthScore: number | null
  totalTrips: number | null
  tripsLast30Days: number | null
  vehiclesTotal: number | null
  driversCount: number | null
  membersCount: number | null
  daysSinceLastLogin: number | null
  subscriptionLifetimeDays: number | null
  setupScore: number | null
  paymentHealth: string | null
  paymentScore: number | null
  engagementScore: number | null
  growthScore: number | null
  ownerName?: string | null
  ownerEmail?: string | null
}

interface PropensityInput {
  companyId: string
  hubspotId: string
  name: string
  mrr: number | null
  plan: string | null
  planCode: string | null
  segment: string | null
  healthScore: string | null
  numericHealthScore: number | null
  totalTrips: number | null
  tripsLast30Days: number | null
  vehiclesTotal: number | null
  driversCount: number | null
  membersCount: number | null
  daysSinceLastLogin: number | null
  subscriptionLifetimeDays: number | null
  setupScore: number | null
  paymentHealth: string | null
  paymentScore: number | null
  engagementScore: number | null
  growthScore: number | null
}

interface ScoredCompany {
  companyId: string
  hubspotId: string
  name: string
  mrr: number | null
  segment: string | null
  owner: string | null | undefined
  ownerEmail: string | null | undefined
  score: number
  level: "high" | "medium" | "low"
  usageScore: number
  engagementScore: number
  healthScore: number
  tenureScore: number
  fitScore: number
  positiveSignals: string[]
  negativeSignals: string[]
  recommendedProducts: string[]
  estimatedValue: number
  optimalTiming: string
  urgency: "urgent" | "normal" | "low"
}

function calculatePropensityScore(company: PropensityInput): {
  score: number
  level: "high" | "medium" | "low"
  usageScore: number
  engagementScore: number
  healthScore: number
  tenureScore: number
  fitScore: number
  positiveSignals: string[]
  negativeSignals: string[]
  recommendedProducts: string[]
  estimatedValue: number
  optimalTiming: string
  urgency: "urgent" | "normal" | "low"
} {
  const positiveSignals: string[] = []
  const negativeSignals: string[] = []
  const recommendedProducts: string[] = []

  // === 1. Usage Score (0-100) ===
  // Based on usage growth and velocity
  let usageScore = 50 // Base score

  // Trip velocity
  const tripVelocity = company.tripsLast30Days || 0
  if (tripVelocity > 100) {
    usageScore += 30
    positiveSignals.push(`High trip velocity: ${tripVelocity} trips/month`)
  } else if (tripVelocity > 50) {
    usageScore += 20
    positiveSignals.push(`Good trip velocity: ${tripVelocity} trips/month`)
  } else if (tripVelocity > 20) {
    usageScore += 10
  } else if (tripVelocity < 5) {
    usageScore -= 20
    negativeSignals.push("Low usage: <5 trips/month")
  }

  // Fleet size growth potential
  const vehicles = company.vehiclesTotal || 0
  if (vehicles > 20) {
    usageScore += 10
    positiveSignals.push(`Large fleet: ${vehicles} vehicles`)
  } else if (vehicles > 10) {
    usageScore += 5
  }

  // Team size indicates complexity/investment
  const members = company.membersCount || 0
  if (members > 5) {
    usageScore += 10
    positiveSignals.push(`Growing team: ${members} users`)
  }

  usageScore = Math.max(0, Math.min(100, usageScore))

  // === 2. Engagement Score (0-100) ===
  let engagementScore = company.engagementScore || 50

  // Recent activity boost
  const daysSinceLogin = company.daysSinceLastLogin || 999
  if (daysSinceLogin <= 1) {
    engagementScore += 15
    positiveSignals.push("Active: logged in today")
  } else if (daysSinceLogin <= 7) {
    engagementScore += 10
  } else if (daysSinceLogin > 30) {
    engagementScore -= 20
    negativeSignals.push(`Inactive: ${daysSinceLogin} days since login`)
  }

  // Setup completion indicates commitment
  const setupScore = company.setupScore || 0
  if (setupScore >= 80) {
    engagementScore += 10
    positiveSignals.push("Fully onboarded")
  } else if (setupScore < 50) {
    engagementScore -= 10
    negativeSignals.push("Incomplete onboarding")
  }

  engagementScore = Math.max(0, Math.min(100, engagementScore))

  // === 3. Health Score (0-100) ===
  let healthScore = company.numericHealthScore || 50

  // Payment health is critical
  if (company.paymentHealth === "critical") {
    healthScore -= 30
    negativeSignals.push("Payment issues - not expansion ready")
  } else if (company.paymentHealth === "at_risk") {
    healthScore -= 15
    negativeSignals.push("Payment health concerns")
  } else if (
    company.paymentHealth === "good" &&
    company.paymentScore &&
    company.paymentScore >= 90
  ) {
    healthScore += 10
    positiveSignals.push("Excellent payment history")
  }

  // Overall health color
  if (company.healthScore === "green") {
    healthScore += 10
    positiveSignals.push("Green health score")
  } else if (company.healthScore === "red") {
    healthScore -= 20
    negativeSignals.push("Red health score - focus on retention first")
  }

  healthScore = Math.max(0, Math.min(100, healthScore))

  // === 4. Tenure Score (0-100) ===
  let tenureScore = 50
  const tenureDays = company.subscriptionLifetimeDays || 0
  const tenureMonths = tenureDays / 30

  if (tenureMonths >= 12) {
    tenureScore = 90
    positiveSignals.push(`Loyal customer: ${Math.floor(tenureMonths)} months`)
  } else if (tenureMonths >= 6) {
    tenureScore = 75
    positiveSignals.push("Established relationship")
  } else if (tenureMonths >= 3) {
    tenureScore = 60
  } else if (tenureMonths < 2) {
    tenureScore = 30
    negativeSignals.push("New customer - let them stabilize first")
  }

  // === 5. Fit Score (0-100) - Plan-segment alignment ===
  let fitScore = 50
  let estimatedValue = 0

  const misalignment = checkPlanMisalignment(
    company.mrr,
    company.planCode || company.plan,
    company.vehiclesTotal,
    company.driversCount,
    company.tripsLast30Days
  )

  if (misalignment.isMisaligned && misalignment.revenueImpact === "undermonetized") {
    fitScore = 90
    positiveSignals.push(`Undermonetized: ${misalignment.reason}`)

    // Calculate estimated value from tier upgrade
    const opportunities = identifyUpsellOpportunities(
      company.planCode || company.plan,
      company.mrr,
      company.vehiclesTotal,
      company.driversCount,
      company.tripsLast30Days
    )

    for (const opp of opportunities) {
      estimatedValue += opp.potentialValue - opp.currentValue
      if (opp.type === "tier_upgrade") {
        recommendedProducts.push(opp.name)
      } else {
        recommendedProducts.push(opp.name)
      }
    }
  } else if (misalignment.revenueImpact === "at_risk") {
    fitScore = 30
    negativeSignals.push("May be oversubscribed - focus on value delivery")
  } else {
    fitScore = 60 // Aligned, still room for add-ons

    // Check for add-on opportunities even if tier-aligned
    const opportunities = identifyUpsellOpportunities(
      company.planCode || company.plan,
      company.mrr,
      company.vehiclesTotal,
      company.driversCount,
      company.tripsLast30Days
    )

    for (const opp of opportunities) {
      if (opp.type === "add_on") {
        estimatedValue += opp.potentialValue
        recommendedProducts.push(opp.name)
      }
    }
  }

  // === Calculate Final Score ===
  // Weighted average with emphasis on fit and usage
  const weights = {
    usage: 0.25,
    engagement: 0.2,
    health: 0.2,
    tenure: 0.1,
    fit: 0.25,
  }

  const finalScore = Math.round(
    usageScore * weights.usage +
      engagementScore * weights.engagement +
      healthScore * weights.health +
      tenureScore * weights.tenure +
      fitScore * weights.fit
  )

  // Determine level
  let level: "high" | "medium" | "low"
  if (finalScore >= 70) {
    level = "high"
  } else if (finalScore >= 45) {
    level = "medium"
  } else {
    level = "low"
  }

  // Determine urgency
  let urgency: "urgent" | "normal" | "low" = "normal"
  if (misalignment.urgency === "high" && level === "high") {
    urgency = "urgent"
  } else if (level === "low" || company.healthScore === "red") {
    urgency = "low"
  }

  // Optimal timing recommendation
  let optimalTiming = "Schedule QBR to discuss growth"
  if (tenureMonths >= 11 && tenureMonths <= 13) {
    optimalTiming = "Annual review - perfect timing for expansion discussion"
    positiveSignals.push("Approaching annual milestone")
  } else if (tripVelocity > 50 && daysSinceLogin <= 7) {
    optimalTiming = "High activity period - strike while hot"
  } else if (company.healthScore === "red") {
    optimalTiming = "Resolve health issues before expansion conversation"
  }

  return {
    score: finalScore,
    level,
    usageScore,
    engagementScore,
    healthScore,
    tenureScore,
    fitScore,
    positiveSignals,
    negativeSignals,
    recommendedProducts: recommendedProducts.slice(0, 3),
    estimatedValue,
    optimalTiming,
    urgency,
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const segment = searchParams.get("segment")
    const owner = searchParams.get("owner")
    const level = searchParams.get("level") // high, medium, low
    const limit = parseInt(searchParams.get("limit") || "50")
    const minScore = parseInt(searchParams.get("minScore") || "0")

    // Build filters
    const filters: Record<string, unknown> = {
      subscriptionStatus: "active",
      mrr: { gt: 0 },
    }
    if (segment) filters.customerSegment = segment
    if (owner) filters.ownerId = owner

    // Get companies with required fields
    const companies = await prisma.hubSpotCompany.findMany({
      where: filters,
      select: {
        id: true,
        hubspotId: true,
        name: true,
        mrr: true,
        plan: true,
        planCode: true,
        customerSegment: true,
        healthScore: true,
        numericHealthScore: true,
        totalTrips: true,
        tripsLast30Days: true,
        vehiclesTotal: true,
        driversCount: true,
        membersCount: true,
        daysSinceLastLogin: true,
        subscriptionLifetimeDays: true,
        setupScore: true,
        paymentHealth: true,
        paymentScore: true,
        engagementScore: true,
        growthScore: true,
        ownerName: true,
        ownerEmail: true,
      },
    })

    // Calculate propensity scores
    const scoredCompanies: ScoredCompany[] = (companies as CompanyData[]).map(
      (company: CompanyData) => {
        const input: PropensityInput = {
          companyId: company.id,
          hubspotId: company.hubspotId,
          name: company.name,
          mrr: company.mrr,
          plan: company.plan,
          planCode: company.planCode,
          segment: company.customerSegment,
          healthScore: company.healthScore,
          numericHealthScore: company.numericHealthScore,
          totalTrips: company.totalTrips,
          tripsLast30Days: company.tripsLast30Days,
          vehiclesTotal: company.vehiclesTotal,
          driversCount: company.driversCount,
          membersCount: company.membersCount,
          daysSinceLastLogin: company.daysSinceLastLogin,
          subscriptionLifetimeDays: company.subscriptionLifetimeDays,
          setupScore: company.setupScore,
          paymentHealth: company.paymentHealth,
          paymentScore: company.paymentScore,
          engagementScore: company.engagementScore,
          growthScore: company.growthScore,
        }
        const propensity = calculatePropensityScore(input)
        return {
          companyId: company.id,
          hubspotId: company.hubspotId,
          name: company.name,
          mrr: company.mrr,
          segment: company.customerSegment,
          owner: company.ownerName,
          ownerEmail: company.ownerEmail,
          ...propensity,
        }
      }
    )

    // Filter by level if specified
    let filtered = scoredCompanies
    if (level) {
      filtered = filtered.filter((c: ScoredCompany) => c.level === level)
    }
    if (minScore > 0) {
      filtered = filtered.filter((c: ScoredCompany) => c.score >= minScore)
    }

    // Sort by score descending
    filtered.sort((a: ScoredCompany, b: ScoredCompany) => b.score - a.score)

    // Apply limit
    const results = filtered.slice(0, limit)

    // Summary stats
    const summary = {
      total: scoredCompanies.length,
      high: scoredCompanies.filter((c: ScoredCompany) => c.level === "high").length,
      medium: scoredCompanies.filter((c: ScoredCompany) => c.level === "medium").length,
      low: scoredCompanies.filter((c: ScoredCompany) => c.level === "low").length,
      totalEstimatedValue: scoredCompanies.reduce(
        (sum: number, c: ScoredCompany) => sum + c.estimatedValue,
        0
      ),
      avgScore: Math.round(
        scoredCompanies.reduce((sum: number, c: ScoredCompany) => sum + c.score, 0) /
          scoredCompanies.length
      ),
    }

    return NextResponse.json({
      summary,
      results,
    })
  } catch (error) {
    console.error("Expansion propensity error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { companyIds } = body as { companyIds?: string[] }

    // Build filter
    const filters: Record<string, unknown> = {
      subscriptionStatus: "active",
      mrr: { gt: 0 },
    }
    if (companyIds && companyIds.length > 0) {
      filters.id = { in: companyIds }
    }

    // Get companies
    const companies = await prisma.hubSpotCompany.findMany({
      where: filters,
      select: {
        id: true,
        hubspotId: true,
        name: true,
        mrr: true,
        plan: true,
        planCode: true,
        customerSegment: true,
        healthScore: true,
        numericHealthScore: true,
        totalTrips: true,
        tripsLast30Days: true,
        vehiclesTotal: true,
        driversCount: true,
        membersCount: true,
        daysSinceLastLogin: true,
        subscriptionLifetimeDays: true,
        setupScore: true,
        paymentHealth: true,
        paymentScore: true,
        engagementScore: true,
        growthScore: true,
      },
    })

    let saved = 0
    let errors = 0

    // Calculate and save scores
    for (const company of companies as CompanyData[]) {
      try {
        const input: PropensityInput = {
          companyId: company.id,
          hubspotId: company.hubspotId,
          name: company.name,
          mrr: company.mrr,
          plan: company.plan,
          planCode: company.planCode,
          segment: company.customerSegment,
          healthScore: company.healthScore,
          numericHealthScore: company.numericHealthScore,
          totalTrips: company.totalTrips,
          tripsLast30Days: company.tripsLast30Days,
          vehiclesTotal: company.vehiclesTotal,
          driversCount: company.driversCount,
          membersCount: company.membersCount,
          daysSinceLastLogin: company.daysSinceLastLogin,
          subscriptionLifetimeDays: company.subscriptionLifetimeDays,
          setupScore: company.setupScore,
          paymentHealth: company.paymentHealth,
          paymentScore: company.paymentScore,
          engagementScore: company.engagementScore,
          growthScore: company.growthScore,
        }
        const propensity = calculatePropensityScore(input)

        // Upsert to ExpansionPropensityScore table
        await prisma.expansionPropensityScore.upsert({
          where: { companyId: company.hubspotId },
          create: {
            companyId: company.hubspotId,
            companyName: company.name,
            propensityScore: propensity.score,
            propensityLevel: propensity.level,
            usageScore: propensity.usageScore,
            engagementScore: propensity.engagementScore,
            healthScore: propensity.healthScore,
            tenureScore: propensity.tenureScore,
            fitScore: propensity.fitScore,
            positiveSignals: propensity.positiveSignals,
            negativeSignals: propensity.negativeSignals,
            recommendedAction: propensity.optimalTiming,
            recommendedProducts: propensity.recommendedProducts,
            estimatedValue: propensity.estimatedValue,
            optimalTiming: propensity.optimalTiming,
            urgency: propensity.urgency,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
          update: {
            companyName: company.name,
            propensityScore: propensity.score,
            propensityLevel: propensity.level,
            usageScore: propensity.usageScore,
            engagementScore: propensity.engagementScore,
            healthScore: propensity.healthScore,
            tenureScore: propensity.tenureScore,
            fitScore: propensity.fitScore,
            positiveSignals: propensity.positiveSignals,
            negativeSignals: propensity.negativeSignals,
            recommendedAction: propensity.optimalTiming,
            recommendedProducts: propensity.recommendedProducts,
            estimatedValue: propensity.estimatedValue,
            optimalTiming: propensity.optimalTiming,
            urgency: propensity.urgency,
            calculatedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
        saved++
      } catch (err) {
        console.error(`Error saving propensity for ${company.id}:`, err)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      processed: companies.length,
      saved,
      errors,
    })
  } catch (error) {
    console.error("Expansion propensity calculation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
