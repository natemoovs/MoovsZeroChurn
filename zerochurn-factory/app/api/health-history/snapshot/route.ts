import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface PortfolioSummary {
  companyId: string
  companyName: string
  healthScore: "green" | "yellow" | "red" | "unknown"
  mrr: number | null
  riskSignals: string[]
  positiveSignals: string[]
  totalTrips?: number
  daysSinceLastLogin?: number | null
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

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Fetch current portfolio data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const portfolioRes = await fetch(`${baseUrl}/api/integrations/portfolio?segment=all&refresh=true`)
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

    const previousMap = new Map(
      previousSnapshots.map((s) => [s.companyId, s])
    )

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
      return scoreOrder[c.to as keyof typeof scoreOrder] < scoreOrder[c.from as keyof typeof scoreOrder]
    })

    return NextResponse.json({
      success: true,
      snapshotsCreated: result.count,
      changesDetected: changes.length,
      downgradesCount: downgrades.length,
      changes,
      downgrades,
    })
  } catch (error) {
    console.error("Health snapshot error:", error)
    return NextResponse.json(
      { error: "Failed to create health snapshots" },
      { status: 500 }
    )
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
    const portfolioRes = await fetch(`${baseUrl}/api/integrations/portfolio?segment=all&refresh=true`)
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

    const previousMap = new Map(
      previousSnapshots.map((s) => [s.companyId, s])
    )

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
      return scoreOrder[c.to as keyof typeof scoreOrder] < scoreOrder[c.from as keyof typeof scoreOrder]
    })

    return NextResponse.json({
      success: true,
      snapshotsCreated: result.count,
      changesDetected: changes.length,
      downgradesCount: downgrades.length,
      changes,
      downgrades,
    })
  } catch (error) {
    console.error("Health snapshot error:", error)
    return NextResponse.json(
      { error: "Failed to create health snapshots" },
      { status: 500 }
    )
  }
}
