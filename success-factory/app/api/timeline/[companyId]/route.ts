import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/timeline/[companyId]
 * Get unified activity timeline for a company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const source = searchParams.get("source") // Filter by source
    const days = parseInt(searchParams.get("days") || "90") // Days to look back

    // Get company
    const company = await prisma.hubSpotCompany.findFirst({
      where: {
        OR: [{ hubspotId: companyId }, { id: companyId }],
      },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const actualCompanyId = company.hubspotId
    const since = new Date()
    since.setDate(since.getDate() - days)

    // Build query
    const where: Record<string, unknown> = {
      companyId: actualCompanyId,
      occurredAt: { gte: since },
    }

    if (source) {
      where.source = source
    }

    // Get activity events from our table
    const events = await prisma.activityEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: limit,
    })

    // Also get health changes as events
    const healthChanges = await prisma.healthChangeLog.findMany({
      where: {
        companyId: company.id,
        changedAt: { gte: since },
      },
      orderBy: { changedAt: "desc" },
      take: 20,
    })

    // Convert health changes to events format
    const healthEvents = healthChanges.map((hc) => ({
      id: hc.id,
      companyId: actualCompanyId,
      source: "platform",
      eventType: "health_changed",
      title: `Health: ${hc.previousScore || "unknown"} → ${hc.newScore}`,
      description:
        hc.riskSignals.length > 0
          ? `Risk signals: ${hc.riskSignals.slice(0, 3).join(", ")}`
          : null,
      metadata: {
        previousScore: hc.previousScore,
        newScore: hc.newScore,
        riskSignals: hc.riskSignals,
      },
      importance:
        hc.newScore === "red"
          ? "critical"
          : hc.newScore === "yellow"
          ? "high"
          : "normal",
      occurredAt: hc.changedAt,
      createdAt: hc.changedAt,
    }))

    // Get NPS responses
    const npsResponses = await prisma.nPSSurvey.findMany({
      where: {
        companyId: actualCompanyId,
        respondedAt: { not: null, gte: since },
      },
      orderBy: { respondedAt: "desc" },
      take: 10,
    })

    const npsEvents = npsResponses.map((nps) => ({
      id: nps.id,
      companyId: actualCompanyId,
      source: "nps",
      eventType: "nps_response",
      title: `NPS Response: ${nps.score} (${nps.category})`,
      description: nps.comment || null,
      metadata: {
        score: nps.score,
        category: nps.category,
        contactEmail: nps.contactEmail,
      },
      importance:
        nps.category === "detractor"
          ? "critical"
          : nps.category === "passive"
          ? "high"
          : "normal",
      occurredAt: nps.respondedAt,
      createdAt: nps.respondedAt,
    }))

    // Get tasks completed
    const tasks = await prisma.task.findMany({
      where: {
        companyId: actualCompanyId,
        status: "completed",
        completedAt: { gte: since },
      },
      orderBy: { completedAt: "desc" },
      take: 20,
    })

    const taskEvents = tasks.map((task) => ({
      id: task.id,
      companyId: actualCompanyId,
      source: "task",
      eventType: "task_completed",
      title: `Task: ${task.title}`,
      description: task.description,
      metadata: {
        priority: task.priority,
        ownerEmail: task.ownerEmail,
      },
      importance: "normal",
      occurredAt: task.completedAt,
      createdAt: task.completedAt,
    }))

    // Combine and sort all events
    const allEvents = [...events, ...healthEvents, ...npsEvents, ...taskEvents]
      .filter((e) => e.occurredAt !== null)
      .sort(
        (a, b) =>
          new Date(b.occurredAt!).getTime() - new Date(a.occurredAt!).getTime()
      )
      .slice(0, limit)

    // Group by date for UI
    const byDate = new Map<string, typeof allEvents>()
    for (const event of allEvents) {
      const date = new Date(event.occurredAt!).toISOString().split("T")[0]
      if (!byDate.has(date)) {
        byDate.set(date, [])
      }
      byDate.get(date)!.push(event)
    }

    const grouped = Array.from(byDate.entries()).map(([date, events]) => ({
      date,
      events,
    }))

    return NextResponse.json({
      companyId: actualCompanyId,
      companyName: company.name,
      events: allEvents,
      grouped,
      sources: ["platform", "nps", "task", "hubspot", "stripe", "support"],
    })
  } catch (error) {
    console.error("Failed to get timeline:", error)
    return NextResponse.json(
      { error: "Failed to get timeline" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/timeline/[companyId]
 * Log a custom activity event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const body = await request.json()
    const { source, eventType, title, description, metadata, importance } = body

    if (!source || !eventType || !title) {
      return NextResponse.json(
        { error: "source, eventType, and title required" },
        { status: 400 }
      )
    }

    // Get company
    const company = await prisma.hubSpotCompany.findFirst({
      where: {
        OR: [{ hubspotId: companyId }, { id: companyId }],
      },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const event = await prisma.activityEvent.create({
      data: {
        companyId: company.hubspotId,
        source,
        eventType,
        title,
        description,
        metadata,
        importance: importance || "normal",
        occurredAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error("Failed to log event:", error)
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 })
  }
}
