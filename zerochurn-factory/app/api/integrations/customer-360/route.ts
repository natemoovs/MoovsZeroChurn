import { NextRequest, NextResponse } from "next/server"
import { hubspot, metabase, stripe, notion, getConfiguredIntegrations } from "@/lib/integrations"

/**
 * Customer 360 View
 *
 * Unified endpoint that aggregates customer data from all sources:
 * - HubSpot: Company info, contacts, deals, activity
 * - Metabase: Usage data, trips, login recency
 * - Stripe: Subscription, payment health, invoices
 * - Notion: CSM tasks and notes
 */

const ACCOUNT_DATA_QUERY_ID = 948
const CSM_DATABASE_ID = process.env.NOTION_CSM_DATABASE_ID

// ============================================================================
// Types
// ============================================================================

interface Customer360 {
  // Core identity
  id: string
  name: string
  domain: string | null

  // Overall health
  healthScore: "green" | "yellow" | "red" | "unknown"
  riskLevel: "low" | "medium" | "high" | "critical"
  riskSignals: string[]
  positiveSignals: string[]

  // CRM data (HubSpot)
  crm: {
    lifecycleStage: string | null
    industry: string | null
    customerSince: string | null
    lastActivity: string | null
    owner: string | null
    contacts: Array<{
      name: string
      email: string | null
      title: string | null
      isPrimary: boolean
    }>
    deals: Array<{
      name: string
      amount: number | null
      stage: string | null
      closeDate: string | null
    }>
  } | null

  // Usage data (Metabase)
  usage: {
    totalTrips: number
    daysSinceLastLogin: number | null
    customerSegment: string | null
    churnStatus: string | null
    plan: string | null
  } | null

  // Payment data (Stripe)
  billing: {
    customerId: string
    status: "healthy" | "at_risk" | "failed" | "unknown"
    mrr: number
    subscriptions: Array<{
      plan: string | null
      status: string
      renewalDate: string
      cancelPending: boolean
    }>
    hasFailedPayments: boolean
    lastPayment: {
      date: string
      amount: number
    } | null
  } | null

  // CSM tasks (Notion)
  tasks: {
    total: number
    open: number
    overdue: number
    items: Array<{
      id: string
      title: string
      status: string
      dueDate: string | null
      url: string
    }>
  } | null

  // Data sources status
  dataSources: {
    hubspot: boolean
    metabase: boolean
    stripe: boolean
    notion: boolean
  }
}

// ============================================================================
// GET: Full customer 360 view
// ============================================================================

/**
 * GET /api/integrations/customer-360?id={hubspotId}
 * or GET /api/integrations/customer-360?domain={domain}
 * or GET /api/integrations/customer-360?name={companyName}
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const hubspotId = searchParams.get("id")
  const domain = searchParams.get("domain")
  const companyName = searchParams.get("name")

  if (!hubspotId && !domain && !companyName) {
    return NextResponse.json(
      { error: "Provide id, domain, or name parameter" },
      { status: 400 }
    )
  }

  const configured = getConfiguredIntegrations()

  try {
    // Step 1: Find or fetch the HubSpot company
    let company: Awaited<ReturnType<typeof hubspot.getCompany>> | null = null
    let resolvedName = companyName || ""
    let resolvedDomain = domain || ""

    if (configured.hubspot) {
      if (hubspotId) {
        company = await hubspot.getCompany(hubspotId).catch(() => null)
      } else if (domain) {
        const results = await hubspot.searchCompanies(domain).catch(() => [])
        company = results.find((c) =>
          c.properties.domain?.toLowerCase() === domain.toLowerCase()
        ) || results[0] || null
      } else if (companyName) {
        const results = await hubspot.searchCompanies(companyName).catch(() => [])
        company = results.find((c) =>
          c.properties.name?.toLowerCase() === companyName.toLowerCase()
        ) || results[0] || null
      }

      if (company) {
        resolvedName = company.properties.name || resolvedName
        resolvedDomain = company.properties.domain || resolvedDomain
      }
    }

    // Step 2: Fetch data from all sources in parallel
    const [crmData, usageData, billingData, tasksData] = await Promise.all([
      // HubSpot CRM data
      company && configured.hubspot
        ? fetchCrmData(company)
        : Promise.resolve(null),

      // Metabase usage data
      configured.metabase && resolvedName
        ? fetchUsageData(resolvedName)
        : Promise.resolve(null),

      // Stripe billing data
      configured.stripe && resolvedDomain
        ? fetchBillingData(resolvedDomain)
        : Promise.resolve(null),

      // Notion tasks
      configured.notion && resolvedName
        ? fetchTasksData(resolvedName)
        : Promise.resolve(null),
    ])

    // Step 3: Calculate health score
    const { healthScore, riskLevel, riskSignals, positiveSignals } =
      calculateOverallHealth(crmData, usageData, billingData, tasksData)

    const customer360: Customer360 = {
      id: company?.id || hubspotId || "",
      name: resolvedName,
      domain: resolvedDomain || null,
      healthScore,
      riskLevel,
      riskSignals,
      positiveSignals,
      crm: crmData,
      usage: usageData,
      billing: billingData,
      tasks: tasksData,
      dataSources: {
        hubspot: !!crmData,
        metabase: !!usageData,
        stripe: !!billingData,
        notion: !!tasksData,
      },
    }

    return NextResponse.json(customer360)
  } catch (error) {
    console.error("Customer 360 fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch customer data" },
      { status: 500 }
    )
  }
}

// ============================================================================
// Data fetching functions
// ============================================================================

async function fetchCrmData(
  company: Awaited<ReturnType<typeof hubspot.getCompany>>
): Promise<Customer360["crm"]> {
  const [contacts, deals] = await Promise.all([
    hubspot.getContacts(company.id).catch(() => []),
    hubspot.getDeals(company.id).catch(() => []),
  ])

  return {
    lifecycleStage: company.properties.lifecyclestage || null,
    industry: company.properties.industry || null,
    customerSince: company.properties.createdate || null,
    lastActivity: company.properties.hs_lastmodifieddate || null,
    owner: company.properties.hubspot_owner_id || null,
    contacts: contacts.map((c, i) => ({
      name: [c.properties.firstname, c.properties.lastname]
        .filter(Boolean)
        .join(" ") || "Unknown",
      email: c.properties.email || null,
      title: c.properties.jobtitle || null,
      isPrimary: i === 0,
    })),
    deals: deals.map((d) => ({
      name: d.properties.dealname,
      amount: d.properties.amount ? parseFloat(d.properties.amount) : null,
      stage: d.properties.dealstage || null,
      closeDate: d.properties.closedate || null,
    })),
  }
}

async function fetchUsageData(
  companyName: string
): Promise<Customer360["usage"]> {
  if (!process.env.METABASE_URL || !process.env.METABASE_API_KEY) {
    return null
  }

  try {
    const result = await metabase.runQuery(ACCOUNT_DATA_QUERY_ID)
    const rows = metabase.rowsToObjects<Record<string, unknown>>(result)

    const match = rows.find(
      (row) =>
        (row.MOOVS_COMPANY_NAME as string)?.toLowerCase() ===
        companyName.toLowerCase()
    )

    if (!match) return null

    return {
      totalTrips: (match.ALL_TRIPS_COUNT as number) || 0,
      daysSinceLastLogin: match.DAYS_SINCE_LAST_IDENTIFY as number | null,
      customerSegment: match.CUSTOMER_SEGMENT as string | null,
      churnStatus: match.CHURN_STATUS as string | null,
      plan: match.LAGO_PLAN_NAME as string | null,
    }
  } catch (error) {
    console.error("Metabase usage fetch error:", error)
    return null
  }
}

async function fetchBillingData(
  domain: string
): Promise<Customer360["billing"]> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null
  }

  try {
    // Search for customer by domain email pattern
    const customer = await stripe.getCustomerByEmail(`@${domain}`)
    if (!customer) return null

    const [subscriptions, charges] = await Promise.all([
      stripe.getSubscriptions(customer.id).catch(() => []),
      stripe.getPaymentHistory(customer.id, { limit: 5 }).catch(() => []),
    ])

    // Calculate MRR
    const mrr = subscriptions
      .filter((s) => s.status === "active" || s.status === "trialing")
      .reduce((sum, sub) => {
        const item = sub.items.data[0]
        if (!item?.price?.unit_amount) return sum
        const amount = item.price.unit_amount / 100
        if (item.price.recurring?.interval === "year") {
          return sum + amount / 12
        }
        return sum + amount
      }, 0)

    const hasFailedPayments = charges.some((c) => c.status === "failed")
    const lastSuccessful = charges.find((c) => c.status === "succeeded")

    // Determine status
    let status: "healthy" | "at_risk" | "failed" | "unknown" = "unknown"
    if (hasFailedPayments) {
      status = "failed"
    } else if (subscriptions.some((s) => s.status === "past_due" || s.cancel_at_period_end)) {
      status = "at_risk"
    } else if (subscriptions.some((s) => s.status === "active")) {
      status = "healthy"
    }

    return {
      customerId: customer.id,
      status,
      mrr,
      subscriptions: subscriptions.map((s) => ({
        plan: s.items.data[0]?.price?.nickname || null,
        status: s.status,
        renewalDate: new Date(s.current_period_end * 1000).toISOString(),
        cancelPending: s.cancel_at_period_end,
      })),
      hasFailedPayments,
      lastPayment: lastSuccessful
        ? {
            date: new Date(lastSuccessful.created * 1000).toISOString(),
            amount: lastSuccessful.amount / 100,
          }
        : null,
    }
  } catch (error) {
    console.error("Stripe billing fetch error:", error)
    return null
  }
}

async function fetchTasksData(
  companyName: string
): Promise<Customer360["tasks"]> {
  if (!process.env.NOTION_API_KEY || !CSM_DATABASE_ID) {
    return null
  }

  try {
    const result = await notion.queryDatabase(CSM_DATABASE_ID, {
      filter: {
        property: "Company",
        rich_text: { contains: companyName },
      },
      sorts: [{ property: "Due Date", direction: "ascending" }],
      pageSize: 10,
    })

    const tasks = result.results.map((page) => {
      const status = notion.extractSelect(page.properties["Status"]) || "Unknown"
      const dueDate = notion.extractDate(page.properties["Due Date"])

      return {
        id: page.id,
        title: notion.extractTitle(page.properties["Title"] || page.properties["Name"]),
        status,
        dueDate,
        url: page.url,
      }
    })

    const now = new Date()
    const openStatuses = ["To Do", "In Progress", "Not Started", "Blocked"]
    const openTasks = tasks.filter((t) => openStatuses.includes(t.status))
    const overdueTasks = openTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now
    )

    return {
      total: tasks.length,
      open: openTasks.length,
      overdue: overdueTasks.length,
      items: tasks.slice(0, 5),
    }
  } catch (error) {
    console.error("Notion tasks fetch error:", error)
    return null
  }
}

// ============================================================================
// Health calculation
// ============================================================================

function calculateOverallHealth(
  crm: Customer360["crm"],
  usage: Customer360["usage"],
  billing: Customer360["billing"],
  tasks: Customer360["tasks"]
): {
  healthScore: Customer360["healthScore"]
  riskLevel: Customer360["riskLevel"]
  riskSignals: string[]
  positiveSignals: string[]
} {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  // Usage signals
  if (usage) {
    if (usage.churnStatus?.toLowerCase().includes("churn")) {
      riskSignals.push("Churned")
    }
    if (usage.totalTrips > 100) {
      positiveSignals.push("High usage")
    } else if (usage.totalTrips <= 5) {
      riskSignals.push("Low usage")
    }
    if (usage.daysSinceLastLogin && usage.daysSinceLastLogin > 60) {
      riskSignals.push(`No login in ${usage.daysSinceLastLogin}d`)
    } else if (usage.daysSinceLastLogin && usage.daysSinceLastLogin <= 7) {
      positiveSignals.push("Recent login")
    }
  }

  // Billing signals
  if (billing) {
    if (billing.status === "failed") {
      riskSignals.push("Payment failed")
    } else if (billing.status === "at_risk") {
      riskSignals.push("Payment at risk")
    } else if (billing.status === "healthy") {
      positiveSignals.push("Payments healthy")
    }
    if (billing.mrr > 0) {
      positiveSignals.push(`$${billing.mrr.toFixed(0)} MRR`)
    }
    if (billing.subscriptions.some((s) => s.cancelPending)) {
      riskSignals.push("Cancellation pending")
    }
  }

  // CRM signals
  if (crm) {
    if (crm.lifecycleStage === "customer") {
      positiveSignals.push("Active customer")
    }
    if (crm.contacts.length > 0) {
      positiveSignals.push(`${crm.contacts.length} contacts`)
    }
  }

  // Task signals
  if (tasks) {
    if (tasks.overdue > 0) {
      riskSignals.push(`${tasks.overdue} overdue tasks`)
    }
  }

  // Calculate scores
  let healthScore: Customer360["healthScore"] = "unknown"
  let riskLevel: Customer360["riskLevel"] = "low"

  const criticalRisks = riskSignals.filter((r) =>
    r.includes("Churned") ||
    r.includes("Payment failed") ||
    r.includes("Cancellation pending")
  )

  if (criticalRisks.length > 0) {
    healthScore = "red"
    riskLevel = "critical"
  } else if (riskSignals.length >= 2) {
    healthScore = "red"
    riskLevel = "high"
  } else if (riskSignals.length === 1) {
    healthScore = "yellow"
    riskLevel = "medium"
  } else if (positiveSignals.length >= 3) {
    healthScore = "green"
    riskLevel = "low"
  } else if (positiveSignals.length >= 1) {
    healthScore = "green"
    riskLevel = "low"
  }

  return { healthScore, riskLevel, riskSignals, positiveSignals }
}
