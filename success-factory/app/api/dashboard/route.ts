import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, isAuthError } from "@/lib/auth/api-middleware"

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
  // Phase 1 additions
  stalledOnboardings: {
    count: number
    critical: number
    mrrAtRisk: number
    accounts: Array<{
      companyId: string
      companyName: string
      overdueMilestones: string[]
      severity: string
      mrr: number
    }>
  }
  npsTrends: {
    currentNPS: number | null
    previousNPS: number | null
    trend: "improving" | "declining" | "stable" | "unknown"
    recentDetractors: number
    totalResponses: number
  }
  championAlerts: {
    noChampion: number
    singleThreaded: number
    recentChampionLeft: Array<{
      companyId: string
      companyName: string
      championName: string
      leftAt: string
    }>
  }
  recentActivity: Array<{
    id: string
    companyId: string
    companyName: string
    source: string
    eventType: string
    title: string
    occurredAt: string
    importance: string
  }>
}

// In-memory cache
let cache: CacheEntry | null = null
const CACHE_TTL_MS = 60 * 1000 // 60 seconds

export async function GET() {
  // Require authentication
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

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
    const [
      companies,
      tasks,
      snapshots,
      overdueMilestones,
      npsResponses,
      stakeholders,
      activityEvents,
    ] = await Promise.all([
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

      // Stalled onboardings
      prisma.onboardingMilestone.findMany({
        where: {
          isOverdue: true,
          completedAt: null,
        },
      }),

      // NPS responses (last 90 days)
      prisma.nPSSurvey.findMany({
        where: {
          respondedAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          },
          score: { not: null },
        },
        orderBy: { respondedAt: "desc" },
      }),

      // Stakeholders for champion alerts
      prisma.stakeholder.findMany({
        where: {
          OR: [
            { role: "champion" },
            { leftCompanyAt: { not: null } },
          ],
        },
      }),

      // Recent activity events
      prisma.activityEvent.findMany({
        where: {
          occurredAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { occurredAt: "desc" },
        take: 10,
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

    // Process stalled onboardings
    const stalledByCompany = new Map<string, { companyId: string; companyName: string; milestones: string[] }>()
    for (const m of overdueMilestones) {
      if (!stalledByCompany.has(m.companyId)) {
        stalledByCompany.set(m.companyId, {
          companyId: m.companyId,
          companyName: m.companyName,
          milestones: [],
        })
      }
      stalledByCompany.get(m.companyId)!.milestones.push(m.milestone)
    }

    const stalledAccounts = Array.from(stalledByCompany.values()).map((s) => {
      const company = companies.find((c) => c.hubspotId === s.companyId)
      return {
        companyId: s.companyId,
        companyName: s.companyName,
        overdueMilestones: s.milestones,
        severity: s.milestones.length >= 3 ? "critical" : s.milestones.length >= 2 ? "high" : "medium",
        mrr: company?.mrr || 0,
      }
    }).sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2 }
      return (severityOrder[a.severity as keyof typeof severityOrder] || 2) -
             (severityOrder[b.severity as keyof typeof severityOrder] || 2)
    })

    const stalledOnboardings = {
      count: stalledAccounts.length,
      critical: stalledAccounts.filter((a) => a.severity === "critical").length,
      mrrAtRisk: stalledAccounts.reduce((sum, a) => sum + a.mrr, 0),
      accounts: stalledAccounts.slice(0, 5),
    }

    // Process NPS trends
    const npsWithScores = npsResponses.filter((r) => r.score !== null)
    const recentNPS = npsWithScores.filter(
      (r) => r.respondedAt && new Date(r.respondedAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    )
    const previousNPS = npsWithScores.filter(
      (r) =>
        r.respondedAt &&
        new Date(r.respondedAt) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) &&
        new Date(r.respondedAt) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    )

    const calculateNPS = (responses: typeof npsWithScores) => {
      if (responses.length === 0) return null
      const promoters = responses.filter((r) => r.score !== null && r.score >= 9).length
      const detractors = responses.filter((r) => r.score !== null && r.score <= 6).length
      return Math.round(((promoters - detractors) / responses.length) * 100)
    }

    const currentNPS = calculateNPS(recentNPS)
    const prevNPS = calculateNPS(previousNPS)
    const npsTrend: "improving" | "declining" | "stable" | "unknown" =
      currentNPS === null || prevNPS === null
        ? "unknown"
        : currentNPS > prevNPS + 5
        ? "improving"
        : currentNPS < prevNPS - 5
        ? "declining"
        : "stable"

    const npsTrends = {
      currentNPS,
      previousNPS: prevNPS,
      trend: npsTrend,
      recentDetractors: recentNPS.filter((r) => r.score !== null && r.score <= 6).length,
      totalResponses: npsWithScores.length,
    }

    // Process champion alerts
    const companyChampions = new Map<string, boolean>()
    const companyContacts = new Map<string, number>()
    const recentChampionLeft: Array<{
      companyId: string
      companyName: string
      championName: string
      leftAt: string
    }> = []

    for (const s of stakeholders) {
      if (s.role === "champion" && s.isActive) {
        companyChampions.set(s.companyId, true)
      }
      if (s.isActive) {
        companyContacts.set(s.companyId, (companyContacts.get(s.companyId) || 0) + 1)
      }
      if (s.role === "champion" && s.leftCompanyAt) {
        const company = companies.find((c) => c.hubspotId === s.companyId)
        recentChampionLeft.push({
          companyId: s.companyId,
          companyName: company?.name || "Unknown",
          championName: s.name,
          leftAt: s.leftCompanyAt.toISOString(),
        })
      }
    }

    // Count accounts with no champion (only paid accounts)
    const paidCompanyIds = new Set(companies.filter((c) => c.mrr && c.mrr > 0).map((c) => c.hubspotId))
    const noChampion = Array.from(paidCompanyIds).filter((id) => !companyChampions.has(id)).length
    const singleThreaded = Array.from(companyContacts.entries()).filter(
      ([id, count]) => paidCompanyIds.has(id) && count === 1
    ).length

    const championAlerts = {
      noChampion,
      singleThreaded,
      recentChampionLeft: recentChampionLeft.slice(0, 3),
    }

    // Process recent activity
    const recentActivity = activityEvents.map((e) => ({
      id: e.id,
      companyId: e.companyId,
      companyName: companies.find((c) => c.hubspotId === e.companyId)?.name || "Unknown",
      source: e.source,
      eventType: e.eventType,
      title: e.title,
      occurredAt: e.occurredAt.toISOString(),
      importance: e.importance,
    }))

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
      stalledOnboardings,
      npsTrends,
      championAlerts,
      recentActivity,
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
