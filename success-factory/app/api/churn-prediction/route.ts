import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface RiskFactor {
  factor: string
  impact: "high" | "medium" | "low"
  score: number // -1 to 1, negative is risk, positive is protective
  description: string
}

interface ChurnPrediction {
  companyId: string
  companyName: string
  domain: string | null
  segment: string | null
  mrr: number | null
  churnProbability: number // 0-100
  confidence: "high" | "medium" | "low"
  riskFactors: RiskFactor[]
  protectiveFactors: RiskFactor[]
  trend: "improving" | "stable" | "declining"
  predictedChurnDate: string | null
  recommendedActions: string[]
}

// Feature weights for the prediction model
const WEIGHTS = {
  daysSinceLastLogin: 0.2,
  usageTrend: 0.18,
  healthScore: 0.15,
  supportTickets: 0.12,
  npsScore: 0.1,
  stakeholderEngagement: 0.08,
  contractTenure: 0.07,
  paymentHistory: 0.05,
  featureAdoption: 0.05,
}

/**
 * Calculate churn probability based on multiple factors
 */
function calculateChurnProbability(
  company: {
    hubspotId: string
    name: string
    domain: string | null
    customerSegment: string | null
    mrr: number | null
    totalTrips: number | null
    daysSinceLastLogin: number | null
    healthScore: string | null
    hubspotCreatedAt: Date | null
    createdAt: Date
  },
  npsScore: number | null,
  stakeholderCount: number,
  hasChampion: boolean
): ChurnPrediction {
  const riskFactors: RiskFactor[] = []
  const protectiveFactors: RiskFactor[] = []
  let totalRiskScore = 0

  // 1. Days since last login (20% weight)
  const daysSinceLogin = company.daysSinceLastLogin ?? 30
  if (daysSinceLogin > 60) {
    const score = Math.min(1, (daysSinceLogin - 60) / 60) * WEIGHTS.daysSinceLastLogin
    totalRiskScore += score
    riskFactors.push({
      factor: "Inactivity",
      impact: daysSinceLogin > 90 ? "high" : "medium",
      score: -score,
      description: `No login in ${daysSinceLogin} days`,
    })
  } else if (daysSinceLogin <= 7) {
    const score = 0.5 * WEIGHTS.daysSinceLastLogin
    totalRiskScore -= score
    protectiveFactors.push({
      factor: "Recent Activity",
      impact: "medium",
      score: score,
      description: "Active within last 7 days",
    })
  }

  // 2. Usage trend (18% weight)
  const totalTrips = company.totalTrips || 0
  const monthsAsCustomer = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(company.hubspotCreatedAt || company.createdAt).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    )
  )
  const tripsPerMonth = totalTrips / monthsAsCustomer

  if (totalTrips === 0) {
    totalRiskScore += WEIGHTS.usageTrend
    riskFactors.push({
      factor: "Zero Usage",
      impact: "high",
      score: -WEIGHTS.usageTrend,
      description: "No trips recorded",
    })
  } else if (tripsPerMonth < 2) {
    const score = 0.7 * WEIGHTS.usageTrend
    totalRiskScore += score
    riskFactors.push({
      factor: "Low Usage",
      impact: "medium",
      score: -score,
      description: `Only ${tripsPerMonth.toFixed(1)} trips/month`,
    })
  } else if (tripsPerMonth > 10) {
    const score = 0.8 * WEIGHTS.usageTrend
    totalRiskScore -= score
    protectiveFactors.push({
      factor: "High Usage",
      impact: "high",
      score: score,
      description: `${tripsPerMonth.toFixed(1)} trips/month average`,
    })
  }

  // 3. Health score (15% weight)
  if (company.healthScore === "red") {
    totalRiskScore += WEIGHTS.healthScore
    riskFactors.push({
      factor: "Poor Health Score",
      impact: "high",
      score: -WEIGHTS.healthScore,
      description: "Account marked as at-risk",
    })
  } else if (company.healthScore === "yellow") {
    const score = 0.5 * WEIGHTS.healthScore
    totalRiskScore += score
    riskFactors.push({
      factor: "Declining Health",
      impact: "medium",
      score: -score,
      description: "Account needs monitoring",
    })
  } else if (company.healthScore === "green") {
    const score = 0.7 * WEIGHTS.healthScore
    totalRiskScore -= score
    protectiveFactors.push({
      factor: "Healthy Account",
      impact: "medium",
      score: score,
      description: "Good overall health indicators",
    })
  }

  // 4. NPS Score (10% weight)
  if (npsScore !== null) {
    if (npsScore <= 6) {
      const score = ((7 - npsScore) / 7) * WEIGHTS.npsScore
      totalRiskScore += score
      riskFactors.push({
        factor: "Detractor",
        impact: npsScore <= 3 ? "high" : "medium",
        score: -score,
        description: `NPS score of ${npsScore}`,
      })
    } else if (npsScore >= 9) {
      const score = 0.8 * WEIGHTS.npsScore
      totalRiskScore -= score
      protectiveFactors.push({
        factor: "Promoter",
        impact: "high",
        score: score,
        description: `NPS score of ${npsScore}`,
      })
    }
  }

  // 5. Stakeholder engagement (8% weight)
  if (stakeholderCount === 0) {
    totalRiskScore += WEIGHTS.stakeholderEngagement
    riskFactors.push({
      factor: "No Stakeholders",
      impact: "high",
      score: -WEIGHTS.stakeholderEngagement,
      description: "No identified contacts",
    })
  } else if (!hasChampion) {
    const score = 0.6 * WEIGHTS.stakeholderEngagement
    totalRiskScore += score
    riskFactors.push({
      factor: "No Champion",
      impact: "medium",
      score: -score,
      description: "No internal champion identified",
    })
  } else if (stakeholderCount >= 3 && hasChampion) {
    const score = 0.7 * WEIGHTS.stakeholderEngagement
    totalRiskScore -= score
    protectiveFactors.push({
      factor: "Strong Relationships",
      impact: "medium",
      score: score,
      description: `${stakeholderCount} stakeholders with champion`,
    })
  }

  // 6. Contract tenure (7% weight)
  if (monthsAsCustomer < 3) {
    const score = 0.8 * WEIGHTS.contractTenure
    totalRiskScore += score
    riskFactors.push({
      factor: "New Customer",
      impact: "medium",
      score: -score,
      description: "Less than 3 months tenure",
    })
  } else if (monthsAsCustomer > 24) {
    const score = 0.9 * WEIGHTS.contractTenure
    totalRiskScore -= score
    protectiveFactors.push({
      factor: "Long-term Customer",
      impact: "medium",
      score: score,
      description: `${monthsAsCustomer} months tenure`,
    })
  }

  // Calculate final probability (0-100)
  // Normalize risk score to 0-1 range, then convert to percentage
  const normalizedRisk = Math.max(0, Math.min(1, totalRiskScore + 0.5))
  const churnProbability = Math.round(normalizedRisk * 100)

  // Determine confidence based on data completeness
  const dataPoints = [
    company.daysSinceLastLogin !== null,
    company.totalTrips !== null && company.totalTrips > 0,
    company.healthScore !== null,
    npsScore !== null,
    stakeholderCount > 0,
  ].filter(Boolean).length

  const confidence: "high" | "medium" | "low" =
    dataPoints >= 4 ? "high" : dataPoints >= 2 ? "medium" : "low"

  // Determine trend
  let trend: "improving" | "stable" | "declining" = "stable"
  if (riskFactors.length > protectiveFactors.length + 1) {
    trend = "declining"
  } else if (protectiveFactors.length > riskFactors.length + 1) {
    trend = "improving"
  }

  // Predict churn date for high-risk accounts
  let predictedChurnDate: string | null = null
  if (churnProbability > 70) {
    const daysUntilChurn = Math.max(14, 90 - churnProbability)
    const churnDate = new Date(Date.now() + daysUntilChurn * 24 * 60 * 60 * 1000)
    predictedChurnDate = churnDate.toISOString().split("T")[0]
  }

  // Generate recommended actions
  const recommendedActions: string[] = []
  if (riskFactors.some((r) => r.factor === "Inactivity")) {
    recommendedActions.push("Schedule re-engagement call")
  }
  if (riskFactors.some((r) => r.factor === "Zero Usage" || r.factor === "Low Usage")) {
    recommendedActions.push("Conduct training session")
  }
  if (riskFactors.some((r) => r.factor === "No Champion")) {
    recommendedActions.push("Identify and nurture champion")
  }
  if (riskFactors.some((r) => r.factor === "Detractor")) {
    recommendedActions.push("Address NPS feedback urgently")
  }
  if (riskFactors.some((r) => r.factor === "New Customer")) {
    recommendedActions.push("Accelerate onboarding milestones")
  }
  if (churnProbability > 50) {
    recommendedActions.push("Schedule executive business review")
  }

  return {
    companyId: company.hubspotId,
    companyName: company.name,
    domain: company.domain,
    segment: company.customerSegment,
    mrr: company.mrr,
    churnProbability,
    confidence,
    riskFactors: riskFactors.sort((a, b) => a.score - b.score),
    protectiveFactors: protectiveFactors.sort((a, b) => b.score - a.score),
    trend,
    predictedChurnDate,
    recommendedActions: recommendedActions.slice(0, 4),
  }
}

/**
 * GET /api/churn-prediction?companyId=xxx
 * Get churn predictions for a company or all companies
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get("companyId")
  const riskLevel = searchParams.get("riskLevel") // high, medium, low

  try {
    // Get companies
    const companies = await prisma.hubSpotCompany.findMany({
      where: companyId ? { hubspotId: companyId } : { mrr: { gt: 0 } },
      orderBy: { mrr: "desc" },
    })

    // Get NPS scores
    const npsSurveys = await prisma.nPSSurvey.findMany({
      where: {
        companyId: { in: companies.map((c) => c.hubspotId) },
        score: { not: null },
      },
      orderBy: { respondedAt: "desc" },
    })

    const npsMap = new Map<string, number>()
    for (const survey of npsSurveys) {
      if (!npsMap.has(survey.companyId) && survey.score !== null) {
        npsMap.set(survey.companyId, survey.score)
      }
    }

    // Get stakeholders
    const stakeholders = await prisma.stakeholder.findMany({
      where: {
        companyId: { in: companies.map((c) => c.hubspotId) },
        isActive: true,
      },
    })

    const stakeholderMap = new Map<string, { count: number; hasChampion: boolean }>()
    for (const s of stakeholders) {
      const current = stakeholderMap.get(s.companyId) || { count: 0, hasChampion: false }
      current.count++
      if (s.role === "champion") current.hasChampion = true
      stakeholderMap.set(s.companyId, current)
    }

    // Calculate predictions
    let predictions = companies.map((company) => {
      const nps = npsMap.get(company.hubspotId) ?? null
      const stakeholderInfo = stakeholderMap.get(company.hubspotId) || {
        count: 0,
        hasChampion: false,
      }
      return calculateChurnProbability(
        company,
        nps,
        stakeholderInfo.count,
        stakeholderInfo.hasChampion
      )
    })

    // Filter by risk level
    if (riskLevel === "high") {
      predictions = predictions.filter((p) => p.churnProbability >= 70)
    } else if (riskLevel === "medium") {
      predictions = predictions.filter((p) => p.churnProbability >= 40 && p.churnProbability < 70)
    } else if (riskLevel === "low") {
      predictions = predictions.filter((p) => p.churnProbability < 40)
    }

    // Sort by churn probability (highest risk first)
    predictions.sort((a, b) => b.churnProbability - a.churnProbability)

    // Calculate summary stats
    const highRisk = predictions.filter((p) => p.churnProbability >= 70)
    const mediumRisk = predictions.filter(
      (p) => p.churnProbability >= 40 && p.churnProbability < 70
    )
    const lowRisk = predictions.filter((p) => p.churnProbability < 40)

    const atRiskMrr = highRisk.reduce((sum, p) => sum + (p.mrr || 0), 0)
    const avgChurnProbability =
      predictions.length > 0
        ? Math.round(
            predictions.reduce((sum, p) => sum + p.churnProbability, 0) / predictions.length
          )
        : 0

    return NextResponse.json({
      predictions: companyId ? predictions[0] : predictions,
      summary: {
        totalAccounts: predictions.length,
        highRisk: highRisk.length,
        mediumRisk: mediumRisk.length,
        lowRisk: lowRisk.length,
        atRiskMrr,
        avgChurnProbability,
      },
    })
  } catch (error) {
    console.error("Failed to calculate churn predictions:", error)
    return NextResponse.json({ error: "Failed to calculate predictions" }, { status: 500 })
  }
}
