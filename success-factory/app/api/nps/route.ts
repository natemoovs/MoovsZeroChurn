import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { randomBytes } from "crypto"
import { requireAuth, isAuthError } from "@/lib/auth/api-middleware"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || "nps@successfactory.app"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL

/**
 * Get NPS data and calculate score
 * GET /api/nps?companyId=xxx&days=90
 */
export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get("companyId")
  const days = parseInt(searchParams.get("days") || "90")

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const where = {
      respondedAt: { not: null },
      sentAt: { gte: since },
      ...(companyId && { companyId }),
    }

    const responses = await prisma.nPSSurvey.findMany({
      where,
      orderBy: { respondedAt: "desc" },
    })

    // Calculate NPS score
    const promoters = responses.filter((r) => r.score !== null && r.score >= 9).length
    const detractors = responses.filter((r) => r.score !== null && r.score <= 6).length
    const total = responses.filter((r) => r.score !== null).length

    const npsScore = total > 0
      ? Math.round(((promoters - detractors) / total) * 100)
      : null

    // Get distribution
    const distribution = {
      promoters,
      passives: total - promoters - detractors,
      detractors,
      total,
    }

    // Get recent responses with comments
    const recentWithComments = responses
      .filter((r) => r.comment)
      .slice(0, 10)

    // Get pending surveys
    const pending = await prisma.nPSSurvey.count({
      where: {
        respondedAt: null,
        sentAt: { gte: since },
        ...(companyId && { companyId }),
      },
    })

    return NextResponse.json({
      npsScore,
      distribution,
      responses: responses.slice(0, 20),
      recentComments: recentWithComments,
      pending,
      period: { days, since: since.toISOString() },
    })
  } catch (error) {
    console.error("NPS fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch NPS data" },
      { status: 500 }
    )
  }
}

/**
 * Send NPS survey emails
 * POST /api/nps
 * Body: { companyId, companyName, contacts: [{ email, name }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, companyName, contacts, triggerType = "manual" } = body as {
      companyId: string
      companyName: string
      contacts: Array<{ email: string; name?: string }>
      triggerType?: "day_30" | "day_90" | "post_support" | "pre_renewal" | "quarterly" | "manual"
    }

    if (!companyId || !companyName || !contacts?.length) {
      return NextResponse.json(
        { error: "companyId, companyName, and contacts required" },
        { status: 400 }
      )
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email not configured (RESEND_API_KEY missing)" },
        { status: 500 }
      )
    }

    const baseUrl = APP_URL?.startsWith("http") ? APP_URL : `https://${APP_URL}`
    const results: Array<{ email: string; success: boolean; error?: string }> = []

    for (const contact of contacts) {
      const token = randomBytes(24).toString("hex")

      // Create survey record
      await prisma.nPSSurvey.create({
        data: {
          companyId,
          companyName,
          contactEmail: contact.email,
          contactName: contact.name,
          token,
          triggerType,
        },
      })

      // Build email HTML with 0-10 score buttons
      const scoreButtons = Array.from({ length: 11 }, (_, i) => {
        const color = i <= 6 ? "#ef4444" : i <= 8 ? "#f59e0b" : "#22c55e"
        const url = `${baseUrl}/api/nps/respond?token=${token}&score=${i}`
        return `<a href="${url}" style="display:inline-block;width:36px;height:36px;line-height:36px;text-align:center;background:${color};color:white;text-decoration:none;border-radius:4px;margin:2px;font-weight:bold;">${i}</a>`
      }).join("")

      const emailHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#18181b;">How likely are you to recommend us?</h2>
          <p style="color:#71717a;">Hi${contact.name ? ` ${contact.name}` : ""},</p>
          <p style="color:#71717a;">We'd love your feedback! On a scale of 0-10, how likely are you to recommend ${companyName}'s experience with us to a friend or colleague?</p>
          <div style="text-align:center;margin:30px 0;">
            <p style="color:#a1a1aa;font-size:12px;margin-bottom:10px;">Not likely &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Very likely</p>
            ${scoreButtons}
          </div>
          <p style="color:#a1a1aa;font-size:12px;">Click a number above to submit your response.</p>
        </div>
      `

      // Send email via Resend
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: contact.email,
            subject: `Quick question: How are we doing?`,
            html: emailHtml,
          }),
        })

        if (res.ok) {
          results.push({ email: contact.email, success: true })
        } else {
          const err = await res.text()
          results.push({ email: contact.email, success: false, error: err })
        }
      } catch (err) {
        results.push({
          email: contact.email,
          success: false,
          error: err instanceof Error ? err.message : "Send failed",
        })
      }
    }

    const sent = results.filter((r) => r.success).length
    return NextResponse.json({
      success: true,
      sent,
      failed: results.length - sent,
      results,
    })
  } catch (error) {
    console.error("NPS send error:", error)
    return NextResponse.json(
      { error: "Failed to send NPS surveys" },
      { status: 500 }
    )
  }
}
