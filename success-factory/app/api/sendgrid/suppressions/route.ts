import { NextRequest, NextResponse } from "next/server"
import {
  isSendGridConfigured,
  sendgridSuppressions,
} from "@/lib/email/sendgrid"
import { requireAdmin, requireAuth } from "@/lib/auth/api-middleware"

/**
 * GET /api/sendgrid/suppressions
 *
 * Fetches email suppression lists from SendGrid.
 * Requires authentication.
 * Query params:
 * - type: "bounces" | "blocks" | "invalid" | "spam" | "all" (default: "all")
 * - email: Optional email to search for
 */
export async function GET(request: NextRequest) {
  // Require authentication for viewing suppressions
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    if (!isSendGridConfigured()) {
      return NextResponse.json({ error: "SendGrid not configured" }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "all"
    const email = searchParams.get("email") || undefined

    const result: {
      bounces?: Array<{ email: string; created: number; reason: string; status: string }>
      blocks?: Array<{ email: string; created: number; reason: string; status: string }>
      invalidEmails?: Array<{ email: string; created: number; reason: string }>
      spamReports?: Array<{ email: string; created: number; ip?: string }>
      summary?: {
        totalBounces: number
        totalBlocks: number
        totalInvalid: number
        totalSpam: number
      }
    } = {}

    // Fetch based on type
    if (type === "all" || type === "bounces") {
      result.bounces = await sendgridSuppressions.getBounces(email)
    }
    if (type === "all" || type === "blocks") {
      result.blocks = await sendgridSuppressions.getBlocks(email)
    }
    if (type === "all" || type === "invalid") {
      result.invalidEmails = await sendgridSuppressions.getInvalidEmails(email)
    }
    if (type === "all" || type === "spam") {
      result.spamReports = await sendgridSuppressions.getSpamReports(email)
    }

    // Add summary if fetching all
    if (type === "all") {
      result.summary = {
        totalBounces: result.bounces?.length || 0,
        totalBlocks: result.blocks?.length || 0,
        totalInvalid: result.invalidEmails?.length || 0,
        totalSpam: result.spamReports?.length || 0,
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to fetch SendGrid suppressions:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch suppressions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sendgrid/suppressions
 *
 * Remove an email from a suppression list.
 * Requires admin role.
 * Query params:
 * - type: "bounce" | "block" | "invalid" | "spam" (required)
 * - email: The email to remove (required)
 */
export async function DELETE(request: NextRequest) {
  // Require admin role for removing suppressions
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  try {
    if (!isSendGridConfigured()) {
      return NextResponse.json({ error: "SendGrid not configured" }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const email = searchParams.get("email")

    if (!type || !email) {
      return NextResponse.json(
        { error: "Both 'type' and 'email' query parameters are required" },
        { status: 400 }
      )
    }

    let success = false

    switch (type) {
      case "bounce":
        success = await sendgridSuppressions.removeBounce(email)
        break
      case "block":
        success = await sendgridSuppressions.removeBlock(email)
        break
      case "invalid":
        success = await sendgridSuppressions.removeInvalidEmail(email)
        break
      case "spam":
        success = await sendgridSuppressions.removeSpamReport(email)
        break
      default:
        return NextResponse.json(
          { error: "Invalid type. Must be: bounce, block, invalid, or spam" },
          { status: 400 }
        )
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Successfully removed ${email} from ${type} list`,
      })
    } else {
      return NextResponse.json(
        { error: "Failed to remove suppression" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Failed to remove SendGrid suppression:", error)
    return NextResponse.json(
      {
        error: "Failed to remove suppression",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
