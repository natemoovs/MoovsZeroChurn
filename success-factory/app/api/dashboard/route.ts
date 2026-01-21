import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Combined dashboard endpoint with in-memory caching
 * GET /api/dashboard
 *
 * Combines: portfolio, tasks, renewals (from DB), and health trends
 * into a single request with 60-second cache
 */

interface CacheEntry {
  data: DashboardData
  timestamp: number
}

interface DashboardData {
  portfolio: {
    summaries: Array<{
      companyId: string
      companyName: string
      domain: string | null
      healthScore: "green" | "yellow" | "red" | "unknown"
      mrr: number | null
      plan: string | null
      riskSignals: string[]
      positiveSignals: string[]
    }>
    total: number
    configured: { hubspot: boolean; stripe: boolean; metabase: boolean }
  }
  tasks: {
    tasks: Array<{
      id: string
      companyId: string
      companyName: string
      title: string
      priority: string
      status: string
      dueDate: string | null
    }>
  }
  renewals: {
    renewals: Array<{
      companyId: string
      companyName: string
      renewalDate: string
      daysUntilRenewal: number
      amount: number | null
      healthScore: string
    }>
  }
  healthTrend: {
    trend: "improving" | "declining" | "stable" | "unknown"
    recentChanges: Array<{
      companyName: string
      from: string
      to: string
      date: string
    }>
  }
}

// In-memory cache
let cache: CacheEntry | null = null
const CACHE_TTL_MS = 60 * 1000 // 60 seconds

export async function GET() {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      ...cache.data,
      cached: true,
      cachedAt: new Date(cache.timestamp).toISOString(),
    })
  }

  try {
    // Run all queries in parallel
    const [companies, tasks, snapshots] = await Promise.all([
      // Portfolio data
      prisma.hubSpotCompany.findMany({
        orderBy: [{ healthScore: "asc" }, { mrr: "desc" }],
      }),

      // Pending tasks (limit to 5 for dashboard)
      prisma.task.findMany({
        where: { status: "pending" },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        take: 5,
      }),

      // Health snapshots for trends (last 7 days)
      prisma.healthScoreSnapshot.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    // Transform portfolio data
    const summaries = companies.map((company) => ({
      companyId: company.hubspotId,
      companyName: company.name,
      domain: company.domain,
      healthScore:
        (company.healthScore as "green" | "yellow" | "red" | "unknown") ||
        "unknown",
      mrr: company.mrr,
      plan: company.plan,
      riskSignals: company.riskSignals,
      positiveSignals: company.positiveSignals,
    }))

    // Sort by health score (red first)
    summaries.sort((a, b) => {
      const order = { red: 0, yellow: 1, unknown: 2, green: 3 }
      return order[a.healthScore] - order[b.healthScore]
    })

    // Transform tasks
    const taskData = tasks.map((t) => ({
      id: t.id,
      companyId: t.companyId,
      companyName: t.companyName,
      title: t.title,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate?.toISOString() || null,
    }))

    // Calculate renewals from companies with renewal dates
    // (Use contractEndDate or estimate from customer since date)
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const renewals = companies
      .filter((c) => c.contractEndDate && new Date(c.contractEndDate) <= thirtyDaysFromNow)
      .map((c) => {
        const renewalDate = c.contractEndDate!
        const daysUntil = Math.ceil(
          (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        return {
          companyId: c.hubspotId,
          companyName: c.name,
          renewalDate: renewalDate.toISOString(),
          daysUntilRenewal: daysUntil,
          amount: c.mrr,
          healthScore: c.healthScore || "unknown",
        }
      })
      .filter((r) => r.daysUntilRenewal >= 0)
      .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)
      .slice(0, 5)

    // Calculate health trends from snapshots
    const companySnapshots = new Map<
      string,
      typeof snapshots
    >()
    for (const s of snapshots) {
      const existing = companySnapshots.get(s.companyId) || []
      existing.push(s)
      companySnapshots.set(s.companyId, existing)
    }

    const recentChanges: Array<{
      companyName: string
      from: string
      to: string
      date: string
    }> = []

    for (const [, companyData] of companySnapshots) {
      companyData.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      for (let i = 0; i < companyData.length - 1; i++) {
        const current = companyData[i]
        const previous = companyData[i + 1]

        if (current.healthScore !== previous.healthScore) {
          recentChanges.push({
            companyName: current.companyName,
            from: previous.healthScore,
            to: current.healthScore,
            date: current.createdAt.toISOString(),
          })
        }
      }
    }

    recentChanges.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // Calculate trend
    const scoreOrder = { green: 3, yellow: 2, red: 1, unknown: 0 }
    let upgrades = 0
    let downgrades = 0

    for (const change of recentChanges) {
      const fromScore =
        scoreOrder[change.from as keyof typeof scoreOrder] || 0
      const toScore = scoreOrder[change.to as keyof typeof scoreOrder] || 0
      if (toScore > fromScore) upgrades++
      if (toScore < fromScore) downgrades++
    }

    let trend: "improving" | "declining" | "stable" | "unknown" = "stable"
    if (upgrades > downgrades * 1.5) trend = "improving"
    else if (downgrades > upgrades * 1.5) trend = "declining"
    else if (recentChanges.length === 0) trend = "unknown"

    // Build response
    const data: DashboardData = {
      portfolio: {
        summaries,
        total: companies.length,
        configured: {
          hubspot: true,
          stripe: !!process.env.STRIPE_SECRET_KEY,
          metabase: !!process.env.METABASE_URL,
        },
      },
      tasks: { tasks: taskData },
      renewals: { renewals },
      healthTrend: {
        trend,
        recentChanges: recentChanges.slice(0, 5),
      },
    }

    // Update cache
    cache = {
      data,
      timestamp: Date.now(),
    }

    return NextResponse.json({
      ...data,
      cached: false,
    })
  } catch (error) {
    console.error("Dashboard fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard data",
        portfolio: { summaries: [], total: 0, configured: { hubspot: false, stripe: false, metabase: false } },
        tasks: { tasks: [] },
        renewals: { renewals: [] },
        healthTrend: { trend: "unknown", recentChanges: [] },
      },
      { status: 500 }
    )
  }
}
