import { NextRequest, NextResponse } from "next/server"
import { hubspot } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/emails
 *
 * Fetches email activity history for an operator from HubSpot.
 * Note: operatorId here is actually the HubSpot company ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params

    // Check HubSpot configuration
    if (!process.env.HUBSPOT_ACCESS_TOKEN) {
      return NextResponse.json({ error: "HubSpot not configured" }, { status: 503 })
    }

    // Fetch recent activity from HubSpot (includes emails)
    const activity = await hubspot.getRecentActivity(operatorId)

    // Calculate stats
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const recentEmails = activity.emails.filter((e) => new Date(e.timestamp) > thirtyDaysAgo)
    const weeklyEmails = activity.emails.filter((e) => new Date(e.timestamp) > sevenDaysAgo)

    return NextResponse.json({
      operatorId,
      emails: activity.emails.map((email) => ({
        id: email.id,
        subject: email.subject || "No subject",
        timestamp: email.timestamp,
        // HubSpot associations don't include full email body in basic fetch
        type: "email",
      })),
      calls: activity.calls.map((call) => ({
        id: call.id,
        disposition: call.disposition,
        duration: call.duration,
        timestamp: call.timestamp,
        type: "call",
      })),
      meetings: activity.meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        type: "meeting",
      })),
      notes: activity.notes.map((note) => ({
        id: note.id,
        body: note.body,
        timestamp: note.timestamp,
        type: "note",
      })),
      stats: {
        totalEmails: activity.emails.length,
        totalCalls: activity.calls.length,
        totalMeetings: activity.meetings.length,
        emailsLast30Days: recentEmails.length,
        emailsLast7Days: weeklyEmails.length,
      },
    })
  } catch (error) {
    console.error("Failed to fetch operator emails:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch email history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
