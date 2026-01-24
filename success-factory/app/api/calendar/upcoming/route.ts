import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/calendar/upcoming
 * Get upcoming meetings that need prep (mocked - would integrate with Google Calendar)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerEmail = searchParams.get("ownerEmail")
    const days = parseInt(searchParams.get("days") || "7")

    // In production, this would fetch from Google Calendar API
    // For now, we'll generate mock meetings based on accounts that need attention

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() + days)

    // Get accounts with upcoming renewals or health issues
    const accounts = await prisma.hubSpotCompany.findMany({
      where: {
        ...(ownerEmail && { ownerEmail }),
        OR: [
          // Accounts with renewals in the date range
          {
            contractEndDate: {
              gte: new Date(),
              lte: cutoffDate,
            },
          },
          // At-risk accounts
          { healthScore: "red" },
          // Accounts that need check-ins (yellow health)
          { healthScore: "yellow" },
        ],
      },
      select: {
        hubspotId: true,
        name: true,
        healthScore: true,
        mrr: true,
        ownerEmail: true,
        ownerName: true,
        contractEndDate: true,
        primaryContactName: true,
        primaryContactEmail: true,
      },
      orderBy: [
        { contractEndDate: "asc" },
        { mrr: "desc" },
      ],
      take: 20,
    })

    // Generate suggested meetings
    const meetings = accounts.map((account, idx) => {
      const isRenewal = account.contractEndDate && new Date(account.contractEndDate) <= cutoffDate
      const meetingDate = new Date()
      meetingDate.setDate(meetingDate.getDate() + Math.min(idx + 1, days))
      meetingDate.setHours(10 + (idx % 6), 0, 0, 0) // Spread across business hours

      return {
        id: `meeting-${account.hubspotId}`,
        title: isRenewal
          ? `Renewal Discussion: ${account.name}`
          : account.healthScore === "red"
          ? `Health Check: ${account.name}`
          : `Quarterly Review: ${account.name}`,
        type: isRenewal ? "renewal" : account.healthScore === "red" ? "health_check" : "qbr",
        companyId: account.hubspotId,
        companyName: account.name,
        healthScore: account.healthScore,
        mrr: account.mrr,
        attendees: [
          { name: account.primaryContactName || "Primary Contact", email: account.primaryContactEmail },
          { name: account.ownerName || "CSM", email: account.ownerEmail },
        ].filter((a) => a.email),
        scheduledAt: meetingDate.toISOString(),
        duration: 30, // minutes
        prepNeeded: true,
        renewalDate: account.contractEndDate?.toISOString(),
      }
    })

    // Check which meetings already have prep tasks
    const existingPrepTasks = await prisma.task.findMany({
      where: {
        metadata: {
          path: ["meetingPrep"],
          equals: true,
        },
        companyId: { in: accounts.map((a) => a.hubspotId) },
        status: { not: "completed" },
      },
      select: { companyId: true },
    })

    const companiesWithPrep = new Set(existingPrepTasks.map((t) => t.companyId))
    const meetingsWithPrepStatus = meetings.map((m) => ({
      ...m,
      hasPrepTask: companiesWithPrep.has(m.companyId),
    }))

    return NextResponse.json({
      meetings: meetingsWithPrepStatus,
      totalMeetings: meetings.length,
      needingPrep: meetings.filter((m) => !companiesWithPrep.has(m.companyId)).length,
    })
  } catch (error) {
    console.error("[Calendar] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get calendar" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/calendar/upcoming
 * Create prep tasks for upcoming meetings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { meetings } = body

    if (!meetings?.length) {
      return NextResponse.json(
        { error: "meetings array required" },
        { status: 400 }
      )
    }

    const createdTasks = []

    for (const meeting of meetings) {
      // Check if prep task already exists
      const existing = await prisma.task.findFirst({
        where: {
          companyId: meeting.companyId,
          metadata: {
            path: ["meetingPrep"],
            equals: true,
          },
          status: { not: "completed" },
        },
      })

      if (existing) {
        continue
      }

      // Calculate due date (1 day before meeting)
      const meetingDate = new Date(meeting.scheduledAt)
      const dueDate = new Date(meetingDate)
      dueDate.setDate(dueDate.getDate() - 1)

      const task = await prisma.task.create({
        data: {
          companyId: meeting.companyId,
          companyName: meeting.companyName,
          title: `Prepare for: ${meeting.title}`,
          description: `**Meeting Details:**
- Type: ${meeting.type === "renewal" ? "Renewal Discussion" : meeting.type === "health_check" ? "Health Check" : "Quarterly Review"}
- Scheduled: ${meetingDate.toLocaleDateString()} at ${meetingDate.toLocaleTimeString()}
- Attendees: ${meeting.attendees?.map((a: { name: string }) => a.name).join(", ") || "TBD"}

**Prep Checklist:**
- [ ] Review account health and recent activity
- [ ] Check usage trends and adoption metrics
- [ ] Prepare talking points based on health signals
- [ ] Review any open support tickets
- [ ] Prepare renewal/expansion discussion if applicable`,
          priority: meeting.type === "renewal" ? "high" : "medium",
          status: "pending",
          ownerEmail: meeting.attendees?.find((a: { email: string }) => a.email?.includes("@"))?.email,
          dueDate,
          metadata: {
            meetingPrep: true,
            meetingId: meeting.id,
            meetingType: meeting.type,
            meetingDate: meeting.scheduledAt,
          },
        },
      })

      createdTasks.push(task)
    }

    return NextResponse.json({
      success: true,
      created: createdTasks.length,
      tasks: createdTasks,
    })
  } catch (error) {
    console.error("[Calendar Prep] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create prep tasks" },
      { status: 500 }
    )
  }
}
