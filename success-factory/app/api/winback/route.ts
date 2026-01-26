/**
 * Win-Back API
 *
 * Returns churned customers for win-back campaign management.
 * Includes stats and account details optimized for re-engagement.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface ChurnedAccount {
  id: string
  hubspotId: string
  name: string
  domain: string | null
  mrr: number | null
  plan: string | null
  totalTrips: number
  primaryContactEmail: string | null
  primaryContactName: string | null
  churnedAt: string | null
  daysSinceChurn: number | null
  previousHealthScore: string | null
  riskSignals: string[]
  subscriptionLifetimeDays: number | null
}

interface WinbackStats {
  totalChurned: number
  lostMrr: number
  avgLifetimeDays: number
  recentChurns: number
  highValueChurns: number
}

export async function GET() {
  try {
    // Fetch all churned companies
    // Source of truth: healthScore = "churned" (set by sync from LAGO_WATERFALL_EVENT)
    const churnedCompanies = await prisma.hubSpotCompany.findMany({
      where: {
        OR: [
          { healthScore: "churned" },
          { subscriptionStatus: { contains: "churn", mode: "insensitive" } },
        ],
      },
      orderBy: { mrr: "desc" },
    })

    // Get the most recent health snapshot for each churned company
    // to determine when they churned and their previous health state
    const companyIds = churnedCompanies.map((c) => c.hubspotId)

    const recentSnapshots = await prisma.healthScoreSnapshot.findMany({
      where: {
        companyId: { in: companyIds },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["companyId"],
    })

    const snapshotMap = new Map(recentSnapshots.map((s) => [s.companyId, s]))

    // Transform to ChurnedAccount format
    const accounts: ChurnedAccount[] = churnedCompanies.map((company) => {
      const snapshot = snapshotMap.get(company.hubspotId)

      // Calculate days since churn
      let churnedAt: string | null = null
      let daysSinceChurn: number | null = null

      // Use contract end date or last snapshot as churn date
      if (company.contractEndDate) {
        churnedAt = company.contractEndDate.toISOString()
        daysSinceChurn = Math.floor(
          (Date.now() - company.contractEndDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      } else if (snapshot?.createdAt) {
        churnedAt = snapshot.createdAt.toISOString()
        daysSinceChurn = Math.floor(
          (Date.now() - snapshot.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        )
      }

      // Use the subscriptionLifetimeDays field from the model
      const subscriptionLifetimeDays = company.subscriptionLifetimeDays

      // Build risk signals from snapshot or derive from company data
      const riskSignals: string[] = []
      if (snapshot?.riskSignals) {
        riskSignals.push(...(snapshot.riskSignals as string[]))
      }
      const trips = company.totalTrips ?? 0
      if (trips === 0) {
        riskSignals.push("Zero usage")
      } else if (trips < 10) {
        riskSignals.push("Low usage")
      }

      return {
        id: company.id,
        hubspotId: company.hubspotId,
        name: company.name,
        domain: company.domain,
        mrr: company.mrr,
        plan: company.plan,
        totalTrips: trips,
        primaryContactEmail: company.primaryContactEmail,
        primaryContactName: company.primaryContactName,
        churnedAt,
        daysSinceChurn,
        previousHealthScore: snapshot?.healthScore || null,
        riskSignals,
        subscriptionLifetimeDays,
      }
    })

    // Calculate stats
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    const totalChurned = accounts.length
    const lostMrr = accounts.reduce((sum, a) => sum + (a.mrr || 0), 0)

    const recentChurns = accounts.filter((a) => {
      if (!a.churnedAt) return false
      return new Date(a.churnedAt).getTime() >= thirtyDaysAgo
    }).length

    const highValueChurns = accounts.filter((a) => (a.mrr || 0) >= 100).length

    const lifetimes = accounts
      .filter((a) => a.subscriptionLifetimeDays !== null)
      .map((a) => a.subscriptionLifetimeDays as number)
    const avgLifetimeDays = lifetimes.length > 0
      ? Math.round(lifetimes.reduce((sum, d) => sum + d, 0) / lifetimes.length)
      : 0

    const stats: WinbackStats = {
      totalChurned,
      lostMrr,
      avgLifetimeDays,
      recentChurns,
      highValueChurns,
    }

    return NextResponse.json({
      accounts,
      stats,
    })
  } catch (error) {
    console.error("[Winback API] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch churned accounts" },
      { status: 500 }
    )
  }
}
