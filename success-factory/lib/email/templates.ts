interface DigestData {
  recipientName: string
  date: string
  atRiskAccounts: Array<{
    name: string
    id: string
    healthScore: string
    riskSignals: string[]
  }>
  overdueTasks: Array<{
    title: string
    companyName: string
    dueDate: string
  }>
  upcomingRenewals: Array<{
    companyName: string
    renewalDate: string
    mrr: number
  }>
  healthChanges: Array<{
    companyName: string
    previousHealth: string
    currentHealth: string
  }>
  appUrl: string
}

export function buildDigestEmail(data: DigestData): string {
  const {
    recipientName,
    date,
    atRiskAccounts,
    overdueTasks,
    upcomingRenewals,
    healthChanges,
    appUrl,
  } = data

  const healthColors: Record<string, string> = {
    green: "#10b981",
    yellow: "#f59e0b",
    red: "#ef4444",
    unknown: "#6b7280",
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily CSM Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Daily CSM Digest
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                ${date}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 30px 20px;">
              <p style="margin: 0; color: #374151; font-size: 16px;">
                Hi ${recipientName},
              </p>
              <p style="margin: 10px 0 0; color: #6b7280; font-size: 14px;">
                Here's your daily summary of accounts that need attention.
              </p>
            </td>
          </tr>

          ${
            atRiskAccounts.length > 0
              ? `
          <!-- At-Risk Accounts -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <h2 style="margin: 0 0 15px; color: #ef4444; font-size: 16px; font-weight: 600; display: flex; align-items: center;">
                🚨 At-Risk Accounts (${atRiskAccounts.length})
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                ${atRiskAccounts
                  .map(
                    (account, i) => `
                <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <a href="${appUrl}/accounts/${account.id}" style="color: #10b981; text-decoration: none; font-weight: 500;">
                      ${account.name}
                    </a>
                    <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: ${healthColors[account.healthScore] || healthColors.unknown}20; color: ${healthColors[account.healthScore] || healthColors.unknown}; border-radius: 10px; font-size: 12px;">
                      ${account.healthScore}
                    </span>
                    ${
                      account.riskSignals.length > 0
                        ? `
                    <p style="margin: 5px 0 0; color: #6b7280; font-size: 12px;">
                      ${account.riskSignals.slice(0, 2).join(" • ")}
                    </p>
                    `
                        : ""
                    }
                  </td>
                </tr>
                `
                  )
                  .join("")}
              </table>
            </td>
          </tr>
          `
              : ""
          }

          ${
            healthChanges.length > 0
              ? `
          <!-- Health Changes -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <h2 style="margin: 0 0 15px; color: #f59e0b; font-size: 16px; font-weight: 600;">
                📉 Health Score Changes (${healthChanges.length})
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                ${healthChanges
                  .map(
                    (change, i) => `
                <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-weight: 500; color: #374151;">${change.companyName}</span>
                    <span style="margin-left: 8px; color: #6b7280;">
                      <span style="color: ${healthColors[change.previousHealth]}">${change.previousHealth}</span>
                      →
                      <span style="color: ${healthColors[change.currentHealth]}">${change.currentHealth}</span>
                    </span>
                  </td>
                </tr>
                `
                  )
                  .join("")}
              </table>
            </td>
          </tr>
          `
              : ""
          }

          ${
            overdueTasks.length > 0
              ? `
          <!-- Overdue Tasks -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <h2 style="margin: 0 0 15px; color: #ef4444; font-size: 16px; font-weight: 600;">
                ⏰ Overdue Tasks (${overdueTasks.length})
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                ${overdueTasks
                  .map(
                    (task, i) => `
                <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-weight: 500; color: #374151;">${task.title}</span>
                    <p style="margin: 4px 0 0; color: #6b7280; font-size: 12px;">
                      ${task.companyName} • Due: ${task.dueDate}
                    </p>
                  </td>
                </tr>
                `
                  )
                  .join("")}
              </table>
            </td>
          </tr>
          `
              : ""
          }

          ${
            upcomingRenewals.length > 0
              ? `
          <!-- Upcoming Renewals -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <h2 style="margin: 0 0 15px; color: #3b82f6; font-size: 16px; font-weight: 600;">
                📅 Upcoming Renewals (${upcomingRenewals.length})
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                ${upcomingRenewals
                  .map(
                    (renewal, i) => `
                <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-weight: 500; color: #374151;">${renewal.companyName}</span>
                    <p style="margin: 4px 0 0; color: #6b7280; font-size: 12px;">
                      $${renewal.mrr.toLocaleString()}/mo • Renews: ${renewal.renewalDate}
                    </p>
                  </td>
                </tr>
                `
                  )
                  .join("")}
              </table>
            </td>
          </tr>
          `
              : ""
          }

          <!-- CTA -->
          <tr>
            <td style="padding: 10px 30px 30px; text-align: center;">
              <a href="${appUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Open Dashboard
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                You're receiving this because you're subscribed to daily digests.
                <br>
                <a href="${appUrl}/settings" style="color: #10b981;">Manage preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

interface AlertEmailData {
  companyName: string
  companyId: string
  alertType: "health_drop" | "at_risk" | "renewal_upcoming"
  details: string
  appUrl: string
}

export function buildAlertEmail(data: AlertEmailData): string {
  const { companyName, companyId, alertType, details, appUrl } = data

  const alertConfig = {
    health_drop: {
      emoji: "📉",
      title: "Health Score Dropped",
      color: "#f59e0b",
    },
    at_risk: {
      emoji: "🚨",
      title: "Account At Risk",
      color: "#ef4444",
    },
    renewal_upcoming: {
      emoji: "📅",
      title: "Renewal Coming Up",
      color: "#3b82f6",
    },
  }

  const config = alertConfig[alertType]

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">${config.emoji}</div>
              <h1 style="margin: 0 0 8px; color: ${config.color}; font-size: 20px; font-weight: 600;">
                ${config.title}
              </h1>
              <p style="margin: 0 0 20px; color: #374151; font-size: 18px; font-weight: 500;">
                ${companyName}
              </p>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px;">
                ${details}
              </p>
              <a href="${appUrl}/accounts/${companyId}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">
                View Account
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
