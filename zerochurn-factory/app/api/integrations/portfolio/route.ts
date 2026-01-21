import { NextRequest, NextResponse } from "next/server"
import { hubspot, stripe } from "@/lib/integrations"
import type { HubSpotCompany, HubSpotContact, StripeCustomer, StripeSubscription, StripeInvoice } from "@/lib/integrations"

interface CompanyHealthSummary {
  companyId: string
  companyName: string
  domain: string | null
  healthScore: "green" | "yellow" | "red" | "unknown"
  mrr: number | null
  plan: string | null
  paymentStatus: "current" | "overdue" | "at_risk" | "unknown"
  lastActivity: string | null
  contactCount: number
  riskSignals: string[]
  positiveSignals: string[]
  customerSince: string | null
}

/**
 * Get portfolio health data for a segment
 *
 * GET /api/integrations/portfolio?segment=enterprise|mid-market|smb|all
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const segment = searchParams.get("segment") || "all"

  // Check if integrations are configured
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    return NextResponse.json({
      summaries: [],
      configured: { hubspot: false, stripe: false },
      error: "HubSpot not configured",
    })
  }

  try {
    // Fetch all companies from HubSpot
    const allCompanies = await hubspot.searchCompanies("*")

    // Filter by segment based on lifecycle stage or revenue
    const filtered = filterBySegment(allCompanies, segment)

    // Quick health scoring using only company-level data (no individual API calls)
    const summaries: CompanyHealthSummary[] = filtered.map((company) =>
      quickHealthScore(company)
    )

    // Sort by health score (red first, then yellow, then green)
    summaries.sort((a, b) => {
      const order = { red: 0, yellow: 1, unknown: 2, green: 3 }
      return order[a.healthScore] - order[b.healthScore]
    })

    return NextResponse.json({
      summaries,
      total: filtered.length,
      segment,
      configured: {
        hubspot: true,
        stripe: !!process.env.STRIPE_SECRET_KEY,
      },
    })
  } catch (error) {
    console.error("Portfolio fetch error:", error)
    return NextResponse.json(
      { summaries: [], error: "Failed to fetch portfolio data" },
      { status: 500 }
    )
  }
}

/**
 * Quick health score using only company-level data (fast, no additional API calls)
 */
function quickHealthScore(company: HubSpotCompany): CompanyHealthSummary {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  const lifecycleStage = company.properties.lifecyclestage?.toLowerCase() || ""
  const leadStatus = company.properties.hs_lead_status?.toLowerCase() || ""
  const lastModified = company.properties.hs_lastmodifieddate
  const notesLastUpdated = company.properties.notes_last_updated

  // Lifecycle stage signals
  if (lifecycleStage === "customer") {
    positiveSignals.push("Active customer")
  } else if (lifecycleStage === "opportunity") {
    positiveSignals.push("Opportunity")
  } else if (lifecycleStage === "evangelist") {
    positiveSignals.push("Evangelist")
  } else if (lifecycleStage === "lead" || lifecycleStage === "marketingqualifiedlead") {
    positiveSignals.push("Lead")
  }

  // Lead status signals
  if (leadStatus.includes("unqualified") || leadStatus.includes("bad")) {
    riskSignals.push("Unqualified")
  } else if (leadStatus.includes("connected") || leadStatus.includes("qualified")) {
    positiveSignals.push("Qualified")
  }

  // Activity recency signals
  const daysSinceUpdate = lastModified
    ? Math.floor((Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24))
    : null

  if (daysSinceUpdate !== null) {
    if (daysSinceUpdate > 180) {
      riskSignals.push("Inactive 6+ months")
    } else if (daysSinceUpdate > 90) {
      riskSignals.push("Inactive 3+ months")
    } else if (daysSinceUpdate <= 30) {
      positiveSignals.push("Recent activity")
    }
  }

  // Notes activity
  if (notesLastUpdated) {
    const daysSinceNotes = Math.floor((Date.now() - new Date(notesLastUpdated).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceNotes <= 14) {
      positiveSignals.push("Recent notes")
    }
  }

  // Calculate health score
  let healthScore: "green" | "yellow" | "red" | "unknown" = "unknown"

  if (riskSignals.some((r) => r.includes("6+ months"))) {
    healthScore = "red"
  } else if (riskSignals.length >= 2) {
    healthScore = "red"
  } else if (riskSignals.length === 1 && positiveSignals.length < 2) {
    healthScore = "yellow"
  } else if (positiveSignals.length >= 2) {
    healthScore = "green"
  } else if (positiveSignals.length === 1 && riskSignals.length === 0) {
    healthScore = "green"
  } else if (lifecycleStage === "customer" && riskSignals.length === 0) {
    healthScore = "green"
  } else if (riskSignals.length === 0 && positiveSignals.length === 0) {
    healthScore = "unknown"
  } else {
    healthScore = "yellow"
  }

  return {
    companyId: company.id,
    companyName: company.properties.name || "Unknown",
    domain: company.properties.domain || null,
    healthScore,
    mrr: null,
    plan: lifecycleStage || null,
    paymentStatus: lifecycleStage === "customer" ? "current" : "unknown",
    lastActivity: notesLastUpdated || lastModified || null,
    contactCount: 0,
    riskSignals,
    positiveSignals,
    customerSince: company.properties.createdate || null,
  }
}

function filterBySegment(companies: HubSpotCompany[], segment: string): HubSpotCompany[] {
  if (segment === "all") return companies

  return companies.filter((company) => {
    const revenue = parseFloat(company.properties.annualrevenue || "0")
    const stage = company.properties.lifecyclestage?.toLowerCase() || ""

    switch (segment.toLowerCase()) {
      case "enterprise":
        // Enterprise: $1M+ or customer lifecycle stage (as proxy for established accounts)
        return revenue >= 1000000 || stage === "customer"
      case "mid-market":
        // Mid-market: $250K-$1M
        return revenue >= 250000 && revenue < 1000000
      case "smb":
        // SMB: $50K-$250K
        return revenue >= 50000 && revenue < 250000
      case "smb/mid-market":
      case "smb-mid-market":
        // Combined SMB + Mid-Market for the SMB/Mid-Market CSM
        return revenue >= 50000 && revenue < 1000000
      default:
        return true
    }
  })
}

async function gatherCompanyHealth(company: HubSpotCompany): Promise<CompanyHealthSummary> {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  // Get contacts for this company
  let contacts: HubSpotContact[] = []
  try {
    contacts = await hubspot.getContacts(company.id)
  } catch {
    // Continue without contacts
  }

  // Try to get Stripe data using contact email
  let stripeCustomer: StripeCustomer | null = null
  let subscriptions: StripeSubscription[] = []
  let invoices: StripeInvoice[] = []

  const contactEmail = contacts.find((c) => c.properties.email)?.properties.email
  if (contactEmail && process.env.STRIPE_SECRET_KEY) {
    try {
      stripeCustomer = await stripe.getCustomerByEmail(contactEmail)
      if (stripeCustomer) {
        subscriptions = await stripe.getSubscriptions(stripeCustomer.id)
        invoices = await stripe.getInvoices(stripeCustomer.id, { limit: 5 })
      }
    } catch {
      // Continue without Stripe data
    }
  }

  // Calculate health metrics
  let plan: string | null = null
  let mrr: number | null = null
  let paymentStatus: "current" | "overdue" | "at_risk" | "unknown" = "unknown"

  // --- HubSpot-based signals ---
  const lifecycleStage = company.properties.lifecyclestage?.toLowerCase() || ""
  const leadStatus = company.properties.hs_lead_status?.toLowerCase() || ""
  const lastModified = company.properties.hs_lastmodifieddate
  const notesLastUpdated = company.properties.notes_last_updated

  // Lifecycle stage signals
  if (lifecycleStage === "customer") {
    positiveSignals.push("Active customer")
    paymentStatus = "current"
  } else if (lifecycleStage === "opportunity") {
    positiveSignals.push("Opportunity stage")
  } else if (lifecycleStage === "evangelist") {
    positiveSignals.push("Evangelist")
  }

  // Lead status risk signals
  if (leadStatus.includes("unqualified") || leadStatus.includes("bad")) {
    riskSignals.push("Unqualified lead status")
  } else if (leadStatus.includes("open") || leadStatus.includes("new") || leadStatus.includes("attempt")) {
    // Neutral - no signal
  } else if (leadStatus.includes("connected") || leadStatus.includes("qualified")) {
    positiveSignals.push("Qualified status")
  }

  // Activity recency signals
  const daysSinceUpdate = lastModified
    ? Math.floor((Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24))
    : null

  if (daysSinceUpdate !== null) {
    if (daysSinceUpdate > 180) {
      riskSignals.push("No activity in 6+ months")
    } else if (daysSinceUpdate > 90) {
      riskSignals.push("No activity in 3+ months")
    } else if (daysSinceUpdate <= 30) {
      positiveSignals.push("Recent activity")
    }
  }

  // Notes activity
  if (notesLastUpdated) {
    const daysSinceNotes = Math.floor((Date.now() - new Date(notesLastUpdated).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceNotes <= 14) {
      positiveSignals.push("Recent notes")
    }
  }

  // --- Stripe-based signals ---
  if (subscriptions.length > 0) {
    const activeSub = subscriptions.find((s) => s.status === "active")
    if (activeSub) {
      plan = activeSub.items.data[0]?.price?.nickname || "Active Plan"
      mrr = activeSub.items.data.reduce((sum, item) => {
        const amount = item.price?.unit_amount || 0
        const interval = item.price?.recurring?.interval
        if (interval === "year") return sum + amount / 12
        return sum + amount
      }, 0) / 100

      positiveSignals.push("Active subscription")
      paymentStatus = "current"
    }

    if (subscriptions.some((s) => s.cancel_at_period_end)) {
      riskSignals.push("Cancellation pending")
    }

    if (subscriptions.some((s) => s.status === "past_due")) {
      riskSignals.push("Subscription past due")
      paymentStatus = "overdue"
    }
  }

  // Check invoices
  if (invoices.length > 0) {
    const failedInvoices = invoices.filter((i) => i.status === "uncollectible" || i.status === "open")
    if (failedInvoices.length >= 2) {
      riskSignals.push(`${failedInvoices.length} unpaid invoices`)
      paymentStatus = "at_risk"
    }

    const recentPaid = invoices.filter((i) => i.status === "paid").slice(0, 3)
    if (recentPaid.length >= 3) {
      positiveSignals.push("Consistent payments")
    }
  }

  if (stripeCustomer?.delinquent) {
    riskSignals.push("Marked delinquent")
    paymentStatus = "overdue"
  }

  // Contact signals
  if (contacts.length === 0) {
    riskSignals.push("No contacts on file")
  } else if (contacts.length >= 3) {
    positiveSignals.push(`${contacts.length} contacts`)
  } else if (contacts.length >= 1) {
    positiveSignals.push("Has contacts")
  }

  // --- Calculate health score ---
  let healthScore: "green" | "yellow" | "red" | "unknown" = "unknown"

  // Critical risk signals = red
  if (riskSignals.some((r) =>
    r.includes("past due") ||
    r.includes("delinquent") ||
    r.includes("Cancellation") ||
    r.includes("6+ months")
  )) {
    healthScore = "red"
  } else if (riskSignals.length >= 2) {
    healthScore = "red"
  } else if (riskSignals.length === 1 && positiveSignals.length < 2) {
    // One risk signal and not many positives = yellow
    healthScore = "yellow"
  } else if (positiveSignals.length >= 2) {
    // Multiple positive signals = green
    healthScore = "green"
  } else if (positiveSignals.length === 1 && riskSignals.length === 0) {
    // One positive, no negatives = green
    healthScore = "green"
  } else if (lifecycleStage === "customer" && riskSignals.length === 0) {
    // Customer with no risk = green
    healthScore = "green"
  } else if (riskSignals.length === 0) {
    // No signals either way = unknown (needs attention)
    healthScore = "unknown"
  } else {
    healthScore = "yellow"
  }

  return {
    companyId: company.id,
    companyName: company.properties.name || "Unknown",
    domain: company.properties.domain || null,
    healthScore,
    mrr,
    plan,
    paymentStatus,
    lastActivity: company.properties.notes_last_updated || company.properties.hs_lastmodifieddate || null,
    contactCount: contacts.length,
    riskSignals,
    positiveSignals,
    customerSince: company.properties.createdate || null,
  }
}
