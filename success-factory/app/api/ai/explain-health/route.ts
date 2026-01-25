import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAnthropicClient, AI_MODEL, TOKEN_LIMITS, extractText } from "@/lib/ai"

/**
 * POST /api/ai/explain-health
 * Get AI explanation of why an account has its current health score
 */
export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json()

    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 })
    }

    // Get company data
    const company = await prisma.hubSpotCompany.findFirst({
      where: {
        OR: [{ hubspotId: companyId }, { id: companyId }],
      },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Get recent health history
    const healthHistory = await prisma.healthScoreSnapshot.findMany({
      where: { companyId: company.hubspotId },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    // Get recent health changes
    const healthChanges = await prisma.healthChangeLog.findMany({
      where: { companyId: company.id },
      orderBy: { changedAt: "desc" },
      take: 5,
    })

    // Get recent tasks
    const recentTasks = await prisma.task.findMany({
      where: { companyId: company.hubspotId },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    // Build context for Claude
    const context = `
# Account: ${company.name}

## Current Status
- Health Score: ${company.healthScore || "unknown"} (numeric: ${company.numericHealthScore || "N/A"})
- MRR: $${(company.mrr || 0).toLocaleString()}/month
- Plan: ${company.plan || "Unknown"}
- Customer Segment: ${company.customerSegment || "Unknown"}
- Days Since Last Login: ${company.daysSinceLastLogin ?? "Unknown"}
- Subscription Status: ${company.subscriptionStatus || "Unknown"}

## Health Score Components (0-100 scale)
- Payment Score: ${company.paymentScore ?? "N/A"} (40% weight)
- Engagement Score: ${company.engagementScore ?? "N/A"} (25% weight)
- Support Score: ${company.supportScore ?? "N/A"} (20% weight)
- Growth Score: ${company.growthScore ?? "N/A"} (15% weight)

## Risk Signals
${company.riskSignals?.length ? company.riskSignals.map((s) => `- ${s}`).join("\n") : "- None detected"}

## Positive Signals
${company.positiveSignals?.length ? company.positiveSignals.map((s) => `- ${s}`).join("\n") : "- None detected"}

## Payment Health
- Payment Success Rate: ${company.paymentSuccessRate ?? "N/A"}%
- Failed Payments (90 days): ${company.failedPaymentCount ?? 0}
- Disputes: ${company.disputeCount ?? 0}
- Payment Health: ${company.paymentHealth || "Unknown"}

## Support Health
- Open Tickets: ${company.openTicketCount ?? 0}
- Oldest Ticket Age: ${company.ticketAgeDays ?? 0} days

## Recent Health Changes
${
  healthChanges.length
    ? healthChanges
        .map(
          (c) =>
            `- ${new Date(c.changedAt).toLocaleDateString()}: ${c.previousScore || "new"} → ${c.newScore}${c.riskSignals?.length ? ` (${c.riskSignals.join(", ")})` : ""}`
        )
        .join("\n")
    : "- No recent changes"
}

## Health Score Trend (last 10 snapshots)
${
  healthHistory.length
    ? healthHistory
        .map(
          (h) =>
            `- ${new Date(h.createdAt).toLocaleDateString()}: ${h.healthScore} (MRR: $${h.mrr || 0})`
        )
        .join("\n")
    : "- No history available"
}

## Recent Tasks
${
  recentTasks.length
    ? recentTasks.map((t) => `- [${t.status}] ${t.title} (${t.priority})`).join("\n")
    : "- No recent tasks"
}
`

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: TOKEN_LIMITS.standard,
      messages: [
        {
          role: "user",
          content: `You are a Customer Success expert analyzing account health. Based on the data below, explain:

1. **Why** this account has its current health score (${company.healthScore})
2. **Key drivers** - what's contributing positively and negatively
3. **Trend analysis** - is the account improving or declining?
4. **Risk assessment** - what should the CSM be worried about?
5. **Recommended actions** - 2-3 specific things to do

Be concise and actionable. Use bullet points. Focus on insights, not just restating data.

${context}`,
        },
      ],
    })

    const explanation = extractText(response)

    return NextResponse.json({
      companyId: company.hubspotId,
      companyName: company.name,
      healthScore: company.healthScore,
      numericScore: company.numericHealthScore,
      explanation,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[AI Explain Health] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to explain health" },
      { status: 500 }
    )
  }
}
