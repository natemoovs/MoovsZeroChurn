import { NextRequest, NextResponse } from "next/server"
import { hubspot, metabase, getConfiguredIntegrations } from "@/lib/integrations"
import { prisma } from "@/lib/db"

/**
 * Smart Alert Prioritization
 *
 * Not just "red health" alerts - combines multiple signals:
 * - Payment failures + usage drop + renewal proximity
 * - Scores urgency
 * - Suggests specific intervention type
 *
 * GET /api/alerts/prioritized - Get prioritized alert list
 */

interface PrioritizedAlert {
  companyId: string
  companyName: string
  domain: string | null

  // Urgency scoring
  urgencyScore: number // 0-100
  urgencyLevel: "critical" | "high" | "medium" | "low"
  timeToAct: string // "immediate", "24 hours", "this week", "this month"

  // Combined signals
  signals: AlertSignal[]
  signalCount: number

  // Intervention recommendation
  recommendedIntervention: string
  playbookSuggestion: string | null

  // Context
  mrr: number | null
  healthScore: string | null
  renewalDate: string | null
  daysToRenewal: number | null
}

interface AlertSignal {
  type: "payment" | "usage" | "renewal" | "engagement" | "health"
  severity: "critical" | "high" | "medium" | "low"
  title: string
  detail: string
  weight: number // Contribution to urgency score
}

const METABASE_QUERY_ID = 948

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const minUrgency = parseInt(searchParams.get("minUrgency") || "30", 10)
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  const configured = getConfiguredIntegrations()

  if (!configured.hubspot) {
    return NextResponse.json({
      alerts: [],
      error: "HubSpot not configured",
      configured,
    })
  }

  try {
    // Fetch all data sources in parallel
    const [companies, metabaseData, stripeCustomers, churnedJourneys] = await Promise.all([
      hubspot.searchCompanies("*").catch(() => []),
      fetchMetabaseData(),
      configured.stripe ? fetchStripeAtRiskCustomers() : Promise.resolve([]),
      // Get churned journeys to exclude from at-risk alerts
      prisma.customerJourney.findMany({
        where: { stage: "churned" },
        select: { companyId: true },
      }),
    ])

    // Build set of churned company IDs to exclude
    const churnedCompanyIds = new Set(churnedJourneys.map((j) => j.companyId))

    // Build lookup maps
    const metabaseMap = new Map<string, MetabaseAccount>()
    for (const account of metabaseData) {
      if (account.companyName) {
        metabaseMap.set(account.companyName.toLowerCase(), account)
      }
    }

    const stripeMap = new Map<string, StripeRisk>()
    for (const customer of stripeCustomers) {
      if (customer.domain) {
        stripeMap.set(customer.domain.toLowerCase(), customer)
      }
    }

    // Analyze each company and generate prioritized alerts
    const alerts: PrioritizedAlert[] = []

    for (const company of companies) {
      // Skip churned companies - they shouldn't be in at-risk alerts
      if (churnedCompanyIds.has(company.id)) {
        continue
      }

      const companyName = company.properties.name?.toLowerCase() || ""
      const domain = company.properties.domain?.toLowerCase() || ""

      const mbData = metabaseMap.get(companyName)

      // Also skip if Metabase shows them as churned
      if (mbData?.churnStatus?.toLowerCase().includes("churn")) {
        continue
      }

      const stripeData = stripeMap.get(domain) || (domain ? stripeMap.get(domain) : null)

      const alert = analyzeCompany(company, mbData, stripeData)

      // Only include alerts above minimum urgency threshold
      if (alert && alert.urgencyScore >= minUrgency) {
        alerts.push(alert)
      }
    }

    // Sort by urgency score (highest first)
    alerts.sort((a, b) => b.urgencyScore - a.urgencyScore)

    // Apply limit
    const limitedAlerts = alerts.slice(0, limit)

    // Summary stats
    const criticalCount = limitedAlerts.filter((a) => a.urgencyLevel === "critical").length
    const highCount = limitedAlerts.filter((a) => a.urgencyLevel === "high").length
    const totalMrrAtRisk = limitedAlerts.reduce((sum, a) => sum + (a.mrr || 0), 0)

    return NextResponse.json({
      alerts: limitedAlerts,
      total: alerts.length,
      summary: {
        critical: criticalCount,
        high: highCount,
        medium: limitedAlerts.filter((a) => a.urgencyLevel === "medium").length,
        low: limitedAlerts.filter((a) => a.urgencyLevel === "low").length,
        totalMrrAtRisk,
      },
      configured,
    })
  } catch (error) {
    console.error("Prioritized alerts error:", error)
    return NextResponse.json(
      { alerts: [], error: "Failed to generate prioritized alerts" },
      { status: 500 }
    )
  }
}

interface MetabaseAccount {
  companyName: string
  totalTrips: number
  daysSinceLastLogin: number | null
  churnStatus: string | null
  mrr: number | null
  plan: string | null
}

interface StripeRisk {
  customerId: string
  domain: string
  hasFailedPayments: boolean
  pastDue: boolean
  cancelingSubscription: boolean
  mrr: number
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
      mrr: row.TOTAL_MRR_NUMERIC as number | null,
      plan: row.LAGO_PLAN_NAME as string | null,
    }))
  } catch {
    return []
  }
}

async function fetchStripeAtRiskCustomers(): Promise<StripeRisk[]> {
  if (!process.env.STRIPE_PLATFORM_SECRET_KEY) {
    return []
  }

  // This would need to be implemented based on your Stripe setup
  // For now, return empty - the individual company check will handle it
  return []
}

function analyzeCompany(
  company: { id: string; properties: Record<string, string | undefined> },
  mbData: MetabaseAccount | undefined,
  stripeData: StripeRisk | null | undefined
): PrioritizedAlert | null {
  const signals: AlertSignal[] = []
  let urgencyScore = 0

  const companyName = company.properties.name || "Unknown"
  const domain = company.properties.domain || null
  const renewalDateStr = company.properties.contract_end_date || company.properties.renewal_date

  // Calculate days to renewal
  let daysToRenewal: number | null = null
  if (renewalDateStr) {
    const renewalDate = new Date(renewalDateStr)
    daysToRenewal = Math.floor((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  // === PAYMENT SIGNALS ===
  if (stripeData) {
    if (stripeData.hasFailedPayments) {
      signals.push({
        type: "payment",
        severity: "critical",
        title: "Failed Payment",
        detail: "Recent payment attempt failed",
        weight: 30,
      })
      urgencyScore += 30
    }

    if (stripeData.pastDue) {
      signals.push({
        type: "payment",
        severity: "high",
        title: "Past Due",
        detail: "Account has past due invoices",
        weight: 25,
      })
      urgencyScore += 25
    }

    if (stripeData.cancelingSubscription) {
      signals.push({
        type: "payment",
        severity: "critical",
        title: "Cancellation Pending",
        detail: "Subscription set to cancel at period end",
        weight: 35,
      })
      urgencyScore += 35
    }
  }

  // === USAGE SIGNALS ===
  if (mbData) {
    if (mbData.churnStatus?.toLowerCase().includes("churn")) {
      signals.push({
        type: "health",
        severity: "critical",
        title: "Churned",
        detail: "Account marked as churned in system",
        weight: 40,
      })
      urgencyScore += 40
    }

    if (mbData.daysSinceLastLogin !== null) {
      if (mbData.daysSinceLastLogin > 60) {
        signals.push({
          type: "engagement",
          severity: "high",
          title: "No Login 60+ Days",
          detail: `Last login ${mbData.daysSinceLastLogin} days ago`,
          weight: 20,
        })
        urgencyScore += 20
      } else if (mbData.daysSinceLastLogin > 30) {
        signals.push({
          type: "engagement",
          severity: "medium",
          title: "Inactive 30+ Days",
          detail: `Last login ${mbData.daysSinceLastLogin} days ago`,
          weight: 12,
        })
        urgencyScore += 12
      }
    }

    if (mbData.totalTrips === 0) {
      signals.push({
        type: "usage",
        severity: "high",
        title: "Zero Usage",
        detail: "No trips recorded",
        weight: 18,
      })
      urgencyScore += 18
    } else if (mbData.totalTrips <= 5) {
      signals.push({
        type: "usage",
        severity: "medium",
        title: "Very Low Usage",
        detail: `Only ${mbData.totalTrips} trips`,
        weight: 10,
      })
      urgencyScore += 10
    }
  }

  // === RENEWAL SIGNALS ===
  if (daysToRenewal !== null) {
    if (daysToRenewal < 0) {
      signals.push({
        type: "renewal",
        severity: "critical",
        title: "Contract Expired",
        detail: `Expired ${Math.abs(daysToRenewal)} days ago`,
        weight: 25,
      })
      urgencyScore += 25
    } else if (daysToRenewal <= 30) {
      signals.push({
        type: "renewal",
        severity: "high",
        title: "Renewal Imminent",
        detail: `Renews in ${daysToRenewal} days`,
        weight: 15,
      })
      urgencyScore += 15
    } else if (daysToRenewal <= 60) {
      signals.push({
        type: "renewal",
        severity: "medium",
        title: "Renewal Approaching",
        detail: `Renews in ${daysToRenewal} days`,
        weight: 8,
      })
      urgencyScore += 8
    }
  }

  // No signals = no alert
  if (signals.length === 0) {
    return null
  }

  // Cap urgency score at 100
  urgencyScore = Math.min(urgencyScore, 100)

  // Determine urgency level and time to act
  let urgencyLevel: PrioritizedAlert["urgencyLevel"]
  let timeToAct: string

  if (urgencyScore >= 70) {
    urgencyLevel = "critical"
    timeToAct = "immediate"
  } else if (urgencyScore >= 50) {
    urgencyLevel = "high"
    timeToAct = "24 hours"
  } else if (urgencyScore >= 30) {
    urgencyLevel = "medium"
    timeToAct = "this week"
  } else {
    urgencyLevel = "low"
    timeToAct = "this month"
  }

  // Generate intervention recommendation
  const { recommendation, playbook } = generateIntervention(signals, urgencyLevel)

  // Determine health score
  let healthScore: string | null = null
  if (signals.some((s) => s.severity === "critical")) {
    healthScore = "red"
  } else if (signals.some((s) => s.severity === "high")) {
    healthScore = "yellow"
  }

  return {
    companyId: company.id,
    companyName,
    domain,
    urgencyScore,
    urgencyLevel,
    timeToAct,
    signals,
    signalCount: signals.length,
    recommendedIntervention: recommendation,
    playbookSuggestion: playbook,
    mrr: mbData?.mrr || null,
    healthScore,
    renewalDate: renewalDateStr || null,
    daysToRenewal,
  }
}

function generateIntervention(
  signals: AlertSignal[],
  urgencyLevel: string
): { recommendation: string; playbook: string | null } {
  const signalTypes = signals.map((s) => s.type)
  const hasCritical = signals.some((s) => s.severity === "critical")

  // Payment issues take priority
  if (signalTypes.includes("payment")) {
    if (signals.some((s) => s.title === "Cancellation Pending")) {
      return {
        recommendation: "Immediate save call - understand cancellation reason and offer resolution",
        playbook: "cancellation_save",
      }
    }
    if (signals.some((s) => s.title === "Failed Payment")) {
      return {
        recommendation: "Contact billing contact to update payment method",
        playbook: "payment_recovery",
      }
    }
  }

  // Churned accounts
  if (signals.some((s) => s.title === "Churned")) {
    return {
      recommendation: "Document churn reason and add to win-back sequence",
      playbook: "churn_documentation",
    }
  }

  // Engagement issues near renewal
  if (signalTypes.includes("renewal") && signalTypes.includes("engagement")) {
    return {
      recommendation: "Schedule re-engagement call before renewal - focus on value demonstration",
      playbook: "renewal_at_risk",
    }
  }

  // Pure engagement issues
  if (signalTypes.includes("engagement") || signalTypes.includes("usage")) {
    if (hasCritical || urgencyLevel === "critical") {
      return {
        recommendation: "Executive sponsor outreach - escalate engagement concerns",
        playbook: "executive_escalation",
      }
    }
    return {
      recommendation: "Schedule check-in call to understand usage barriers and provide training",
      playbook: "re_engagement",
    }
  }

  // Renewal approaching (no other issues)
  if (signalTypes.includes("renewal")) {
    return {
      recommendation: "Proactive renewal discussion - confirm value and expansion opportunities",
      playbook: "proactive_renewal",
    }
  }

  return {
    recommendation: "Review account and determine appropriate outreach",
    playbook: null,
  }
}
