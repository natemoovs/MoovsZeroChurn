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
    const pipelineIdParam = searchParams.get("pipeline") || searchParams.get("pipelineId")
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

    // Build pipeline filter (supports "moovs", "swoop", tier filters, specific ID, or "all")
    const tierParam = searchParams.get("tier") // smb, mid-market, enterprise, shuttle
    let pipelineFilter: { pipelineId?: string | { in: string[] } } = {}
    let stageFilter: { pipelineId?: string | { in: string[] } } = {}

    // First get base pipelines by segment (moovs/swoop)
    let basePipelines: { id: string; name: string }[] | null = null

    if (pipelineIdParam === "moovs") {
      basePipelines = await prisma.pipeline.findMany({
        where: { name: { contains: "Moovs", mode: "insensitive" } },
        select: { id: true, name: true },
      })
    } else if (pipelineIdParam === "swoop") {
      basePipelines = await prisma.pipeline.findMany({
        where: { name: { contains: "Swoop", mode: "insensitive" } },
        select: { id: true, name: true },
      })
    } else if (pipelineIdParam && pipelineIdParam !== "all") {
      // Specific pipeline ID
      pipelineFilter = { pipelineId: pipelineIdParam }
      stageFilter = { pipelineId: pipelineIdParam }
    }

    // Apply tier filter on top of segment filter
    if (basePipelines || (!pipelineIdParam || pipelineIdParam === "all")) {
      // If no segment filter, get all pipelines for tier filtering
      if (!basePipelines) {
        basePipelines = await prisma.pipeline.findMany({
          select: { id: true, name: true },
        })
      }

      if (tierParam && tierParam !== "all") {
        let filteredPipelines: typeof basePipelines = []

        if (tierParam === "smb") {
          filteredPipelines = basePipelines.filter((p) =>
            p.name.toLowerCase().includes("smb")
          )
        } else if (tierParam === "mid-market") {
          filteredPipelines = basePipelines.filter((p) =>
            p.name.toLowerCase().includes("mid-market") ||
            p.name.toLowerCase().includes("mid market")
          )
        } else if (tierParam === "enterprise") {
          filteredPipelines = basePipelines.filter((p) =>
            p.name.toLowerCase().includes("enterprise")
          )
        } else if (tierParam === "expansion") {
          filteredPipelines = basePipelines.filter((p) =>
            p.name.toLowerCase().includes("expansion")
          )
        } else if (tierParam === "marketplace") {
          // Swoop Marketplace/Ride
          filteredPipelines = basePipelines.filter((p) =>
            p.name.toLowerCase().includes("marketplace") ||
            p.name.toLowerCase().includes("ride")
          )
        } else if (tierParam === "recurring") {
          // Swoop Recurring
          filteredPipelines = basePipelines.filter((p) =>
            p.name.toLowerCase().includes("recurring")
          )
        }

        if (filteredPipelines.length > 0) {
          const ids = filteredPipelines.map((p) => p.id)
          pipelineFilter = { pipelineId: { in: ids } }
          stageFilter = { pipelineId: { in: ids } }
        }
      } else if (basePipelines.length > 0 && (pipelineIdParam === "moovs" || pipelineIdParam === "swoop")) {
        // Apply segment filter without tier
        const ids = basePipelines.map((p) => p.id)
        pipelineFilter = { pipelineId: { in: ids } }
        stageFilter = { pipelineId: { in: ids } }
      }
    }

    // Build filters
    const dealFilters: Record<string, unknown> = {
      createDate: { gte: startDate },
      ...pipelineFilter,
    }
    if (ownerId) dealFilters.ownerId = ownerId

    // Get pipeline stages for ordering
    const stages = await prisma.pipelineStage.findMany({
      where: stageFilter.pipelineId ? stageFilter : undefined,
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
        deal: pipelineFilter.pipelineId ? pipelineFilter : undefined,
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
    const rawStageConversion = stages
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

    // Deduplicate stages by name (aggregate values for same-named stages across pipelines)
    // and filter out stages with zero deals
    const stageByName = new Map<string, typeof rawStageConversion[0]>()
    for (const stage of rawStageConversion) {
      const existing = stageByName.get(stage.stageName)
      if (existing) {
        // Aggregate values
        existing.dealCount += stage.dealCount
        existing.totalValue += stage.totalValue
        existing.dealsReached += stage.dealsReached
        // Keep lower display order for sorting
        existing.displayOrder = Math.min(existing.displayOrder, stage.displayOrder)
      } else {
        stageByName.set(stage.stageName, { ...stage })
      }
    }

    // Filter out zero-deal stages and sort by display order
    const stageConversion = Array.from(stageByName.values())
      .filter((s) => s.dealCount > 0 || s.dealsReached > 0)
      .sort((a, b) => a.displayOrder - b.displayOrder)

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
    // Also include deals where daysInCurrentStage is null but they've been open a while
    const stalledDeals = await prisma.deal.findMany({
      where: {
        ...dealFilters,
        isClosed: false,
        OR: [
          { daysInCurrentStage: { gte: 14 } },
          { daysInCurrentStage: null, daysInPipeline: { gte: 14 } },
        ],
      },
      orderBy: { daysInCurrentStage: "desc" },
      select: {
        id: true,
        hubspotId: true,
        name: true,
        stageId: true,
        stageName: true,
        amount: true,
        daysInCurrentStage: true,
        daysInPipeline: true,
        ownerName: true,
        ownerId: true,
        companyName: true,
        contactCount: true,
        hasChampion: true,
        hasDecisionMaker: true,
        hasExecutiveSponsor: true,
        multiThreadingScore: true,
        competitorNames: true,
      },
    })

    // Calculate stalled deals aging buckets
    const stalledAgingBuckets = {
      bucket14to30: { count: 0, value: 0, deals: [] as typeof stalledDeals },
      bucket30to60: { count: 0, value: 0, deals: [] as typeof stalledDeals },
      bucket60plus: { count: 0, value: 0, deals: [] as typeof stalledDeals },
    }

    for (const deal of stalledDeals) {
      // Use daysInCurrentStage, fallback to daysInPipeline if null
      const days = deal.daysInCurrentStage ?? deal.daysInPipeline ?? 0
      const amount = deal.amount || 0
      if (days >= 60) {
        stalledAgingBuckets.bucket60plus.count++
        stalledAgingBuckets.bucket60plus.value += amount
        stalledAgingBuckets.bucket60plus.deals.push(deal)
      } else if (days >= 30) {
        stalledAgingBuckets.bucket30to60.count++
        stalledAgingBuckets.bucket30to60.value += amount
        stalledAgingBuckets.bucket30to60.deals.push(deal)
      } else {
        stalledAgingBuckets.bucket14to30.count++
        stalledAgingBuckets.bucket14to30.value += amount
        stalledAgingBuckets.bucket14to30.deals.push(deal)
      }
    }

    // Group stalled deals by stage NAME (not ID) to merge across pipelines
    const stalledByStage = new Map<string, { stageName: string; count: number; value: number; avgDays: number }>()
    for (const deal of stalledDeals) {
      const stageName = deal.stageName || "Unknown"
      const days = deal.daysInCurrentStage ?? deal.daysInPipeline ?? 0
      const existing = stalledByStage.get(stageName) || { stageName, count: 0, value: 0, avgDays: 0 }
      existing.count++
      existing.value += deal.amount || 0
      existing.avgDays = ((existing.avgDays * (existing.count - 1)) + days) / existing.count
      stalledByStage.set(stageName, existing)
    }

    // Group stalled deals by owner
    const stalledByOwner = new Map<string, { ownerName: string; count: number; value: number; avgDays: number }>()
    for (const deal of stalledDeals) {
      const ownerId = deal.ownerId || "unassigned"
      const existing = stalledByOwner.get(ownerId) || { ownerName: deal.ownerName || "Unassigned", count: 0, value: 0, avgDays: 0 }
      existing.count++
      existing.value += deal.amount || 0
      existing.avgDays = ((existing.avgDays * (existing.count - 1)) + (deal.daysInCurrentStage || 0)) / existing.count
      stalledByOwner.set(ownerId, existing)
    }

    const totalStalledValue = stalledDeals.reduce((sum, d) => sum + (d.amount || 0), 0)

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

    // Get lost deals for detailed analysis
    const lostDealsDetailed = await prisma.deal.findMany({
      where: { ...dealFilters, isClosed: true, isWon: false },
      select: {
        id: true,
        name: true,
        amount: true,
        stageName: true,
        stageId: true,
        ownerName: true,
        ownerId: true,
        lostReason: true,
        daysInPipeline: true,
        competitorNames: true,
        actualCloseDate: true,
        stage: {
          select: { displayOrder: true, probability: true },
        },
      },
    })

    // Categorize stages as early/mid/late based on display order
    const maxDisplayOrder = Math.max(...stages.map((s: StageWithPipeline) => s.displayOrder), 1)
    const stageOfLoss = {
      early: { count: 0, value: 0, stageNames: [] as string[] },
      mid: { count: 0, value: 0, stageNames: [] as string[] },
      late: { count: 0, value: 0, stageNames: [] as string[] },
    }

    for (const deal of lostDealsDetailed) {
      const order = deal.stage?.displayOrder || 0
      const normalizedPosition = order / maxDisplayOrder
      const amount = deal.amount || 0

      if (normalizedPosition <= 0.33) {
        stageOfLoss.early.count++
        stageOfLoss.early.value += amount
        if (deal.stageName && !stageOfLoss.early.stageNames.includes(deal.stageName)) {
          stageOfLoss.early.stageNames.push(deal.stageName)
        }
      } else if (normalizedPosition <= 0.66) {
        stageOfLoss.mid.count++
        stageOfLoss.mid.value += amount
        if (deal.stageName && !stageOfLoss.mid.stageNames.includes(deal.stageName)) {
          stageOfLoss.mid.stageNames.push(deal.stageName)
        }
      } else {
        stageOfLoss.late.count++
        stageOfLoss.late.value += amount
        if (deal.stageName && !stageOfLoss.late.stageNames.includes(deal.stageName)) {
          stageOfLoss.late.stageNames.push(deal.stageName)
        }
      }
    }

    // Get competitor breakdown from lost deals
    const competitorLosses = new Map<string, { count: number; value: number }>()
    for (const deal of lostDealsDetailed) {
      if (deal.competitorNames && deal.competitorNames.length > 0) {
        for (const competitor of deal.competitorNames) {
          const existing = competitorLosses.get(competitor) || { count: 0, value: 0 }
          existing.count++
          existing.value += deal.amount || 0
          competitorLosses.set(competitor, existing)
        }
      }
    }

    // Get loss by owner
    const lossByOwner = new Map<string, { ownerName: string; count: number; value: number; totalDeals: number; lossRate: number }>()
    for (const deal of lostDealsDetailed) {
      const ownerId = deal.ownerId || "unassigned"
      const existing = lossByOwner.get(ownerId) || { ownerName: deal.ownerName || "Unassigned", count: 0, value: 0, totalDeals: 0, lossRate: 0 }
      existing.count++
      existing.value += deal.amount || 0
      lossByOwner.set(ownerId, existing)
    }

    // Calculate loss rates from owner performance
    for (const owner of ownerPerformance) {
      const lossData = lossByOwner.get(owner.ownerId || "")
      if (lossData) {
        lossData.totalDeals = owner.totalDeals
        lossData.lossRate = owner.totalDeals > 0 ? Math.round((lossData.count / owner.totalDeals) * 100) : 0
      }
    }

    // Get loss trend by week (last 12 weeks)
    const lossTrend: { week: string; count: number; value: number }[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const weekLabel = `W${12 - i}`

      const weekLosses = lostDealsDetailed.filter((deal) => {
        const closeDate = deal.actualCloseDate ? new Date(deal.actualCloseDate) : null
        return closeDate && closeDate >= weekStart && closeDate < weekEnd
      })

      lossTrend.push({
        week: weekLabel,
        count: weekLosses.length,
        value: weekLosses.reduce((sum, d) => sum + (d.amount || 0), 0),
      })
    }

    // Calculate time-to-loss buckets
    const timeToLoss = {
      under30: { count: 0, value: 0, topReason: "" },
      days30to60: { count: 0, value: 0, topReason: "" },
      days60to90: { count: 0, value: 0, topReason: "" },
      over90: { count: 0, value: 0, topReason: "" },
    }

    const timeToLossReasons: Record<string, Map<string, number>> = {
      under30: new Map(),
      days30to60: new Map(),
      days60to90: new Map(),
      over90: new Map(),
    }

    for (const deal of lostDealsDetailed) {
      const days = deal.daysInPipeline || 0
      const amount = deal.amount || 0
      const reason = deal.lostReason || "Unknown"

      let bucket: keyof typeof timeToLoss
      if (days < 30) bucket = "under30"
      else if (days < 60) bucket = "days30to60"
      else if (days < 90) bucket = "days60to90"
      else bucket = "over90"

      timeToLoss[bucket].count++
      timeToLoss[bucket].value += amount
      const reasonCount = timeToLossReasons[bucket].get(reason) || 0
      timeToLossReasons[bucket].set(reason, reasonCount + 1)
    }

    // Find top reason per bucket
    for (const bucket of Object.keys(timeToLoss) as (keyof typeof timeToLoss)[]) {
      let maxCount = 0
      let topReason = "Unknown"
      for (const [reason, count] of timeToLossReasons[bucket]) {
        if (count > maxCount) {
          maxCount = count
          topReason = reason
        }
      }
      timeToLoss[bucket].topReason = topReason
    }

    // Calculate total lost value for percentages
    const totalLostValue = lostDealsDetailed.reduce((sum, d) => sum + (d.amount || 0), 0)
    const avgLossRate = wonDeals + lostDeals > 0 ? Math.round((lostDeals / (wonDeals + lostDeals)) * 100) : 0

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
        totalLostValue,
        avgLossRate,
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
      // Enhanced stalled deals data
      stalledDeals,
      stalledSummary: {
        totalCount: stalledDeals.length,
        totalValue: totalStalledValue,
        agingBuckets: {
          "14-30": { count: stalledAgingBuckets.bucket14to30.count, value: stalledAgingBuckets.bucket14to30.value },
          "30-60": { count: stalledAgingBuckets.bucket30to60.count, value: stalledAgingBuckets.bucket30to60.value },
          "60+": { count: stalledAgingBuckets.bucket60plus.count, value: stalledAgingBuckets.bucket60plus.value },
        },
        byStage: Array.from(stalledByStage.entries())
          .map(([stageName, data]) => ({
            stageId: stageName, // Using stage name as ID for cross-pipeline grouping
            ...data,
            avgDays: Math.round(data.avgDays),
          }))
          .sort((a, b) => b.value - a.value),
        byOwner: Array.from(stalledByOwner.entries())
          .map(([ownerId, data]) => ({
            ownerId,
            ...data,
            avgDays: Math.round(data.avgDays),
          }))
          .sort((a, b) => b.value - a.value),
      },
      multiThreading: {
        avgScore: Math.round(avgMultiThreading._avg.multiThreadingScore || 0),
        avgContacts: Math.round((avgMultiThreading._avg.contactCount || 0) * 10) / 10,
        singleThreadedCount: singleThreadedDeals,
        singleThreadedPercent:
          openDeals > 0 ? Math.round((singleThreadedDeals / openDeals) * 100) : 0,
      },
      ownerPerformance: ownerPerformance.slice(0, 10),
      // Enhanced loss analysis data
      lossReasons: (lossReasons as LossReasonGroup[])
        .map((l: LossReasonGroup) => ({
          reason: l.lostReason || "Unknown",
          count: l._count.id,
          lostValue: l._sum.amount || 0,
          percentage: totalLostValue > 0 ? Math.round(((l._sum.amount || 0) / totalLostValue) * 100) : 0,
        }))
        .sort((a, b) => b.lostValue - a.lostValue),
      lossAnalysis: {
        totalLostValue,
        totalLostDeals: lostDeals,
        avgLossSize: lostDeals > 0 ? Math.round(totalLostValue / lostDeals) : 0,
        avgDaysToLoss: Math.round(lostVelocity._avg.daysInPipeline || 0),
        stageOfLoss: {
          early: {
            ...stageOfLoss.early,
            percentage: totalLostValue > 0 ? Math.round((stageOfLoss.early.value / totalLostValue) * 100) : 0,
          },
          mid: {
            ...stageOfLoss.mid,
            percentage: totalLostValue > 0 ? Math.round((stageOfLoss.mid.value / totalLostValue) * 100) : 0,
          },
          late: {
            ...stageOfLoss.late,
            percentage: totalLostValue > 0 ? Math.round((stageOfLoss.late.value / totalLostValue) * 100) : 0,
          },
        },
        competitorLosses: Array.from(competitorLosses.entries())
          .map(([competitor, data]) => ({
            competitor,
            ...data,
          }))
          .sort((a, b) => b.value - a.value),
        byOwner: Array.from(lossByOwner.entries())
          .map(([ownerId, data]) => ({
            ownerId,
            ...data,
          }))
          .sort((a, b) => b.value - a.value),
        timeToLoss,
        trend: lossTrend,
      },
    })
  } catch (error) {
    console.error("Deal analytics error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
