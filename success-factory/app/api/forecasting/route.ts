import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/forecasting
 * Revenue forecasting based on health trends and historical data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get("months") || "3")

    // Get all active accounts with MRR
    const accounts = await prisma.hubSpotCompany.findMany({
      where: {
        mrr: { gt: 0 },
        subscriptionStatus: { notIn: ["churned", "cancelled"] },
      },
      select: {
        hubspotId: true,
        name: true,
        mrr: true,
        healthScore: true,
        numericHealthScore: true,
        contractEndDate: true,
        customerSegment: true,
      },
    })

    // Get churn rates by health score from historical data
    const churnRates = await calculateHistoricalChurnRates()

    // Current MRR
    const currentMrr = accounts.reduce((sum, a) => sum + (a.mrr || 0), 0)

    // Calculate forecast for each month
    const forecast = []
    let runningMrr = currentMrr
    const monthlyChurnRisk: { [key: string]: number } = {}

    for (let m = 1; m <= months; m++) {
      const monthDate = new Date()
      monthDate.setMonth(monthDate.getMonth() + m)
      const monthKey = monthDate.toISOString().slice(0, 7) // YYYY-MM

      let expectedChurn = 0
      let expectedExpansion = 0
      let renewalRisk = 0

      for (const account of accounts) {
        // Churn risk based on health score
        const churnProbability = churnRates[account.healthScore || "unknown"] || 0.05

        // Higher risk for accounts with renewal in this month
        const renewalInMonth = account.contractEndDate &&
          new Date(account.contractEndDate).getMonth() === monthDate.getMonth() &&
          new Date(account.contractEndDate).getFullYear() === monthDate.getFullYear()

        const adjustedChurnProb = renewalInMonth
          ? Math.min(churnProbability * 2, 0.8)
          : churnProbability

        const potentialChurn = (account.mrr || 0) * adjustedChurnProb
        expectedChurn += potentialChurn

        if (renewalInMonth) {
          renewalRisk += account.mrr || 0
        }

        // Expansion estimate (healthy accounts more likely to expand)
        if (account.healthScore === "green") {
          expectedExpansion += (account.mrr || 0) * 0.02 // 2% expansion for healthy
        }
      }

      runningMrr = runningMrr - expectedChurn + expectedExpansion

      forecast.push({
        month: monthKey,
        projectedMrr: Math.round(runningMrr),
        expectedChurn: Math.round(expectedChurn),
        expectedExpansion: Math.round(expectedExpansion),
        renewalRisk: Math.round(renewalRisk),
        confidence: m === 1 ? "high" : m === 2 ? "medium" : "low",
      })

      monthlyChurnRisk[monthKey] = expectedChurn
    }

    // Accounts at highest risk
    const atRiskAccounts = accounts
      .filter((a) => a.healthScore === "red" || a.healthScore === "yellow")
      .map((a) => ({
        companyId: a.hubspotId,
        name: a.name,
        mrr: a.mrr,
        healthScore: a.healthScore,
        churnProbability: churnRates[a.healthScore || "unknown"] || 0.05,
        renewalDate: a.contractEndDate,
      }))
      .sort((a, b) => (b.mrr || 0) - (a.mrr || 0))
      .slice(0, 10)

    // Summary stats
    const summary = {
      currentMrr,
      projectedMrr3Month: forecast[months - 1]?.projectedMrr || currentMrr,
      totalChurnRisk: forecast.reduce((sum, f) => sum + f.expectedChurn, 0),
      totalExpansionPotential: forecast.reduce((sum, f) => sum + f.expectedExpansion, 0),
      netChange: (forecast[months - 1]?.projectedMrr || currentMrr) - currentMrr,
      healthDistribution: {
        green: accounts.filter((a) => a.healthScore === "green").length,
        yellow: accounts.filter((a) => a.healthScore === "yellow").length,
        red: accounts.filter((a) => a.healthScore === "red").length,
        unknown: accounts.filter((a) => !a.healthScore || a.healthScore === "unknown").length,
      },
    }

    return NextResponse.json({
      summary,
      forecast,
      atRiskAccounts,
      churnRates,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Forecasting] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Forecasting failed" },
      { status: 500 }
    )
  }
}

async function calculateHistoricalChurnRates(): Promise<Record<string, number>> {
  // Get historical churn data
  const churns = await prisma.churnRecord.findMany({
    where: {
      churnDate: {
        gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
      },
    },
    select: {
      healthScoreAtChurn: true,
    },
  })

  // Get total accounts by health score (approximate)
  const totalByHealth = await prisma.hubSpotCompany.groupBy({
    by: ["healthScore"],
    _count: { id: true },
  })

  const churnsByHealth = {
    green: churns.filter((c) => c.healthScoreAtChurn === "green").length,
    yellow: churns.filter((c) => c.healthScoreAtChurn === "yellow").length,
    red: churns.filter((c) => c.healthScoreAtChurn === "red").length,
    unknown: churns.filter((c) => !c.healthScoreAtChurn || c.healthScoreAtChurn === "unknown").length,
  }

  const totalByHealthMap: Record<string, number> = {}
  for (const t of totalByHealth) {
    totalByHealthMap[t.healthScore || "unknown"] = t._count.id
  }

  // Calculate monthly churn rates (annualized / 12)
  // Use defaults if not enough data
  return {
    green: totalByHealthMap.green
      ? Math.min((churnsByHealth.green / totalByHealthMap.green) / 12, 0.02)
      : 0.01, // 1% monthly for healthy
    yellow: totalByHealthMap.yellow
      ? Math.min((churnsByHealth.yellow / totalByHealthMap.yellow) / 12, 0.1)
      : 0.05, // 5% monthly for warning
    red: totalByHealthMap.red
      ? Math.min((churnsByHealth.red / totalByHealthMap.red) / 12, 0.3)
      : 0.15, // 15% monthly for at-risk
    unknown: 0.05, // Default 5%
  }
}
