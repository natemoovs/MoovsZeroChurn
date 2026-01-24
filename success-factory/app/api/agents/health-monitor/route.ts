import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hubspot, metabase } from "@/lib/integrations"

/**
 * Health Monitor Agent
 *
 * Autonomous agent that runs daily to:
 * 1. Scan all accounts for health changes
 * 2. Detect significant changes (green→yellow, yellow→red, etc.)
 * 3. Create tasks for CSMs to address changes
 * 4. Log health snapshots for trend analysis
 *
 * Trigger: Daily cron at 6 AM UTC
 * POST /api/agents/health-monitor
 */

const METABASE_QUERY_ID = 948

interface HealthChange {
  companyId: string
  companyName: string
  previousHealth: string | null
  currentHealth: string
  changeType: "improved" | "declined" | "new"
  riskSignals: string[]
  positiveSignals: string[]
  mrr: number | null
}

export async function POST(request: NextRequest) {
  // Verify cron auth
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  // Auth: require valid CRON_SECRET or Vercel cron header (dev mode allows all)
  const isAuthorized =
    process.env.NODE_ENV === "development" ||
    request.headers.get("x-vercel-cron") === "1" ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`)

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[Health Monitor] Starting daily health scan...")

  try {
    // Fetch current data from HubSpot and Metabase
    const [companies, metabaseData] = await Promise.all([
      hubspot.searchCompanies("*").catch(() => []),
      fetchMetabaseData(),
    ])

    // Build Metabase lookup map
    const metabaseMap = new Map<string, MetabaseAccount>()
    for (const account of metabaseData) {
      if (account.companyName) {
        metabaseMap.set(account.companyName.toLowerCase(), account)
      }
    }

    // Get previous health snapshots (most recent for each company)
    const previousSnapshots = await prisma.healthScoreSnapshot.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Last 48 hours
        },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["companyId"],
    })

    const previousHealthMap = new Map<string, string>()
    for (const snapshot of previousSnapshots) {
      previousHealthMap.set(snapshot.companyId, snapshot.healthScore)
    }

    // Analyze each company
    const healthChanges: HealthChange[] = []
    const snapshots: Array<{
      companyId: string
      companyName: string
      healthScore: string
      mrr: number | null
      totalTrips: number | null
      daysSinceLastLogin: number | null
      riskSignals: string[]
      positiveSignals: string[]
    }> = []

    for (const company of companies) {
      const companyName = company.properties.name?.toLowerCase() || ""
      const mbData = metabaseMap.get(companyName)

      // Calculate current health
      const health = calculateHealth(company, mbData)

      // Store snapshot
      snapshots.push({
        companyId: company.id,
        companyName: company.properties.name || "Unknown",
        healthScore: health.score,
        mrr: mbData?.mrr || null,
        totalTrips: mbData?.totalTrips || null,
        daysSinceLastLogin: mbData?.daysSinceLastLogin || null,
        riskSignals: health.riskSignals,
        positiveSignals: health.positiveSignals,
      })

      // Check for changes
      const previousHealth = previousHealthMap.get(company.id)

      if (!previousHealth) {
        // New company or first scan
        if (health.score === "red") {
          healthChanges.push({
            companyId: company.id,
            companyName: company.properties.name || "Unknown",
            previousHealth: null,
            currentHealth: health.score,
            changeType: "new",
            riskSignals: health.riskSignals,
            positiveSignals: health.positiveSignals,
            mrr: mbData?.mrr || null,
          })
        }
      } else if (previousHealth !== health.score) {
        const declined = isDecline(previousHealth, health.score)
        healthChanges.push({
          companyId: company.id,
          companyName: company.properties.name || "Unknown",
          previousHealth,
          currentHealth: health.score,
          changeType: declined ? "declined" : "improved",
          riskSignals: health.riskSignals,
          positiveSignals: health.positiveSignals,
          mrr: mbData?.mrr || null,
        })
      }
    }

    // Batch insert snapshots
    if (snapshots.length > 0) {
      await prisma.healthScoreSnapshot.createMany({
        data: snapshots,
      })
    }

    // Create tasks for significant declines
    const tasksCreated: string[] = []
    for (const change of healthChanges) {
      if (change.changeType === "declined" || (change.changeType === "new" && change.currentHealth === "red")) {
        const task = await prisma.task.create({
          data: {
            companyId: change.companyId,
            companyName: change.companyName,
            title: change.changeType === "new"
              ? `🚨 New at-risk account: ${change.companyName}`
              : `⚠️ Health declined: ${change.companyName} (${change.previousHealth}→${change.currentHealth})`,
            description: buildTaskDescription(change),
            priority: change.currentHealth === "red" ? "high" : "medium",
            status: "pending",
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            metadata: {
              source: "health-monitor-agent",
              healthChange: {
                companyId: change.companyId,
                companyName: change.companyName,
                previousHealth: change.previousHealth,
                currentHealth: change.currentHealth,
                changeType: change.changeType,
                riskSignals: change.riskSignals,
                positiveSignals: change.positiveSignals,
                mrr: change.mrr,
              },
            },
          },
        })
        tasksCreated.push(task.id)
      }
    }

    // Log the run
    console.log(`[Health Monitor] Scan complete:
    - Companies scanned: ${companies.length}
    - Snapshots saved: ${snapshots.length}
    - Health changes detected: ${healthChanges.length}
    - Tasks created: ${tasksCreated.length}`)

    return NextResponse.json({
      success: true,
      summary: {
        companiesScanned: companies.length,
        snapshotsSaved: snapshots.length,
        healthChanges: healthChanges.length,
        tasksCreated: tasksCreated.length,
        declines: healthChanges.filter(c => c.changeType === "declined").length,
        improvements: healthChanges.filter(c => c.changeType === "improved").length,
        newAtRisk: healthChanges.filter(c => c.changeType === "new").length,
      },
      changes: healthChanges.slice(0, 20), // Return top 20 changes
    })
  } catch (error) {
    console.error("[Health Monitor] Error:", error)
    return NextResponse.json(
      { error: "Health monitor failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}

// GET endpoint to check status
export async function GET() {
  try {
    // Get last run info
    const lastSnapshot = await prisma.healthScoreSnapshot.findFirst({
      orderBy: { createdAt: "desc" },
    })

    const recentTasks = await prisma.task.findMany({
      where: {
        metadata: {
          path: ["source"],
          equals: "health-monitor-agent",
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    // Get health distribution
    const healthDist = await prisma.healthScoreSnapshot.groupBy({
      by: ["healthScore"],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      _count: true,
    })

    return NextResponse.json({
      lastRun: lastSnapshot?.createdAt || null,
      recentTasks: recentTasks.length,
      healthDistribution: healthDist.reduce(
        (acc, h) => ({ ...acc, [h.healthScore]: h._count }),
        {} as Record<string, number>
      ),
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 })
  }
}

// Helper types and functions
interface MetabaseAccount {
  companyName: string
  totalTrips: number
  daysSinceLastLogin: number | null
  churnStatus: string | null
  mrr: number | null
}

async function fetchMetabaseData(): Promise<MetabaseAccount[]> {
  if (!process.env.METABASE_URL || !process.env.METABASE_API_KEY) {
    return []
  }

  try {
    const result = await metabase.runQuery(METABASE_QUERY_ID)
    const rows = metabase.rowsToObjects<Record<string, unknown>>(result)

    return rows.map(row => ({
      companyName: (row.MOOVS_COMPANY_NAME as string) || "",
      totalTrips: (row.ALL_TRIPS_COUNT as number) || 0,
      daysSinceLastLogin: row.DAYS_SINCE_LAST_IDENTIFY as number | null,
      churnStatus: row.CHURN_STATUS as string | null,
      mrr: row.TOTAL_MRR_NUMERIC as number | null,
    }))
  } catch {
    return []
  }
}

function calculateHealth(
  company: { properties: Record<string, string | undefined> },
  mb: MetabaseAccount | undefined
): { score: string; riskSignals: string[]; positiveSignals: string[] } {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  if (mb) {
    if (mb.churnStatus?.toLowerCase().includes("churn")) {
      riskSignals.push("Churned")
    }
    if (mb.totalTrips > 100) {
      positiveSignals.push("High usage")
    } else if (mb.totalTrips <= 5) {
      riskSignals.push("Low usage")
    }
    if (mb.daysSinceLastLogin && mb.daysSinceLastLogin > 60) {
      riskSignals.push(`No login ${mb.daysSinceLastLogin}d`)
    } else if (mb.daysSinceLastLogin && mb.daysSinceLastLogin <= 7) {
      positiveSignals.push("Recent login")
    }
    if (mb.mrr && mb.mrr > 0) {
      positiveSignals.push("Paying")
    }
  }

  let score = "unknown"
  if (riskSignals.some(r => r.includes("Churned"))) {
    score = "red"
  } else if (riskSignals.length >= 2) {
    score = "red"
  } else if (riskSignals.length === 1) {
    score = "yellow"
  } else if (positiveSignals.length >= 2) {
    score = "green"
  } else if (positiveSignals.length === 1) {
    score = "green"
  }

  return { score, riskSignals, positiveSignals }
}

function isDecline(previous: string, current: string): boolean {
  const order = { green: 0, yellow: 1, red: 2, unknown: 1 }
  return (order[current as keyof typeof order] || 0) > (order[previous as keyof typeof order] || 0)
}

function buildTaskDescription(change: HealthChange): string {
  const lines: string[] = []

  if (change.changeType === "declined") {
    lines.push(`Health score dropped from ${change.previousHealth} to ${change.currentHealth}.`)
  } else {
    lines.push(`Account identified as at-risk (${change.currentHealth}).`)
  }

  if (change.mrr) {
    lines.push(`MRR at risk: $${change.mrr.toLocaleString()}`)
  }

  if (change.riskSignals.length > 0) {
    lines.push(`\nRisk signals: ${change.riskSignals.join(", ")}`)
  }

  lines.push("\nRecommended action: Review account and reach out to understand current situation.")

  return lines.join("\n")
}
