import { NextRequest, NextResponse } from "next/server"
import { hubspot, metabase, stripe } from "@/lib/integrations"
import { prisma } from "@/lib/db"

// Metabase query IDs
const ACCOUNT_DATA_QUERY_ID = 948

interface AccountDetail {
  // Core info
  id: string
  name: string
  domain: string | null
  industry: string | null
  website: string | null
  phone: string | null
  city: string | null
  state: string | null
  country: string | null
  description: string | null
  // Platform identifiers
  operatorId: string | null
  stripeAccountId: string | null
  // Lifecycle
  lifecycleStage: string | null
  customerSince: string | null
  lastModified: string | null
  // Health
  healthScore: "green" | "yellow" | "red" | "unknown"
  riskSignals: string[]
  positiveSignals: string[]
  // Financials (from Metabase)
  mrr: number | null
  plan: string | null
  planCode: string | null
  customerSegment: string | null
  // Usage (from Metabase/Card 1469)
  totalTrips: number | null
  tripsLast30Days: number | null
  daysSinceLastLogin: number | null
  churnStatus: string | null
  engagementStatus: string | null
  // Fleet/Product adoption (from Card 1469)
  vehiclesTotal: number | null
  driversCount: number | null
  membersCount: number | null
  setupScore: number | null
  // Subscription info
  subscriptionLifetimeDays: number | null
  // Contacts
  contacts: ContactInfo[]
  // Deals
  deals: DealInfo[]
  // Activity timeline
  timeline: TimelineEvent[]
  // Payment health (from Stripe)
  paymentHealth: PaymentHealth | null
  // Data source indicator
  hasHubSpotRecord: boolean
  // Timestamps
  lastSyncedAt: string | null
  lastTripCreatedAt: string | null
}

interface ContactInfo {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  jobTitle: string | null
  lastModified: string | null
}

interface DealInfo {
  id: string
  name: string
  amount: number | null
  stage: string | null
  closeDate: string | null
  createdAt: string | null
}

interface TimelineEvent {
  id: string
  type: "note" | "email" | "call" | "meeting" | "deal" | "health_change" | "payment"
  title: string
  description?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

interface PaymentHealth {
  stripeCustomerId: string | null
  subscriptions: SubscriptionInfo[]
  recentInvoices: InvoiceInfo[]
  paymentStatus: "healthy" | "at_risk" | "failed" | "unknown"
  totalMrr: number
  hasFailedPayments: boolean
  lastPaymentDate: string | null
  lastPaymentAmount: number | null
}

interface SubscriptionInfo {
  id: string
  status: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  planName: string | null
  amount: number | null
  interval: string | null
}

interface InvoiceInfo {
  id: string
  status: string
  amount: number
  currency: string
  dueDate: string | null
  paidAt: string | null
  invoiceUrl: string | null
}

/**
 * Get detailed account information
 * GET /api/integrations/accounts/[id]
 *
 * Handles both HubSpot IDs (numeric) and synthetic operator IDs (operator-xxx)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Check if this is a synthetic operator ID (for operators without HubSpot records)
  const isSyntheticId = id.startsWith("operator-")

  try {
    // First, try to get data from our synced database
    const syncedCompany = await prisma.hubSpotCompany.findUnique({
      where: { hubspotId: id },
    })

    // For synthetic IDs, we MUST have synced data (no HubSpot to fall back to)
    if (isSyntheticId && !syncedCompany) {
      return NextResponse.json({ error: "Account not found in database" }, { status: 404 })
    }

    // Determine the actual HubSpot ID to use for API calls
    // Could be the ID passed in, or the hubspotRecordId from sync (if operator was matched to HubSpot)
    const hubspotId = isSyntheticId
      ? syncedCompany?.hubspotRecordId // May be null if no HubSpot match
      : id

    // Only fetch from HubSpot if we have a valid HubSpot ID and the token
    let company: Awaited<ReturnType<typeof hubspot.getCompany>> | null = null
    let contacts: Awaited<ReturnType<typeof hubspot.getContacts>> = []
    let deals: Awaited<ReturnType<typeof hubspot.getDeals>> = []
    let activity: Awaited<ReturnType<typeof hubspot.getRecentActivity>> = {
      engagements: [],
      notes: [],
      emails: [],
      calls: [],
      meetings: [],
    }

    if (hubspotId && process.env.HUBSPOT_ACCESS_TOKEN) {
      try {
        // Fetch company, contacts, deals, and activity in parallel
        const results = await Promise.all([
          hubspot.getCompany(hubspotId).catch(() => null),
          hubspot.getContacts(hubspotId).catch(() => []),
          hubspot.getDeals(hubspotId).catch(() => []),
          hubspot.getRecentActivity(hubspotId).catch(() => ({
            engagements: [],
            notes: [],
            emails: [],
            calls: [],
            meetings: [],
          })),
        ])
        company = results[0]
        contacts = results[1]
        deals = results[2]
        activity = results[3]
      } catch (hubspotError) {
        console.log("HubSpot fetch failed, using synced data:", hubspotError)
      }
    }

    // If no HubSpot data and no synced data, return 404
    if (!company && !syncedCompany) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Determine company name and domain for Metabase/Stripe lookups
    const companyName = company?.properties.name || syncedCompany?.name || "Unknown"
    const companyDomain = company?.properties.domain || syncedCompany?.domain || null
    const companyEmail = companyDomain
      ? `@${companyDomain}`
      : syncedCompany?.primaryContactEmail
        ? `@${syncedCompany.primaryContactEmail.split("@")[1]}`
        : null

    // Fetch Metabase and Stripe data in parallel
    const [metabaseData, paymentHealth] = await Promise.all([
      fetchMetabaseDataForCompany(companyName),
      fetchStripeData(companyEmail),
    ])

    // Build timeline from activity (including payments)
    const timeline = buildTimeline(activity, deals, paymentHealth)

    // Use synced data if available, otherwise calculate (for companies not yet synced)
    let healthScore: "green" | "yellow" | "red" | "unknown"
    let riskSignals: string[]
    let positiveSignals: string[]

    if (syncedCompany && syncedCompany.healthScore) {
      // Use stored health data from sync (consistent with CSM Workload)
      healthScore = syncedCompany.healthScore as "green" | "yellow" | "red" | "unknown"
      riskSignals = syncedCompany.riskSignals || []
      positiveSignals = syncedCompany.positiveSignals || []
    } else if (company) {
      // Fallback: calculate health for companies not yet synced
      const calculated = calculateHealth(company, metabaseData, paymentHealth)
      healthScore = calculated.healthScore
      riskSignals = calculated.riskSignals
      positiveSignals = calculated.positiveSignals
    } else {
      // No HubSpot data and no synced health - use defaults
      healthScore = "unknown"
      riskSignals = []
      positiveSignals = []
    }

    // Prefer synced data for usage metrics if available
    const finalMrr = syncedCompany?.mrr ?? metabaseData?.mrr ?? null
    const finalPlan = syncedCompany?.plan ?? metabaseData?.plan ?? null
    const finalTotalTrips = syncedCompany?.totalTrips ?? metabaseData?.totalTrips ?? null
    const finalDaysSinceLastLogin =
      syncedCompany?.daysSinceLastLogin ?? metabaseData?.daysSinceLastLogin ?? null

    const accountDetail: AccountDetail = {
      // Core info - prefer HubSpot, fall back to synced data
      id: id, // Use the original ID (could be HubSpot or synthetic)
      name: company?.properties.name || syncedCompany?.name || "Unknown",
      domain: company?.properties.domain || syncedCompany?.domain || null,
      industry: company?.properties.industry || syncedCompany?.industry || null,
      website: company?.properties.website || null,
      phone: company?.properties.phone || null,
      city: company?.properties.city || syncedCompany?.city || null,
      state: company?.properties.state || syncedCompany?.state || null,
      country: company?.properties.country || syncedCompany?.country || null,
      description: company?.properties.description || null,
      // Platform identifiers (from synced Metabase data)
      operatorId: syncedCompany?.operatorId || null,
      stripeAccountId: syncedCompany?.stripeAccountId || null,
      // Lifecycle
      lifecycleStage:
        company?.properties.lifecyclestage || syncedCompany?.subscriptionStatus || null,
      customerSince:
        company?.properties.createdate || syncedCompany?.hubspotCreatedAt?.toISOString() || null,
      lastModified:
        company?.properties.hs_lastmodifieddate ||
        syncedCompany?.hubspotUpdatedAt?.toISOString() ||
        null,
      // Health (from synced database for consistency)
      healthScore,
      riskSignals,
      positiveSignals,
      // Financials (prefer synced data)
      mrr: finalMrr,
      plan: finalPlan,
      planCode: syncedCompany?.planCode || null,
      customerSegment: syncedCompany?.customerSegment || metabaseData?.customerSegment || null,
      // Usage (prefer synced data from Card 1469)
      totalTrips: finalTotalTrips,
      tripsLast30Days: syncedCompany?.tripsLast30Days || null,
      daysSinceLastLogin: finalDaysSinceLastLogin,
      churnStatus: metabaseData?.churnStatus || syncedCompany?.subscriptionStatus || null,
      engagementStatus: syncedCompany?.engagementStatus || null,
      // Fleet/Product adoption (from Card 1469)
      vehiclesTotal: syncedCompany?.vehiclesTotal || null,
      driversCount: syncedCompany?.driversCount || null,
      membersCount: syncedCompany?.membersCount || null,
      setupScore: syncedCompany?.setupScore || null,
      // Subscription info
      subscriptionLifetimeDays: syncedCompany?.subscriptionLifetimeDays || null,
      // Contacts - from HubSpot if available, otherwise show primary contact from sync
      contacts:
        contacts.length > 0
          ? contacts.map((c) => ({
              id: c.id,
              firstName: c.properties.firstname || null,
              lastName: c.properties.lastname || null,
              email: c.properties.email || null,
              phone: c.properties.phone || null,
              jobTitle: c.properties.jobtitle || null,
              lastModified: c.properties.lastmodifieddate || null,
            }))
          : syncedCompany?.primaryContactEmail
            ? [
                {
                  id: "primary",
                  firstName: null,
                  lastName: null,
                  email: syncedCompany.primaryContactEmail,
                  phone: null,
                  jobTitle: null,
                  lastModified: null,
                },
              ]
            : [],
      // Deals
      deals: deals.map((d) => ({
        id: d.id,
        name: d.properties.dealname,
        amount: d.properties.amount ? parseFloat(d.properties.amount) : null,
        stage: d.properties.dealstage || null,
        closeDate: d.properties.closedate || null,
        createdAt: d.properties.createdate || null,
      })),
      // Timeline
      timeline,
      // Payment health
      paymentHealth,
      // Data source - true if we have actual HubSpot data OR synced record indicates HubSpot match
      hasHubSpotRecord: !!company || syncedCompany?.hasHubSpotRecord === true,
      // Timestamps
      lastSyncedAt: syncedCompany?.lastSyncedAt?.toISOString() || null,
      lastTripCreatedAt: syncedCompany?.lastTripCreatedAt?.toISOString() || null,
    }

    return NextResponse.json(accountDetail)
  } catch (error) {
    console.error("Account detail fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch account details" }, { status: 500 })
  }
}

interface MetabaseAccountData {
  companyName: string
  totalTrips: number
  daysSinceLastLogin: number | null
  churnStatus: string | null
  mrr: number | null
  plan: string | null
  customerSegment: string | null
}

async function fetchMetabaseDataForCompany(
  companyName: string
): Promise<MetabaseAccountData | null> {
  if (!process.env.METABASE_URL || !process.env.METABASE_API_KEY || !companyName) {
    return null
  }

  try {
    const result = await metabase.runQuery(ACCOUNT_DATA_QUERY_ID)
    const rows = metabase.rowsToObjects<Record<string, unknown>>(result)

    // Find matching company (case-insensitive)
    const match = rows.find(
      (row) => (row.MOOVS_COMPANY_NAME as string)?.toLowerCase() === companyName.toLowerCase()
    )

    if (!match) return null

    return {
      companyName: (match.MOOVS_COMPANY_NAME as string) || "",
      totalTrips: (match.ALL_TRIPS_COUNT as number) || 0,
      daysSinceLastLogin: match.DAYS_SINCE_LAST_IDENTIFY as number | null,
      churnStatus: match.CHURN_STATUS as string | null,
      mrr: match.TOTAL_MRR_NUMERIC as number | null,
      plan: match.LAGO_PLAN_NAME as string | null,
      customerSegment: match.CUSTOMER_SEGMENT as string | null,
    }
  } catch (error) {
    console.error("Metabase fetch error for company:", error)
    return null
  }
}

/**
 * Fetch Stripe payment data for a company
 * Attempts to find customer by domain-based email pattern
 */
async function fetchStripeData(companyDomainEmail: string | null): Promise<PaymentHealth | null> {
  if (!process.env.STRIPE_SECRET_KEY || !companyDomainEmail) {
    return null
  }

  try {
    // Try to find customer by email domain pattern
    const customer = await stripe.getCustomerByEmail(companyDomainEmail)

    if (!customer) {
      return null
    }

    // Fetch subscriptions, invoices, and recent charges
    const [subscriptions, invoices, charges] = await Promise.all([
      stripe.getSubscriptions(customer.id).catch(() => []),
      stripe.getInvoices(customer.id, { limit: 10 }).catch(() => []),
      stripe.getPaymentHistory(customer.id, { limit: 5 }).catch(() => []),
    ])

    // Calculate total MRR from active subscriptions
    const totalMrr = subscriptions
      .filter((s) => s.status === "active" || s.status === "trialing")
      .reduce((sum, sub) => {
        const item = sub.items.data[0]
        if (!item?.price?.unit_amount) return sum
        const amount = item.price.unit_amount / 100 // Convert cents to dollars
        // Normalize to monthly
        if (item.price.recurring?.interval === "year") {
          return sum + amount / 12
        }
        return sum + amount
      }, 0)

    // Check for failed payments
    const hasFailedPayments = charges.some((c) => c.status === "failed" || c.refunded)

    // Determine payment status
    let paymentStatus: PaymentHealth["paymentStatus"] = "unknown"
    const hasOverdueInvoice = invoices.some(
      (i) => i.status === "open" && i.due_date && i.due_date < Date.now() / 1000
    )
    const hasAtRiskSubscription = subscriptions.some(
      (s) => s.status === "past_due" || s.cancel_at_period_end
    )

    if (hasFailedPayments || hasOverdueInvoice) {
      paymentStatus = "failed"
    } else if (hasAtRiskSubscription) {
      paymentStatus = "at_risk"
    } else if (subscriptions.some((s) => s.status === "active")) {
      paymentStatus = "healthy"
    }

    // Get last successful payment
    const lastSuccessfulCharge = charges.find((c) => c.status === "succeeded")

    return {
      stripeCustomerId: customer.id,
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        status: s.status,
        currentPeriodEnd: new Date(s.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: s.cancel_at_period_end,
        planName: s.items.data[0]?.price?.nickname || null,
        amount: s.items.data[0]?.price?.unit_amount
          ? s.items.data[0].price.unit_amount / 100
          : null,
        interval: s.items.data[0]?.price?.recurring?.interval || null,
      })),
      recentInvoices: invoices.slice(0, 5).map((i) => ({
        id: i.id,
        status: i.status,
        amount: i.amount_due / 100,
        currency: i.currency,
        dueDate: i.due_date ? new Date(i.due_date * 1000).toISOString() : null,
        paidAt: i.paid ? new Date(i.period_end * 1000).toISOString() : null,
        invoiceUrl: i.hosted_invoice_url,
      })),
      paymentStatus,
      totalMrr,
      hasFailedPayments,
      lastPaymentDate: lastSuccessfulCharge
        ? new Date(lastSuccessfulCharge.created * 1000).toISOString()
        : null,
      lastPaymentAmount: lastSuccessfulCharge ? lastSuccessfulCharge.amount / 100 : null,
    }
  } catch (error) {
    console.error("Stripe fetch error:", error)
    return null
  }
}

function buildTimeline(
  activity: {
    notes: Array<{ id: string; body: string; timestamp: string }>
    emails: Array<{ id: string; subject: string; timestamp: string }>
    calls: Array<{
      id: string
      disposition: string
      duration: number
      timestamp: string
    }>
    meetings: Array<{
      id: string
      title: string
      startTime: string
      endTime: string
    }>
  },
  deals: Array<{
    id: string
    properties: { dealname: string; createdate: string; amount?: string }
  }>,
  paymentHealth: PaymentHealth | null
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // Add notes
  for (const note of activity.notes) {
    events.push({
      id: `note-${note.id}`,
      type: "note",
      title: "Note added",
      description: note.body.substring(0, 200),
      timestamp: note.timestamp,
    })
  }

  // Add emails
  for (const email of activity.emails) {
    events.push({
      id: `email-${email.id}`,
      type: "email",
      title: email.subject || "Email sent",
      timestamp: email.timestamp,
    })
  }

  // Add calls
  for (const call of activity.calls) {
    events.push({
      id: `call-${call.id}`,
      type: "call",
      title: `Call - ${call.disposition || "Completed"}`,
      description:
        call.duration > 0 ? `Duration: ${Math.round(call.duration / 60)} min` : undefined,
      timestamp: call.timestamp,
    })
  }

  // Add meetings
  for (const meeting of activity.meetings) {
    events.push({
      id: `meeting-${meeting.id}`,
      type: "meeting",
      title: meeting.title || "Meeting",
      timestamp: meeting.startTime,
    })
  }

  // Add deals
  for (const deal of deals) {
    events.push({
      id: `deal-${deal.id}`,
      type: "deal",
      title: `Deal: ${deal.properties.dealname}`,
      description: deal.properties.amount
        ? `$${parseFloat(deal.properties.amount).toLocaleString()}`
        : undefined,
      timestamp: deal.properties.createdate,
    })
  }

  // Add payment events from Stripe
  if (paymentHealth) {
    for (const invoice of paymentHealth.recentInvoices) {
      const statusLabel =
        invoice.status === "paid"
          ? "Payment received"
          : invoice.status === "open"
            ? "Invoice pending"
            : `Invoice ${invoice.status}`
      events.push({
        id: `payment-${invoice.id}`,
        type: "payment",
        title: statusLabel,
        description: `$${invoice.amount.toLocaleString()} ${invoice.currency.toUpperCase()}`,
        timestamp: invoice.paidAt || invoice.dueDate || new Date().toISOString(),
        metadata: { invoiceUrl: invoice.invoiceUrl },
      })
    }
  }

  // Sort by timestamp (newest first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return events.slice(0, 50) // Limit to 50 events
}

function calculateHealth(
  company: { properties: Record<string, string | undefined> },
  mb: MetabaseAccountData | null,
  payment: PaymentHealth | null = null
): {
  healthScore: "green" | "yellow" | "red" | "unknown"
  riskSignals: string[]
  positiveSignals: string[]
} {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  const lifecycleStage = company.properties.lifecyclestage?.toLowerCase() || ""
  const lastModified = company.properties.hs_lastmodifieddate

  // Payment-based signals (Stripe)
  if (payment) {
    if (payment.paymentStatus === "failed") {
      riskSignals.push("Failed payments")
    } else if (payment.paymentStatus === "at_risk") {
      riskSignals.push("Payment at risk")
    } else if (payment.paymentStatus === "healthy") {
      positiveSignals.push("Healthy payments")
    }

    if (payment.hasFailedPayments) {
      riskSignals.push("Recent payment failure")
    }

    if (payment.totalMrr > 0) {
      positiveSignals.push(`$${payment.totalMrr.toFixed(0)} MRR`)
    }

    // Check for upcoming cancellation
    const cancelingSub = payment.subscriptions.find((s) => s.cancelAtPeriodEnd)
    if (cancelingSub) {
      riskSignals.push("Subscription canceling")
    }
  }

  // Metabase-based signals
  if (mb) {
    if (mb.churnStatus && mb.churnStatus.toLowerCase().includes("churn")) {
      riskSignals.push("Churned")
    }

    if (mb.totalTrips > 100) {
      positiveSignals.push(`${mb.totalTrips} trips`)
    } else if (mb.totalTrips > 20) {
      positiveSignals.push("Active usage")
    } else if (mb.totalTrips > 0 && mb.totalTrips <= 5) {
      riskSignals.push("Low usage")
    } else if (mb.totalTrips === 0) {
      riskSignals.push("No trips")
    }

    if (mb.daysSinceLastLogin !== null) {
      if (mb.daysSinceLastLogin > 60) {
        riskSignals.push(`No login in ${mb.daysSinceLastLogin}d`)
      } else if (mb.daysSinceLastLogin > 30) {
        riskSignals.push("Inactive 30+ days")
      } else if (mb.daysSinceLastLogin <= 7) {
        positiveSignals.push("Recent login")
      }
    }

    if (mb.mrr && mb.mrr > 0) {
      positiveSignals.push("Paying customer")
      if (mb.mrr >= 200) {
        positiveSignals.push("High value")
      }
    } else if (mb.plan?.toLowerCase().includes("free")) {
      if (mb.totalTrips === 0) {
        riskSignals.push("Free + no usage")
      }
    }
  }

  // HubSpot-based signals
  if (lifecycleStage === "customer") {
    positiveSignals.push("Active customer")
  }

  if (!mb && lastModified) {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceUpdate > 180) {
      riskSignals.push("Inactive 6+ months")
    } else if (daysSinceUpdate > 90) {
      riskSignals.push("Inactive 3+ months")
    } else if (daysSinceUpdate <= 30) {
      positiveSignals.push("Recent activity")
    }
  }

  // Calculate score
  let healthScore: "green" | "yellow" | "red" | "unknown" = "unknown"

  if (
    riskSignals.some(
      (r) =>
        r.includes("Churned") ||
        r.includes("6+ months") ||
        (r.includes("No login in") && parseInt(r.match(/\d+/)?.[0] || "0") > 60)
    )
  ) {
    healthScore = "red"
  } else if (riskSignals.length >= 2) {
    healthScore = "red"
  } else if (riskSignals.length === 1 && positiveSignals.length < 2) {
    healthScore = "yellow"
  } else if (positiveSignals.length >= 3) {
    healthScore = "green"
  } else if (positiveSignals.length >= 2 && riskSignals.length === 0) {
    healthScore = "green"
  } else if (positiveSignals.length === 1 && riskSignals.length === 0) {
    healthScore = "green"
  } else if (mb && mb.totalTrips > 10 && mb.mrr && mb.mrr > 0) {
    healthScore = "green"
  } else if (riskSignals.length === 0 && positiveSignals.length === 0) {
    healthScore = "unknown"
  } else {
    healthScore = "yellow"
  }

  return { healthScore, riskSignals, positiveSignals }
}
