/**
 * Deal Sync API
 *
 * POST /api/sync/deals - Trigger a deal sync from HubSpot
 * GET /api/sync/deals - Get sync status and stats
 */

import { NextResponse } from "next/server"
import { runFullDealSync, syncDeals, syncPipelines } from "@/lib/sync/deal-sync"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { mode = "incremental" } = body as { mode?: "full" | "incremental" | "pipelines" }

    let result

    switch (mode) {
      case "full":
        result = await runFullDealSync()
        break
      case "pipelines":
        result = await syncPipelines()
        break
      case "incremental":
      default:
        // Sync deals modified in last 24 hours
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
        result = await syncDeals({ since })
        break
    }

    return NextResponse.json({
      success: true,
      mode,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Deal sync error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get deal stats
    const [
      totalDeals,
      openDeals,
      wonDeals,
      lostDeals,
      pipelineCount,
      stageCount,
      stageHistoryCount,
      lastSyncedDeal,
    ] = await Promise.all([
      prisma.deal.count(),
      prisma.deal.count({ where: { isClosed: false } }),
      prisma.deal.count({ where: { isWon: true } }),
      prisma.deal.count({ where: { isClosed: true, isWon: false } }),
      prisma.pipeline.count(),
      prisma.pipelineStage.count(),
      prisma.dealStageHistory.count(),
      prisma.deal.findFirst({
        orderBy: { lastSyncedAt: "desc" },
        select: { lastSyncedAt: true },
      }),
    ])

    // Get stage distribution for open deals
    const stageDistribution = await prisma.deal.groupBy({
      by: ["stageName"],
      where: { isClosed: false },
      _count: { id: true },
      _sum: { amount: true },
    })

    return NextResponse.json({
      stats: {
        totalDeals,
        openDeals,
        wonDeals,
        lostDeals,
        pipelineCount,
        stageCount,
        stageHistoryCount,
        lastSyncedAt: lastSyncedDeal?.lastSyncedAt,
      },
      stageDistribution: stageDistribution.map((s) => ({
        stage: s.stageName || "Unknown",
        count: s._count.id,
        totalValue: s._sum.amount || 0,
      })),
    })
  } catch (error) {
    console.error("Deal stats error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
