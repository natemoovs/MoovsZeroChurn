import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/email-logs
 *
 * Fetches email logs from the operator's platform.
 * Data comes from Snowflake's POSTGRES_SWOOP.EMAIL_LOG schema.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params

    if (!snowflake.isConfigured()) {
      return NextResponse.json(
        { error: "Snowflake/Metabase not configured" },
        { status: 503 }
      )
    }

    // Get limit from query params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "50", 10)

    // Fetch email logs
    const emailLogs = await snowflake.getOperatorEmailLog(operatorId, limit)

    // Calculate stats
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const recentLogs = emailLogs.filter(
      (log) => log.sent_at && new Date(log.sent_at) > sevenDaysAgo
    )
    const monthlyLogs = emailLogs.filter(
      (log) => log.sent_at && new Date(log.sent_at) > thirtyDaysAgo
    )

    // Count by status
    const statusCounts: Record<string, number> = {}
    for (const log of emailLogs) {
      const status = log.status || "unknown"
      statusCounts[status] = (statusCounts[status] || 0) + 1
    }

    // Count by template
    const templateCounts: Record<string, number> = {}
    for (const log of emailLogs) {
      const template = log.template_name || "unknown"
      templateCounts[template] = (templateCounts[template] || 0) + 1
    }

    // Check if Sendgrid is working (has recent successful emails)
    const hasRecentEmails = recentLogs.length > 0
    const failedCount = statusCounts["failed"] || statusCounts["bounced"] || 0
    const successCount = statusCounts["sent"] || statusCounts["delivered"] || 0

    // Determine email health status
    let emailHealthStatus: "healthy" | "warning" | "critical" | "unknown" = "unknown"
    if (emailLogs.length === 0) {
      emailHealthStatus = "unknown" // No email data
    } else if (!hasRecentEmails) {
      emailHealthStatus = "warning" // No recent emails
    } else if (failedCount > successCount * 0.1) {
      emailHealthStatus = "critical" // More than 10% failures
    } else {
      emailHealthStatus = "healthy"
    }

    return NextResponse.json({
      operatorId,
      emailLogs: emailLogs.map((log) => ({
        id: log.email_log_id,
        toEmail: log.to_email,
        subject: log.subject,
        template: log.template_name,
        sentAt: log.sent_at,
        status: log.status,
      })),
      stats: {
        total: emailLogs.length,
        last7Days: recentLogs.length,
        last30Days: monthlyLogs.length,
        statusCounts,
        templateCounts,
      },
      health: {
        status: emailHealthStatus,
        hasRecentEmails,
        failedCount,
        successCount,
        message:
          emailHealthStatus === "healthy"
            ? "Email delivery is working normally"
            : emailHealthStatus === "warning"
              ? "No recent emails sent - check Sendgrid configuration"
              : emailHealthStatus === "critical"
                ? "High email failure rate detected"
                : "No email data available",
      },
    })
  } catch (error) {
    console.error("Failed to fetch operator email logs:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch email logs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
