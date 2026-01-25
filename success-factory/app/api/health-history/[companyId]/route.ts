import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Get health score history for a specific company
 * GET /api/health-history/[companyId]?days=30
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const searchParams = request.nextUrl.searchParams
  const days = parseInt(searchParams.get("days") || "30", 10)

  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const snapshots = await prisma.healthScoreSnapshot.findMany({
      where: {
        companyId,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        healthScore: true,
        mrr: true,
        totalTrips: true,
        daysSinceLastLogin: true,
        riskSignals: true,
        positiveSignals: true,
        createdAt: true,
      },
    })

    // Calculate trend
    let trend: "improving" | "declining" | "stable" | "unknown" = "unknown"

    if (snapshots.length >= 2) {
      const recent = snapshots.slice(-7) // Last 7 snapshots
      const older = snapshots.slice(0, Math.min(7, snapshots.length - 7))

      const scoreValues = { green: 3, yellow: 2, red: 1, unknown: 0 }

      const recentAvg =
        recent.reduce((sum, s) => sum + scoreValues[s.healthScore as keyof typeof scoreValues], 0) /
        recent.length
      const olderAvg =
        older.length > 0
          ? older.reduce(
              (sum, s) => sum + scoreValues[s.healthScore as keyof typeof scoreValues],
              0
            ) / older.length
          : recentAvg

      if (recentAvg > olderAvg + 0.3) {
        trend = "improving"
      } else if (recentAvg < olderAvg - 0.3) {
        trend = "declining"
      } else {
        trend = "stable"
      }
    }

    // Get current health
    const current = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null

    // Count health score distribution over period
    const distribution = {
      green: snapshots.filter((s) => s.healthScore === "green").length,
      yellow: snapshots.filter((s) => s.healthScore === "yellow").length,
      red: snapshots.filter((s) => s.healthScore === "red").length,
      unknown: snapshots.filter((s) => s.healthScore === "unknown").length,
    }

    // Identify score changes
    const changes: Array<{
      from: string
      to: string
      date: Date
    }> = []

    for (let i = 1; i < snapshots.length; i++) {
      if (snapshots[i].healthScore !== snapshots[i - 1].healthScore) {
        changes.push({
          from: snapshots[i - 1].healthScore,
          to: snapshots[i].healthScore,
          date: snapshots[i].createdAt,
        })
      }
    }

    return NextResponse.json({
      companyId,
      snapshots: snapshots.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
      trend,
      current: current
        ? {
            healthScore: current.healthScore,
            mrr: current.mrr,
            riskSignals: current.riskSignals,
            positiveSignals: current.positiveSignals,
            asOf: current.createdAt.toISOString(),
          }
        : null,
      distribution,
      changes: changes.map((c) => ({
        ...c,
        date: c.date.toISOString(),
      })),
      totalSnapshots: snapshots.length,
      days,
    })
  } catch (error) {
    console.error("Health history fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch health history" }, { status: 500 })
  }
}
