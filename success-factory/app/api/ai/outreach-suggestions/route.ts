import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/ai/outreach-suggestions
 * Get AI-powered suggestions for who to contact today
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "5")
    const csmEmail = searchParams.get("csm") || undefined

    // Get accounts that need attention
    const priorityAccounts = await prisma.hubSpotCompany.findMany({
      where: {
        ...(csmEmail ? { ownerEmail: csmEmail } : {}),
        OR: [
          { healthScore: "red" },
          { healthScore: "yellow" },
          {
            contractEndDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            },
          },
          { daysSinceLastLogin: { gte: 14 } },
        ],
      },
      orderBy: [
        { healthScore: "asc" }, // red first
        { mrr: "desc" },
      ],
      take: 20,
    })

    // Get recent activity to avoid suggesting accounts we just contacted
    const recentTasks = await prisma.task.findMany({
      where: {
        companyId: { in: priorityAccounts.map((a) => a.hubspotId) },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { companyId: true },
    })

    const recentlyContactedIds = new Set(recentTasks.map((t) => t.companyId))

    // Filter out recently contacted
    const candidates = priorityAccounts
      .filter((a) => !recentlyContactedIds.has(a.hubspotId))
      .slice(0, 10)

    if (candidates.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message: "All priority accounts have recent activity",
      })
    }

    // Get stakeholders for context
    const stakeholders = await prisma.stakeholder.findMany({
      where: {
        companyId: { in: candidates.map((c) => c.hubspotId) },
        isActive: true,
      },
    })

    const stakeholderMap = new Map<string, typeof stakeholders>()
    for (const s of stakeholders) {
      const existing = stakeholderMap.get(s.companyId) || []
      existing.push(s)
      stakeholderMap.set(s.companyId, existing)
    }

    // Build suggestions
    const suggestions = candidates.slice(0, limit).map((account) => {
      const accountStakeholders = stakeholderMap.get(account.hubspotId) || []
      const champion = accountStakeholders.find((s) => s.role === "champion")
      const decisionMaker = accountStakeholders.find((s) => s.role === "decision_maker")

      let urgency: "high" | "medium" | "low" = "low"
      let reason = ""

      if (account.healthScore === "red") {
        urgency = "high"
        reason = "Health score is critical"
      } else if (account.healthScore === "yellow") {
        urgency = "medium"
        reason = "Health score declining"
      }

      if (account.contractEndDate) {
        const daysToRenewal = Math.ceil(
          (new Date(account.contractEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        if (daysToRenewal <= 30) {
          urgency = "high"
          reason = `Renewal in ${daysToRenewal} days`
        } else if (daysToRenewal <= 60) {
          urgency = urgency === "high" ? "high" : "medium"
          reason = reason || `Renewal in ${daysToRenewal} days`
        }
      }

      if ((account.daysSinceLastLogin || 0) >= 30) {
        urgency = urgency === "low" ? "medium" : urgency
        reason = reason || `No login in ${account.daysSinceLastLogin} days`
      }

      const suggestedContact = champion || decisionMaker || accountStakeholders[0]

      return {
        companyId: account.hubspotId,
        companyName: account.name,
        healthScore: account.healthScore,
        mrr: account.mrr,
        urgency,
        reason,
        suggestedContact: suggestedContact
          ? {
              name: suggestedContact.name,
              role: suggestedContact.role,
              email: suggestedContact.email,
              sentiment: suggestedContact.sentiment,
            }
          : null,
        riskSignals: account.riskSignals?.slice(0, 3) || [],
        daysToRenewal: account.contractEndDate
          ? Math.ceil(
              (new Date(account.contractEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
          : null,
        daysSinceContact: 7, // Placeholder - would calculate from activity
      }
    })

    // Sort by urgency
    suggestions.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 }
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    })

    return NextResponse.json({
      suggestions,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Outreach Suggestions] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get suggestions" },
      { status: 500 }
    )
  }
}
