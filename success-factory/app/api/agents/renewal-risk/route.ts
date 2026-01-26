import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hubspot, metabase, stripe } from "@/lib/integrations"
import {
  getAnthropicClient,
  createMessage,
  AI_MODEL,
  TOKEN_LIMITS,
  type AnthropicClient,
} from "@/lib/ai"

/**
 * Renewal Risk Agent
 *
 * Autonomous agent that runs weekly to:
 * 1. Find accounts with renewals in 45-75 days
 * 2. Perform deep risk analysis using all data sources
 * 3. Generate AI-powered intervention playbooks
 * 4. Create high-priority tasks for CSMs
 *
 * Trigger: Weekly cron (Sundays 8 AM UTC)
 * POST /api/agents/renewal-risk
 */

const DAYS_BEFORE_RENEWAL = 60
const WINDOW_DAYS = 15 // +/- 15 days around target

const METABASE_QUERY_ID = 948

interface RenewalAccount {
  id: string
  name: string
  domain: string | null
  renewalDate: string
  daysUntilRenewal: number
  mrr: number | null
  lifecycleStage: string | null
  ownerId: string | null
}

interface AccountAnalysis {
  account: RenewalAccount
  usageData: UsageData | null
  paymentHealth: PaymentHealth | null
  riskScore: number
  riskFactors: string[]
  positiveSignals: string[]
}

interface UsageData {
  totalTrips: number
  daysSinceLastLogin: number | null
  churnStatus: string | null
}

interface PaymentHealth {
  status: "healthy" | "at_risk" | "failed"
  failedCharges: number
  lastPaymentDate: string | null
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

  const apiKey = process.env.VERCEL_AI_GATEWAY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "VERCEL_AI_GATEWAY_API_KEY not configured" }, { status: 500 })
  }

  console.log("[Renewal Risk Agent] Starting renewal risk analysis...")

  try {
    // Find accounts with upcoming renewals
    const renewalAccounts = await findUpcomingRenewals()

    if (renewalAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No accounts with renewals in the target window",
        accountsAnalyzed: 0,
      })
    }

    console.log(
      `[Renewal Risk Agent] Found ${renewalAccounts.length} accounts with upcoming renewals`
    )

    // Fetch enrichment data
    const [metabaseData, stripeCustomers] = await Promise.all([
      fetchMetabaseData(),
      fetchStripeData(),
    ])

    // Build lookup maps
    const metabaseMap = new Map<string, UsageData>()
    for (const account of metabaseData) {
      if (account.companyName) {
        metabaseMap.set(account.companyName.toLowerCase(), {
          totalTrips: account.totalTrips,
          daysSinceLastLogin: account.daysSinceLastLogin,
          churnStatus: account.churnStatus,
        })
      }
    }

    const stripeMap = new Map<string, PaymentHealth>()
    for (const customer of stripeCustomers) {
      if (customer.name) {
        stripeMap.set(customer.name.toLowerCase(), customer.paymentHealth)
      }
    }

    // Get churned journeys to exclude
    const churnedJourneys = await prisma.customerJourney.findMany({
      where: {
        companyId: { in: renewalAccounts.map((a) => a.id) },
        stage: "churned",
      },
      select: { companyId: true },
    })
    const churnedCompanyIds = new Set(churnedJourneys.map((j) => j.companyId))

    // Analyze each account (skip churned - they shouldn't be in renewal risk)
    const analyses: AccountAnalysis[] = []
    for (const account of renewalAccounts) {
      // Skip churned accounts
      if (churnedCompanyIds.has(account.id)) {
        console.log(`[Renewal Risk Agent] Skipping ${account.name} - marked as churned`)
        continue
      }

      const nameLower = account.name.toLowerCase()
      const usageData = metabaseMap.get(nameLower) || null
      const paymentHealth = stripeMap.get(nameLower) || null

      // Also skip if Metabase shows them as churned
      if (usageData?.churnStatus?.toLowerCase().includes("churn")) {
        console.log(`[Renewal Risk Agent] Skipping ${account.name} - churned in usage data`)
        continue
      }

      const { riskScore, riskFactors, positiveSignals } = calculateRiskScore(
        account,
        usageData,
        paymentHealth
      )

      analyses.push({
        account,
        usageData,
        paymentHealth,
        riskScore,
        riskFactors,
        positiveSignals,
      })
    }

    // Sort by risk score (highest first)
    analyses.sort((a, b) => b.riskScore - a.riskScore)

    // Generate playbooks for high-risk accounts (risk score >= 60)
    const anthropic = getAnthropicClient(apiKey)
    const highRiskAccounts = analyses.filter((a) => a.riskScore >= 60)
    const tasksCreated: string[] = []

    for (const analysis of highRiskAccounts) {
      try {
        // Check for existing task
        const existingTask = await prisma.task.findFirst({
          where: {
            companyId: analysis.account.id,
            title: { contains: "Renewal Risk" },
            createdAt: {
              gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            },
          },
        })

        if (existingTask) {
          console.log(
            `[Renewal Risk Agent] Skipping ${analysis.account.name} - already has recent task`
          )
          continue
        }

        // Generate intervention playbook
        const playbook = await generatePlaybook(anthropic, analysis)

        // Create high-priority task
        const task = await prisma.task.create({
          data: {
            companyId: analysis.account.id,
            companyName: analysis.account.name,
            title: `🚨 Renewal Risk: ${analysis.account.name} (${analysis.account.daysUntilRenewal}d)`,
            description: playbook,
            priority: analysis.riskScore >= 80 ? "critical" : "high",
            status: "pending",
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            metadata: {
              source: "renewal-risk-agent",
              renewalDate: analysis.account.renewalDate,
              riskScore: analysis.riskScore,
              riskFactors: analysis.riskFactors,
              mrr: analysis.account.mrr,
            },
          },
        })

        tasksCreated.push(task.id)
        console.log(
          `[Renewal Risk Agent] Created task for ${analysis.account.name} (risk: ${analysis.riskScore})`
        )
      } catch (err) {
        console.error(`[Renewal Risk Agent] Error processing ${analysis.account.name}:`, err)
      }
    }

    // Log summary
    console.log(`[Renewal Risk Agent] Analysis complete:
    - Accounts analyzed: ${analyses.length}
    - High risk (>=60): ${highRiskAccounts.length}
    - Tasks created: ${tasksCreated.length}`)

    return NextResponse.json({
      success: true,
      summary: {
        accountsAnalyzed: analyses.length,
        highRiskCount: highRiskAccounts.length,
        tasksCreated: tasksCreated.length,
        averageRiskScore: Math.round(
          analyses.reduce((sum, a) => sum + a.riskScore, 0) / analyses.length
        ),
      },
      riskDistribution: {
        critical: analyses.filter((a) => a.riskScore >= 80).length,
        high: analyses.filter((a) => a.riskScore >= 60 && a.riskScore < 80).length,
        medium: analyses.filter((a) => a.riskScore >= 40 && a.riskScore < 60).length,
        low: analyses.filter((a) => a.riskScore < 40).length,
      },
      topRisks: analyses.slice(0, 10).map((a) => ({
        name: a.account.name,
        renewalDate: a.account.renewalDate,
        daysUntilRenewal: a.account.daysUntilRenewal,
        riskScore: a.riskScore,
        mrr: a.account.mrr,
        riskFactors: a.riskFactors,
      })),
    })
  } catch (error) {
    console.error("[Renewal Risk Agent] Error:", error)
    return NextResponse.json(
      {
        error: "Renewal risk analysis failed",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    )
  }
}

// GET endpoint for status
export async function GET() {
  try {
    const recentTasks = await prisma.task.findMany({
      where: {
        title: { contains: "Renewal Risk" },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    // Get risk score distribution from recent snapshots
    const recentSnapshots = await prisma.healthScoreSnapshot.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    })

    return NextResponse.json({
      recentTasks: recentTasks.map((t) => ({
        id: t.id,
        companyName: t.companyName,
        priority: t.priority,
        createdAt: t.createdAt,
        status: t.status,
        riskScore: (t.metadata as Record<string, unknown>)?.riskScore,
      })),
      snapshotsToday: recentSnapshots.length,
    })
  } catch {
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 })
  }
}

async function findUpcomingRenewals(): Promise<RenewalAccount[]> {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    return []
  }

  try {
    const companies = await hubspot.searchCompanies("*")
    const now = new Date()
    const targetStart = new Date(
      now.getTime() + (DAYS_BEFORE_RENEWAL - WINDOW_DAYS) * 24 * 60 * 60 * 1000
    )
    const targetEnd = new Date(
      now.getTime() + (DAYS_BEFORE_RENEWAL + WINDOW_DAYS) * 24 * 60 * 60 * 1000
    )

    const renewals: RenewalAccount[] = []

    for (const company of companies) {
      const props = company.properties
      const renewalDateStr = props.contract_end_date || props.renewal_date

      if (renewalDateStr) {
        const renewalDate = new Date(renewalDateStr)

        if (renewalDate >= targetStart && renewalDate <= targetEnd) {
          const daysUntil = Math.ceil(
            (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )

          renewals.push({
            id: company.id,
            name: props.name || "Unknown",
            domain: props.domain || null,
            renewalDate: renewalDateStr,
            daysUntilRenewal: daysUntil,
            mrr: parseFloat(props.mrr || props.monthly_recurring_revenue || "0") || null,
            lifecycleStage: props.lifecyclestage || null,
            ownerId: props.hubspot_owner_id || null,
          })
        }
      }
    }

    return renewals.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)
  } catch (error) {
    console.error("[Renewal Risk Agent] Error finding renewals:", error)
    return []
  }
}

interface MetabaseAccount {
  companyName: string
  totalTrips: number
  daysSinceLastLogin: number | null
  churnStatus: string | null
}

async function fetchMetabaseData(): Promise<MetabaseAccount[]> {
  if (!process.env.METABASE_URL || !process.env.METABASE_API_KEY) {
    return []
  }

  try {
    const result = await metabase.runQuery(METABASE_QUERY_ID)
    const rows = metabase.rowsToObjects<Record<string, unknown>>(result)

    return rows.map((row) => ({
      companyName: (row.MOOVS_COMPANY_NAME as string) || "",
      totalTrips: (row.ALL_TRIPS_COUNT as number) || 0,
      daysSinceLastLogin: row.DAYS_SINCE_LAST_IDENTIFY as number | null,
      churnStatus: row.CHURN_STATUS as string | null,
    }))
  } catch {
    return []
  }
}

interface StripeCustomer {
  name: string
  paymentHealth: PaymentHealth
}

async function fetchStripeData(): Promise<StripeCustomer[]> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return []
  }

  try {
    const customers = await stripe.listCustomers(100)
    const results: StripeCustomer[] = []

    for (const customer of customers) {
      if (!customer.name) continue

      const charges = await stripe.getRecentCharges(customer.id, 10)
      const failedCharges = charges.filter((c) => c.status === "failed").length
      const lastSuccessful = charges.find((c) => c.status === "succeeded")

      let status: "healthy" | "at_risk" | "failed" = "healthy"
      if (failedCharges >= 3) {
        status = "failed"
      } else if (failedCharges >= 1) {
        status = "at_risk"
      }

      results.push({
        name: customer.name,
        paymentHealth: {
          status,
          failedCharges,
          lastPaymentDate: lastSuccessful?.created
            ? new Date(lastSuccessful.created * 1000).toISOString()
            : null,
        },
      })
    }

    return results
  } catch {
    return []
  }
}

function calculateRiskScore(
  account: RenewalAccount,
  usage: UsageData | null,
  payment: PaymentHealth | null
): { riskScore: number; riskFactors: string[]; positiveSignals: string[] } {
  let score = 30 // Base score
  const riskFactors: string[] = []
  const positiveSignals: string[] = []

  // Time pressure (closer renewal = higher urgency)
  if (account.daysUntilRenewal < 45) {
    score += 10
    riskFactors.push("Renewal imminent")
  }

  // Usage signals
  if (usage) {
    if (usage.churnStatus?.toLowerCase().includes("churn")) {
      score += 30
      riskFactors.push("Marked as churned")
    }
    if (usage.totalTrips <= 5) {
      score += 20
      riskFactors.push("Very low usage")
    } else if (usage.totalTrips <= 20) {
      score += 10
      riskFactors.push("Low usage")
    } else if (usage.totalTrips > 100) {
      score -= 15
      positiveSignals.push("High usage")
    }
    if (usage.daysSinceLastLogin && usage.daysSinceLastLogin > 60) {
      score += 20
      riskFactors.push(`No login in ${usage.daysSinceLastLogin} days`)
    } else if (usage.daysSinceLastLogin && usage.daysSinceLastLogin > 30) {
      score += 10
      riskFactors.push("Inactive 30+ days")
    } else if (usage.daysSinceLastLogin && usage.daysSinceLastLogin <= 7) {
      score -= 10
      positiveSignals.push("Recent login")
    }
  } else {
    score += 10
    riskFactors.push("No usage data available")
  }

  // Payment signals
  if (payment) {
    if (payment.status === "failed") {
      score += 25
      riskFactors.push("Payment failures")
    } else if (payment.status === "at_risk") {
      score += 10
      riskFactors.push("Recent payment issue")
    } else if (payment.status === "healthy") {
      score -= 5
      positiveSignals.push("Healthy payments")
    }
  }

  // MRR weight (higher MRR = more critical even at same risk)
  if (account.mrr && account.mrr > 5000) {
    score += 5
    riskFactors.push("High-value account")
  }

  // Cap score between 0-100
  score = Math.max(0, Math.min(100, score))

  return { riskScore: score, riskFactors, positiveSignals }
}

async function generatePlaybook(anthropic: AnthropicClient, analysis: AccountAnalysis): Promise<string> {
  const context = `
## Account: ${analysis.account.name}
- Renewal Date: ${analysis.account.renewalDate} (${analysis.account.daysUntilRenewal} days)
- MRR: ${analysis.account.mrr ? `$${analysis.account.mrr.toLocaleString()}` : "Unknown"}
- Risk Score: ${analysis.riskScore}/100

### Risk Factors:
${analysis.riskFactors.map((r) => `- ${r}`).join("\n") || "- None identified"}

### Positive Signals:
${analysis.positiveSignals.map((s) => `- ${s}`).join("\n") || "- None identified"}

### Usage Data:
${
  analysis.usageData
    ? `- Total Trips: ${analysis.usageData.totalTrips}
- Days Since Last Login: ${analysis.usageData.daysSinceLastLogin || "Unknown"}
- Churn Status: ${analysis.usageData.churnStatus || "N/A"}`
    : "No usage data available"
}

### Payment Health:
${
  analysis.paymentHealth
    ? `- Status: ${analysis.paymentHealth.status}
- Failed Charges: ${analysis.paymentHealth.failedCharges}
- Last Payment: ${analysis.paymentHealth.lastPaymentDate || "Unknown"}`
    : "No payment data available"
}
`

  const message = await createMessage(anthropic, {
    model: AI_MODEL,
    max_tokens: TOKEN_LIMITS.medium,
    messages: [
      {
        role: "user",
        content: `You are a Customer Success Manager creating an intervention playbook for an at-risk renewal.

Generate a focused, actionable playbook for this account:

${context}

Structure your playbook as:

1. **Situation Summary** (2-3 sentences)

2. **Immediate Actions** (Next 48 hours)
   - 3-4 specific tasks with owners

3. **Conversation Starters**
   - 2-3 specific questions/topics to discuss with the customer
   - Focus on understanding their perspective and needs

4. **Value Reinforcement**
   - Key product wins to highlight
   - ROI talking points

5. **Risk Mitigation**
   - Address each risk factor specifically
   - Proposed solutions or alternatives

6. **Escalation Path**
   - When to escalate
   - Who to involve

Be specific, actionable, and realistic. Focus on saving this renewal.`,
      },
    ],
  })

  return message.content[0].type === "text" ? message.content[0].text : ""
}
