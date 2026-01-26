/**
 * Customer Health Timeline API
 *
 * Returns a chronological timeline of health-related events for visualization:
 * - Health score changes
 * - Key activities (calls, emails, tasks)
 * - Payment events
 * - Expansion/contraction events
 * - Risk signals and resolutions
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface TimelineEvent {
  id: string
  date: Date
  type:
    | "health_change"
    | "activity"
    | "task"
    | "payment"
    | "expansion"
    | "risk_signal"
    | "milestone"
  category: "positive" | "negative" | "neutral" | "info"
  title: string
  description: string
  metadata?: Record<string, unknown>
  healthScore?: string
  mrrImpact?: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const searchParams = request.nextUrl.searchParams
  const daysBack = parseInt(searchParams.get("days") || "90")
  const limit = parseInt(searchParams.get("limit") || "100")

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)

  try {
    // Fetch all relevant data in parallel
    const [
      company,
      healthSnapshots,
      healthChanges,
      activities,
      tasks,
      expansions,
    ] = await Promise.all([
      // Company info
      prisma.hubSpotCompany.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          mrr: true,
          healthScore: true,
          createdAt: true,
          contractEndDate: true,
        },
      }),

      // Health snapshots for trend line
      prisma.healthScoreSnapshot.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          healthScore: true,
          mrr: true,
          totalTrips: true,
          riskSignals: true,
          positiveSignals: true,
          createdAt: true,
        },
      }),

      // Health changes
      prisma.healthChangeLog.findMany({
        where: {
          companyId,
          changedAt: { gte: startDate },
        },
        orderBy: { changedAt: "desc" },
      }),

      // Activity events
      prisma.activityEvent.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate },
        },
        orderBy: { occurredAt: "desc" },
        take: 50,
      }),

      // Tasks
      prisma.task.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),

      // Expansion opportunities
      prisma.expansionOpportunity.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Build timeline events
    const timeline: TimelineEvent[] = []

    // Add health changes
    for (const change of healthChanges) {
      const isImprovement = getHealthValue(change.newScore) > getHealthValue(change.previousScore)
      timeline.push({
        id: `health-${change.id}`,
        date: change.changedAt,
        type: "health_change",
        category: isImprovement ? "positive" : "negative",
        title: `Health: ${change.previousScore} → ${change.newScore}`,
        description: change.trigger || "Health score changed",
        healthScore: change.newScore,
        metadata: {
          previousScore: change.previousScore,
          newScore: change.newScore,
          riskSignals: change.riskSignals,
        },
      })
    }

    // Add activities
    for (const activity of activities) {
      const category = getActivityCategory(activity.importance, activity.eventType)
      timeline.push({
        id: `activity-${activity.id}`,
        date: activity.occurredAt,
        type: "activity",
        category,
        title: activity.title,
        description: activity.description || "",
        metadata: {
          source: activity.source,
          eventType: activity.eventType,
          ...(activity.metadata as Record<string, unknown>),
        },
      })
    }

    // Add completed tasks as milestones
    for (const task of tasks) {
      if (task.status === "completed" && task.completedAt) {
        timeline.push({
          id: `task-${task.id}`,
          date: task.completedAt,
          type: "task",
          category: "positive",
          title: `Task completed: ${task.title}`,
          description: task.description?.slice(0, 200) || "",
          metadata: {
            priority: task.priority,
          },
        })
      }
    }

    // Add expansion events
    for (const expansion of expansions) {
      const isWon = expansion.status === "won"
      const isLost = expansion.status === "lost"
      const potentialVal = expansion.potentialValue || 0
      const currentVal = expansion.currentValue || 0

      timeline.push({
        id: `expansion-${expansion.id}`,
        date: expansion.createdAt,
        type: "expansion",
        category: isWon ? "positive" : isLost ? "negative" : "info",
        title: `${expansion.type} opportunity ${expansion.status}`,
        description: `Potential value: $${potentialVal}/mo`,
        mrrImpact: isWon ? potentialVal - currentVal : 0,
        metadata: {
          type: expansion.type,
          status: expansion.status,
          confidence: expansion.confidence,
          currentValue: currentVal,
          potentialValue: potentialVal,
        },
      })
    }

    // Add milestone events
    const accountAge = Math.floor(
      (Date.now() - new Date(company.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Add customer anniversary if within period
    if (accountAge >= 365 && accountAge <= 365 + daysBack) {
      const anniversaryDate = new Date(company.createdAt)
      anniversaryDate.setFullYear(anniversaryDate.getFullYear() + 1)

      timeline.push({
        id: "milestone-anniversary",
        date: anniversaryDate,
        type: "milestone",
        category: "positive",
        title: "1 Year Anniversary",
        description: `${company.name} has been a customer for 1 year!`,
      })
    }

    // Add upcoming renewal warning if within period
    if (company.contractEndDate) {
      const renewalDate = new Date(company.contractEndDate)
      const daysUntilRenewal = Math.floor(
        (renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntilRenewal > 0 && daysUntilRenewal <= 60) {
        timeline.push({
          id: "milestone-renewal",
          date: renewalDate,
          type: "milestone",
          category: "info",
          title: "Contract Renewal",
          description: `Renewal in ${daysUntilRenewal} days`,
          metadata: { daysUntilRenewal },
        })
      }
    }

    // Sort by date descending and limit
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const limitedTimeline = timeline.slice(0, limit)

    // Build health trend data for charting
    const healthTrend = healthSnapshots.map((s) => ({
      date: s.createdAt,
      score: getHealthValue(s.healthScore) * 33,
      healthScore: s.healthScore,
      mrr: s.mrr,
    }))

    // Calculate summary stats
    const summary = {
      currentHealth: company.healthScore,
      currentMrr: company.mrr,
      healthChangesCount: healthChanges.length,
      improvementsCount: healthChanges.filter(
        (h) => getHealthValue(h.newScore) > getHealthValue(h.previousScore)
      ).length,
      declinesCount: healthChanges.filter(
        (h) => getHealthValue(h.newScore) < getHealthValue(h.previousScore)
      ).length,
      tasksCompleted: tasks.filter((t) => t.status === "completed").length,
      activitiesLogged: activities.length,
      expansionOpportunities: expansions.length,
      expansionWon: expansions.filter((e) => e.status === "won").length,
    }

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        mrr: company.mrr,
        healthScore: company.healthScore,
      },
      timeline: limitedTimeline,
      healthTrend,
      summary,
      period: {
        start: startDate,
        end: new Date(),
        days: daysBack,
      },
    })
  } catch (error) {
    console.error("[Health Timeline] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate timeline", details: String(error) },
      { status: 500 }
    )
  }
}

function getHealthValue(score: string | null | undefined): number {
  if (!score) return 0
  const values: Record<string, number> = {
    green: 3,
    yellow: 2,
    red: 1,
    churned: 0,
  }
  return values[score] || 1
}

function getActivityCategory(
  importance: string | null,
  eventType: string
): "positive" | "negative" | "neutral" | "info" {
  // Negative events
  if (
    eventType.includes("fail") ||
    eventType.includes("churn") ||
    eventType.includes("cancel") ||
    eventType.includes("dispute") ||
    importance === "critical"
  ) {
    return "negative"
  }

  // Positive events
  if (
    eventType.includes("success") ||
    eventType.includes("upgrade") ||
    eventType.includes("expansion") ||
    eventType.includes("completed") ||
    eventType.includes("won")
  ) {
    return "positive"
  }

  // Info events
  if (
    eventType.includes("created") ||
    eventType.includes("updated") ||
    eventType.includes("sync")
  ) {
    return "info"
  }

  return "neutral"
}
