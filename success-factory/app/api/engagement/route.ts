import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth/api-middleware"

interface FeatureUsage {
  feature: string
  category: string
  usageCount: number
  lastUsed: string | null
  adoptionRate: number // percentage of active users using this
  trend: "increasing" | "stable" | "decreasing"
}

interface EngagementMetrics {
  companyId: string
  companyName: string
  segment: string | null
  overallEngagementScore: number // 0-100
  loginFrequency: {
    avgDaysPerWeek: number
    lastLogin: string | null
    trend: "increasing" | "stable" | "decreasing"
  }
  sessionMetrics: {
    avgSessionDuration: number // minutes
    avgActionsPerSession: number
    totalSessions: number
  }
  featureAdoption: {
    totalFeaturesUsed: number
    totalFeaturesAvailable: number
    adoptionRate: number
    topFeatures: FeatureUsage[]
    unusedFeatures: string[]
  }
  engagementTrend: "improving" | "stable" | "declining"
  riskIndicators: string[]
  recommendations: string[]
}

// Define available features by tier
const FEATURES_BY_TIER: Record<string, string[]> = {
  free: ["Basic Booking", "Trip History", "Profile Management"],
  smb: [
    "Basic Booking",
    "Trip History",
    "Profile Management",
    "Team Management",
    "Basic Reporting",
    "Email Notifications",
  ],
  mid_market: [
    "Basic Booking",
    "Trip History",
    "Profile Management",
    "Team Management",
    "Basic Reporting",
    "Email Notifications",
    "Advanced Reporting",
    "API Access",
    "Custom Integrations",
    "Priority Support",
    "Bulk Operations",
  ],
  enterprise: [
    "Basic Booking",
    "Trip History",
    "Profile Management",
    "Team Management",
    "Basic Reporting",
    "Email Notifications",
    "Advanced Reporting",
    "API Access",
    "Custom Integrations",
    "Priority Support",
    "Bulk Operations",
    "SSO",
    "White Label",
    "Dedicated Account Manager",
    "Custom SLA",
    "Advanced Analytics",
  ],
}

/**
 * Calculate engagement metrics for a company
 */
function calculateEngagement(company: {
  hubspotId: string
  name: string
  customerSegment: string | null
  planCode: string | null
  totalTrips: number | null
  daysSinceLastLogin: number | null
  hubspotCreatedAt: Date | null
  createdAt: Date
}): EngagementMetrics {
  const segment = company.customerSegment || "smb"
  const availableFeatures = FEATURES_BY_TIER[segment] || FEATURES_BY_TIER.smb

  // Simulate feature usage based on activity level
  const totalTrips = company.totalTrips || 0
  const daysSinceLogin = company.daysSinceLastLogin ?? 30
  const tenure = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(company.hubspotCreatedAt || company.createdAt).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    )
  )

  // Calculate login frequency
  const avgDaysPerWeek =
    daysSinceLogin <= 7 ? 3 : daysSinceLogin <= 14 ? 1.5 : daysSinceLogin <= 30 ? 0.5 : 0.1

  // Simulate session metrics based on trip activity
  const avgSessionDuration = Math.min(45, 5 + (totalTrips / tenure) * 2)
  const avgActionsPerSession = Math.min(20, 3 + (totalTrips / tenure) * 0.5)
  const totalSessions = Math.floor(tenure * avgDaysPerWeek * 4)

  // Calculate feature adoption based on activity
  const activityLevel = totalTrips > 100 ? "high" : totalTrips > 20 ? "medium" : "low"

  const baseAdoptionRate = activityLevel === "high" ? 0.8 : activityLevel === "medium" ? 0.5 : 0.3

  // Generate feature usage
  const featureUsage: FeatureUsage[] = []
  const usedFeatures: string[] = []
  const unusedFeatures: string[] = []

  for (let i = 0; i < availableFeatures.length; i++) {
    const feature = availableFeatures[i]
    // Core features have higher adoption, optional features lower
    const isCore = i < 3
    const adoptionChance = isCore ? 0.9 : baseAdoptionRate * (1 - i * 0.05)
    const isUsed = Math.random() < adoptionChance

    if (isUsed) {
      usedFeatures.push(feature)
      featureUsage.push({
        feature,
        category: isCore ? "Core" : "Advanced",
        usageCount: Math.floor(Math.random() * 50) + 10,
        lastUsed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        adoptionRate: Math.round((0.5 + Math.random() * 0.5) * 100),
        trend: Math.random() > 0.5 ? "increasing" : Math.random() > 0.3 ? "stable" : "decreasing",
      })
    } else {
      unusedFeatures.push(feature)
    }
  }

  // Sort by usage count
  featureUsage.sort((a, b) => b.usageCount - a.usageCount)

  // Calculate overall engagement score
  const loginScore = Math.min(30, avgDaysPerWeek * 10)
  const adoptionScore = (usedFeatures.length / availableFeatures.length) * 40
  const activityScore = Math.min(30, (totalTrips / tenure) * 3)
  const overallEngagementScore = Math.round(loginScore + adoptionScore + activityScore)

  // Determine trend
  const engagementTrend: "improving" | "stable" | "declining" =
    daysSinceLogin <= 7 && totalTrips > tenure * 5
      ? "improving"
      : daysSinceLogin > 30 || totalTrips < tenure * 2
        ? "declining"
        : "stable"

  // Risk indicators
  const riskIndicators: string[] = []
  if (daysSinceLogin > 30) riskIndicators.push("Inactive for over 30 days")
  if (usedFeatures.length < availableFeatures.length * 0.3) {
    riskIndicators.push("Low feature adoption")
  }
  if (totalTrips === 0) riskIndicators.push("No trips recorded")
  if (avgSessionDuration < 5) riskIndicators.push("Very short sessions")

  // Recommendations
  const recommendations: string[] = []
  if (unusedFeatures.length > 0) {
    recommendations.push(`Introduce ${unusedFeatures[0]} feature`)
  }
  if (daysSinceLogin > 14) {
    recommendations.push("Send re-engagement campaign")
  }
  if (usedFeatures.length < 5) {
    recommendations.push("Schedule feature training session")
  }
  if (engagementTrend === "declining") {
    recommendations.push("Review account health with CSM")
  }

  return {
    companyId: company.hubspotId,
    companyName: company.name,
    segment,
    overallEngagementScore,
    loginFrequency: {
      avgDaysPerWeek: Math.round(avgDaysPerWeek * 10) / 10,
      lastLogin:
        daysSinceLogin <= 0
          ? new Date().toISOString().split("T")[0]
          : new Date(Date.now() - daysSinceLogin * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      trend: daysSinceLogin <= 7 ? "increasing" : daysSinceLogin <= 21 ? "stable" : "decreasing",
    },
    sessionMetrics: {
      avgSessionDuration: Math.round(avgSessionDuration),
      avgActionsPerSession: Math.round(avgActionsPerSession),
      totalSessions,
    },
    featureAdoption: {
      totalFeaturesUsed: usedFeatures.length,
      totalFeaturesAvailable: availableFeatures.length,
      adoptionRate: Math.round((usedFeatures.length / availableFeatures.length) * 100),
      topFeatures: featureUsage.slice(0, 5),
      unusedFeatures: unusedFeatures.slice(0, 5),
    },
    engagementTrend,
    riskIndicators,
    recommendations: recommendations.slice(0, 3),
  }
}

/**
 * GET /api/engagement?companyId=xxx
 * Get engagement metrics for a company or all companies
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get("companyId")
  const sortBy = searchParams.get("sortBy") || "score" // score, risk, adoption

  try {
    const companies = await prisma.hubSpotCompany.findMany({
      where: companyId ? { hubspotId: companyId } : { mrr: { gt: 0 } },
      orderBy: { mrr: "desc" },
    })

    const metrics = companies.map(calculateEngagement)

    // Sort
    if (sortBy === "risk") {
      metrics.sort((a, b) => b.riskIndicators.length - a.riskIndicators.length)
    } else if (sortBy === "adoption") {
      metrics.sort((a, b) => a.featureAdoption.adoptionRate - b.featureAdoption.adoptionRate)
    } else {
      metrics.sort((a, b) => b.overallEngagementScore - a.overallEngagementScore)
    }

    // Calculate summary
    const avgScore = Math.round(
      metrics.reduce((sum, m) => sum + m.overallEngagementScore, 0) / metrics.length
    )
    const avgAdoption = Math.round(
      metrics.reduce((sum, m) => sum + m.featureAdoption.adoptionRate, 0) / metrics.length
    )
    const atRiskCount = metrics.filter((m) => m.riskIndicators.length >= 2).length
    const decliningCount = metrics.filter((m) => m.engagementTrend === "declining").length

    return NextResponse.json({
      metrics: companyId ? metrics[0] : metrics,
      summary: {
        totalAccounts: metrics.length,
        avgEngagementScore: avgScore,
        avgFeatureAdoption: avgAdoption,
        atRiskCount,
        decliningCount,
        byTrend: {
          improving: metrics.filter((m) => m.engagementTrend === "improving").length,
          stable: metrics.filter((m) => m.engagementTrend === "stable").length,
          declining: decliningCount,
        },
      },
    })
  } catch (error) {
    console.error("Failed to calculate engagement:", error)
    return NextResponse.json({ error: "Failed to calculate engagement" }, { status: 500 })
  }
}
