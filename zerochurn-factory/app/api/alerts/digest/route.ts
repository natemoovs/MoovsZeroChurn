import { NextRequest, NextResponse } from "next/server"

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

interface PortfolioSummary {
  companyId: string
  companyName: string
  healthScore: "green" | "yellow" | "red" | "unknown"
  mrr: number | null
  riskSignals: string[]
}

/**
 * Send daily digest to Slack
 * POST /api/alerts/digest
 *
 * Can be triggered by:
 * - Cron job (e.g., Vercel cron)
 * - Manual trigger from admin
 */
export async function POST(request: NextRequest) {
  // Optional auth check for cron
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!SLACK_WEBHOOK_URL) {
    return NextResponse.json(
      { error: "Slack webhook not configured" },
      { status: 400 }
    )
  }

  try {
    // Fetch portfolio data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const portfolioRes = await fetch(`${baseUrl}/api/integrations/portfolio?segment=all`)
    const portfolioData = await portfolioRes.json()

    if (!portfolioData.summaries) {
      return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 })
    }

    const summaries: PortfolioSummary[] = portfolioData.summaries

    // Calculate stats
    const atRisk = summaries.filter((s) => s.healthScore === "red")
    const monitor = summaries.filter((s) => s.healthScore === "yellow")
    const healthy = summaries.filter((s) => s.healthScore === "green")
    const totalMrr = summaries.reduce((sum, s) => sum + (s.mrr || 0), 0)
    const atRiskMrr = atRisk.reduce((sum, s) => sum + (s.mrr || 0), 0)

    // Build Slack message
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: ":chart_with_upwards_trend: Daily Portfolio Health Digest",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Total Accounts:*\n${summaries.length}`,
          },
          {
            type: "mrkdwn",
            text: `*Total MRR:*\n$${totalMrr.toLocaleString()}`,
          },
          {
            type: "mrkdwn",
            text: `*:red_circle: At Risk:*\n${atRisk.length} accounts`,
          },
          {
            type: "mrkdwn",
            text: `*:large_yellow_circle: Monitor:*\n${monitor.length} accounts`,
          },
        ],
      },
    ]

    // Add at-risk accounts section
    if (atRisk.length > 0) {
      blocks.push(
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*:rotating_light: At-Risk Accounts ($${atRiskMrr.toLocaleString()} MRR)*`,
          },
        }
      )

      // Show top 5 at-risk accounts
      const topAtRisk = atRisk.slice(0, 5)
      for (const account of topAtRisk) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${account.companyName}*\n${account.mrr ? `$${account.mrr.toLocaleString()}/mo` : "No MRR"} · ${account.riskSignals.slice(0, 2).join(", ") || "No signals"}`,
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "View",
              emoji: true,
            },
            url: `${baseUrl}/accounts/${account.companyId}`,
          },
        } as unknown)
      }

      if (atRisk.length > 5) {
        blocks.push({
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_+ ${atRisk.length - 5} more at-risk accounts_`,
            },
          ],
        } as unknown)
      }
    }

    // Health score distribution
    blocks.push(
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `:large_green_circle: ${healthy.length} Healthy · :large_yellow_circle: ${monitor.length} Monitor · :red_circle: ${atRisk.length} At Risk`,
          },
        ],
      } as unknown
    )

    // Action button
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Full Dashboard",
            emoji: true,
          },
          url: baseUrl,
          style: "primary",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "At-Risk Accounts",
            emoji: true,
          },
          url: `${baseUrl}/accounts?filter=at-risk`,
        },
      ],
    } as unknown)

    // Send to Slack
    const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    })

    if (!slackResponse.ok) {
      throw new Error(`Slack API error: ${slackResponse.status}`)
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: summaries.length,
        atRisk: atRisk.length,
        monitor: monitor.length,
        healthy: healthy.length,
        totalMrr,
        atRiskMrr,
      },
    })
  } catch (error) {
    console.error("Digest error:", error)
    return NextResponse.json(
      { error: "Failed to send digest" },
      { status: 500 }
    )
  }
}

/**
 * Get digest configuration OR trigger digest (for Vercel Cron)
 * GET /api/alerts/digest
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // If called from Vercel Cron with proper auth, trigger digest
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    if (!SLACK_WEBHOOK_URL) {
      return NextResponse.json({ error: "Slack webhook not configured" }, { status: 400 })
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
      const portfolioRes = await fetch(`${baseUrl}/api/integrations/portfolio?segment=all`)
      const portfolioData = await portfolioRes.json()

      if (!portfolioData.summaries) {
        return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 })
      }

      const summaries: PortfolioSummary[] = portfolioData.summaries
      const atRisk = summaries.filter((s) => s.healthScore === "red")
      const monitor = summaries.filter((s) => s.healthScore === "yellow")
      const healthy = summaries.filter((s) => s.healthScore === "green")
      const totalMrr = summaries.reduce((sum, s) => sum + (s.mrr || 0), 0)
      const atRiskMrr = atRisk.reduce((sum, s) => sum + (s.mrr || 0), 0)

      const blocks = [
        {
          type: "header",
          text: { type: "plain_text", text: ":chart_with_upwards_trend: Daily Portfolio Health Digest", emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Total Accounts:*\n${summaries.length}` },
            { type: "mrkdwn", text: `*Total MRR:*\n$${totalMrr.toLocaleString()}` },
            { type: "mrkdwn", text: `*:red_circle: At Risk:*\n${atRisk.length} accounts` },
            { type: "mrkdwn", text: `*:large_yellow_circle: Monitor:*\n${monitor.length} accounts` },
          ],
        },
        { type: "divider" },
        {
          type: "context",
          elements: [{
            type: "mrkdwn",
            text: `:large_green_circle: ${healthy.length} Healthy · :large_yellow_circle: ${monitor.length} Monitor · :red_circle: ${atRisk.length} At Risk`,
          }],
        },
        {
          type: "actions",
          elements: [
            { type: "button", text: { type: "plain_text", text: "View Dashboard", emoji: true }, url: baseUrl, style: "primary" },
          ],
        },
      ]

      await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      })

      return NextResponse.json({
        success: true,
        stats: { total: summaries.length, atRisk: atRisk.length, monitor: monitor.length, healthy: healthy.length, totalMrr, atRiskMrr },
      })
    } catch (error) {
      console.error("Digest cron error:", error)
      return NextResponse.json({ error: "Failed to send digest" }, { status: 500 })
    }
  }

  return NextResponse.json({
    configured: !!SLACK_WEBHOOK_URL,
    description: "Sends daily portfolio health summary to Slack",
    triggerMethod: "POST /api/alerts/digest or GET with CRON_SECRET",
    cronSchedule: "Weekdays at 8 AM UTC via Vercel Cron",
  })
}
