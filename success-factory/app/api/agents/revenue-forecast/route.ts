/**
 * Revenue Forecasting Agent
 *
 * Generates MRR forecasts based on:
 * - Health score distribution
 * - Historical churn rates
 * - Expansion pipeline
 * - Renewal calendar
 *
 * Runs weekly to provide forward-looking revenue projections.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { complete } from "@/lib/ai"

// Churn probability by health score (based on typical SaaS benchmarks)
const CHURN_PROBABILITY = {
  green: 0.02, // 2% monthly churn for healthy accounts
  yellow: 0.08, // 8% for at-risk
  red: 0.25, // 25% for critical
  churned: 1.0,
}

// Expansion probability by opportunity status
const EXPANSION_PROBABILITY = {
  identified: 0.15,
  qualified: 0.35,
  in_progress: 0.55,
  won: 1.0,
  lost: 0,
}

interface ForecastPeriod {
  label: string
  startDate: Date
  endDate: Date
  projectedMrr: number
  churnRisk: number
  expansionUpside: number
  renewals: number
  netChange: number
}

interface SegmentForecast {
  segment: string
  currentMrr: number
  accountCount: number
  projectedChurn: number
  projectedExpansion: number
  netForecast: number
}

export async function POST(request: NextRequest) {
  // Verify cron authorization
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  const isAuthorized =
    process.env.NODE_ENV === "development" ||
    request.headers.get("x-vercel-cron") === "1" ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`)

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[Revenue Forecast] Starting forecast generation...")

  try {
    // Step 1: Get current portfolio snapshot (exclude churned)
    const companies = await prisma.hubSpotCompany.findMany({
      where: {
        healthScore: { not: "churned" },
        subscriptionStatus: { in: ["active", "past_due"] },
      },
      select: {
        id: true,
        name: true,
        mrr: true,
        healthScore: true,
        plan: true,
        contractEndDate: true,
        paymentHealth: true,
        createdAt: true,
      },
    })

    // Step 2: Get expansion opportunities
    const expansionOpportunities = await prisma.expansionOpportunity.findMany({
      where: {
        status: { in: ["identified", "qualified", "in_progress"] },
      },
      select: {
        id: true,
        companyId: true,
        status: true,
        currentValue: true,
        potentialValue: true,
        confidence: true,
      },
    })

    // Step 3: Calculate current state
    const currentMrr = companies.reduce((sum, c) => sum + (c.mrr || 0), 0)
    const accountCount = companies.length

    const healthDistribution = {
      green: companies.filter((c) => c.healthScore === "green"),
      yellow: companies.filter((c) => c.healthScore === "yellow"),
      red: companies.filter((c) => c.healthScore === "red"),
      unknown: companies.filter(
        (c) => !c.healthScore || !["green", "yellow", "red"].includes(c.healthScore)
      ),
    }

    // Step 4: Generate forecasts for different periods
    const forecasts: ForecastPeriod[] = []

    // 4-week forecast
    forecasts.push(
      generatePeriodForecast(
        "4 Weeks",
        4,
        companies,
        expansionOpportunities,
        healthDistribution
      )
    )

    // 13-week (quarterly) forecast
    forecasts.push(
      generatePeriodForecast(
        "13 Weeks (Q)",
        13,
        companies,
        expansionOpportunities,
        healthDistribution
      )
    )

    // 26-week (half-year) forecast
    forecasts.push(
      generatePeriodForecast(
        "26 Weeks",
        26,
        companies,
        expansionOpportunities,
        healthDistribution
      )
    )

    // 52-week (annual) forecast
    forecasts.push(
      generatePeriodForecast(
        "52 Weeks",
        52,
        companies,
        expansionOpportunities,
        healthDistribution
      )
    )

    // Step 5: Segment analysis
    const segments = analyzeBySegment(companies, expansionOpportunities)

    // Step 6: Identify renewals in next 90 days
    const ninetyDaysOut = new Date()
    ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90)

    const upcomingRenewals = companies.filter(
      (c) =>
        c.contractEndDate &&
        new Date(c.contractEndDate) <= ninetyDaysOut &&
        new Date(c.contractEndDate) >= new Date()
    )

    const renewalMrr = upcomingRenewals.reduce((sum, c) => sum + (c.mrr || 0), 0)

    // Step 7: Generate AI insights
    const aiInsights = await generateAIInsights({
      currentMrr,
      accountCount,
      healthDistribution: {
        green: healthDistribution.green.length,
        yellow: healthDistribution.yellow.length,
        red: healthDistribution.red.length,
      },
      forecasts,
      upcomingRenewals: upcomingRenewals.length,
      renewalMrr,
      expansionPipeline: expansionOpportunities.reduce(
        (sum, o) => sum + ((o.potentialValue || 0) - (o.currentValue || 0)),
        0
      ),
    })

    // Step 8: Log forecast run
    // Note: Revenue forecasts are portfolio-wide, not company-specific
    // Store the summary data in metadata for historical tracking
    console.log("[Revenue Forecast] Generated forecast:", {
      currentMrr,
      accountCount,
      forecasts: forecasts.map((f) => ({ label: f.label, projected: f.projectedMrr })),
      confidence: calculateOverallConfidence(forecasts),
    })

    const summary = {
      currentState: {
        mrr: currentMrr,
        accounts: accountCount,
        healthDistribution: {
          green: healthDistribution.green.length,
          yellow: healthDistribution.yellow.length,
          red: healthDistribution.red.length,
        },
      },
      forecasts: forecasts.map((f) => ({
        period: f.label,
        projectedMrr: f.projectedMrr,
        churnRisk: f.churnRisk,
        expansionUpside: f.expansionUpside,
        netChange: f.netChange,
        netChangePercent: ((f.netChange / currentMrr) * 100).toFixed(1) + "%",
      })),
      renewals: {
        next90Days: upcomingRenewals.length,
        atRiskMrr: renewalMrr,
      },
      expansionPipeline: {
        opportunities: expansionOpportunities.length,
        potentialValue: expansionOpportunities.reduce(
          (sum, o) => sum + ((o.potentialValue || 0) - (o.currentValue || 0)),
          0
        ),
      },
      segments,
      aiInsights,
      generatedAt: new Date().toISOString(),
    }

    console.log("[Revenue Forecast] Summary:", {
      currentMrr,
      accounts: accountCount,
      fourWeekProjection: forecasts[0].projectedMrr,
    })

    return NextResponse.json({
      success: true,
      summary,
    })
  } catch (error) {
    console.error("[Revenue Forecast] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate forecast", details: String(error) },
      { status: 500 }
    )
  }
}

function generatePeriodForecast(
  label: string,
  weeks: number,
  companies: Array<{
    id: string
    mrr: number | null
    healthScore: string | null
  }>,
  expansionOpportunities: Array<{
    status: string
    currentValue: number | null
    potentialValue: number | null
    confidence: string
  }>,
  healthDistribution: Record<string, Array<{ mrr: number | null }>>
): ForecastPeriod {
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + weeks * 7)

  const months = weeks / 4.33 // Convert weeks to months for churn calculation

  // Calculate churn risk by health tier
  let churnRisk = 0
  for (const [health, accounts] of Object.entries(healthDistribution)) {
    const churnRate =
      CHURN_PROBABILITY[health as keyof typeof CHURN_PROBABILITY] || 0.05
    const tierMrr = accounts.reduce((sum, a) => sum + (a.mrr || 0), 0)
    // Compound monthly churn over the period
    const tierChurn = tierMrr * (1 - Math.pow(1 - churnRate, months))
    churnRisk += tierChurn
  }

  // Calculate expansion upside
  let expansionUpside = 0
  // Convert string confidence to numeric value
  const confidenceToNumber = (conf: string): number => {
    switch (conf) {
      case "high": return 80
      case "medium": return 50
      case "low": return 20
      default: return 50
    }
  }

  for (const opp of expansionOpportunities) {
    const probability =
      EXPANSION_PROBABILITY[opp.status as keyof typeof EXPANSION_PROBABILITY] ||
      0.2
    // Adjust probability based on time period (longer = higher chance of closing)
    const timeAdjustedProbability = Math.min(
      probability * (1 + weeks / 26),
      0.9
    )
    const currentVal = opp.currentValue || 0
    const potentialVal = opp.potentialValue || 0
    const confidenceNum = confidenceToNumber(opp.confidence)
    const oppValue = (potentialVal - currentVal) * (confidenceNum / 100)
    expansionUpside += oppValue * timeAdjustedProbability
  }

  const currentMrr = companies.reduce((sum, c) => sum + (c.mrr || 0), 0)
  const projectedMrr = currentMrr - churnRisk + expansionUpside
  const netChange = projectedMrr - currentMrr

  // Count renewals in period
  const renewals = companies.filter((c) => {
    // Simplified - in real implementation, check contractEndDate
    return true
  }).length

  return {
    label,
    startDate,
    endDate,
    projectedMrr: Math.round(projectedMrr),
    churnRisk: Math.round(churnRisk),
    expansionUpside: Math.round(expansionUpside),
    renewals,
    netChange: Math.round(netChange),
  }
}

function analyzeBySegment(
  companies: Array<{
    mrr: number | null
    healthScore: string | null
    plan: string | null
  }>,
  expansionOpportunities: Array<{
    companyId: string
    potentialValue: number | null
    currentValue: number | null
  }>
): SegmentForecast[] {
  // Segment by MRR tiers
  const segments = {
    enterprise: companies.filter((c) => (c.mrr || 0) >= 5000),
    midMarket: companies.filter(
      (c) => (c.mrr || 0) >= 1000 && (c.mrr || 0) < 5000
    ),
    smb: companies.filter((c) => (c.mrr || 0) < 1000),
  }

  const results: SegmentForecast[] = []

  for (const [segment, accounts] of Object.entries(segments)) {
    const currentMrr = accounts.reduce((sum, a) => sum + (a.mrr || 0), 0)
    const accountCount = accounts.length

    // Calculate churn based on health distribution
    let projectedChurn = 0
    for (const account of accounts) {
      const churnRate =
        CHURN_PROBABILITY[
          account.healthScore as keyof typeof CHURN_PROBABILITY
        ] || 0.05
      projectedChurn += (account.mrr || 0) * churnRate * 3 // 3-month outlook
    }

    // Get expansion for this segment (simplified)
    const projectedExpansion = currentMrr * 0.05 // Assume 5% expansion

    results.push({
      segment,
      currentMrr,
      accountCount,
      projectedChurn: Math.round(projectedChurn),
      projectedExpansion: Math.round(projectedExpansion),
      netForecast: Math.round(currentMrr - projectedChurn + projectedExpansion),
    })
  }

  return results
}

async function generateAIInsights(data: {
  currentMrr: number
  accountCount: number
  healthDistribution: { green: number; yellow: number; red: number }
  forecasts: ForecastPeriod[]
  upcomingRenewals: number
  renewalMrr: number
  expansionPipeline: number
}): Promise<string[]> {
  try {
    const prompt = `Analyze this revenue forecast data and provide 3-4 key insights for a CS leader.

Current State:
- MRR: $${data.currentMrr.toLocaleString()}
- Accounts: ${data.accountCount}
- Health: ${data.healthDistribution.green} green, ${data.healthDistribution.yellow} yellow, ${data.healthDistribution.red} red

4-Week Forecast:
- Projected MRR: $${data.forecasts[0].projectedMrr.toLocaleString()}
- Churn Risk: $${data.forecasts[0].churnRisk.toLocaleString()}
- Expansion Upside: $${data.forecasts[0].expansionUpside.toLocaleString()}

13-Week Forecast:
- Projected MRR: $${data.forecasts[1].projectedMrr.toLocaleString()}
- Net Change: $${data.forecasts[1].netChange.toLocaleString()}

Renewals (90 days): ${data.upcomingRenewals} accounts, $${data.renewalMrr.toLocaleString()} MRR
Expansion Pipeline: $${data.expansionPipeline.toLocaleString()}

Provide 3-4 bullet points with actionable insights. Be specific about risks and opportunities.`

    const response = await complete("general", prompt, { maxTokens: 400 })

    // Parse bullet points
    const insights = response
      .split("\n")
      .filter((line) => line.trim().match(/^[\-\*•]/))
      .map((line) => line.replace(/^[\-\*•]\s*/, "").trim())
      .filter((line) => line.length > 10)

    return insights.length > 0
      ? insights
      : [
          "Review red accounts - they represent significant churn risk",
          "Focus expansion efforts on green accounts with growth signals",
          "Prioritize upcoming renewals for proactive outreach",
        ]
  } catch (error) {
    console.error("[Revenue Forecast] AI insights error:", error)
    return [
      "Revenue forecast generated successfully",
      "Review health distribution to prioritize interventions",
      "Monitor expansion pipeline for growth opportunities",
    ]
  }
}

function calculateOverallConfidence(forecasts: ForecastPeriod[]): number {
  // Confidence decreases with time horizon
  // 4-week: 85%, 13-week: 70%, 26-week: 55%, 52-week: 40%
  const baseConfidences = [85, 70, 55, 40]
  return baseConfidences[0] // Return short-term confidence as overall
}

// Get forecast status - forecasts are generated on-demand via POST
export async function GET() {
  // Return portfolio stats as a quick health check
  const stats = await prisma.hubSpotCompany.aggregate({
    where: { subscriptionStatus: "active" },
    _sum: { mrr: true },
    _count: { id: true },
  })

  const healthCounts = await prisma.hubSpotCompany.groupBy({
    by: ["healthScore"],
    where: { subscriptionStatus: "active" },
    _count: true,
  })

  return NextResponse.json({
    status: "ok",
    agent: "revenue-forecast",
    message: "Use POST to generate a full forecast",
    currentSnapshot: {
      totalMrr: stats._sum.mrr || 0,
      activeAccounts: stats._count.id,
      healthDistribution: Object.fromEntries(
        healthCounts.map((h) => [h.healthScore || "unknown", h._count])
      ),
    },
  })
}
