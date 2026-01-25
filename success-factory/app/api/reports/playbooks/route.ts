import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  classifySegment,
  getSegmentDisplayName,
  classifyServiceType,
  evaluatePlaybookTriggers,
  getPlaybookActions,
} from "@/lib/segments"

/**
 * Playbook Triggers Report API
 *
 * GET /api/reports/playbooks
 *
 * Evaluates all accounts against playbook triggers and returns
 * accounts that need attention with recommended actions.
 *
 * Query params:
 * - priority: filter by priority (critical, high, medium, low, all - default all)
 * - segment: filter by segment (smb, mid_market, enterprise, all - default all)
 * - limit: max accounts to return (default 50)
 */

interface TriggeredAccount {
  id: string
  hubspotId: string
  name: string
  domain: string | null
  segment: string
  segmentDisplay: string
  serviceType: string

  // Health context
  healthScore: string | null
  numericScore: number | null
  mrr: number | null

  // Triggered playbooks
  triggeredPlaybooks: Array<{
    type: string
    name: string
    priority: string
    description: string
  }>
  highestPriority: string

  // Actions
  criticalActions: string[]
  tasks: string[]
  automatedActions: string[]

  // Contact
  ownerName: string | null
  ownerEmail: string | null
}

interface PlaybookReport {
  generatedAt: string
  summary: {
    totalAccountsEvaluated: number
    accountsWithTriggers: number
    criticalTriggers: number
    highTriggers: number
    mediumTriggers: number
  }
  byPlaybookType: Record<string, number>
  bySegment: Record<string, number>
  accounts: TriggeredAccount[]
  insights: string[]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const priorityFilter = searchParams.get("priority") || "all"
  const segmentFilter = searchParams.get("segment") || "all"
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    // Get all active accounts
    const companies = await prisma.hubSpotCompany.findMany({
      orderBy: [{ numericHealthScore: "asc" }, { mrr: "desc" }],
    })

    const triggeredAccounts: TriggeredAccount[] = []
    const byPlaybookType: Record<string, number> = {}
    const bySegment: Record<string, number> = {}

    let criticalCount = 0
    let highCount = 0
    let mediumCount = 0

    for (const company of companies) {
      const segment = classifySegment(company.mrr)

      // Filter by segment if specified
      if (segmentFilter !== "all" && segment !== segmentFilter) continue

      const segmentDisplay = getSegmentDisplayName(segment)

      // Determine service type (simplified - would use more signals in production)
      const serviceType = classifyServiceType({
        planName: company.plan,
        hasShuttlePlatform: company.plan?.toLowerCase().includes("shuttle"),
      })

      // Evaluate playbook triggers
      const triggers = evaluatePlaybookTriggers({
        segment,
        serviceType,
        healthScore: company.healthScore,
        numericHealthScore: company.numericHealthScore,
        totalTrips: company.totalTrips,
        tripsLast30Days: null, // Would need from Metabase
        daysSinceLastLogin: company.daysSinceLastLogin,
        paymentHealth: company.paymentHealth,
        riskSignalCount: company.riskSignals.length,
        daysToRenewal: company.contractEndDate
          ? Math.floor(
              (new Date(company.contractEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
          : null,
        openTicketCount: 0, // Would need from Notion
        currentPlan: company.plan,
        mrr: company.mrr,
      })

      // Skip if no triggers
      if (triggers.length === 0) continue

      // Filter by priority if specified
      if (priorityFilter !== "all") {
        const filteredTriggers = triggers.filter((t) => t.priority === priorityFilter)
        if (filteredTriggers.length === 0) continue
      }

      // Get actions
      const actions = getPlaybookActions(triggers)

      // Track stats
      const highestPriority = triggers[0]?.priority || "low"
      if (highestPriority === "critical") criticalCount++
      else if (highestPriority === "high") highCount++
      else if (highestPriority === "medium") mediumCount++

      // Count by playbook type
      for (const trigger of triggers) {
        byPlaybookType[trigger.type] = (byPlaybookType[trigger.type] || 0) + 1
      }

      // Count by segment
      bySegment[segmentDisplay] = (bySegment[segmentDisplay] || 0) + 1

      triggeredAccounts.push({
        id: company.id,
        hubspotId: company.hubspotId,
        name: company.name,
        domain: company.domain,
        segment,
        segmentDisplay,
        serviceType,

        healthScore: company.healthScore,
        numericScore: company.numericHealthScore,
        mrr: company.mrr,

        triggeredPlaybooks: triggers.map((t) => ({
          type: t.type,
          name: t.name,
          priority: t.priority,
          description: t.description,
        })),
        highestPriority,

        criticalActions: actions.criticalActions,
        tasks: actions.tasks,
        automatedActions: actions.automatedActions,

        ownerName: company.ownerName,
        ownerEmail: company.ownerEmail,
      })
    }

    // Sort by priority then MRR
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    triggeredAccounts.sort((a, b) => {
      const pDiff = priorityOrder[a.highestPriority] - priorityOrder[b.highestPriority]
      if (pDiff !== 0) return pDiff
      return (b.mrr || 0) - (a.mrr || 0)
    })

    const topAccounts = triggeredAccounts.slice(0, limit)

    // Generate insights
    const insights = generatePlaybookInsights(
      companies.length,
      triggeredAccounts.length,
      criticalCount,
      highCount,
      byPlaybookType,
      bySegment
    )

    const report: PlaybookReport = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalAccountsEvaluated: companies.length,
        accountsWithTriggers: triggeredAccounts.length,
        criticalTriggers: criticalCount,
        highTriggers: highCount,
        mediumTriggers: mediumCount,
      },
      byPlaybookType,
      bySegment,
      accounts: topAccounts,
      insights,
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("Playbook report error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate playbook report",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    )
  }
}

function generatePlaybookInsights(
  totalAccounts: number,
  triggeredCount: number,
  criticalCount: number,
  highCount: number,
  byPlaybookType: Record<string, number>,
  bySegment: Record<string, number>
): string[] {
  const insights: string[] = []

  // Overall trigger rate
  const triggerRate = totalAccounts > 0 ? Math.round((triggeredCount / totalAccounts) * 100) : 0
  insights.push(
    `${triggeredCount} of ${totalAccounts} accounts (${triggerRate}%) have active playbook triggers`
  )

  // Critical priority
  if (criticalCount > 0) {
    insights.push(`${criticalCount} accounts require immediate attention (critical priority)`)
  }

  // Top trigger type
  const topType = Object.entries(byPlaybookType).sort((a, b) => b[1] - a[1])[0]
  if (topType) {
    const typeLabels: Record<string, string> = {
      health_critical: "Critical Health",
      health_declined: "Health Decline",
      usage_dropped: "Usage Drop",
      payment_failed: "Payment Issues",
      renewal_approaching: "Renewal",
      expansion_ready: "Expansion Opportunity",
      onboarding_stalled: "Stalled Onboarding",
      churn_risk: "Churn Risk",
    }
    const label = typeLabels[topType[0]] || topType[0]
    insights.push(`"${label}" is the most common trigger (${topType[1]} accounts)`)
  }

  // Segment distribution
  const topSegment = Object.entries(bySegment).sort((a, b) => b[1] - a[1])[0]
  if (topSegment) {
    insights.push(`${topSegment[0]} segment has the most triggered accounts (${topSegment[1]})`)
  }

  // Onboarding stalled
  if (byPlaybookType["onboarding_stalled"] && byPlaybookType["onboarding_stalled"] > 5) {
    insights.push(
      `${byPlaybookType["onboarding_stalled"]} accounts have stalled onboarding - consider activation campaign`
    )
  }

  // Expansion opportunities
  if (byPlaybookType["expansion_ready"] && byPlaybookType["expansion_ready"] > 0) {
    insights.push(
      `${byPlaybookType["expansion_ready"]} accounts show expansion readiness - sales opportunity`
    )
  }

  return insights.slice(0, 5)
}
