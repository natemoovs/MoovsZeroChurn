import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Health Digest API
 *
 * GET /api/reports/digest
 *
 * Generates a digest of health changes and alerts for:
 * - Daily, weekly, or custom period
 * - Can be used for automated notifications (Slack, email)
 *
 * Query params:
 * - period: day, week, month (default week)
 * - ownerId: filter by CSM (optional)
 * - format: json, slack, email (default json)
 */

interface HealthChange {
  companyId: string
  companyName: string
  hubspotId: string
  previousScore: string | null
  currentScore: string | null
  previousNumeric: number | null
  currentNumeric: number | null
  change: "improved" | "declined" | "new_risk"
  newRiskSignals: string[]
  mrr: number | null
  ownerName: string | null
}

interface DigestSummary {
  period: string
  periodStart: string
  periodEnd: string
  totalAccounts: number
  atRiskCount: number
  healthChanges: {
    improved: number
    declined: number
    newRisk: number
  }
  mrrAtRisk: number
  topIssues: Array<{ issue: string; count: number }>
}

interface DigestReport {
  generatedAt: string
  summary: DigestSummary
  criticalAlerts: HealthChange[]
  declinedAccounts: HealthChange[]
  improvedAccounts: HealthChange[]
  recommendations: string[]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get("period") || "week"
  const ownerId = searchParams.get("ownerId")
  const format = searchParams.get("format") || "json"

  try {
    // Calculate period dates
    const now = new Date()
    const periodDays = period === "day" ? 1 : period === "week" ? 7 : 30
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

    // Build base filter
    const baseFilter: Record<string, unknown> = {}
    if (ownerId) {
      baseFilter.ownerId = ownerId
    }

    // Get current at-risk accounts
    const atRiskAccounts = await prisma.hubSpotCompany.findMany({
      where: {
        ...baseFilter,
        OR: [
          { healthScore: "red" },
          { healthScore: "yellow" },
          { numericHealthScore: { lt: 60 } },
        ],
      },
      orderBy: { numericHealthScore: "asc" },
    })

    // Get health history changes for the period
    const healthChanges = await prisma.healthChangeLog.findMany({
      where: {
        changedAt: { gte: periodStart },
        ...(ownerId ? { company: { ownerId } } : {}),
      },
      include: {
        company: {
          select: {
            name: true,
            hubspotId: true,
            mrr: true,
            ownerName: true,
            healthScore: true,
            numericHealthScore: true,
            riskSignals: true,
          },
        },
      },
      orderBy: { changedAt: "desc" },
    })

    // Process health changes
    const improved: HealthChange[] = []
    const declined: HealthChange[] = []
    const newRisk: HealthChange[] = []

    const processedCompanies = new Set<string>()

    for (const change of healthChanges) {
      // Only count latest change per company
      if (processedCompanies.has(change.companyId)) continue
      processedCompanies.add(change.companyId)

      const healthChange: HealthChange = {
        companyId: change.companyId,
        companyName: change.company.name,
        hubspotId: change.company.hubspotId,
        previousScore: change.previousScore,
        currentScore: change.newScore,
        previousNumeric: change.previousNumericScore,
        currentNumeric: change.newNumericScore,
        change: determineChangeType(change.previousScore, change.newScore),
        newRiskSignals: change.company.riskSignals.slice(0, 3),
        mrr: change.company.mrr,
        ownerName: change.company.ownerName,
      }

      if (healthChange.change === "improved") {
        improved.push(healthChange)
      } else if (healthChange.change === "declined") {
        declined.push(healthChange)
      } else {
        newRisk.push(healthChange)
      }
    }

    // Get total accounts for context
    const totalAccounts = await prisma.hubSpotCompany.count({
      where: baseFilter,
    })

    // Calculate MRR at risk
    const mrrAtRisk = atRiskAccounts.reduce((sum, a) => sum + (a.mrr || 0), 0)

    // Count top issues
    const issueCount: Record<string, number> = {}
    for (const account of atRiskAccounts) {
      for (const signal of account.riskSignals) {
        const category = categorizeSignal(signal)
        issueCount[category] = (issueCount[category] || 0) + 1
      }
    }
    const topIssues = Object.entries(issueCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }))

    // Critical alerts: red health or significant score drop
    const criticalAlerts = [
      ...declined.filter(
        (c) => c.currentScore === "red" || (c.currentNumeric !== null && c.currentNumeric < 30)
      ),
      ...atRiskAccounts
        .filter((a) => a.healthScore === "red" && !processedCompanies.has(a.id))
        .slice(0, 5)
        .map((a) => ({
          companyId: a.id,
          companyName: a.name,
          hubspotId: a.hubspotId,
          previousScore: null,
          currentScore: a.healthScore,
          previousNumeric: null,
          currentNumeric: a.numericHealthScore,
          change: "new_risk" as const,
          newRiskSignals: a.riskSignals.slice(0, 3),
          mrr: a.mrr,
          ownerName: a.ownerName,
        })),
    ].slice(0, 10)

    // Generate recommendations
    const recommendations = generateDigestRecommendations(
      atRiskAccounts.length,
      declined.length,
      improved.length,
      topIssues,
      mrrAtRisk
    )

    const report: DigestReport = {
      generatedAt: now.toISOString(),
      summary: {
        period,
        periodStart: periodStart.toISOString(),
        periodEnd: now.toISOString(),
        totalAccounts,
        atRiskCount: atRiskAccounts.length,
        healthChanges: {
          improved: improved.length,
          declined: declined.length,
          newRisk: newRisk.length,
        },
        mrrAtRisk,
        topIssues,
      },
      criticalAlerts,
      declinedAccounts: declined.slice(0, 10),
      improvedAccounts: improved.slice(0, 5),
      recommendations,
    }

    // Format output based on request
    if (format === "slack") {
      return NextResponse.json(formatForSlack(report))
    } else if (format === "email") {
      return NextResponse.json(formatForEmail(report))
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("Digest generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate digest", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}

function determineChangeType(
  previousScore: string | null,
  currentScore: string | null
): "improved" | "declined" | "new_risk" {
  if (!previousScore) return "new_risk"

  const scoreOrder: Record<string, number> = { red: 0, yellow: 1, green: 2 }
  const prev = scoreOrder[previousScore] ?? 1
  const curr = scoreOrder[currentScore || "yellow"] ?? 1

  if (curr > prev) return "improved"
  if (curr < prev) return "declined"
  return "new_risk"
}

function categorizeSignal(signal: string): string {
  const lower = signal.toLowerCase()
  if (lower.includes("payment") || lower.includes("failed") || lower.includes("dispute")) {
    return "Payment Issues"
  }
  if (lower.includes("usage") || lower.includes("login") || lower.includes("inactive") || lower.includes("decline")) {
    return "Low Engagement"
  }
  if (lower.includes("support") || lower.includes("ticket")) {
    return "Support Issues"
  }
  if (lower.includes("contract") || lower.includes("renewal")) {
    return "Contract Risk"
  }
  return "Other"
}

function generateDigestRecommendations(
  atRiskCount: number,
  declinedCount: number,
  improvedCount: number,
  topIssues: Array<{ issue: string; count: number }>,
  mrrAtRisk: number
): string[] {
  const recommendations: string[] = []

  if (atRiskCount > 10) {
    recommendations.push(`Review the ${atRiskCount} at-risk accounts and prioritize by MRR`)
  }

  if (declinedCount > improvedCount) {
    recommendations.push("Health trend is negative - schedule team sync to discuss intervention strategies")
  } else if (improvedCount > declinedCount) {
    recommendations.push("Health trend is positive - document what's working for successful recoveries")
  }

  if (topIssues[0]?.issue === "Payment Issues" && topIssues[0].count > 3) {
    recommendations.push("Payment issues are common - consider proactive billing check-ins")
  }

  if (topIssues[0]?.issue === "Low Engagement" && topIssues[0].count > 5) {
    recommendations.push("Engagement is a key risk factor - plan re-engagement campaign")
  }

  if (mrrAtRisk > 5000) {
    recommendations.push(`$${mrrAtRisk.toLocaleString()} MRR at risk - prioritize high-value account recovery`)
  }

  if (recommendations.length === 0) {
    recommendations.push("Portfolio health looks stable - continue regular check-ins")
  }

  return recommendations.slice(0, 4)
}

function formatForSlack(report: DigestReport): { blocks: unknown[] } {
  const blocks: unknown[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📊 Customer Health Digest - ${report.summary.period}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Summary*\n• ${report.summary.atRiskCount} accounts at risk\n• $${report.summary.mrrAtRisk.toLocaleString()} MRR at risk\n• ${report.summary.healthChanges.declined} declined, ${report.summary.healthChanges.improved} improved`,
      },
    },
  ]

  if (report.criticalAlerts.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🚨 Critical Alerts*\n${report.criticalAlerts
          .slice(0, 5)
          .map((a) => `• *${a.companyName}* - ${a.newRiskSignals[0] || "Health declined"}`)
          .join("\n")}`,
      },
    })
  }

  if (report.recommendations.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💡 Recommendations*\n${report.recommendations.map((r) => `• ${r}`).join("\n")}`,
      },
    })
  }

  return { blocks }
}

function formatForEmail(report: DigestReport): {
  subject: string
  html: string
  text: string
} {
  const subject = `Customer Health Digest: ${report.summary.atRiskCount} at risk, $${report.summary.mrrAtRisk.toLocaleString()} MRR`

  const criticalList = report.criticalAlerts
    .slice(0, 5)
    .map((a) => `<li><strong>${a.companyName}</strong> - ${a.newRiskSignals[0] || "Health declined"}</li>`)
    .join("")

  const html = `
    <h2>Customer Health Digest</h2>
    <p><strong>Period:</strong> ${report.summary.period} (${new Date(report.summary.periodStart).toLocaleDateString()} - ${new Date(report.summary.periodEnd).toLocaleDateString()})</p>

    <h3>Summary</h3>
    <ul>
      <li><strong>${report.summary.atRiskCount}</strong> accounts at risk</li>
      <li><strong>$${report.summary.mrrAtRisk.toLocaleString()}</strong> MRR at risk</li>
      <li><strong>${report.summary.healthChanges.declined}</strong> declined, <strong>${report.summary.healthChanges.improved}</strong> improved</li>
    </ul>

    ${report.criticalAlerts.length > 0 ? `<h3>Critical Alerts</h3><ul>${criticalList}</ul>` : ""}

    <h3>Recommendations</h3>
    <ul>
      ${report.recommendations.map((r) => `<li>${r}</li>`).join("")}
    </ul>
  `

  const text = `
Customer Health Digest
======================
Period: ${report.summary.period}

Summary:
- ${report.summary.atRiskCount} accounts at risk
- $${report.summary.mrrAtRisk.toLocaleString()} MRR at risk
- ${report.summary.healthChanges.declined} declined, ${report.summary.healthChanges.improved} improved

${report.criticalAlerts.length > 0 ? `Critical Alerts:\n${report.criticalAlerts.slice(0, 5).map((a) => `- ${a.companyName}: ${a.newRiskSignals[0] || "Health declined"}`).join("\n")}` : ""}

Recommendations:
${report.recommendations.map((r) => `- ${r}`).join("\n")}
  `

  return { subject, html, text }
}
