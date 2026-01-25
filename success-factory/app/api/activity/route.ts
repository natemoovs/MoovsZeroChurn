import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth/api-middleware"

/**
 * GET /api/activity
 * Get activity feed for dashboard
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    const limit = parseInt(searchParams.get("limit") || "20")

    // Get recent activities from ActivityEvent table
    const activityEvents = await prisma.activityEvent.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { occurredAt: "desc" },
      take: Math.min(limit, 50),
    })

    // Transform to activity items
    const activities = activityEvents.map((event) => ({
      id: event.id,
      type: mapEventType(event.eventType),
      title: event.title,
      description: event.description,
      companyId: event.companyId,
      companyName: (event.metadata as Record<string, string>)?.companyName,
      userName: (event.metadata as Record<string, string>)?.userName,
      metadata: event.metadata as Record<string, unknown>,
      createdAt: event.occurredAt.toISOString(),
    }))

    // If no activity events, generate from recent data
    if (activities.length === 0) {
      const fallbackActivities = await generateFallbackActivities(companyId, limit)
      return NextResponse.json({ activities: fallbackActivities })
    }

    return NextResponse.json({ activities })
  } catch (error) {
    console.error("[Activity] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get activity" },
      { status: 500 }
    )
  }
}

function mapEventType(
  eventType: string
): "task_completed" | "health_change" | "renewal" | "expansion" | "note" | "escalation" {
  if (eventType.includes("task") || eventType.includes("complete")) return "task_completed"
  if (eventType.includes("health")) return "health_change"
  if (eventType.includes("renewal")) return "renewal"
  if (eventType.includes("expansion") || eventType.includes("upsell")) return "expansion"
  if (eventType.includes("escalat")) return "escalation"
  return "note"
}

async function generateFallbackActivities(companyId: string | null, limit: number) {
  const activities: Array<{
    id: string
    type: string
    title: string
    description?: string
    companyId?: string
    companyName?: string
    userName?: string
    createdAt: string
  }> = []

  // Get recent completed tasks
  const recentTasks = await prisma.task.findMany({
    where: {
      status: "completed",
      ...(companyId ? { companyId } : {}),
    },
    orderBy: { completedAt: "desc" },
    take: Math.floor(limit / 3),
  })

  for (const task of recentTasks) {
    activities.push({
      id: `task-${task.id}`,
      type: "task_completed",
      title: `Task completed: ${task.title}`,
      companyId: task.companyId,
      companyName: task.companyName,
      userName: task.ownerEmail?.split("@")[0],
      createdAt: task.completedAt?.toISOString() || task.updatedAt.toISOString(),
    })
  }

  // Get recent health changes
  const recentHealthChanges = await prisma.healthChangeLog.findMany({
    where: companyId ? { company: { hubspotId: companyId } } : {},
    include: { company: { select: { name: true, hubspotId: true } } },
    orderBy: { changedAt: "desc" },
    take: Math.floor(limit / 3),
  })

  for (const change of recentHealthChanges) {
    activities.push({
      id: `health-${change.id}`,
      type: "health_change",
      title: `Health score changed: ${change.previousScore || "new"} → ${change.newScore}`,
      companyId: change.company.hubspotId,
      companyName: change.company.name,
      createdAt: change.changedAt.toISOString(),
    })
  }

  // Sort by date
  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return activities.slice(0, limit)
}
