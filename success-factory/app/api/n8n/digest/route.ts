/**
 * n8n Daily Digest API
 *
 * Single endpoint for n8n to fetch all data needed for the daily CSM digest.
 * Uses N8N_WEBHOOK_SECRET for authentication (no session required).
 *
 * GET /api/n8n/digest
 * Header: x-webhook-secret: <N8N_WEBHOOK_SECRET>
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hubspot, metabase, getConfiguredIntegrations } from "@/lib/integrations"

export async function GET(request: NextRequest) {
  // Authenticate with webhook secret
  const secret = request.headers.get("x-webhook-secret")
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "N8N_WEBHOOK_SECRET not configured" },
      { status: 500 }
    )
  }

  if (secret !== expectedSecret) {
    return NextResponse.json(
      { error: "Invalid webhook secret" },
      { status: 401 }
    )
  }

  try {
    // Fetch dashboard stats
    const [
      totalCustomers,
      healthDistribution,
      avgScores,
      atRiskCustomers,
      recentChurns,
    ] = await Promise.all([
      prisma.hubSpotCompany.count({
        where: { healthScore: { not: "churned" } },
      }),
      prisma.hubSpotCompany.groupBy({
        by: ["healthScore"],
        _count: true,
        _sum: { mrr: true },
      }),
      prisma.hubSpotCompany.aggregate({
        where: { healthScore: { not: "churned" } },
        _avg: { numericHealthScore: true },
        _sum: { mrr: true },
      }),
      prisma.hubSpotCompany.findMany({
        where: {
          healthScore: "red",
          subscriptionStatus: { not: { contains: "churn" } },
        },
        select: {
          name: true,
          mrr: true,
          healthScore: true,
          riskSignals: true,
          ownerName: true,
        },
        orderBy: { mrr: { sort: "desc", nulls: "last" } },
        take: 10,
      }),
      prisma.hubSpotCompany.count({
        where: { healthScore: "churned" },
      }),
    ])

    // Calculate health distribution counts
    const healthCounts = healthDistribution.reduce(
      (acc, h) => ({
        ...acc,
        [h.healthScore || "unknown"]: h._count,
      }),
      {} as Record<string, number>
    )

    // Calculate MRR at risk
    const mrrAtRisk = atRiskCustomers.reduce((sum, c) => sum + (c.mrr || 0), 0)

    // Build priority alerts from at-risk customers
    const priorityAlerts = atRiskCustomers.map((c, i) => ({
      rank: i + 1,
      companyName: c.name,
      mrr: c.mrr || 0,
      riskSignals: c.riskSignals || [],
      csm: c.ownerName || "Unassigned",
      urgency: (c.mrr || 0) >= 200 ? "critical" : (c.mrr || 0) >= 100 ? "high" : "medium",
    }))

    // Count by urgency
    const criticalCount = priorityAlerts.filter(a => a.urgency === "critical").length
    const highCount = priorityAlerts.filter(a => a.urgency === "high").length

    return NextResponse.json({
      // Dashboard stats - flat structure for easy n8n access
      stats: {
        totalCustomers,
        totalMrr: Math.round(avgScores._sum.mrr || 0),
        mrrAtRisk: Math.round(mrrAtRisk),
        avgHealthScore: Math.round(avgScores._avg.numericHealthScore || 0),
        greenCount: healthCounts.green || 0,
        yellowCount: healthCounts.yellow || 0,
        redCount: healthCounts.red || 0,
        churnedCount: recentChurns,
      },

      // Priority alerts
      alerts: {
        total: priorityAlerts.length,
        critical: criticalCount,
        high: highCount,
        items: priorityAlerts,
      },

      // Metadata
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[n8n Digest] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate digest" },
      { status: 500 }
    )
  }
}
