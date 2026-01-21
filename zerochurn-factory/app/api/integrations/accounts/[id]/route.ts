import { NextRequest, NextResponse } from "next/server"
import { hubspot, metabase } from "@/lib/integrations"

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
  customerSegment: string | null
  // Usage (from Metabase)
  totalTrips: number | null
  daysSinceLastLogin: number | null
  churnStatus: string | null
  // Contacts
  contacts: ContactInfo[]
  // Deals
  deals: DealInfo[]
  // Activity timeline
  timeline: TimelineEvent[]
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
  type: "note" | "email" | "call" | "meeting" | "deal" | "health_change"
  title: string
  description?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

/**
 * Get detailed account information
 * GET /api/integrations/accounts/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "HubSpot not configured" },
      { status: 500 }
    )
  }

  try {
    // Fetch company, contacts, deals, and activity in parallel
    const [company, contacts, deals, activity] = await Promise.all([
      hubspot.getCompany(id),
      hubspot.getContacts(id).catch(() => []),
      hubspot.getDeals(id).catch(() => []),
      hubspot.getRecentActivity(id).catch(() => ({
        engagements: [],
        notes: [],
        emails: [],
        calls: [],
        meetings: [],
      })),
    ])

    // Fetch Metabase data for this company
    const metabaseData = await fetchMetabaseDataForCompany(company.properties.name || "")

    // Build timeline from activity
    const timeline = buildTimeline(activity, deals)

    // Calculate health score
    const { healthScore, riskSignals, positiveSignals } = calculateHealth(
      company,
      metabaseData
    )

    const accountDetail: AccountDetail = {
      // Core info
      id: company.id,
      name: company.properties.name || "Unknown",
      domain: company.properties.domain || null,
      industry: company.properties.industry || null,
      website: company.properties.website || null,
      phone: company.properties.phone || null,
      city: company.properties.city || null,
      state: company.properties.state || null,
      country: company.properties.country || null,
      description: company.properties.description || null,
      // Lifecycle
      lifecycleStage: company.properties.lifecyclestage || null,
      customerSince: company.properties.createdate || null,
      lastModified: company.properties.hs_lastmodifieddate || null,
      // Health
      healthScore,
      riskSignals,
      positiveSignals,
      // Financials
      mrr: metabaseData?.mrr || null,
      plan: metabaseData?.plan || null,
      customerSegment: metabaseData?.customerSegment || null,
      // Usage
      totalTrips: metabaseData?.totalTrips || null,
      daysSinceLastLogin: metabaseData?.daysSinceLastLogin || null,
      churnStatus: metabaseData?.churnStatus || null,
      // Contacts
      contacts: contacts.map((c) => ({
        id: c.id,
        firstName: c.properties.firstname || null,
        lastName: c.properties.lastname || null,
        email: c.properties.email || null,
        phone: c.properties.phone || null,
        jobTitle: c.properties.jobtitle || null,
        lastModified: c.properties.lastmodifieddate || null,
      })),
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
    }

    return NextResponse.json(accountDetail)
  } catch (error) {
    console.error("Account detail fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch account details" },
      { status: 500 }
    )
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
      (row) =>
        (row.MOOVS_COMPANY_NAME as string)?.toLowerCase() ===
        companyName.toLowerCase()
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
  }>
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
      description: call.duration > 0 ? `Duration: ${Math.round(call.duration / 60)} min` : undefined,
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

  // Sort by timestamp (newest first)
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return events.slice(0, 50) // Limit to 50 events
}

function calculateHealth(
  company: { properties: Record<string, string | undefined> },
  mb: MetabaseAccountData | null
): {
  healthScore: "green" | "yellow" | "red" | "unknown"
  riskSignals: string[]
  positiveSignals: string[]
} {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  const lifecycleStage = company.properties.lifecyclestage?.toLowerCase() || ""
  const lastModified = company.properties.hs_lastmodifieddate

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
        (r.includes("No login in") &&
          parseInt(r.match(/\d+/)?.[0] || "0") > 60)
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
