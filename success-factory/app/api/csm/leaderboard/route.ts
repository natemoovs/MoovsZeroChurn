/**
 * CSM Performance Leaderboard & Metrics
 *
 * Tracks and ranks CSM performance based on:
 * - Save rate (prevented churns)
 * - Expansion revenue generated
 * - Task completion rate
 * - Account health improvements
 *
 * Note: CSMs are identified by ownerEmail from HubSpotCompany records
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface CSMMetrics {
  csmId: string
  csmName: string
  csmEmail: string
  accountCount: number
  totalMrr: number
  metrics: {
    savesThisMonth: number
    savedMrr: number
    expansionsThisMonth: number
    expansionMrr: number
    tasksCompleted: number
    taskCompletionRate: number
    healthImprovements: number
  }
  scores: {
    overall: number
    retention: number
    growth: number
    engagement: number
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get("period") || "month" // month, quarter, year

  try {
    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    switch (period) {
      case "week":
        startDate.setDate(now.getDate() - 7)
        break
      case "month":
        startDate.setMonth(now.getMonth() - 1)
        break
      case "quarter":
        startDate.setMonth(now.getMonth() - 3)
        break
      case "year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Get all unique CSMs by owner email from active companies
    const companiesByOwner = await prisma.hubSpotCompany.groupBy({
      by: ["ownerEmail", "ownerName", "ownerId"],
      where: {
        subscriptionStatus: "active",
        ownerEmail: { not: null },
      },
      _count: { id: true },
      _sum: { mrr: true },
    })

    const leaderboard: CSMMetrics[] = []

    for (const csmGroup of companiesByOwner) {
      if (!csmGroup.ownerEmail) continue

      // Get companies for this CSM
      const companies = await prisma.hubSpotCompany.findMany({
        where: {
          ownerEmail: csmGroup.ownerEmail,
          subscriptionStatus: "active",
        },
        select: {
          id: true,
          name: true,
          mrr: true,
          healthScore: true,
        },
      })

      const companyIds = companies.map((c) => c.id)

      // Get tasks completed in period
      const tasksCompleted = await prisma.task.count({
        where: {
          companyId: { in: companyIds },
          status: "completed",
          completedAt: { gte: startDate },
        },
      })

      const totalTasks = await prisma.task.count({
        where: {
          companyId: { in: companyIds },
          createdAt: { gte: startDate },
        },
      })

      // Get health changes (improvements)
      const healthChanges = await prisma.healthChangeLog.findMany({
        where: {
          companyId: { in: companyIds },
          changedAt: { gte: startDate },
        },
      })

      const healthImprovements = healthChanges.filter((h) => {
        const scoreMap: Record<string, number> = { red: 1, yellow: 2, green: 3 }
        const newVal = h.newScore ? scoreMap[h.newScore] || 0 : 0
        const prevVal = h.previousScore ? scoreMap[h.previousScore] || 0 : 0
        return newVal > prevVal
      }).length

      // Get saves (accounts that went from red/yellow to green)
      const saves = healthChanges.filter(
        (h) =>
          h.newScore === "green" && h.previousScore && ["red", "yellow"].includes(h.previousScore)
      )

      // Get expansions
      const expansions = await prisma.expansionOpportunity.findMany({
        where: {
          companyId: { in: companyIds },
          status: "won",
          updatedAt: { gte: startDate },
        },
      })

      const expansionMrr = expansions.reduce(
        (sum, e) => sum + ((e.potentialValue || 0) - (e.currentValue || 0)),
        0
      )

      // Calculate saved MRR
      const savedCompanyIds = saves.map((s) => s.companyId)
      const savedAccounts = companies.filter((c) =>
        savedCompanyIds.includes(c.id)
      )
      const savedMrr = savedAccounts.reduce((sum, a) => sum + (a.mrr || 0), 0)

      const currentMrr = csmGroup._sum.mrr || 0

      // Calculate scores (0-100)
      const taskCompletionRate =
        totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 100
      const retentionScore = calculateRetentionScore(companies)
      const growthScore = calculateGrowthScore(expansionMrr, currentMrr)
      const engagementScore = Math.min(100, taskCompletionRate)

      const overallScore = Math.round(
        retentionScore * 0.4 + growthScore * 0.3 + engagementScore * 0.3
      )

      leaderboard.push({
        csmId: csmGroup.ownerId || csmGroup.ownerEmail,
        csmName: csmGroup.ownerName || csmGroup.ownerEmail,
        csmEmail: csmGroup.ownerEmail,
        accountCount: csmGroup._count.id,
        totalMrr: currentMrr,
        metrics: {
          savesThisMonth: saves.length,
          savedMrr,
          expansionsThisMonth: expansions.length,
          expansionMrr,
          tasksCompleted,
          taskCompletionRate: Math.round(taskCompletionRate),
          healthImprovements,
        },
        scores: {
          overall: overallScore,
          retention: retentionScore,
          growth: growthScore,
          engagement: engagementScore,
        },
      })
    }

    // Sort by overall score
    leaderboard.sort((a, b) => b.scores.overall - a.scores.overall)

    // Add ranks
    const rankedLeaderboard = leaderboard.map((csm, index) => ({
      rank: index + 1,
      ...csm,
    }))

    // Calculate team totals
    const teamMetrics = {
      totalAccounts: leaderboard.reduce((sum, c) => sum + c.accountCount, 0),
      totalMrr: leaderboard.reduce((sum, c) => sum + c.totalMrr, 0),
      totalSaves: leaderboard.reduce((sum, c) => sum + c.metrics.savesThisMonth, 0),
      totalSavedMrr: leaderboard.reduce((sum, c) => sum + c.metrics.savedMrr, 0),
      totalExpansions: leaderboard.reduce(
        (sum, c) => sum + c.metrics.expansionsThisMonth,
        0
      ),
      totalExpansionMrr: leaderboard.reduce(
        (sum, c) => sum + c.metrics.expansionMrr,
        0
      ),
      avgTaskCompletion:
        leaderboard.length > 0
          ? Math.round(
              leaderboard.reduce((sum, c) => sum + c.metrics.taskCompletionRate, 0) /
                leaderboard.length
            )
          : 0,
      avgOverallScore:
        leaderboard.length > 0
          ? Math.round(
              leaderboard.reduce((sum, c) => sum + c.scores.overall, 0) /
                leaderboard.length
            )
          : 0,
    }

    return NextResponse.json({
      period,
      startDate,
      endDate: now,
      leaderboard: rankedLeaderboard,
      teamMetrics,
      topPerformers: getTopPerformers(leaderboard),
    })
  } catch (error) {
    console.error("[CSM Leaderboard] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate leaderboard", details: String(error) },
      { status: 500 }
    )
  }
}

function getTopPerformers(leaderboard: CSMMetrics[]) {
  if (leaderboard.length === 0) return null

  const topRetention = [...leaderboard].sort(
    (a, b) => b.scores.retention - a.scores.retention
  )[0]
  const topGrowth = [...leaderboard].sort(
    (a, b) => b.scores.growth - a.scores.growth
  )[0]
  const topEngagement = [...leaderboard].sort(
    (a, b) => b.scores.engagement - a.scores.engagement
  )[0]
  const mostSaves = [...leaderboard].sort(
    (a, b) => b.metrics.savesThisMonth - a.metrics.savesThisMonth
  )[0]

  return {
    retention: { name: topRetention.csmName, score: topRetention.scores.retention },
    growth: { name: topGrowth.csmName, score: topGrowth.scores.growth },
    engagement: { name: topEngagement.csmName, score: topEngagement.scores.engagement },
    mostSaves: { name: mostSaves.csmName, saves: mostSaves.metrics.savesThisMonth },
  }
}

function calculateRetentionScore(
  companies: Array<{
    healthScore: string | null
  }>
): number {
  if (companies.length === 0) return 50

  const healthScores: Record<string, number> = {
    green: 100,
    yellow: 60,
    red: 20,
  }

  const avgHealth =
    companies.reduce(
      (sum, c) => sum + (healthScores[c.healthScore || ""] || 50),
      0
    ) / companies.length

  return Math.max(0, Math.min(100, Math.round(avgHealth)))
}

function calculateGrowthScore(expansionMrr: number, totalMrr: number): number {
  if (totalMrr === 0) return 50

  const expansionRate = (expansionMrr / totalMrr) * 100

  // Score based on expansion rate
  // 0% = 30, 5% = 70, 10%+ = 100
  if (expansionRate >= 10) return 100
  if (expansionRate >= 5) return 70 + (expansionRate - 5) * 6
  if (expansionRate > 0) return 30 + expansionRate * 8

  return 30
}
