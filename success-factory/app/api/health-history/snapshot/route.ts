import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Playbook action type
interface PlaybookAction {
  type: "create_task"
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  dueInDays?: number
}

/**
 * Execute playbooks based on triggers
 */
async function executePlaybooks(
  trigger: string,
  context: { companyId: string; companyName: string; mrr: number | null }
) {
  try {
    // Find active playbooks matching this trigger
    const playbooks = await prisma.playbook.findMany({
      where: {
        trigger,
        isActive: true,
      },
    })

    for (const playbook of playbooks) {
      const actions = playbook.actions as unknown as PlaybookAction[]

      for (const action of actions) {
        if (action.type === "create_task") {
          // Calculate due date
          const dueDate = action.dueInDays
            ? new Date(Date.now() + action.dueInDays * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Default 3 days

          await prisma.task.create({
            data: {
              companyId: context.companyId,
              companyName: context.companyName,
              title: action.title.replace("{companyName}", context.companyName),
              description: action.description?.replace("{companyName}", context.companyName),
              priority: action.priority || "medium",
              status: "pending",
              dueDate,
              playbookId: playbook.id,
              metadata: {
                trigger,
                mrr: context.mrr,
                createdBy: "playbook",
              },
            },
          })
        }
      }
    }
  } catch (error) {
    console.error("Playbook execution error:", error)
  }
}

interface PortfolioSummary {
  companyId: string
  companyName: string
  healthScore: "green" | "yellow" | "red" | "unknown"
  mrr: number | null
  riskSignals: string[]
  positiveSignals: string[]
  totalTrips?: number
  daysSinceLastLogin?: number | null
  // New fields from enhanced portfolio API
  tripsLast30Days?: number | null
  engagementStatus?: string | null
  vehiclesTotal?: number | null
  setupScore?: number | null
}

/**
 * Take a snapshot of all accounts' health scores
 * POST /api/health-history/snapshot
 *
 * This should be called daily (via cron) to build historical data
 */
export async function POST(request: NextRequest) {
  // Optional auth for cron
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // Require CRON_SECRET for security - deny if not configured or doesn't match
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Fetch current portfolio data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const portfolioRes = await fetch(
      `${baseUrl}/api/integrations/portfolio?segment=all&refresh=true`
    )
    const portfolioData = await portfolioRes.json()

    if (!portfolioData.summaries) {
      return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 })
    }

    const summaries: PortfolioSummary[] = portfolioData.summaries

    // Get previous snapshots to detect changes
    const previousSnapshots = await prisma.healthScoreSnapshot.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["companyId"],
    })

    const previousMap = new Map(previousSnapshots.map((s) => [s.companyId, s]))

    // Create snapshots for all accounts
    const snapshots = summaries.map((s) => ({
      companyId: s.companyId,
      companyName: s.companyName,
      healthScore: s.healthScore,
      mrr: s.mrr,
      totalTrips: s.totalTrips || null,
      daysSinceLastLogin: s.daysSinceLastLogin || null,
      riskSignals: s.riskSignals,
      positiveSignals: s.positiveSignals,
    }))

    // Batch insert
    const result = await prisma.healthScoreSnapshot.createMany({
      data: snapshots,
    })

    // Detect health score changes
    const changes: Array<{
      companyId: string
      companyName: string
      from: string
      to: string
      mrr: number | null
    }> = []

    for (const summary of summaries) {
      const previous = previousMap.get(summary.companyId)
      if (previous && previous.healthScore !== summary.healthScore) {
        changes.push({
          companyId: summary.companyId,
          companyName: summary.companyName,
          from: previous.healthScore,
          to: summary.healthScore,
          mrr: summary.mrr,
        })
      }
    }

    // Filter for negative changes (downgrades)
    const downgrades = changes.filter((c) => {
      const scoreOrder = { green: 3, yellow: 2, red: 1, unknown: 0 }
      return (
        scoreOrder[c.to as keyof typeof scoreOrder] < scoreOrder[c.from as keyof typeof scoreOrder]
      )
    })

    // Execute playbooks for health changes
    let tasksCreated = 0
    for (const downgrade of downgrades) {
      const context = {
        companyId: downgrade.companyId,
        companyName: downgrade.companyName,
        mrr: downgrade.mrr,
      }

      // Trigger appropriate playbook based on new health score
      if (downgrade.to === "red") {
        await executePlaybooks("health_drops_to_red", context)
        tasksCreated++
      } else if (downgrade.to === "yellow") {
        await executePlaybooks("health_drops_to_yellow", context)
        tasksCreated++
      }
    }

    // Also check for inactivity triggers
    for (const summary of summaries) {
      if (summary.daysSinceLastLogin && summary.daysSinceLastLogin >= 60) {
        await executePlaybooks("inactive_60_days", {
          companyId: summary.companyId,
          companyName: summary.companyName,
          mrr: summary.mrr,
        })
      } else if (summary.daysSinceLastLogin && summary.daysSinceLastLogin >= 30) {
        await executePlaybooks("inactive_30_days", {
          companyId: summary.companyId,
          companyName: summary.companyName,
          mrr: summary.mrr,
        })
      }

      // Low usage trigger
      if (summary.totalTrips !== undefined && summary.totalTrips < 5) {
        await executePlaybooks("low_usage", {
          companyId: summary.companyId,
          companyName: summary.companyName,
          mrr: summary.mrr,
        })
      }

      // Usage drop trigger - customer was active but stopped
      if (
        summary.totalTrips &&
        summary.totalTrips > 20 &&
        summary.tripsLast30Days !== undefined &&
        summary.tripsLast30Days === 0
      ) {
        await executePlaybooks("usage_stopped", {
          companyId: summary.companyId,
          companyName: summary.companyName,
          mrr: summary.mrr,
        })
      }

      // Low setup completion - onboarding risk
      if (summary.setupScore !== undefined && summary.setupScore < 30 && summary.mrr && summary.mrr > 0) {
        await executePlaybooks("low_setup_score", {
          companyId: summary.companyId,
          companyName: summary.companyName,
          mrr: summary.mrr,
        })
      }
    }

    return NextResponse.json({
      success: true,
      snapshotsCreated: result.count,
      changesDetected: changes.length,
      downgradesCount: downgrades.length,
      playbookTasksCreated: tasksCreated,
      changes,
      downgrades,
    })
  } catch (error) {
    console.error("Health snapshot error:", error)
    return NextResponse.json({ error: "Failed to create health snapshots" }, { status: 500 })
  }
}

/**
 * Get snapshot status OR trigger snapshot (for Vercel Cron)
 * GET /api/health-history/snapshot
 *
 * If called with CRON_SECRET authorization, triggers a snapshot.
 * Otherwise returns status info.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // If called from Vercel Cron with proper auth, trigger snapshot
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return triggerSnapshot()
  }

  // Otherwise return status
  try {
    const latestSnapshot = await prisma.healthScoreSnapshot.findFirst({
      orderBy: { createdAt: "desc" },
    })

    const totalSnapshots = await prisma.healthScoreSnapshot.count()

    const uniqueCompanies = await prisma.healthScoreSnapshot.groupBy({
      by: ["companyId"],
    })

    return NextResponse.json({
      configured: true,
      lastSnapshot: latestSnapshot?.createdAt || null,
      totalSnapshots,
      uniqueCompanies: uniqueCompanies.length,
    })
  } catch (error) {
    console.error("Health snapshot status error:", error)
    return NextResponse.json({
      configured: false,
      error: "Database not configured or accessible",
    })
  }
}

async function triggerSnapshot() {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
    const portfolioRes = await fetch(
      `${baseUrl}/api/integrations/portfolio?segment=all&refresh=true`
    )
    const portfolioData = await portfolioRes.json()

    if (!portfolioData.summaries) {
      return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 })
    }

    const summaries: PortfolioSummary[] = portfolioData.summaries

    const previousSnapshots = await prisma.healthScoreSnapshot.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["companyId"],
    })

    const previousMap = new Map(previousSnapshots.map((s) => [s.companyId, s]))

    const snapshots = summaries.map((s) => ({
      companyId: s.companyId,
      companyName: s.companyName,
      healthScore: s.healthScore,
      mrr: s.mrr,
      totalTrips: s.totalTrips || null,
      daysSinceLastLogin: s.daysSinceLastLogin || null,
      riskSignals: s.riskSignals,
      positiveSignals: s.positiveSignals,
    }))

    const result = await prisma.healthScoreSnapshot.createMany({
      data: snapshots,
    })

    const changes: Array<{
      companyId: string
      companyName: string
      from: string
      to: string
      mrr: number | null
    }> = []

    for (const summary of summaries) {
      const previous = previousMap.get(summary.companyId)
      if (previous && previous.healthScore !== summary.healthScore) {
        changes.push({
          companyId: summary.companyId,
          companyName: summary.companyName,
          from: previous.healthScore,
          to: summary.healthScore,
          mrr: summary.mrr,
        })
      }
    }

    const downgrades = changes.filter((c) => {
      const scoreOrder = { green: 3, yellow: 2, red: 1, unknown: 0 }
      return (
        scoreOrder[c.to as keyof typeof scoreOrder] < scoreOrder[c.from as keyof typeof scoreOrder]
      )
    })

    // Execute playbooks for health changes (same logic as POST)
    let tasksCreated = 0
    for (const downgrade of downgrades) {
      const context = {
        companyId: downgrade.companyId,
        companyName: downgrade.companyName,
        mrr: downgrade.mrr,
      }

      if (downgrade.to === "red") {
        await executePlaybooks("health_drops_to_red", context)
        tasksCreated++
      } else if (downgrade.to === "yellow") {
        await executePlaybooks("health_drops_to_yellow", context)
        tasksCreated++
      }
    }

    return NextResponse.json({
      success: true,
      snapshotsCreated: result.count,
      changesDetected: changes.length,
      downgradesCount: downgrades.length,
      playbookTasksCreated: tasksCreated,
      changes,
      downgrades,
    })
  } catch (error) {
    console.error("Health snapshot error:", error)
    return NextResponse.json({ error: "Failed to create health snapshots" }, { status: 500 })
  }
}
