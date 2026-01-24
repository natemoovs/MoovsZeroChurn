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
