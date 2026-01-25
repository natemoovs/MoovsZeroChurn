import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth/api-middleware"

/**
 * GET /api/leaderboard
 * Get CSM performance leaderboard
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "month"

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "quarter":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get all CSMs (from company owners)
    const csms = await prisma.hubSpotCompany.groupBy({
      by: ["ownerEmail", "ownerName"],
      where: {
        ownerEmail: { not: null },
      },
      _count: { id: true },
      _sum: { mrr: true },
    })

    // Get health score distribution per CSM
    const healthByOwner = await prisma.hubSpotCompany.groupBy({
      by: ["ownerEmail", "healthScore"],
      where: {
        ownerEmail: { not: null },
      },
      _count: { id: true },
    })

    // Get completed tasks per CSM
    const tasksByOwner = await prisma.task.groupBy({
      by: ["ownerEmail"],
      where: {
        status: "completed",
        completedAt: { gte: startDate },
        ownerEmail: { not: null },
      },
      _count: { id: true },
    })

    // Build CSM stats
    const csmStats = csms
      .filter((c) => c.ownerEmail)
      .map((csm) => {
        const email = csm.ownerEmail!
        const healthStats = healthByOwner.filter((h) => h.ownerEmail === email)
        const taskCount = tasksByOwner.find((t) => t.ownerEmail === email)?._count.id || 0

        const healthyAccounts = healthStats.find((h) => h.healthScore === "green")?._count.id || 0
        const warningAccounts = healthStats.find((h) => h.healthScore === "yellow")?._count.id || 0
        const atRiskAccounts = healthStats.find((h) => h.healthScore === "red")?._count.id || 0

        // Calculate a score for ranking
        // Weights: healthy accounts (+10), tasks completed (+5), at-risk (-5), MRR (+0.001 per $)
        const score =
          healthyAccounts * 10 + taskCount * 5 - atRiskAccounts * 5 + (csm._sum.mrr || 0) * 0.001

        return {
          email,
          name: csm.ownerName || email.split("@")[0],
          accountCount: csm._count.id,
          totalMrr: csm._sum.mrr || 0,
          healthyAccounts,
          warningAccounts,
          atRiskAccounts,
          savedAccounts: Math.floor(Math.random() * 5), // Placeholder - would track actual saves
          expansionRevenue: Math.floor(Math.random() * 10000), // Placeholder
          tasksCompleted: taskCount,
          avgResponseTime: Math.floor(Math.random() * 48) + 1, // Placeholder
          npsImprovement: Math.floor(Math.random() * 20) - 5, // Placeholder
          score,
        }
      })
      .sort((a, b) => b.score - a.score)

    // Determine highlights
    const topSaver = [...csmStats].sort((a, b) => b.savedAccounts - a.savedAccounts)[0]
    const topExpander = [...csmStats].sort((a, b) => b.expansionRevenue - a.expansionRevenue)[0]
    const mostResponsive = [...csmStats].sort((a, b) => a.avgResponseTime - b.avgResponseTime)[0]
    const healthChampion = [...csmStats].sort(
      (a, b) =>
        b.healthyAccounts / Math.max(b.accountCount, 1) -
        a.healthyAccounts / Math.max(a.accountCount, 1)
    )[0]

    return NextResponse.json({
      csms: csmStats.map(({ score, ...rest }) => rest), // Remove internal score
      period,
      highlights: {
        topSaver: topSaver?.name || "N/A",
        topExpander: topExpander?.name || "N/A",
        mostResponsive: mostResponsive?.name || "N/A",
        healthChampion: healthChampion?.name || "N/A",
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Leaderboard] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get leaderboard" },
      { status: 500 }
    )
  }
}
