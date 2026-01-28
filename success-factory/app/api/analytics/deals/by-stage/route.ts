/**
 * Deals by Stage API
 *
 * GET /api/analytics/deals/by-stage - Get deals in a specific pipeline stage
 *
 * Query params:
 * - stageId: Required - The stage ID to filter by
 * - period: Time period (30d, 90d, 180d, 365d, all)
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stageId = searchParams.get("stageId")
    const period = searchParams.get("period") || "90d"

    if (!stageId) {
      return NextResponse.json({ error: "stageId is required" }, { status: 400 })
    }

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

    // Fetch deals in this stage
    const deals = await prisma.deal.findMany({
      where: {
        stageId,
        isClosed: false,
        createDate: { gte: startDate },
      },
      orderBy: [{ amount: "desc" }, { createDate: "desc" }],
      select: {
        id: true,
        hubspotId: true,
        name: true,
        companyName: true,
        amount: true,
        ownerName: true,
        daysInCurrentStage: true,
        createDate: true,
      },
      take: 100,
    })

    return NextResponse.json({
      deals: deals.map((deal) => ({
        id: deal.id,
        hubspotId: deal.hubspotId,
        name: deal.name,
        companyName: deal.companyName,
        amount: deal.amount,
        ownerName: deal.ownerName,
        daysInCurrentStage: deal.daysInCurrentStage,
        createDate: deal.createDate?.toISOString() || null,
      })),
      total: deals.length,
    })
  } catch (error) {
    console.error("Deals by stage error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
