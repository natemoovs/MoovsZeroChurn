import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAnthropicClient, AI_MODEL, TOKEN_LIMITS, extractText } from "@/lib/ai"

/**
 * POST /api/ai/save-playbook
 * Generate a personalized save playbook for an at-risk account
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

    // Get churn patterns for context
    const churnPatterns = await prisma.churnPattern.findMany({
      orderBy: { frequency: "desc" },
      take: 5,
    })

    // Get similar churned accounts for pattern matching
    const similarChurned = await prisma.churnRecord.findMany({
      where: {
        primaryReason: { not: "" },
        ...(company.customerSegment && {
          lostMrr: { gte: (company.mrr || 0) * 0.5, lte: (company.mrr || 0) * 2 },
        }),
      },
      orderBy: { churnDate: "desc" },
      take: 10,
    })

    // Get stakeholders
    const stakeholders = await prisma.stakeholder.findMany({
      where: { companyId: company.hubspotId, isActive: true },
      take: 10,
    })

    const context = `
# Account to Save: ${company.name}

## Current Situation
- Health Score: ${company.healthScore} (${company.numericHealthScore || "N/A"}/100)
- MRR at Risk: $${(company.mrr || 0).toLocaleString()}/month
- Plan: ${company.plan || "Unknown"}
- Segment: ${company.customerSegment || "Unknown"}
- Days Since Last Login: ${company.daysSinceLastLogin ?? "Unknown"}
- Contract End: ${company.contractEndDate ? new Date(company.contractEndDate).toLocaleDateString() : "Unknown"}

## Risk Signals
${company.riskSignals?.length ? company.riskSignals.map((s) => `- ${s}`).join("\n") : "- None detected"}

## Positive Signals (leverage these)
${company.positiveSignals?.length ? company.positiveSignals.map((s) => `- ${s}`).join("\n") : "- None detected"}

## Payment Health
- Success Rate: ${company.paymentSuccessRate ?? "N/A"}%
- Failed Payments: ${company.failedPaymentCount ?? 0}
- Payment Status: ${company.paymentHealth || "Unknown"}

## Key Stakeholders
${
  stakeholders.length
    ? stakeholders
        .map(
          (s) =>
            `- ${s.name} (${s.role}): ${s.sentiment} sentiment, ${s.influence} influence`
        )
        .join("\n")
    : "- No stakeholders mapped"
}

## Similar Accounts That Churned (learn from these)
${
  similarChurned.length
    ? similarChurned
        .slice(0, 5)
        .map(
          (c) =>
            `- ${c.companyName}: ${c.primaryReason}${c.reasonDetails ? ` - "${c.reasonDetails.slice(0, 100)}"` : ""}`
        )
        .join("\n")
    : "- No similar churns recorded"
}

## Common Churn Patterns in Your Portfolio
${
  churnPatterns.length
    ? churnPatterns
        .map(
          (p) =>
            `- ${p.title}: ${p.description.slice(0, 100)}... (${p.frequency} occurrences)`
        )
        .join("\n")
    : "- No patterns identified yet"
}
`

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: TOKEN_LIMITS.large,
      messages: [
        {
          role: "user",
          content: `You are a Customer Success expert creating a save playbook. Based on the account data and churn patterns, create a detailed save strategy.

Structure your response as:

## 🎯 Save Strategy Summary
One paragraph on the overall approach

## 📊 Risk Assessment
- Primary risk factors (ranked)
- Churn probability estimate (low/medium/high/critical)
- Time sensitivity (days until point of no return)

## 👥 Stakeholder Strategy
Who to engage, in what order, with what message

## 📋 Action Plan (Week 1-4)
Specific tasks with timing:
- Week 1: Immediate actions
- Week 2: Follow-up and discovery
- Week 3: Value demonstration
- Week 4: Commitment and close

## 💬 Key Talking Points
- What to say in the save call
- Objection handling for likely concerns
- Value props to emphasize

## 🎁 Save Offers (if needed)
Potential concessions ranked by cost to company

## ✅ Success Metrics
How to know if the save is working

Be specific, actionable, and realistic. Reference the actual data provided.

${context}`,
        },
      ],
    })

    const playbook = extractText(response)

    // Create tasks from the playbook
    const taskMatches = playbook.match(/(?:Week \d|Immediate|Today|Tomorrow).*?(?=\n|$)/gi) || []
    const suggestedTasks = taskMatches.slice(0, 5).map((t) => t.replace(/^[-•]\s*/, "").trim())

    return NextResponse.json({
      companyId: company.hubspotId,
      companyName: company.name,
      healthScore: company.healthScore,
      mrrAtRisk: company.mrr,
      playbook,
      suggestedTasks,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[AI Save Playbook] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate playbook" },
      { status: 500 }
    )
  }
}
