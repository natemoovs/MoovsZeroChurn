import sgMail from "@sendgrid/mail"

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn("SendGrid not configured - SENDGRID_API_KEY not set")
    return false
  }

  const fromEmail = process.env.EMAIL_FROM || "alerts@moovs.io"

  try {
    await sgMail.send({
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
    })
    return true
  } catch (error) {
    console.error("SendGrid email error:", error)
    return false
  }
}

// Simple HTML to text converter
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

// Check if SendGrid is configured
export function isSendGridConfigured(): boolean {
  return !!SENDGRID_API_KEY
}

// ============================================================================
// Suppression Management (for Operator Hub)
// ============================================================================

interface SuppressionRecord {
  email: string
  created: number
  reason?: string
  status?: string
}

interface BounceRecord {
  email: string
  created: number
  reason: string
  status: string
}

interface BlockRecord {
  email: string
  created: number
  reason: string
  status: string
}

interface InvalidEmailRecord {
  email: string
  created: number
  reason: string
}

interface SpamReportRecord {
  email: string
  created: number
  ip?: string
}

/**
 * Get bounced emails from SendGrid
 */
export async function getBounces(email?: string): Promise<BounceRecord[]> {
  if (!SENDGRID_API_KEY) {
    throw new Error("SendGrid not configured")
  }

  const params = new URLSearchParams()
  if (email) params.set("email", email)

  const response = await fetch(
    `https://api.sendgrid.com/v3/suppression/bounces?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SendGrid API error: ${error}`)
  }

  return response.json()
}

/**
 * Get blocked emails from SendGrid
 */
export async function getBlocks(email?: string): Promise<BlockRecord[]> {
  if (!SENDGRID_API_KEY) {
    throw new Error("SendGrid not configured")
  }

  const params = new URLSearchParams()
  if (email) params.set("email", email)

  const response = await fetch(
    `https://api.sendgrid.com/v3/suppression/blocks?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SendGrid API error: ${error}`)
  }

  return response.json()
}

/**
 * Get invalid emails from SendGrid
 */
export async function getInvalidEmails(email?: string): Promise<InvalidEmailRecord[]> {
  if (!SENDGRID_API_KEY) {
    throw new Error("SendGrid not configured")
  }

  const params = new URLSearchParams()
  if (email) params.set("email", email)

  const response = await fetch(
    `https://api.sendgrid.com/v3/suppression/invalid_emails?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SendGrid API error: ${error}`)
  }

  return response.json()
}

/**
 * Get spam reports from SendGrid
 */
export async function getSpamReports(email?: string): Promise<SpamReportRecord[]> {
  if (!SENDGRID_API_KEY) {
    throw new Error("SendGrid not configured")
  }

  const params = new URLSearchParams()
  if (email) params.set("email", email)

  const response = await fetch(
    `https://api.sendgrid.com/v3/suppression/spam_reports?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SendGrid API error: ${error}`)
  }

  return response.json()
}

/**
 * Remove a bounce from SendGrid (delete from suppression list)
 */
export async function removeBounce(email: string): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    throw new Error("SendGrid not configured")
  }

  const response = await fetch(
    `https://api.sendgrid.com/v3/suppression/bounces/${encodeURIComponent(email)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  )

  // 204 No Content is success for DELETE
  return response.ok || response.status === 204
}

/**
 * Remove a block from SendGrid (delete from suppression list)
 */
export async function removeBlock(email: string): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    throw new Error("SendGrid not configured")
  }

  const response = await fetch(
    `https://api.sendgrid.com/v3/suppression/blocks/${encodeURIComponent(email)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  )

  // 204 No Content is success for DELETE
  return response.ok || response.status === 204
}

/**
 * Remove an invalid email from SendGrid (delete from suppression list)
 */
export async function removeInvalidEmail(email: string): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    throw new Error("SendGrid not configured")
  }

  const response = await fetch(
    `https://api.sendgrid.com/v3/suppression/invalid_emails/${encodeURIComponent(email)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  )

  // 204 No Content is success for DELETE
  return response.ok || response.status === 204
}

/**
 * Remove a spam report from SendGrid (delete from suppression list)
 */
export async function removeSpamReport(email: string): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    throw new Error("SendGrid not configured")
  }

  const response = await fetch(
    `https://api.sendgrid.com/v3/suppression/spam_reports/${encodeURIComponent(email)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  )

  // 204 No Content is success for DELETE
  return response.ok || response.status === 204
}

// Export suppression management functions
export const sendgridSuppressions = {
  getBounces,
  getBlocks,
  getInvalidEmails,
  getSpamReports,
  removeBounce,
  removeBlock,
  removeInvalidEmail,
  removeSpamReport,
}
