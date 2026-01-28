/**
 * Competitive Intelligence API
 *
 * GET /api/competitive - Get competitors with win/loss stats
 * POST /api/competitive - Add a new competitor
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { Competitor, CompetitiveIntel } from "@prisma/client"

interface CompetitorStat {
  id: string
  name: string
  website: string | null
  description: string | null
  strengths: string[]
  weaknesses: string[]
  battlecardUrl: string | null
  stats: {
    totalEncounters: number
    wins: number
    losses: number
    noDecision: number
    winRate: number
    wonValue: number
    lostValue: number
  }
  topLossReasons: Array<{ reason: string; count: number }>
  topFeatureGaps: Array<{ feature: string; count: number }>
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "90d"

    // Calculate date filter
    const periodDays: Record<string, number> = {
      "30d": 30,
      "90d": 90,
      "180d": 180,
      "365d": 365,
      all: 3650,
    }
    const days = periodDays[period] || 90
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get all competitors
    const competitors = await prisma.competitor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    })

    // Get win/loss stats for each competitor
    const competitorStats: CompetitorStat[] = await Promise.all(
      competitors.map(async (competitor: Competitor) => {
        // Get intel records for this competitor
        const intel = await prisma.competitiveIntel.findMany({
          where: {
            competitorId: competitor.id,
            reportedAt: { gte: startDate },
          },
        })

        const wins = intel.filter((i: CompetitiveIntel) => i.outcome === "won")
        const losses = intel.filter((i: CompetitiveIntel) => i.outcome === "lost")
        const noDecision = intel.filter((i: CompetitiveIntel) => i.outcome === "no_decision")

        const totalDeals = wins.length + losses.length
        const winRate = totalDeals > 0 ? (wins.length / totalDeals) * 100 : 0

        const wonValue = wins.reduce(
          (sum: number, i: CompetitiveIntel) => sum + (i.dealAmount || 0),
          0
        )
        const lostValue = losses.reduce(
          (sum: number, i: CompetitiveIntel) => sum + (i.dealAmount || 0),
          0
        )

        // Aggregate loss reasons
        const lossReasonCounts = new Map<string, number>()
        for (const loss of losses) {
          for (const reason of loss.lossReasons) {
            lossReasonCounts.set(reason, (lossReasonCounts.get(reason) || 0) + 1)
          }
        }

        // Aggregate feature gaps
        const featureGapCounts = new Map<string, number>()
        for (const loss of losses) {
          for (const gap of loss.featureGaps) {
            featureGapCounts.set(gap, (featureGapCounts.get(gap) || 0) + 1)
          }
        }

        return {
          id: competitor.id,
          name: competitor.name,
          website: competitor.website,
          description: competitor.description,
          strengths: competitor.strengths,
          weaknesses: competitor.weaknesses,
          battlecardUrl: competitor.battlecardUrl,
          stats: {
            totalEncounters: intel.length,
            wins: wins.length,
            losses: losses.length,
            noDecision: noDecision.length,
            winRate: Math.round(winRate),
            wonValue,
            lostValue,
          },
          topLossReasons: Array.from(lossReasonCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([reason, count]) => ({ reason, count })),
          topFeatureGaps: Array.from(featureGapCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([feature, count]) => ({ feature, count })),
        }
      })
    )

    // Overall summary
    const totalWins = competitorStats.reduce(
      (sum: number, c: CompetitorStat) => sum + c.stats.wins,
      0
    )
    const totalLosses = competitorStats.reduce(
      (sum: number, c: CompetitorStat) => sum + c.stats.losses,
      0
    )
    const totalEncounters = competitorStats.reduce(
      (sum: number, c: CompetitorStat) => sum + c.stats.totalEncounters,
      0
    )

    return NextResponse.json({
      period,
      summary: {
        totalCompetitors: competitors.length,
        totalEncounters,
        totalWins,
        totalLosses,
        overallWinRate:
          totalWins + totalLosses > 0
            ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
            : 0,
      },
      competitors: competitorStats.sort(
        (a, b) => b.stats.totalEncounters - a.stats.totalEncounters
      ),
    })
  } catch (error) {
    console.error("Competitive intelligence error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, website, description, strengths, weaknesses, battlecardUrl } = body

    if (!name) {
      return NextResponse.json({ error: "Competitor name is required" }, { status: 400 })
    }

    const competitor = await prisma.competitor.create({
      data: {
        name,
        website,
        description,
        strengths: strengths || [],
        weaknesses: weaknesses || [],
        battlecardUrl,
      },
    })

    return NextResponse.json(competitor, { status: 201 })
  } catch (error) {
    console.error("Create competitor error:", error)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Competitor with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
