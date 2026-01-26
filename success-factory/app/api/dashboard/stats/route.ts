import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Dashboard Stats API
 *
 * GET /api/dashboard/stats
 *
 * Returns aggregate health metrics for the CSM dashboard
 */
export async function GET() {
  try {
    // Get basic counts
    const [
      totalCustomers,
      healthDistribution,
      paymentHealthDist,
      avgScores,
      atRiskCustomers,
      recentChurns,
      topCustomers,
    ] = await Promise.all([
      // Total customer count
      prisma.hubSpotCompany.count(),

      // Health score distribution
      prisma.hubSpotCompany.groupBy({
        by: ["healthScore"],
        _count: true,
        _sum: { mrr: true },
      }),

      // Payment health distribution
      prisma.hubSpotCompany.groupBy({
        by: ["paymentHealth"],
        _count: true,
      }),

      // Average scores
      prisma.hubSpotCompany.aggregate({
        _avg: {
          numericHealthScore: true,
          paymentScore: true,
          engagementScore: true,
          supportScore: true,
          growthScore: true,
          mrr: true,
        },
        _sum: { mrr: true },
      }),

      // At-risk customers (red health score, EXCLUDING churned)
      prisma.hubSpotCompany.findMany({
        where: {
          healthScore: "red",
          subscriptionStatus: { not: { contains: "churn" } },
        },
        select: {
          id: true,
          hubspotId: true,
          name: true,
          mrr: true,
          healthScore: true,
          numericHealthScore: true,
          riskSignals: true,
          ownerName: true,
          paymentHealth: true,
        },
        orderBy: { mrr: { sort: "desc", nulls: "last" } },
        take: 10,
      }),

      // Recent churns (subscription status contains "churn")
      prisma.hubSpotCompany.findMany({
        where: {
          subscriptionStatus: { contains: "churn", mode: "insensitive" },
        },
        select: {
          id: true,
          hubspotId: true,
          name: true,
          mrr: true,
          subscriptionStatus: true,
        },
        orderBy: { hubspotUpdatedAt: "desc" },
        take: 5,
      }),

      // Top customers by MRR
      prisma.hubSpotCompany.findMany({
        where: { mrr: { not: null } },
        select: {
          id: true,
          hubspotId: true,
          name: true,
          mrr: true,
          healthScore: true,
          numericHealthScore: true,
          totalTrips: true,
          plan: true,
        },
        orderBy: { mrr: "desc" },
        take: 10,
      }),
    ])

    // Calculate health distribution summary
    const healthSummary = healthDistribution.reduce(
      (acc, h) => ({
        ...acc,
        [h.healthScore || "unknown"]: {
          count: h._count,
          mrr: h._sum.mrr || 0,
        },
      }),
      {} as Record<string, { count: number; mrr: number }>
    )

    // Calculate payment health summary
    const paymentSummary = paymentHealthDist.reduce(
      (acc, h) => ({
        ...acc,
        [h.paymentHealth || "unknown"]: h._count,
      }),
      {} as Record<string, number>
    )

    // Calculate MRR at risk (red health score customers)
    const mrrAtRisk = atRiskCustomers.reduce((sum, c) => sum + (c.mrr || 0), 0)

    return NextResponse.json({
      overview: {
        totalCustomers,
        totalMrr: avgScores._sum.mrr || 0,
        avgMrr: avgScores._avg.mrr || 0,
        mrrAtRisk,
        avgHealthScore: Math.round(avgScores._avg.numericHealthScore || 0),
      },

      healthDistribution: healthSummary,

      componentScores: {
        payment: Math.round(avgScores._avg.paymentScore || 0),
        engagement: Math.round(avgScores._avg.engagementScore || 0),
        support: Math.round(avgScores._avg.supportScore || 0),
        growth: Math.round(avgScores._avg.growthScore || 0),
      },

      paymentHealth: paymentSummary,

      atRiskCustomers: atRiskCustomers.map((c) => ({
        id: c.id,
        hubspotId: c.hubspotId,
        name: c.name,
        mrr: c.mrr,
        healthScore: c.healthScore,
        numericScore: c.numericHealthScore,
        riskSignals: c.riskSignals,
        csm: c.ownerName,
        paymentHealth: c.paymentHealth,
      })),

      recentChurns,

      topCustomers: topCustomers.map((c) => ({
        id: c.id,
        hubspotId: c.hubspotId,
        name: c.name,
        mrr: c.mrr,
        healthScore: c.healthScore,
        numericScore: c.numericHealthScore,
        totalTrips: c.totalTrips,
        plan: c.plan,
      })),
    })
  } catch (error) {
    console.error("Dashboard stats failed:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard stats",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    )
  }
}
