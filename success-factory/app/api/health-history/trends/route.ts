import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Get health score trends and recent changes
 * GET /api/health-history/trends
 */
export async function GET() {
  try {
    // Get snapshots from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const snapshots = await prisma.healthScoreSnapshot.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Group by company and find changes
    const companySnapshots = new Map<string, typeof snapshots>()
    for (const s of snapshots) {
      const existing = companySnapshots.get(s.companyId) || []
      existing.push(s)
      companySnapshots.set(s.companyId, existing)
    }

    // Detect changes
    const recentChanges: Array<{
      companyId: string
      companyName: string
      from: string
      to: string
      date: string
      mrr: number | null
    }> = []

    for (const [, companyData] of companySnapshots) {
      // Sort by date descending
      companyData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Check for health score changes
      for (let i = 0; i < companyData.length - 1; i++) {
        const current = companyData[i]
        const previous = companyData[i + 1]

        if (current.healthScore !== previous.healthScore) {
          recentChanges.push({
            companyId: current.companyId,
            companyName: current.companyName,
            from: previous.healthScore,
            to: current.healthScore,
            date: current.createdAt.toISOString(),
            mrr: current.mrr,
          })
        }
      }
    }

    // Sort changes by date
    recentChanges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Calculate overall trend
    const scoreOrder = { green: 3, yellow: 2, red: 1, unknown: 0 }
    let upgrades = 0
    let downgrades = 0

    for (const change of recentChanges) {
      const fromScore = scoreOrder[change.from as keyof typeof scoreOrder] || 0
      const toScore = scoreOrder[change.to as keyof typeof scoreOrder] || 0
      if (toScore > fromScore) upgrades++
      if (toScore < fromScore) downgrades++
    }

    let trend: "improving" | "declining" | "stable" | "unknown" = "stable"
    if (upgrades > downgrades * 1.5) trend = "improving"
    else if (downgrades > upgrades * 1.5) trend = "declining"
    else if (recentChanges.length === 0) trend = "unknown"

    // Get distribution over time
    const dailyDistribution: Array<{
      date: string
      green: number
      yellow: number
      red: number
    }> = []

    // Group snapshots by day
    const byDay = new Map<string, typeof snapshots>()
    for (const s of snapshots) {
      const day = s.createdAt.toISOString().split("T")[0]
      const existing = byDay.get(day) || []
      existing.push(s)
      byDay.set(day, existing)
    }

    // Calculate distribution per day (latest snapshot per company per day)
    for (const [day, daySnapshots] of byDay) {
      const latestByCompany = new Map<string, (typeof snapshots)[0]>()
      for (const s of daySnapshots) {
        const existing = latestByCompany.get(s.companyId)
        if (!existing || s.createdAt > existing.createdAt) {
          latestByCompany.set(s.companyId, s)
        }
      }

      let green = 0, yellow = 0, red = 0
      for (const s of latestByCompany.values()) {
        if (s.healthScore === "green") green++
        else if (s.healthScore === "yellow") yellow++
        else if (s.healthScore === "red") red++
      }

      dailyDistribution.push({ date: day, green, yellow, red })
    }

    // Sort by date
    dailyDistribution.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      trend,
      recentChanges: recentChanges.slice(0, 10),
      stats: {
        upgrades,
        downgrades,
        totalChanges: recentChanges.length,
      },
      dailyDistribution: dailyDistribution.slice(-7),
    })
  } catch (error) {
    console.error("Health trends error:", error)
    return NextResponse.json({
      trend: "unknown",
      recentChanges: [],
      stats: { upgrades: 0, downgrades: 0, totalChanges: 0 },
      dailyDistribution: [],
    })
  }
}
