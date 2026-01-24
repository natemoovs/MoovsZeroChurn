import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAnthropicClient, AI_MODEL, TOKEN_LIMITS, extractText } from "@/lib/ai"

/**
 * GET /api/analysis/win-loss
 * Analyze patterns in churns vs saves to identify what works
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const generateInsights = searchParams.get("insights") === "true"

    // Get churned accounts (losses)
    const churns = await prisma.churnRecord.findMany({
      orderBy: { churnDate: "desc" },
      take: 100,
    })

    // Get saved accounts (wins) - accounts that were red but are now green/yellow
    // We'll identify these through health change logs
    const potentialSaves = await prisma.healthChangeLog.findMany({
      where: {
        previousScore: "red",
        newScore: { in: ["green", "yellow"] },
      },
      include: {
        company: {
          select: {
            hubspotId: true,
            name: true,
            mrr: true,
            healthScore: true,
            customerSegment: true,
          },
        },
      },
      orderBy: { changedAt: "desc" },
      take: 100,
    })

    // Dedupe saves by company
    const savesByCompany = new Map<string, typeof potentialSaves[0]>()
    for (const save of potentialSaves) {
      if (!savesByCompany.has(save.companyId)) {
        savesByCompany.set(save.companyId, save)
      }
    }
    const saves = Array.from(savesByCompany.values())

    // Analyze churn reasons
    const churnReasons = churns.reduce(
      (acc, c) => {
        const reason = c.primaryReason || "unknown"
        acc[reason] = (acc[reason] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Analyze churn by segment
    const churnBySegment = churns.reduce(
      (acc, c) => {
        // Would need to cross-reference with company data
        const segment = "unknown" // Placeholder
        acc[segment] = (acc[segment] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Calculate save rate
    const atRiskTotal = saves.length + churns.length
    const saveRate = atRiskTotal > 0 ? (saves.length / atRiskTotal) * 100 : 0

    // MRR analysis
    const churnedMrr = churns.reduce((sum, c) => sum + (c.lostMrr || 0), 0)
    const savedMrr = saves.reduce((sum, s) => sum + (s.company?.mrr || 0), 0)

    // Common feature gaps from churns
    const featureGaps = churns
      .flatMap((c) => c.featureGaps || [])
      .reduce(
        (acc, gap) => {
          acc[gap] = (acc[gap] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

    // Top competitors
    const competitors = churns
      .filter((c) => c.competitorName)
      .reduce(
        (acc, c) => {
          acc[c.competitorName!] = (acc[c.competitorName!] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

    const analysis = {
      summary: {
        totalChurns: churns.length,
        totalSaves: saves.length,
        saveRate: Math.round(saveRate),
        churnedMrr,
        savedMrr,
        netMrrImpact: savedMrr - churnedMrr,
      },
      churnReasons: Object.entries(churnReasons)
        .map(([reason, count]) => ({ reason, count, percentage: Math.round((count / churns.length) * 100) }))
        .sort((a, b) => b.count - a.count),
      topFeatureGaps: Object.entries(featureGaps)
        .map(([feature, count]) => ({ feature, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topCompetitors: Object.entries(competitors)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      recentChurns: churns.slice(0, 5).map((c) => ({
        companyName: c.companyName,
        churnDate: c.churnDate,
        reason: c.primaryReason,
        lostMrr: c.lostMrr,
      })),
      recentSaves: saves.slice(0, 5).map((s) => ({
        companyName: s.company?.name,
        savedDate: s.changedAt,
        mrr: s.company?.mrr,
      })),
    }

    // Generate AI insights if requested
    let insights = null
    if (generateInsights && (churns.length > 0 || saves.length > 0)) {
      const anthropic = getAnthropicClient()

      const context = `
## Win/Loss Data Summary

### Losses (Churns): ${churns.length} accounts, $${churnedMrr.toLocaleString()} MRR lost

Top Churn Reasons:
${analysis.churnReasons.slice(0, 5).map((r) => `- ${r.reason}: ${r.count} (${r.percentage}%)`).join("\n")}

Feature Gaps Mentioned:
${analysis.topFeatureGaps.slice(0, 5).map((f) => `- ${f.feature}: ${f.count} mentions`).join("\n")}

Competitors Won Against Us:
${analysis.topCompetitors.map((c) => `- ${c.name}: ${c.count} losses`).join("\n") || "- No competitor data"}

### Wins (Saves): ${saves.length} accounts, $${savedMrr.toLocaleString()} MRR saved

Save Rate: ${Math.round(saveRate)}%

Recent Saves:
${saves.slice(0, 5).map((s) => `- ${s.company?.name}: went from red to ${s.newScore}`).join("\n")}
`

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: TOKEN_LIMITS.standard,
        messages: [
          {
            role: "user",
            content: `You are a Customer Success analyst. Based on this win/loss data, provide actionable insights.

${context}

Provide:
1. **Key Patterns**: What differentiates wins from losses?
2. **Root Causes**: What's really driving churn?
3. **Save Playbook**: What tactics seem to work for saves?
4. **Quick Wins**: 3 specific actions to improve save rate
5. **Product Feedback**: What should be communicated to product team?

Be specific and actionable. Reference the actual data.`,
          },
        ],
      })

      insights = extractText(response)
    }

    return NextResponse.json({
      ...analysis,
      insights,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Win/Loss Analysis] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    )
  }
}
