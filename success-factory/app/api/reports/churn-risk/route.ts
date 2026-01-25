import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  classifySegment,
  getSegmentProfile,
  getSegmentRecommendations,
  getSegmentDisplayName,
  CustomerSegment,
} from "@/lib/segments"

/**
 * Churn Risk Report API
 *
 * GET /api/reports/churn-risk
 *
 * Generates a comprehensive churn risk report combining all signals:
 * - Health scores (payment, engagement, support, growth)
 * - Risk signals and patterns
 * - Segment-aware recommendations (SMB, Mid-Market, Enterprise)
 * - Actionable recommendations
 *
 * Query params:
 * - limit: number of accounts to include (default 20)
 * - minRisk: minimum risk level (high, medium, low - default high)
 * - includeDetails: boolean to include full details (default false)
 * - segment: filter by segment (smb, mid_market, enterprise, all - default all)
 */

interface ChurnRiskAccount {
  // Identity
  id: string
  hubspotId: string
  name: string
  domain: string | null
  operatorId: string | null

  // Segment
  segment: CustomerSegment
  segmentDisplay: string

  // Health
  healthScore: string | null
  numericScore: number | null
  paymentScore: number | null
  engagementScore: number | null
  supportScore: number | null
  growthScore: number | null

  // Risk indicators
  riskSignals: string[]
  positiveSignals: string[]
  riskLevel: "critical" | "high" | "medium" | "low"
  riskCategory: string

  // Key metrics
  mrr: number | null
  paymentHealth: string | null
  daysSinceLastLogin: number | null
  totalTrips: number | null
  failedPayments: number | null

  // Recommendations (segment-aware)
  recommendations: string[]
  priority: number

  // Contact
  ownerName: string | null
  ownerEmail: string | null
  primaryContact: string | null
}

interface ChurnRiskReport {
  generatedAt: string
  summary: {
    totalAtRisk: number
    criticalCount: number
    highCount: number
    mediumCount: number
    totalMrrAtRisk: number
    avgRiskScore: number
  }
  byCategory: Record<string, number>
  bySegment: Record<string, number>
  accounts: ChurnRiskAccount[]
  insights: string[]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get("limit") || "20")
  const minRisk = searchParams.get("minRisk") || "high"
  const includeDetails = searchParams.get("includeDetails") === "true"
  const segmentFilter = searchParams.get("segment") || "all"

  try {
    // Query at-risk companies (red or yellow health, or low numeric score)
    const companies = await prisma.hubSpotCompany.findMany({
      where: {
        OR: [
          { healthScore: "red" },
          { healthScore: "yellow" },
          { numericHealthScore: { lt: 60 } },
          { paymentHealth: "critical" },
          { paymentHealth: "at_risk" },
          { riskSignals: { isEmpty: false } },
        ],
      },
      orderBy: [
        { numericHealthScore: "asc" }, // Lowest scores first
        { mrr: "desc" }, // Higher value accounts first within same score
      ],
      take: limit * 2, // Get extra to filter
    })

    // Process and categorize each account with segment intelligence
    const processedAccounts: ChurnRiskAccount[] = companies.map((company) => {
      // Classify segment based on MRR (primary indicator per ICP)
      const segment = classifySegment(company.mrr)
      const segmentDisplay = getSegmentDisplayName(segment)

      const riskLevel = calculateRiskLevel(company)
      const riskCategory = categorizeRisk(company)

      // Get segment-aware recommendations
      const genericRecs = generateRecommendations(company, riskCategory)
      const segmentRecs = getSegmentRecommendations(
        segment,
        company.riskSignals,
        company.numericHealthScore || 50
      )
      // Combine and dedupe recommendations (segment-specific first)
      const recommendations = [...new Set([...segmentRecs, ...genericRecs])].slice(0, 5)

      const priority = calculatePriority(company, riskLevel)

      return {
        id: company.id,
        hubspotId: company.hubspotId,
        name: company.name,
        domain: company.domain,
        operatorId: company.operatorId,

        segment,
        segmentDisplay,

        healthScore: company.healthScore,
        numericScore: company.numericHealthScore,
        paymentScore: company.paymentScore,
        engagementScore: company.engagementScore,
        supportScore: company.supportScore,
        growthScore: company.growthScore,

        riskSignals: company.riskSignals,
        positiveSignals: company.positiveSignals,
        riskLevel,
        riskCategory,

        mrr: company.mrr,
        paymentHealth: company.paymentHealth,
        daysSinceLastLogin: company.daysSinceLastLogin,
        totalTrips: company.totalTrips,
        failedPayments: company.failedPaymentCount,

        recommendations,
        priority,

        ownerName: company.ownerName,
        ownerEmail: company.ownerEmail,
        primaryContact: company.primaryContactEmail,
      }
    })

    // Filter by minimum risk level and segment
    const riskLevels: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    const minRiskNum = riskLevels[minRisk] ?? 1
    const filteredAccounts = processedAccounts
      .filter((a) => riskLevels[a.riskLevel] <= minRiskNum)
      .filter((a) => segmentFilter === "all" || a.segment === segmentFilter)
      .sort((a, b) => a.priority - b.priority)
      .slice(0, limit)

    // Calculate summary stats
    const criticalAccounts = filteredAccounts.filter((a) => a.riskLevel === "critical")
    const highAccounts = filteredAccounts.filter((a) => a.riskLevel === "high")
    const mediumAccounts = filteredAccounts.filter((a) => a.riskLevel === "medium")

    const totalMrrAtRisk = filteredAccounts.reduce((sum, a) => sum + (a.mrr || 0), 0)
    const avgRiskScore =
      filteredAccounts.length > 0
        ? filteredAccounts.reduce((sum, a) => sum + (a.numericScore || 50), 0) /
          filteredAccounts.length
        : 0

    // Count by category
    const byCategory: Record<string, number> = {}
    for (const account of filteredAccounts) {
      byCategory[account.riskCategory] = (byCategory[account.riskCategory] || 0) + 1
    }

    // Count by segment
    const bySegment: Record<string, number> = {}
    for (const account of filteredAccounts) {
      bySegment[account.segmentDisplay] = (bySegment[account.segmentDisplay] || 0) + 1
    }

    // Generate portfolio-level insights (segment-aware)
    const insights = generatePortfolioInsights(filteredAccounts, byCategory, bySegment)

    const report: ChurnRiskReport = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalAtRisk: filteredAccounts.length,
        criticalCount: criticalAccounts.length,
        highCount: highAccounts.length,
        mediumCount: mediumAccounts.length,
        totalMrrAtRisk,
        avgRiskScore: Math.round(avgRiskScore),
      },
      byCategory,
      bySegment,
      accounts: includeDetails
        ? filteredAccounts
        : filteredAccounts.map((a) => ({
            ...a,
            // Slim down for non-detailed view
            recommendations: a.recommendations.slice(0, 1),
          })),
      insights,
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("Churn risk report error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate churn risk report",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    )
  }
}

function calculateRiskLevel(company: {
  healthScore: string | null
  numericHealthScore: number | null
  paymentHealth: string | null
  riskSignals: string[]
}): "critical" | "high" | "medium" | "low" {
  const score = company.numericHealthScore ?? 50
  const riskCount = company.riskSignals.length

  // Critical: red health OR score < 30 OR payment critical OR 5+ risk signals
  if (
    company.healthScore === "red" ||
    score < 30 ||
    company.paymentHealth === "critical" ||
    riskCount >= 5
  ) {
    return "critical"
  }

  // High: yellow health OR score 30-50 OR payment at_risk OR 3-4 risk signals
  if (
    company.healthScore === "yellow" ||
    (score >= 30 && score < 50) ||
    company.paymentHealth === "at_risk" ||
    (riskCount >= 3 && riskCount < 5)
  ) {
    return "high"
  }

  // Medium: score 50-70 OR 1-2 risk signals
  if (score < 70 || riskCount >= 1) {
    return "medium"
  }

  return "low"
}

function categorizeRisk(company: {
  riskSignals: string[]
  paymentHealth: string | null
  daysSinceLastLogin: number | null
  paymentScore: number | null
  engagementScore: number | null
  supportScore: number | null
}): string {
  const signals = company.riskSignals.join(" ").toLowerCase()

  // Payment issues
  if (
    company.paymentHealth === "critical" ||
    company.paymentHealth === "at_risk" ||
    (company.paymentScore !== null && company.paymentScore < 50) ||
    signals.includes("payment") ||
    signals.includes("failed") ||
    signals.includes("dispute")
  ) {
    return "Payment Issues"
  }

  // Engagement decline
  if (
    (company.daysSinceLastLogin !== null && company.daysSinceLastLogin > 30) ||
    (company.engagementScore !== null && company.engagementScore < 40) ||
    signals.includes("usage") ||
    signals.includes("login") ||
    signals.includes("inactive") ||
    signals.includes("decline")
  ) {
    return "Engagement Decline"
  }

  // Support issues
  if (
    (company.supportScore !== null && company.supportScore < 50) ||
    signals.includes("ticket") ||
    signals.includes("support") ||
    signals.includes("complaint")
  ) {
    return "Support Issues"
  }

  // Contract risk
  if (signals.includes("contract") || signals.includes("renewal") || signals.includes("cancel")) {
    return "Contract Risk"
  }

  // Multiple signals
  if (company.riskSignals.length >= 3) {
    return "Multiple Risk Factors"
  }

  return "General Health Decline"
}

function generateRecommendations(
  company: {
    riskSignals: string[]
    paymentHealth: string | null
    daysSinceLastLogin: number | null
    paymentScore: number | null
    engagementScore: number | null
    supportScore: number | null
    mrr: number | null
  },
  category: string
): string[] {
  const recommendations: string[] = []
  const isHighValue = (company.mrr || 0) >= 200

  switch (category) {
    case "Payment Issues":
      recommendations.push("Review billing status and reach out to discuss payment situation")
      if (isHighValue) {
        recommendations.push("Consider offering payment plan or temporary relief")
      }
      recommendations.push("Check for any billing disputes or issues")
      break

    case "Engagement Decline":
      recommendations.push("Schedule check-in call to understand usage changes")
      if (company.daysSinceLastLogin && company.daysSinceLastLogin > 60) {
        recommendations.push("Send re-engagement email highlighting new features")
      }
      recommendations.push("Offer product training or onboarding refresher")
      break

    case "Support Issues":
      recommendations.push("Review open support tickets and escalate if needed")
      recommendations.push("Schedule call to address concerns directly")
      if (isHighValue) {
        recommendations.push("Consider assigning dedicated support contact")
      }
      break

    case "Contract Risk":
      recommendations.push("Prepare renewal discussion and value summary")
      recommendations.push("Identify expansion opportunities before renewal")
      recommendations.push("Get ahead of any competitor evaluation")
      break

    case "Multiple Risk Factors":
      recommendations.push("Conduct comprehensive account review")
      recommendations.push("Schedule executive sponsor call")
      recommendations.push("Create custom recovery plan")
      break

    default:
      recommendations.push("Schedule regular check-in to monitor health")
      recommendations.push("Review account history for patterns")
  }

  // Add risk-signal specific recommendations
  for (const signal of company.riskSignals.slice(0, 2)) {
    const lowerSignal = signal.toLowerCase()
    if (lowerSignal.includes("no login") || lowerSignal.includes("inactive")) {
      recommendations.push("Verify primary contact is still with the company")
    }
    if (lowerSignal.includes("stopped") || lowerSignal.includes("was active")) {
      recommendations.push("Understand what changed in their business")
    }
  }

  return [...new Set(recommendations)].slice(0, 4) // Dedupe and limit
}

function calculatePriority(
  company: { mrr: number | null; numericHealthScore: number | null },
  riskLevel: "critical" | "high" | "medium" | "low"
): number {
  // Lower number = higher priority
  const riskMultiplier: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 }
  const mrr = company.mrr || 0
  const score = company.numericHealthScore || 50

  // Priority formula: risk level * (100 - MRR weight) * (100 - inverse health weight)
  // Higher MRR = lower priority number (more urgent)
  // Lower health = lower priority number (more urgent)
  const mrrWeight = Math.min(100, mrr / 10) // Cap at 100 for $1000+ MRR
  const healthWeight = score

  return (riskMultiplier[riskLevel] * (100 - mrrWeight) * (100 - healthWeight)) / 1000
}

function generatePortfolioInsights(
  accounts: ChurnRiskAccount[],
  byCategory: Record<string, number>,
  bySegment: Record<string, number> = {}
): string[] {
  const insights: string[] = []

  const total = accounts.length
  const critical = accounts.filter((a) => a.riskLevel === "critical").length
  const totalMrr = accounts.reduce((sum, a) => sum + (a.mrr || 0), 0)

  // Critical accounts insight
  if (critical > 0) {
    insights.push(
      `${critical} account${critical > 1 ? "s" : ""} require${critical === 1 ? "s" : ""} immediate attention`
    )
  }

  // Segment-specific insights
  const enterpriseAtRisk = accounts.filter((a) => a.segment === "enterprise").length
  if (enterpriseAtRisk > 0) {
    const enterpriseMrr = accounts
      .filter((a) => a.segment === "enterprise")
      .reduce((sum, a) => sum + (a.mrr || 0), 0)
    insights.push(
      `${enterpriseAtRisk} Enterprise account${enterpriseAtRisk > 1 ? "s" : ""} at risk ($${enterpriseMrr.toLocaleString()} MRR) - prioritize high-touch outreach`
    )
  }

  const freeWithZeroUsage = accounts.filter(
    (a) => a.segment === "free" && (a.totalTrips === 0 || a.totalTrips === null)
  ).length
  if (freeWithZeroUsage > 3) {
    insights.push(
      `${freeWithZeroUsage} Free accounts with zero usage - consider activation campaign (44.7% of SMB starts free)`
    )
  }

  // Category insights
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
  if (topCategory) {
    insights.push(
      `"${topCategory[0]}" is the primary risk driver affecting ${topCategory[1]} account${topCategory[1] > 1 ? "s" : ""}`
    )
  }

  // MRR at risk
  if (totalMrr > 0) {
    insights.push(`$${totalMrr.toLocaleString()} monthly revenue at risk across ${total} accounts`)
  }

  // Payment pattern
  const paymentIssues = accounts.filter(
    (a) => a.paymentHealth === "critical" || a.paymentHealth === "at_risk"
  ).length
  if (paymentIssues > 0) {
    insights.push(
      `${paymentIssues} account${paymentIssues > 1 ? "s have" : " has"} payment issues requiring follow-up`
    )
  }

  // Engagement pattern
  const lowEngagement = accounts.filter(
    (a) =>
      (a.engagementScore !== null && a.engagementScore < 40) ||
      (a.daysSinceLastLogin !== null && a.daysSinceLastLogin > 60)
  ).length
  if (lowEngagement > 0) {
    insights.push(
      `${lowEngagement} account${lowEngagement > 1 ? "s show" : " shows"} significant engagement decline`
    )
  }

  // Owner workload
  const ownerCounts: Record<string, number> = {}
  for (const account of accounts) {
    if (account.ownerName) {
      ownerCounts[account.ownerName] = (ownerCounts[account.ownerName] || 0) + 1
    }
  }
  const overloadedOwners = Object.entries(ownerCounts)
    .filter(([, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
  if (overloadedOwners.length > 0) {
    insights.push(
      `${overloadedOwners[0][0]} has ${overloadedOwners[0][1]} at-risk accounts - consider distributing workload`
    )
  }

  return insights.slice(0, 6)
}
