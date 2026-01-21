import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Supports Resend API or generic SMTP via SMTP_* env vars
const RESEND_API_KEY = process.env.RESEND_API_KEY
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const EMAIL_FROM = process.env.EMAIL_FROM || "alerts@zerochurn.app"

type AlertType = "at_risk" | "health_change" | "renewal_upcoming" | "payment_failed" | "inactive" | "digest"

interface EmailAlert {
  type: AlertType
  to: string | string[]
  companyName?: string
  companyId?: string
  details: {
    healthScore?: "green" | "yellow" | "red" | "unknown"
    previousHealthScore?: "green" | "yellow" | "red" | "unknown"
    mrr?: number
    riskSignals?: string[]
    daysUntilRenewal?: number
    daysSinceLastLogin?: number
    message?: string
    // For digest
    stats?: {
      total: number
      atRisk: number
      monitor: number
      healthy: number
      totalMrr: number
      atRiskMrr: number
    }
    topAtRisk?: Array<{
      companyId: string
      companyName: string
      mrr: number | null
      riskSignals: string[]
    }>
  }
}

/**
 * Send alert via email
 * POST /api/alerts/email
 */
export async function POST(request: NextRequest) {
  const isConfigured = !!RESEND_API_KEY || (SMTP_HOST && SMTP_USER && SMTP_PASS)

  if (!isConfigured) {
    return NextResponse.json(
      { error: "Email not configured. Set RESEND_API_KEY or SMTP_* env variables." },
      { status: 400 }
    )
  }

  try {
    const alert: EmailAlert = await request.json()
    const recipients = Array.isArray(alert.to) ? alert.to : [alert.to]

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients specified" }, { status: 400 })
    }

    const { subject, html, text } = buildEmailContent(alert)

    // Send via Resend API
    if (RESEND_API_KEY) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: recipients,
          subject,
          html,
          text,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Resend API error: ${response.status} - ${error}`)
      }

      const result = await response.json()

      // Log the alert
      await logAlert(alert, "email", true)

      return NextResponse.json({ success: true, id: result.id })
    }

    // For SMTP, we'd use nodemailer or similar
    // For now, return not implemented for SMTP
    return NextResponse.json(
      { error: "SMTP sending not yet implemented. Use RESEND_API_KEY." },
      { status: 501 }
    )
  } catch (error) {
    console.error("Email alert error:", error)
    await logAlert({ type: "at_risk", to: "", details: {} } as EmailAlert, "email", false, String(error))
    return NextResponse.json(
      { error: "Failed to send email alert" },
      { status: 500 }
    )
  }
}

/**
 * Get email alert configuration status
 * GET /api/alerts/email
 */
export async function GET() {
  const isConfigured = !!RESEND_API_KEY || (SMTP_HOST && SMTP_USER && SMTP_PASS)

  return NextResponse.json({
    configured: isConfigured,
    provider: RESEND_API_KEY ? "resend" : SMTP_HOST ? "smtp" : null,
    from: EMAIL_FROM,
    supportedAlertTypes: [
      "at_risk",
      "health_change",
      "renewal_upcoming",
      "payment_failed",
      "inactive",
      "digest",
    ],
  })
}

function buildEmailContent(alert: EmailAlert): { subject: string; html: string; text: string } {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const subject = getEmailSubject(alert)

  // Build HTML email
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
    .card { background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
    .metric { display: inline-block; margin-right: 24px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #111; }
    .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .health-green { color: #10b981; }
    .health-yellow { color: #f59e0b; }
    .health-red { color: #ef4444; }
    .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px; }
    .btn-outline { background: white; color: #10b981; border: 1px solid #10b981; }
    .risk-signal { background: #fef2f2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 14px; margin: 4px 0; display: inline-block; }
    .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 20px;">${getAlertEmoji(alert.type)} ${subject}</h1>
  </div>
  <div class="content">
`

  // Add content based on alert type
  if (alert.type === "digest" && alert.details.stats) {
    const stats = alert.details.stats
    html += `
    <div class="card">
      <div class="metric">
        <div class="metric-value">${stats.total}</div>
        <div class="metric-label">Total Accounts</div>
      </div>
      <div class="metric">
        <div class="metric-value">$${stats.totalMrr.toLocaleString()}</div>
        <div class="metric-label">Total MRR</div>
      </div>
    </div>
    <div class="card">
      <div class="metric">
        <div class="metric-value health-green">${stats.healthy}</div>
        <div class="metric-label">Healthy</div>
      </div>
      <div class="metric">
        <div class="metric-value health-yellow">${stats.monitor}</div>
        <div class="metric-label">Monitor</div>
      </div>
      <div class="metric">
        <div class="metric-value health-red">${stats.atRisk}</div>
        <div class="metric-label">At Risk</div>
      </div>
    </div>
`
    if (alert.details.topAtRisk && alert.details.topAtRisk.length > 0) {
      html += `<h3 style="color: #ef4444;">At-Risk Accounts ($${stats.atRiskMrr.toLocaleString()} MRR)</h3>`
      for (const account of alert.details.topAtRisk.slice(0, 5)) {
        html += `
    <div class="card">
      <strong>${account.companyName}</strong><br>
      <span style="color: #6b7280;">${account.mrr ? `$${account.mrr.toLocaleString()}/mo` : "No MRR"}</span>
      ${account.riskSignals.length > 0 ? `<br><span class="risk-signal">${account.riskSignals[0]}</span>` : ""}
      <br><a href="${baseUrl}/accounts/${account.companyId}" style="color: #10b981; font-size: 14px;">View account →</a>
    </div>
`
      }
    }
  } else {
    // Individual alert
    html += `<div class="card">`

    if (alert.companyName) {
      html += `<h2 style="margin-top: 0;">${alert.companyName}</h2>`
    }

    if (alert.details.healthScore) {
      const healthClass = `health-${alert.details.healthScore}`
      html += `<p><strong>Health Score:</strong> <span class="${healthClass}">${alert.details.healthScore.toUpperCase()}</span></p>`
    }

    if (alert.details.previousHealthScore && alert.details.healthScore) {
      html += `<p>Changed from <strong>${alert.details.previousHealthScore}</strong> → <strong>${alert.details.healthScore}</strong></p>`
    }

    if (alert.details.mrr !== undefined) {
      html += `<p><strong>MRR:</strong> $${alert.details.mrr.toLocaleString()}/mo</p>`
    }

    if (alert.details.daysUntilRenewal !== undefined) {
      html += `<p><strong>Renewal in:</strong> ${alert.details.daysUntilRenewal} days</p>`
    }

    if (alert.details.daysSinceLastLogin !== undefined) {
      html += `<p><strong>Last login:</strong> ${alert.details.daysSinceLastLogin} days ago</p>`
    }

    if (alert.details.riskSignals && alert.details.riskSignals.length > 0) {
      html += `<p><strong>Risk Signals:</strong></p><ul>`
      for (const signal of alert.details.riskSignals) {
        html += `<li class="risk-signal">${signal}</li>`
      }
      html += `</ul>`
    }

    if (alert.details.message) {
      html += `<p>${alert.details.message}</p>`
    }

    html += `</div>`

    if (alert.companyId) {
      html += `<a href="${baseUrl}/accounts/${alert.companyId}" class="btn">View Account</a>`
    }
  }

  html += `
    <a href="${baseUrl}" class="btn btn-outline" style="margin-left: 8px;">Open Dashboard</a>
  </div>
  <div class="footer">
    <p>Sent by ZeroChurn • <a href="${baseUrl}/settings/notifications" style="color: #6b7280;">Manage notifications</a></p>
  </div>
</body>
</html>
`

  // Build plain text version
  let text = `${subject}\n\n`

  if (alert.type === "digest" && alert.details.stats) {
    const stats = alert.details.stats
    text += `Portfolio Summary:\n`
    text += `- Total Accounts: ${stats.total}\n`
    text += `- Total MRR: $${stats.totalMrr.toLocaleString()}\n`
    text += `- Healthy: ${stats.healthy}\n`
    text += `- Monitor: ${stats.monitor}\n`
    text += `- At Risk: ${stats.atRisk} ($${stats.atRiskMrr.toLocaleString()} MRR)\n`

    if (alert.details.topAtRisk && alert.details.topAtRisk.length > 0) {
      text += `\nAt-Risk Accounts:\n`
      for (const account of alert.details.topAtRisk.slice(0, 5)) {
        text += `- ${account.companyName}: ${account.mrr ? `$${account.mrr.toLocaleString()}/mo` : "No MRR"}\n`
      }
    }
  } else {
    if (alert.companyName) text += `Company: ${alert.companyName}\n`
    if (alert.details.healthScore) text += `Health Score: ${alert.details.healthScore}\n`
    if (alert.details.mrr !== undefined) text += `MRR: $${alert.details.mrr.toLocaleString()}/mo\n`
    if (alert.details.daysUntilRenewal !== undefined) text += `Renewal in: ${alert.details.daysUntilRenewal} days\n`
    if (alert.details.riskSignals && alert.details.riskSignals.length > 0) {
      text += `Risk Signals:\n${alert.details.riskSignals.map((s) => `- ${s}`).join("\n")}\n`
    }
    if (alert.details.message) text += `\n${alert.details.message}\n`
    if (alert.companyId) text += `\nView account: ${baseUrl}/accounts/${alert.companyId}\n`
  }

  text += `\nOpen Dashboard: ${baseUrl}`

  return { subject, html, text }
}

function getAlertEmoji(type: AlertType): string {
  const emojis: Record<AlertType, string> = {
    at_risk: "🚨",
    health_change: "📉",
    renewal_upcoming: "📅",
    payment_failed: "💳",
    inactive: "💤",
    digest: "📊",
  }
  return emojis[type]
}

function getEmailSubject(alert: EmailAlert): string {
  const titles: Record<AlertType, string> = {
    at_risk: `At-Risk Account: ${alert.companyName}`,
    health_change: `Health Score Changed: ${alert.companyName}`,
    renewal_upcoming: `Renewal Coming Up: ${alert.companyName}`,
    payment_failed: `Payment Failed: ${alert.companyName}`,
    inactive: `Inactive Account: ${alert.companyName}`,
    digest: "Daily Portfolio Health Digest",
  }
  return `[ZeroChurn] ${titles[alert.type]}`
}

async function logAlert(
  alert: EmailAlert,
  channel: string,
  success: boolean,
  error?: string
) {
  try {
    await prisma.alertLog.create({
      data: {
        type: alert.type,
        companyId: alert.companyId || null,
        companyName: alert.companyName || null,
        channel,
        payload: alert as unknown as Record<string, unknown>,
        success,
        error: error || null,
      },
    })
  } catch (e) {
    console.error("Failed to log alert:", e)
  }
}
