/**
 * Deal Analytics API
 *
 * GET /api/analytics/deals - Get deal velocity, conversion rates, and pipeline metrics
 *
 * Query params:
 * - pipeline: Filter by pipeline ID
 * - owner: Filter by owner ID
 * - period: Time period (30d, 90d, 180d, 365d, all)
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { PipelineStage, Pipeline } from "@prisma/client"

type StageWithPipeline = PipelineStage & { pipeline: Pipeline }

interface OwnerStat {
  ownerId: string | null
  ownerName: string | null
  _count: { id: number }
  _sum: { amount: number | null }
}

interface OwnerWin {
  ownerId: string | null
  _count: { id: number }
  _sum: { amount: number | null }
}

interface TimeInStageGroup {
  fromStageId: string | null
  fromStageName: string | null
  _avg: { daysInPreviousStage: number | null }
  _min: { daysInPreviousStage: number | null }
  _max: { daysInPreviousStage: number | null }
  _count: { id: number }
}

interface LossReasonGroup {
  lostReason: string | null
  _count: { id: number }
  _sum: { amount: number | null }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const pipelineId = searchParams.get("pipeline")
    const ownerId = searchParams.get("owner")
    const period = searchParams.get("period") || "90d"

    // Calculate date filter
    const periodDays: Record<string, number> = {
      "30d": 30,
      "90d": 90,
      "180d": 180,
      "365d": 365,
      all: 3650, // ~10 years
    }
    const days = periodDays[period] || 90
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Build filters
    const dealFilters: Record<string, unknown> = {
      createDate: { gte: startDate },
    }
    if (pipelineId) dealFilters.pipelineId = pipelineId
    if (ownerId) dealFilters.ownerId = ownerId

    // Get pipeline stages for ordering
    const stages = await prisma.pipelineStage.findMany({
      where: pipelineId ? { pipelineId } : undefined,
      orderBy: { displayOrder: "asc" },
      include: { pipeline: true },
    })

    // === 1. Pipeline Summary ===
    const [totalDeals, openDeals, wonDeals, lostDeals, totalValue, wonValue] = await Promise.all([
      prisma.deal.count({ where: dealFilters }),
      prisma.deal.count({ where: { ...dealFilters, isClosed: false } }),
      prisma.deal.count({ where: { ...dealFilters, isWon: true } }),
      prisma.deal.count({ where: { ...dealFilters, isClosed: true, isWon: false } }),
      prisma.deal.aggregate({ where: dealFilters, _sum: { amount: true } }),
      prisma.deal.aggregate({ where: { ...dealFilters, isWon: true }, _sum: { amount: true } }),
    ])

    const winRate = totalDeals > 0 ? (wonDeals / (wonDeals + lostDeals)) * 100 : 0

    // === 2. Stage Conversion Funnel ===
    const stageHistory = await prisma.dealStageHistory.findMany({
      where: {
        changedAt: { gte: startDate },
        deal: pipelineId ? { pipelineId } : undefined,
      },
      include: {
        deal: { select: { isWon: true, isClosed: true, amount: true } },
      },
    })

    // Count deals that reached each stage and sum their values
    const stageReached = new Map<string, number>()
    const stageWon = new Map<string, number>()
    const stageValue = new Map<string, number>()
    for (const entry of stageHistory) {
      const current = stageReached.get(entry.toStageId) || 0
      stageReached.set(entry.toStageId, current + 1)
      const currentValue = stageValue.get(entry.toStageId) || 0
      stageValue.set(entry.toStageId, currentValue + (entry.deal.amount || 0))
      if (entry.deal.isWon) {
        const wonCurrent = stageWon.get(entry.toStageId) || 0
        stageWon.set(entry.toStageId, wonCurrent + 1)
      }
    }

    // Get current deals per stage for more accurate counts
    const currentDealsPerStage = await prisma.deal.groupBy({
      by: ["stageId"],
      where: { ...dealFilters, isClosed: false },
      _count: { id: true },
      _sum: { amount: true },
    })
    const currentStageMap = new Map(
      currentDealsPerStage.map((s) => [
        s.stageId,
        { count: s._count.id, value: s._sum.amount || 0 },
      ])
    )

    // Calculate stage-to-stage conversion rates
    const stageConversion = stages
      .filter((s: StageWithPipeline) => !s.isClosed)
      .map((stage: StageWithPipeline, index: number, arr: StageWithPipeline[]) => {
        const reached = stageReached.get(stage.id) || 0
        const current = currentStageMap.get(stage.id)
        const currentCount = current?.count || 0
        const currentValue = current?.value || 0
        // Use current deals if available, otherwise use reached
        const dealCount = currentCount > 0 ? currentCount : reached
        const totalValue = currentCount > 0 ? currentValue : stageValue.get(stage.id) || 0
        const nextStage = arr[index + 1]
        const movedToNext = nextStage ? stageReached.get(nextStage.id) || 0 : 0
        const conversionRate = reached > 0 ? (movedToNext / reached) * 100 : 0

        return {
          stageId: stage.id,
          stageName: stage.label,
          displayOrder: stage.displayOrder,
          dealsReached: reached,
          dealCount,
          totalValue,
          conversionToNext: nextStage ? Math.round(conversionRate) : null,
          winRate: reached > 0 ? Math.round(((stageWon.get(stage.id) || 0) / reached) * 100) : 0,
        }
      })

    // === 3. Time-in-Stage Analysis ===
    const timeInStage = await prisma.dealStageHistory.groupBy({
      by: ["fromStageId", "fromStageName"],
      where: {
        changedAt: { gte: startDate },
        fromStageId: { not: null },
        daysInPreviousStage: { not: null },
      },
      _avg: { daysInPreviousStage: true },
      _min: { daysInPreviousStage: true },
      _max: { daysInPreviousStage: true },
      _count: { id: true },
    })

    const stageVelocity = (timeInStage as TimeInStageGroup[]).map((t: TimeInStageGroup) => ({
      stageId: t.fromStageId,
      stageName: t.fromStageName || "Unknown",
      avgDays: Math.round(t._avg.daysInPreviousStage || 0),
      minDays: t._min.daysInPreviousStage || 0,
      maxDays: t._max.daysInPreviousStage || 0,
      dealCount: t._count.id,
    }))

    // === 4. Deal Velocity Metrics ===
    const velocityMetrics = await prisma.deal.aggregate({
      where: { ...dealFilters, isClosed: true },
      _avg: { daysInPipeline: true },
      _min: { daysInPipeline: true },
      _max: { daysInPipeline: true },
    })

    const wonVelocity = await prisma.deal.aggregate({
      where: { ...dealFilters, isWon: true },
      _avg: { daysInPipeline: true },
    })

    const lostVelocity = await prisma.deal.aggregate({
      where: { ...dealFilters, isClosed: true, isWon: false },
      _avg: { daysInPipeline: true },
    })

    // === 5. Stalled Deals (in stage > 14 days) ===
    const stalledDeals = await prisma.deal.findMany({
      where: {
        ...dealFilters,
        isClosed: false,
        daysInCurrentStage: { gte: 14 },
      },
      orderBy: { daysInCurrentStage: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        stageName: true,
        amount: true,
        daysInCurrentStage: true,
        ownerName: true,
        companyName: true,
      },
    })

    // === 6. Multi-Threading Analysis ===
    const multiThreadingDistribution = await prisma.deal.groupBy({
      by: ["multiThreadingScore"],
      where: { ...dealFilters, isClosed: false },
      _count: { id: true },
    })

    const singleThreadedDeals = await prisma.deal.count({
      where: { ...dealFilters, isClosed: false, contactCount: { lte: 1 } },
    })

    const avgMultiThreading = await prisma.deal.aggregate({
      where: { ...dealFilters, isClosed: false },
      _avg: { multiThreadingScore: true, contactCount: true },
    })

    // === 7. Owner Performance ===
    const ownerStats = await prisma.deal.groupBy({
      by: ["ownerId", "ownerName"],
      where: { ...dealFilters, ownerId: { not: null } },
      _count: { id: true },
      _sum: { amount: true },
    })

    const ownerWins = await prisma.deal.groupBy({
      by: ["ownerId"],
      where: { ...dealFilters, isWon: true, ownerId: { not: null } },
      _count: { id: true },
      _sum: { amount: true },
    })

    const ownerWinsMap = new Map((ownerWins as OwnerWin[]).map((o: OwnerWin) => [o.ownerId, o]))

    const ownerPerformance = (ownerStats as OwnerStat[])
      .map((o: OwnerStat) => {
        const wins = ownerWinsMap.get(o.ownerId) as OwnerWin | undefined
        return {
          ownerId: o.ownerId,
          ownerName: o.ownerName || "Unknown",
          totalDeals: o._count.id,
          totalValue: o._sum.amount || 0,
          wonDeals: wins?._count.id || 0,
          wonValue: wins?._sum.amount || 0,
          winRate: o._count.id > 0 ? Math.round(((wins?._count.id || 0) / o._count.id) * 100) : 0,
        }
      })
      .sort((a: { wonValue: number }, b: { wonValue: number }) => b.wonValue - a.wonValue)

    // === 8. Loss Reason Analysis ===
    const lossReasons = await prisma.deal.groupBy({
      by: ["lostReason"],
      where: { ...dealFilters, isClosed: true, isWon: false, lostReason: { not: null } },
      _count: { id: true },
      _sum: { amount: true },
    })

    return NextResponse.json({
      period,
      periodStart: startDate.toISOString(),
      summary: {
        totalDeals,
        openDeals,
        wonDeals,
        lostDeals,
        winRate: Math.round(winRate),
        totalPipelineValue: totalValue._sum.amount || 0,
        wonValue: wonValue._sum.amount || 0,
      },
      velocity: {
        avgDaysToClose: Math.round(velocityMetrics._avg.daysInPipeline || 0),
        avgDaysToWin: Math.round(wonVelocity._avg.daysInPipeline || 0),
        avgDaysToLoss: Math.round(lostVelocity._avg.daysInPipeline || 0),
        minDaysToClose: velocityMetrics._min.daysInPipeline || 0,
        maxDaysToClose: velocityMetrics._max.daysInPipeline || 0,
      },
      stageConversion,
      stageVelocity: stageVelocity.sort(
        (a: { stageId: string | null }, b: { stageId: string | null }) => {
          const stageA = stages.find((s: StageWithPipeline) => s.id === a.stageId)
          const stageB = stages.find((s: StageWithPipeline) => s.id === b.stageId)
          return (stageA?.displayOrder || 0) - (stageB?.displayOrder || 0)
        }
      ),
      stalledDeals,
      multiThreading: {
        avgScore: Math.round(avgMultiThreading._avg.multiThreadingScore || 0),
        avgContacts: Math.round((avgMultiThreading._avg.contactCount || 0) * 10) / 10,
        singleThreadedCount: singleThreadedDeals,
        singleThreadedPercent:
          openDeals > 0 ? Math.round((singleThreadedDeals / openDeals) * 100) : 0,
      },
      ownerPerformance: ownerPerformance.slice(0, 10),
      lossReasons: (lossReasons as LossReasonGroup[])
        .map((l: LossReasonGroup) => ({
          reason: l.lostReason || "Unknown",
          count: l._count.id,
          lostValue: l._sum.amount || 0,
        }))
        .sort((a: { count: number }, b: { count: number }) => b.count - a.count),
    })
  } catch (error) {
    console.error("Deal analytics error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
