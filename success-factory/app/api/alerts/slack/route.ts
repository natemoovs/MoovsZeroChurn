import { NextRequest, NextResponse } from "next/server"

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

type AlertType = "at_risk" | "health_change" | "renewal_upcoming" | "payment_failed" | "inactive"

interface SlackAlert {
  type: AlertType
  companyName: string
  companyId?: string
  details: {
    healthScore?: "green" | "yellow" | "red" | "unknown"
    previousHealthScore?: "green" | "yellow" | "red" | "unknown"
    mrr?: number
    riskSignals?: string[]
    daysUntilRenewal?: number
    daysSinceLastLogin?: number
    message?: string
  }
}

// Using any for Slack blocks due to complex union types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SlackBlock = any

/**
 * Send alert to Slack
 * POST /api/alerts/slack
 */
export async function POST(request: NextRequest) {
  if (!SLACK_WEBHOOK_URL) {
    return NextResponse.json(
      { error: "Slack webhook not configured. Set SLACK_WEBHOOK_URL env variable." },
      { status: 400 }
    )
  }

  try {
    const alert: SlackAlert = await request.json()
    const slackPayload = buildSlackMessage(alert)

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Slack alert error:", error)
    return NextResponse.json(
      { error: "Failed to send Slack alert" },
      { status: 500 }
    )
  }
}

/**
 * Get alert configuration status
 * GET /api/alerts/slack
 */
export async function GET() {
  return NextResponse.json({
    configured: !!SLACK_WEBHOOK_URL,
    supportedAlertTypes: [
      "at_risk",
      "health_change",
      "renewal_upcoming",
      "payment_failed",
      "inactive",
    ],
  })
}

function buildSlackMessage(alert: SlackAlert) {
  const blocks: SlackBlock[] = []
  const emoji = getAlertEmoji(alert.type)
  const title = getAlertTitle(alert.type, alert.companyName)

  // Header
  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: `${emoji} ${title}`,
      emoji: true,
    },
  })

  // Details section
  const fields: Array<{ type: string; text: string }> = []

  if (alert.details.healthScore) {
    const healthEmoji = {
      green: ":large_green_circle:",
      yellow: ":large_yellow_circle:",
      red: ":red_circle:",
      unknown: ":white_circle:",
    }[alert.details.healthScore]
    fields.push({
      type: "mrkdwn",
      text: `*Health Score:*\n${healthEmoji} ${alert.details.healthScore.charAt(0).toUpperCase() + alert.details.healthScore.slice(1)}`,
    })
  }

  if (alert.details.mrr !== undefined) {
    fields.push({
      type: "mrkdwn",
      text: `*MRR:*\n$${alert.details.mrr.toLocaleString()}/mo`,
    })
  }

  if (alert.details.daysUntilRenewal !== undefined) {
    fields.push({
      type: "mrkdwn",
      text: `*Renewal In:*\n${alert.details.daysUntilRenewal} days`,
    })
  }

  if (alert.details.daysSinceLastLogin !== undefined) {
    fields.push({
      type: "mrkdwn",
      text: `*Last Login:*\n${alert.details.daysSinceLastLogin} days ago`,
    })
  }

  if (fields.length > 0) {
    blocks.push({
      type: "section",
      fields,
    })
  }

  // Risk signals
  if (alert.details.riskSignals && alert.details.riskSignals.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Risk Signals:*\n${alert.details.riskSignals.map((s) => `• ${s}`).join("\n")}`,
      },
    })
  }

  // Custom message
  if (alert.details.message) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: alert.details.message,
      },
    })
  }

  // Health change context
  if (alert.type === "health_change" && alert.details.previousHealthScore) {
    const prevEmoji = {
      green: ":large_green_circle:",
      yellow: ":large_yellow_circle:",
      red: ":red_circle:",
      unknown: ":white_circle:",
    }[alert.details.previousHealthScore]
    const newEmoji = {
      green: ":large_green_circle:",
      yellow: ":large_yellow_circle:",
      red: ":red_circle:",
      unknown: ":white_circle:",
    }[alert.details.healthScore || "unknown"]

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Health changed: ${prevEmoji} → ${newEmoji}`,
        },
      ],
    })
  }

  // Action buttons
  const actions: Array<{
    type: string
    text?: { type: string; text: string; emoji?: boolean }
    url?: string
    style?: string
  }> = []

  if (alert.companyId) {
    actions.push({
      type: "button",
      text: {
        type: "plain_text",
        text: "View Account",
        emoji: true,
      },
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/accounts/${alert.companyId}`,
    })
  }

  if (alert.type === "at_risk") {
    actions.push({
      type: "button",
      text: {
        type: "plain_text",
        text: "Run Churn Analysis",
        emoji: true,
      },
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/skills/churn-risk?company=${encodeURIComponent(alert.companyName)}`,
      style: "danger",
    })
  }

  if (actions.length > 0) {
    blocks.push({
      type: "actions",
      elements: actions,
    })
  }

  // Divider
  blocks.push({ type: "divider" })

  return { blocks }
}

function getAlertEmoji(type: AlertType): string {
  const emojis = {
    at_risk: ":rotating_light:",
    health_change: ":chart_with_downwards_trend:",
    renewal_upcoming: ":calendar:",
    payment_failed: ":credit_card:",
    inactive: ":zzz:",
  }
  return emojis[type]
}

function getAlertTitle(type: AlertType, companyName: string): string {
  const titles = {
    at_risk: `At-Risk Account: ${companyName}`,
    health_change: `Health Score Changed: ${companyName}`,
    renewal_upcoming: `Renewal Coming Up: ${companyName}`,
    payment_failed: `Payment Failed: ${companyName}`,
    inactive: `Inactive Account: ${companyName}`,
  }
  return titles[type]
}
