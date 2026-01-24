import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAnthropicClient, AI_MODEL, TOKEN_LIMITS, extractText } from "@/lib/ai"

/**
 * POST /api/ai/meeting-prep
 * Generate a meeting prep brief for an account
 */
export async function POST(request: NextRequest) {
  try {
    const { companyId, meetingType = "check-in" } = await request.json()

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

    // Get stakeholders
    const stakeholders = await prisma.stakeholder.findMany({
      where: { companyId: company.hubspotId, isActive: true },
    })

    // Get recent tasks
    const recentTasks = await prisma.task.findMany({
      where: { companyId: company.hubspotId },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    // Get health history
    const healthHistory = await prisma.healthScoreSnapshot.findMany({
      where: { companyId: company.hubspotId },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    // Get expansion opportunities
    const opportunities = await prisma.expansionOpportunity.findMany({
      where: { companyId: company.hubspotId, status: { notIn: ["won", "lost"] } },
    })

    // Get recent NPS
    const recentNps = await prisma.nPSSurvey.findMany({
      where: { companyId: company.hubspotId },
      orderBy: { sentAt: "desc" },
      take: 3,
    })

    const meetingTypes = {
      "check-in": "Regular check-in call",
      qbr: "Quarterly Business Review",
      renewal: "Renewal discussion",
      escalation: "Escalation meeting",
      expansion: "Expansion/upsell discussion",
    }

    const context = `
# Account: ${company.name}
# Meeting Type: ${meetingTypes[meetingType as keyof typeof meetingTypes] || meetingType}

## Account Overview
- Health Score: ${company.healthScore} (${company.numericHealthScore || "N/A"}/100)
- MRR: $${(company.mrr || 0).toLocaleString()}/month
- Plan: ${company.plan || "Unknown"}
- Segment: ${company.customerSegment || "Unknown"}
- Owner: ${company.ownerName || "Unassigned"}
- Days Since Last Login: ${company.daysSinceLastLogin ?? "Unknown"}
- Contract End: ${company.contractEndDate ? new Date(company.contractEndDate).toLocaleDateString() : "Unknown"}

## Risk & Positive Signals
Risk: ${company.riskSignals?.join(", ") || "None"}
Positive: ${company.positiveSignals?.join(", ") || "None"}

## Key Stakeholders
${
  stakeholders.length
    ? stakeholders
        .map(
          (s) =>
            `- ${s.name} (${s.role}): ${s.title || "No title"}, Sentiment: ${s.sentiment}, Influence: ${s.influence}${s.notes ? ` - Notes: ${s.notes}` : ""}`
        )
        .join("\n")
    : "- No stakeholders mapped"
}

## Recent NPS Responses
${
  recentNps.length
    ? recentNps
        .filter((n) => n.score !== null)
        .map(
          (n) =>
            `- Score: ${n.score}/10 (${n.category}) - ${n.contactName || n.contactEmail}${n.comment ? `: "${n.comment}"` : ""}`
        )
        .join("\n")
    : "- No NPS data"
}

## Health Score Trend
${
  healthHistory.length
    ? healthHistory
        .map(
          (h) =>
            `- ${new Date(h.createdAt).toLocaleDateString()}: ${h.healthScore}`
        )
        .join("\n")
    : "- No history"
}

## Open Tasks
${
  recentTasks.filter((t) => t.status !== "completed").length
    ? recentTasks
        .filter((t) => t.status !== "completed")
        .map((t) => `- [${t.priority}] ${t.title} (${t.status})`)
        .join("\n")
    : "- No open tasks"
}

## Expansion Opportunities
${
  opportunities.length
    ? opportunities
        .map(
          (o) =>
            `- ${o.title}: ${o.type}, Potential: $${o.potentialValue || 0}/mo, Status: ${o.status}`
        )
        .join("\n")
    : "- No active opportunities"
}

## Payment Health
- Success Rate: ${company.paymentSuccessRate ?? "N/A"}%
- Failed Payments: ${company.failedPaymentCount ?? 0}
- Payment Status: ${company.paymentHealth || "Unknown"}
`

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: TOKEN_LIMITS.standard,
      messages: [
        {
          role: "user",
          content: `You are preparing a CSM for a ${meetingTypes[meetingType as keyof typeof meetingTypes] || meetingType} with ${company.name}. Create a concise meeting prep brief.

Structure:
## 📋 Meeting Brief: ${company.name}

### 🎯 Meeting Objective
What we should accomplish in this meeting

### 📊 Account Snapshot
Key metrics at a glance (2-3 bullets)

### 👥 Attendee Notes
Who's likely on the call and their perspective

### 💬 Opening Talking Points
How to start the conversation positively

### ⚠️ Topics to Address
Issues or concerns to proactively discuss

### ❓ Discovery Questions
3-5 questions to ask to understand their needs

### 🎁 Value to Deliver
What insights/value can we share

### ✅ Desired Outcomes
What commitments to seek before ending

### 📝 Pre-Meeting Prep Checklist
- [ ] Quick checklist before the call

Be specific to this account. Reference actual data. Keep each section to 2-4 bullets max.

${context}`,
        },
      ],
    })

    const brief = extractText(response)

    return NextResponse.json({
      companyId: company.hubspotId,
      companyName: company.name,
      meetingType,
      brief,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Meeting Prep] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate brief" },
      { status: 500 }
    )
  }
}
