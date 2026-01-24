import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || "alerts@successfactory.app"
const DIGEST_RECIPIENTS = process.env.DIGEST_EMAIL_RECIPIENTS?.split(",").map(e => e.trim()) || []

interface PortfolioSummary {
  companyId: string
  companyName: string
  healthScore: "green" | "yellow" | "red" | "unknown"
  mrr: number | null
  riskSignals: string[]
}

/**
 * Send daily email digest
 * POST /api/alerts/email-digest
 *
 * Can be triggered by:
 * - Cron job (e.g., Vercel cron)
 * - Manual trigger
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // Require CRON_SECRET for security - deny if not configured or doesn't match
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email not configured. Set RESEND_API_KEY." },
      { status: 400 }
    )
  }

  // Get recipients from body or env
  const body = await request.json().catch(() => ({}))
  const recipients = body.to || DIGEST_RECIPIENTS

  if (!recipients || recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients specified. Set DIGEST_EMAIL_RECIPIENTS or provide 'to' in body." },
      { status: 400 }
    )
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
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

    const stats = {
      total: summaries.length,
      atRisk: atRisk.length,
      monitor: monitor.length,
      healthy: healthy.length,
      totalMrr,
      atRiskMrr,
    }

    // Build email HTML
    const html = buildDigestEmail(stats, atRisk.slice(0, 5), baseUrl)
    const subject = `[Success Factory] Daily Portfolio Health Digest - ${new Date().toLocaleDateString()}`

    // Send via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: Array.isArray(recipients) ? recipients : [recipients],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Resend API error: ${response.status} - ${error}`)
    }

    // Log success
    await prisma.alertLog.create({
      data: {
        type: "digest",
        channel: "email",
        payload: { stats, recipients },
        success: true,
      },
    })

    return NextResponse.json({
      success: true,
      recipients,
      stats,
    })
  } catch (error) {
    console.error("Email digest error:", error)
    await prisma.alertLog.create({
      data: {
        type: "digest",
        channel: "email",
        payload: {},
        success: false,
        error: String(error),
      },
    }).catch(() => {})

    return NextResponse.json(
      { error: "Failed to send email digest" },
      { status: 500 }
    )
  }
}

/**
 * Get email digest config OR trigger digest (for Vercel Cron)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // If called from Vercel Cron with proper auth, trigger digest
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    const response = await POST(request)
    return response
  }

  return NextResponse.json({
    configured: !!RESEND_API_KEY && DIGEST_RECIPIENTS.length > 0,
    provider: RESEND_API_KEY ? "resend" : null,
    recipients: DIGEST_RECIPIENTS.length > 0 ? `${DIGEST_RECIPIENTS.length} configured` : "none",
    description: "Sends daily portfolio health summary via email",
  })
}

function buildDigestEmail(
  stats: {
    total: number
    atRisk: number
    monitor: number
    healthy: number
    totalMrr: number
    atRiskMrr: number
  },
  topAtRisk: PortfolioSummary[],
  baseUrl: string
): string {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Portfolio Health Digest</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6; }
    .container { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0 0 4px 0; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #111; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .health-row { display: flex; justify-content: space-between; margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; }
    .health-item { text-align: center; }
    .health-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 4px; }
    .dot-green { background: #10b981; }
    .dot-yellow { background: #f59e0b; }
    .dot-red { background: #ef4444; }
    .health-count { font-size: 24px; font-weight: bold; }
    .health-label { font-size: 12px; color: #6b7280; }
    .at-risk-section { border-top: 1px solid #e5e7eb; padding-top: 24px; }
    .at-risk-header { color: #ef4444; font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .account-card { background: #fef2f2; border: 1px solid #fecaca; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; }
    .account-name { font-weight: 600; color: #111; margin-bottom: 4px; }
    .account-meta { font-size: 14px; color: #6b7280; }
    .account-signal { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 12px; display: inline-block; margin-top: 8px; }
    .account-link { color: #10b981; text-decoration: none; font-size: 13px; }
    .btn { display: inline-block; background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px; }
    .btn-container { text-align: center; padding: 24px; border-top: 1px solid #e5e7eb; }
    .footer { text-align: center; padding: 16px; color: #9ca3af; font-size: 12px; }
    .footer a { color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Daily Portfolio Digest</h1>
      <p>${date}</p>
    </div>

    <div class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Total Accounts</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">$${stats.totalMrr.toLocaleString()}</div>
          <div class="stat-label">Total MRR</div>
        </div>
      </div>

      <div class="health-row">
        <div class="health-item">
          <span class="health-dot dot-green"></span>
          <span class="health-count" style="color: #10b981;">${stats.healthy}</span>
          <div class="health-label">Healthy</div>
        </div>
        <div class="health-item">
          <span class="health-dot dot-yellow"></span>
          <span class="health-count" style="color: #f59e0b;">${stats.monitor}</span>
          <div class="health-label">Monitor</div>
        </div>
        <div class="health-item">
          <span class="health-dot dot-red"></span>
          <span class="health-count" style="color: #ef4444;">${stats.atRisk}</span>
          <div class="health-label">At Risk</div>
        </div>
      </div>

      ${stats.atRisk > 0 ? `
      <div class="at-risk-section">
        <div class="at-risk-header">
          🚨 At-Risk Accounts ($${stats.atRiskMrr.toLocaleString()} MRR at risk)
        </div>
        ${topAtRisk.map(account => `
        <div class="account-card">
          <div class="account-name">${account.companyName}</div>
          <div class="account-meta">${account.mrr ? `$${account.mrr.toLocaleString()}/mo` : "No MRR data"}</div>
          ${account.riskSignals.length > 0 ? `<span class="account-signal">${account.riskSignals[0]}</span>` : ""}
          <div style="margin-top: 8px;">
            <a href="${baseUrl}/accounts/${account.companyId}" class="account-link">View account →</a>
          </div>
        </div>
        `).join("")}
        ${stats.atRisk > 5 ? `<p style="color: #6b7280; font-size: 14px; text-align: center;">+ ${stats.atRisk - 5} more at-risk accounts</p>` : ""}
      </div>
      ` : ""}
    </div>

    <div class="btn-container">
      <a href="${baseUrl}" class="btn">Open Dashboard</a>
    </div>

    <div class="footer">
      <p>Sent by Success Factory • <a href="${baseUrl}/settings/notifications">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>
`
}
