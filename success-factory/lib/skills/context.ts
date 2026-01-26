/**
 * Skill Context Builder
 *
 * Gathers data from integrations based on skill requirements
 * and formats it as markdown for injection into Claude prompts.
 */

import {
  hubspot,
  stripe,
  notion,
  type HubSpotCompany,
  type HubSpotContact,
  type HubSpotDeal,
  type HubSpotActivity,
  type StripeCustomer,
  type StripeSubscription,
  type StripeInvoice,
  type NotionPage,
} from "@/lib/integrations"
import { prisma } from "@/lib/db"

// ============================================================================
// Types
// ============================================================================

export interface SkillDataRequirements {
  hubspot?: {
    company?: boolean // fetch company by domain/name from form input
    contacts?: boolean // fetch contacts for that company
    deals?: boolean // fetch deals
    activity?: boolean // recent activity
  }
  stripe?: {
    customer?: boolean // fetch by email
    subscriptions?: boolean
    invoices?: boolean
  }
  notion?: {
    databases?: string[] // database IDs to query
  }
  batch?: boolean // if true, fetch all companies in segment (portfolio view)
  useTools?: boolean // if true, use dynamic tool calling (like MCP) instead of pre-gathering
}

export interface GatheredContext {
  hubspot?: {
    company?: HubSpotCompany | null
    contacts?: HubSpotContact[]
    deals?: HubSpotDeal[]
    activity?: HubSpotActivity
  }
  stripe?: {
    customer?: StripeCustomer | null
    subscriptions?: StripeSubscription[]
    invoices?: StripeInvoice[]
  }
  notion?: {
    databases?: Record<string, NotionPage[]>
  }
  errors: string[]
}

// ============================================================================
// Synced Database Lookup (primary source for paying customers)
// ============================================================================

/**
 * Get customer data from our synced database (Metabase data)
 * This is more reliable than HubSpot API for actual paying customers
 */
async function getSyncedCustomerData(companyIdentifier: string) {
  try {
    // Search by name (case-insensitive)
    const company = await prisma.hubSpotCompany.findFirst({
      where: {
        OR: [
          { name: { contains: companyIdentifier, mode: "insensitive" } },
          { domain: { contains: companyIdentifier, mode: "insensitive" } },
        ],
      },
    })

    return company
  } catch (error) {
    console.error("[Context] Error fetching synced customer:", error)
    return null
  }
}

/**
 * Format synced customer data as markdown for skill prompts
 */
function formatSyncedCustomerData(company: {
  hubspotId?: string
  name: string
  domain?: string | null
  healthScore?: string | null
  mrr?: number | null
  plan?: string | null
  subscriptionStatus?: string | null
  riskSignals?: string[]
  positiveSignals?: string[]
  primaryContactEmail?: string | null
  primaryContactName?: string | null
  primaryContactPhone?: string | null
  hubspotCreatedAt?: Date | null
  lastLoginAt?: Date | null
  totalTrips?: number | null
  tripsLast30Days?: number | null
  engagementStatus?: string | null
  vehiclesTotal?: number | null
  driversCount?: number | null
  membersCount?: number | null
  setupScore?: number | null
  subscriptionLifetimeDays?: number | null
  daysSinceLastLogin?: number | null
  city?: string | null
  state?: string | null
  ownerName?: string | null
}): string {
  const lines: string[] = []

  // Health score header
  const healthIcon =
    company.healthScore === "green"
      ? "🟢"
      : company.healthScore === "yellow"
        ? "🟡"
        : company.healthScore === "red"
          ? "🔴"
          : "⚪"

  lines.push(`## Customer Data: ${company.name}`)
  lines.push("")
  lines.push("### Quick Stats")
  lines.push("")
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| **Health Score** | ${healthIcon} ${company.healthScore || "Unknown"} |`)
  lines.push(`| **MRR** | ${company.mrr ? `$${company.mrr.toLocaleString()}` : "Unknown"} |`)
  lines.push(`| **Plan** | ${company.plan || "Unknown"} |`)
  lines.push(`| **Subscription Status** | ${company.subscriptionStatus || "Unknown"} |`)
  lines.push(
    `| **Customer Since** | ${company.hubspotCreatedAt ? company.hubspotCreatedAt.toLocaleDateString() : "Unknown"} |`
  )
  lines.push(
    `| **Tenure** | ${company.subscriptionLifetimeDays ? `${company.subscriptionLifetimeDays} days` : "Unknown"} |`
  )
  lines.push("")

  // Engagement metrics
  lines.push("### Engagement & Usage")
  lines.push("")
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| **Total Trips** | ${company.totalTrips?.toLocaleString() || "Unknown"} |`)
  lines.push(`| **Trips (Last 30 Days)** | ${company.tripsLast30Days?.toLocaleString() || "Unknown"} |`)
  lines.push(`| **Engagement Status** | ${company.engagementStatus || "Unknown"} |`)
  lines.push(
    `| **Days Since Last Login** | ${company.daysSinceLastLogin !== null ? company.daysSinceLastLogin : "Unknown"} |`
  )
  lines.push(
    `| **Last Login** | ${company.lastLoginAt ? company.lastLoginAt.toLocaleDateString() : "Unknown"} |`
  )
  lines.push("")

  // Fleet metrics
  lines.push("### Fleet & Team")
  lines.push("")
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| **Vehicles** | ${company.vehiclesTotal ?? "Unknown"} |`)
  lines.push(`| **Drivers** | ${company.driversCount ?? "Unknown"} |`)
  lines.push(`| **Members** | ${company.membersCount ?? "Unknown"} |`)
  lines.push(
    `| **Setup Score** | ${company.setupScore !== null ? `${Math.round((company.setupScore / 30) * 100)}% (${company.setupScore}/30)` : "Unknown"} |`
  )
  lines.push("")

  // Contact info
  if (company.primaryContactEmail || company.primaryContactName || company.primaryContactPhone) {
    lines.push("### Primary Contact")
    lines.push("")
    if (company.primaryContactName) lines.push(`- **Name:** ${company.primaryContactName}`)
    if (company.primaryContactEmail) lines.push(`- **Email:** ${company.primaryContactEmail}`)
    if (company.primaryContactPhone) lines.push(`- **Phone:** ${company.primaryContactPhone}`)
    lines.push("")
  }

  // Location
  if (company.city || company.state) {
    lines.push("### Location")
    lines.push("")
    lines.push(`- ${[company.city, company.state].filter(Boolean).join(", ")}`)
    lines.push("")
  }

  // CSM Owner
  if (company.ownerName) {
    lines.push("### Account Owner")
    lines.push("")
    lines.push(`- **CSM:** ${company.ownerName}`)
    lines.push("")
  }

  // Health signals
  if (company.positiveSignals && company.positiveSignals.length > 0) {
    lines.push("### Positive Signals")
    lines.push("")
    for (const signal of company.positiveSignals) {
      lines.push(`- ✅ ${signal}`)
    }
    lines.push("")
  }

  if (company.riskSignals && company.riskSignals.length > 0) {
    lines.push("### Risk Signals")
    lines.push("")
    for (const signal of company.riskSignals) {
      lines.push(`- ⚠️ ${signal}`)
    }
    lines.push("")
  }

  // Segment determination
  const segment = getSegmentFromPlan(company.plan)
  lines.push("### Segment")
  lines.push("")
  lines.push(`- **Category:** ${segment}`)
  lines.push("")

  return lines.join("\n")
}

function getSegmentFromPlan(plan: string | null): string {
  if (!plan) return "Unknown"
  const planLower = plan.toLowerCase()
  if (planLower.includes("vip") || planLower.includes("elite") || planLower.includes("enterprise")) {
    return "Enterprise"
  }
  if (planLower.includes("pro")) return "Mid-Market"
  if (planLower.includes("free")) return "Free"
  return "SMB"
}

// ============================================================================
// Context Gathering
// ============================================================================

/**
 * Gather context from integrations based on skill requirements
 */
export async function gatherContext(
  requirements: SkillDataRequirements,
  formData: Record<string, string>
): Promise<string> {
  const context: GatheredContext = { errors: [] }

  // First, try to get customer from our synced database (Metabase data)
  // This is the source of truth for paying customers
  const companyIdentifier = extractCompanyIdentifier(formData)
  if (companyIdentifier) {
    const syncedData = await getSyncedCustomerData(companyIdentifier)
    if (syncedData) {
      // Return synced data directly - it's more accurate than HubSpot for paying customers
      return formatSyncedCustomerData(syncedData)
    }
  }

  // Fall back to HubSpot API if not found in synced database
  if (requirements.hubspot) {
    context.hubspot = await gatherHubSpotContext(requirements.hubspot, formData, context.errors)
  }

  // Gather Stripe data - use HubSpot contact emails if no email in form data
  if (requirements.stripe) {
    // Try to get email from form data first, then fall back to HubSpot contacts
    let emailForStripe = extractEmail(formData)

    if (!emailForStripe && context.hubspot?.contacts?.length) {
      // Use the first contact's email from HubSpot
      for (const contact of context.hubspot.contacts) {
        if (contact.properties.email) {
          emailForStripe = contact.properties.email
          break
        }
      }
    }

    context.stripe = await gatherStripeContext(
      requirements.stripe,
      emailForStripe ? { ...formData, _derivedEmail: emailForStripe } : formData,
      context.errors
    )
  }

  // Gather Notion data
  if (requirements.notion?.databases) {
    context.notion = await gatherNotionContext(requirements.notion.databases, context.errors)
  }

  // Format as markdown
  return formatContextAsMarkdown(context)
}

/**
 * Gather HubSpot data based on requirements
 */
async function gatherHubSpotContext(
  requirements: NonNullable<SkillDataRequirements["hubspot"]>,
  formData: Record<string, string>,
  errors: string[]
): Promise<GatheredContext["hubspot"]> {
  const result: GatheredContext["hubspot"] = {}

  // Try to find company by domain or name
  const companyIdentifier = extractCompanyIdentifier(formData)

  if (!companyIdentifier && requirements.company) {
    errors.push("Could not determine company from form data for HubSpot lookup")
    return result
  }

  try {
    // Get company
    if (requirements.company && companyIdentifier) {
      // Try by domain first, then by search
      if (companyIdentifier.includes(".")) {
        result.company = await hubspot.getCompanyByDomain(companyIdentifier)
      }
      if (!result.company) {
        const companies = await hubspot.searchCompanies(companyIdentifier)
        result.company = companies[0] || null
      }
    }

    // If we have a company, fetch related data
    if (result.company) {
      const companyId = result.company.id

      if (requirements.contacts) {
        result.contacts = await hubspot.getContacts(companyId)
      }

      if (requirements.deals) {
        result.deals = await hubspot.getDeals(companyId)
      }

      if (requirements.activity) {
        result.activity = await hubspot.getRecentActivity(companyId)
      }
    }
  } catch (error) {
    errors.push(`HubSpot error: ${error instanceof Error ? error.message : "Unknown error"}`)
  }

  return result
}

/**
 * Gather Stripe data based on requirements
 */
async function gatherStripeContext(
  requirements: NonNullable<SkillDataRequirements["stripe"]>,
  formData: Record<string, string>,
  errors: string[]
): Promise<GatheredContext["stripe"]> {
  const result: GatheredContext["stripe"] = {}

  // Try to find customer by email
  const email = extractEmail(formData)

  if (!email && requirements.customer) {
    errors.push("Could not determine email from form data for Stripe lookup")
    return result
  }

  try {
    // Get customer by email
    if (requirements.customer && email) {
      result.customer = await stripe.getCustomerByEmail(email)
    }

    // If we have a customer, fetch related data
    if (result.customer) {
      const customerId = result.customer.id

      if (requirements.subscriptions) {
        result.subscriptions = await stripe.getSubscriptions(customerId)
      }

      if (requirements.invoices) {
        result.invoices = await stripe.getInvoices(customerId, { limit: 10 })
      }
    }
  } catch (error) {
    errors.push(`Stripe error: ${error instanceof Error ? error.message : "Unknown error"}`)
  }

  return result
}

/**
 * Gather Notion data from specified databases
 */
async function gatherNotionContext(
  databaseIds: string[],
  errors: string[]
): Promise<GatheredContext["notion"]> {
  const result: GatheredContext["notion"] = { databases: {} }

  for (const dbId of databaseIds) {
    try {
      const queryResult = await notion.queryDatabase(dbId, { pageSize: 50 })
      result.databases![dbId] = queryResult.results
    } catch (error) {
      errors.push(
        `Notion database ${dbId}: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  return result
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format gathered context as markdown
 */
function formatContextAsMarkdown(context: GatheredContext): string {
  const sections: string[] = []

  // HubSpot section
  if (context.hubspot && hasHubSpotData(context.hubspot)) {
    sections.push(formatHubSpotSection(context.hubspot))
  }

  // Stripe section
  if (context.stripe && hasStripeData(context.stripe)) {
    sections.push(formatStripeSection(context.stripe))
  }

  // Notion section
  if (context.notion?.databases && Object.keys(context.notion.databases).length > 0) {
    sections.push(formatNotionSection(context.notion))
  }

  // Errors section
  if (context.errors.length > 0) {
    sections.push(formatErrorsSection(context.errors))
  }

  return sections.join("\n\n")
}

function hasHubSpotData(data: GatheredContext["hubspot"]): boolean {
  return !!(data?.company || data?.contacts?.length || data?.deals?.length || data?.activity)
}

function hasStripeData(data: GatheredContext["stripe"]): boolean {
  return !!(data?.customer || data?.subscriptions?.length || data?.invoices?.length)
}

function formatHubSpotSection(data: NonNullable<GatheredContext["hubspot"]>): string {
  const lines: string[] = ["## HubSpot Data"]

  if (data.company) {
    const c = data.company.properties
    lines.push("")
    lines.push(`### Company: ${c.name}`)
    if (c.industry) lines.push(`- Industry: ${c.industry}`)
    if (c.annualrevenue) lines.push(`- Annual Revenue: $${formatNumber(c.annualrevenue)}`)
    if (c.numberofemployees) lines.push(`- Employees: ${c.numberofemployees}`)
    if (c.lifecyclestage) lines.push(`- Lifecycle Stage: ${c.lifecyclestage}`)
    if (c.createdate) lines.push(`- Customer Since: ${formatDate(c.createdate)}`)
    if (c.domain) lines.push(`- Domain: ${c.domain}`)
    if (c.city && c.state) lines.push(`- Location: ${c.city}, ${c.state}`)
  }

  if (data.contacts && data.contacts.length > 0) {
    lines.push("")
    lines.push("### Contacts")
    for (const contact of data.contacts) {
      const name =
        [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(" ") ||
        "Unknown"
      const title = contact.properties.jobtitle ? ` (${contact.properties.jobtitle})` : ""
      const email = contact.properties.email ? ` - ${contact.properties.email}` : ""
      lines.push(`- ${name}${title}${email}`)
    }
  }

  if (data.deals && data.deals.length > 0) {
    lines.push("")
    lines.push("### Deals")
    for (const deal of data.deals) {
      const amount = deal.properties.amount ? ` - $${formatNumber(deal.properties.amount)}` : ""
      const stage = deal.properties.dealstage ? ` (${deal.properties.dealstage})` : ""
      lines.push(`- ${deal.properties.dealname}${amount}${stage}`)
    }
  }

  if (data.activity) {
    const hasActivity =
      data.activity.notes.length > 0 ||
      data.activity.emails.length > 0 ||
      data.activity.calls.length > 0 ||
      data.activity.meetings.length > 0

    if (hasActivity) {
      lines.push("")
      lines.push("### Recent Activity")

      // Combine all activities and sort by date
      const activities: Array<{ date: string; description: string }> = []

      for (const note of data.activity.notes.slice(0, 5)) {
        activities.push({
          date: note.timestamp,
          description: `Note: ${truncate(note.body, 60)}`,
        })
      }

      for (const email of data.activity.emails.slice(0, 5)) {
        activities.push({
          date: email.timestamp,
          description: `Email: ${email.subject || "No subject"}`,
        })
      }

      for (const call of data.activity.calls.slice(0, 5)) {
        activities.push({
          date: call.timestamp,
          description: `Call: ${call.disposition || "Completed"} (${Math.round(call.duration / 60)}min)`,
        })
      }

      for (const meeting of data.activity.meetings.slice(0, 5)) {
        activities.push({
          date: meeting.startTime,
          description: `Meeting: ${meeting.title || "No title"}`,
        })
      }

      // Sort by date descending and take top 10
      activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .forEach((activity) => {
          lines.push(`- ${formatDate(activity.date)}: ${activity.description}`)
        })
    }
  }

  return lines.join("\n")
}

function formatStripeSection(data: NonNullable<GatheredContext["stripe"]>): string {
  const lines: string[] = ["## Stripe Data"]

  if (data.customer) {
    lines.push("")
    lines.push(`### Customer: ${data.customer.name || data.customer.email || "Unknown"}`)
    if (data.customer.email) lines.push(`- Email: ${data.customer.email}`)
    if (data.customer.balance !== 0)
      lines.push(`- Balance: $${(data.customer.balance / 100).toFixed(2)}`)
    if (data.customer.delinquent) lines.push(`- **Delinquent: Yes**`)
    lines.push(`- Created: ${formatTimestamp(data.customer.created)}`)
  }

  if (data.subscriptions && data.subscriptions.length > 0) {
    lines.push("")
    lines.push("### Subscriptions")
    for (const sub of data.subscriptions) {
      const items = sub.items.data
      const planInfo = items
        .map((item) => {
          const price = item.price
          const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : "Custom"
          const interval = price.recurring?.interval || "one-time"
          return `${price.nickname || "Plan"} (${amount}/${interval})`
        })
        .join(", ")

      lines.push(`- ${planInfo}`)
      lines.push(`  - Status: ${sub.status}`)
      lines.push(
        `  - Current Period: ${formatTimestamp(sub.current_period_start)} to ${formatTimestamp(sub.current_period_end)}`
      )
      if (sub.cancel_at_period_end) {
        lines.push(`  - **Cancels at period end**`)
      }
    }
  }

  if (data.invoices && data.invoices.length > 0) {
    lines.push("")
    lines.push("### Recent Invoices")
    for (const invoice of data.invoices.slice(0, 5)) {
      const amount = `$${(invoice.amount_due / 100).toFixed(2)}`
      const status = invoice.status || "unknown"
      lines.push(`- ${formatTimestamp(invoice.created)}: ${amount} (${status})`)
    }
  }

  return lines.join("\n")
}

function formatNotionSection(data: NonNullable<GatheredContext["notion"]>): string {
  const lines: string[] = ["## Notion Data"]

  for (const [dbId, pages] of Object.entries(data.databases || {})) {
    lines.push("")
    lines.push(`### Database: ${dbId}`)
    lines.push(`- ${pages.length} records found`)

    // Show first few records
    for (const page of pages.slice(0, 5)) {
      const title = extractNotionTitle(page)
      lines.push(`- ${title || page.id}`)
    }

    if (pages.length > 5) {
      lines.push(`- ... and ${pages.length - 5} more`)
    }
  }

  return lines.join("\n")
}

function formatErrorsSection(errors: string[]): string {
  const lines: string[] = ["## Integration Errors"]
  lines.push("")
  lines.push("*Some data could not be fetched:*")
  for (const error of errors) {
    lines.push(`- ${error}`)
  }
  return lines.join("\n")
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract company identifier from form data
 * Looks for customerName, companyName, company, domain fields
 */
function extractCompanyIdentifier(formData: Record<string, string>): string | null {
  const fields = ["customerName", "companyName", "company", "domain", "customer"]
  for (const field of fields) {
    const value = formData[field]
    if (value) {
      // Extract just the company name/domain, removing extra info
      // e.g., "Acme Corp - $36K ARR" -> "Acme Corp"
      const match = value.match(/^([^-–]+)/)
      return match ? match[1].trim() : value.trim()
    }
  }
  return null
}

/**
 * Extract email from form data
 */
function extractEmail(formData: Record<string, string>): string | null {
  // Check for derived email first (from HubSpot contacts)
  if (formData._derivedEmail) {
    return formData._derivedEmail
  }

  const fields = ["email", "customerEmail", "contactEmail"]
  for (const field of fields) {
    const value = formData[field]
    if (value && value.includes("@")) {
      return value.trim()
    }
  }

  // Also check if any field value contains an email
  for (const value of Object.values(formData)) {
    const emailMatch = value.match(/[\w.-]+@[\w.-]+\.\w+/)
    if (emailMatch) {
      return emailMatch[0]
    }
  }

  return null
}

/**
 * Extract title from a Notion page
 */
function extractNotionTitle(page: NotionPage): string | null {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === "title" && prop.title.length > 0) {
      return prop.title.map((t) => t.plain_text).join("")
    }
  }
  return null
}

/**
 * Format a number with commas
 */
function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) return String(value)
  return num.toLocaleString()
}

/**
 * Format an ISO date string
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateString
  }
}

/**
 * Format a Unix timestamp
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/**
 * Truncate a string to a max length
 */
function truncate(str: string, maxLength: number): string {
  if (!str) return ""
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + "..."
}

// ============================================================================
// Batch Context Gathering (for portfolio views)
// ============================================================================

export interface CompanyHealthSummary {
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
}

/**
 * Gather health summaries for multiple companies
 * Used for portfolio/segment views
 */
export async function gatherBatchContext(companyIds: string[]): Promise<CompanyHealthSummary[]> {
  const summaries: CompanyHealthSummary[] = []

  for (const companyId of companyIds) {
    try {
      const company = await hubspot.getCompany(companyId)
      if (!company) continue

      // Get contacts for this company
      let contacts: HubSpotContact[] = []
      try {
        contacts = await hubspot.getContacts(companyId)
      } catch {
        // Continue without contacts
      }

      // Try to get Stripe data using contact email
      let stripeCustomer: StripeCustomer | null = null
      let subscriptions: StripeSubscription[] = []
      let invoices: StripeInvoice[] = []

      const contactEmail = contacts.find((c) => c.properties.email)?.properties.email
      if (contactEmail) {
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
      const summary = calculateHealthSummary(
        company,
        contacts,
        stripeCustomer,
        subscriptions,
        invoices
      )
      summaries.push(summary)
    } catch (error) {
      console.error(`Error gathering context for company ${companyId}:`, error)
    }
  }

  return summaries
}

/**
 * Calculate health summary for a single company
 */
function calculateHealthSummary(
  company: HubSpotCompany,
  contacts: HubSpotContact[],
  stripeCustomer: StripeCustomer | null,
  subscriptions: StripeSubscription[],
  invoices: StripeInvoice[]
): CompanyHealthSummary {
  const riskSignals: string[] = []
  const positiveSignals: string[] = []

  // Determine plan and MRR from Stripe
  let plan: string | null = null
  let mrr: number | null = null
  let paymentStatus: "current" | "overdue" | "at_risk" | "unknown" = "unknown"

  if (subscriptions.length > 0) {
    const activeSub = subscriptions.find((s) => s.status === "active")
    if (activeSub) {
      plan = activeSub.items.data[0]?.price?.nickname || "Active Plan"
      mrr =
        activeSub.items.data.reduce((sum, item) => {
          const amount = item.price?.unit_amount || 0
          const interval = item.price?.recurring?.interval
          // Normalize to monthly
          if (interval === "year") return sum + amount / 12
          return sum + amount
        }, 0) / 100

      positiveSignals.push("Active subscription")
    }

    // Check for cancellation pending
    if (subscriptions.some((s) => s.cancel_at_period_end)) {
      riskSignals.push("Cancellation pending at period end")
    }

    // Check subscription status
    if (subscriptions.some((s) => s.status === "past_due")) {
      riskSignals.push("Subscription past due")
      paymentStatus = "overdue"
    } else if (subscriptions.some((s) => s.status === "active")) {
      paymentStatus = "current"
    }
  }

  // Check invoice payment history
  if (invoices.length > 0) {
    const failedInvoices = invoices.filter(
      (i) => i.status === "uncollectible" || i.status === "open"
    )
    if (failedInvoices.length >= 2) {
      riskSignals.push(`${failedInvoices.length} unpaid invoices`)
      paymentStatus = "at_risk"
    } else if (failedInvoices.length === 1) {
      riskSignals.push("1 pending invoice")
    }

    const recentPaid = invoices.filter((i) => i.status === "paid").slice(0, 3)
    if (recentPaid.length >= 3) {
      positiveSignals.push("Consistent payment history")
    }
  }

  // Check Stripe customer status
  if (stripeCustomer?.delinquent) {
    riskSignals.push("Customer marked delinquent")
    paymentStatus = "overdue"
  }

  // Contact signals
  if (contacts.length === 0) {
    riskSignals.push("No contacts on file")
  } else if (contacts.length >= 2) {
    positiveSignals.push(`${contacts.length} contacts engaged`)
  }

  // Calculate overall health score
  let healthScore: "green" | "yellow" | "red" | "unknown" = "unknown"

  if (riskSignals.length === 0 && positiveSignals.length >= 2) {
    healthScore = "green"
  } else if (
    riskSignals.length >= 2 ||
    riskSignals.some(
      (r) => r.includes("past due") || r.includes("delinquent") || r.includes("Cancellation")
    )
  ) {
    healthScore = "red"
  } else if (riskSignals.length > 0 || positiveSignals.length < 2) {
    healthScore = "yellow"
  } else if (stripeCustomer) {
    healthScore = "green"
  }

  return {
    companyId: company.id,
    companyName: company.properties.name || "Unknown",
    domain: company.properties.domain || null,
    healthScore,
    mrr,
    plan,
    paymentStatus,
    lastActivity: company.properties.notes_last_updated || company.properties.createdate || null,
    contactCount: contacts.length,
    riskSignals,
    positiveSignals,
  }
}

/**
 * Format batch summaries as markdown table
 */
export function formatBatchContextAsMarkdown(summaries: CompanyHealthSummary[]): string {
  if (summaries.length === 0) {
    return "No companies found for this segment."
  }

  const lines: string[] = []

  // Summary stats
  const green = summaries.filter((s) => s.healthScore === "green").length
  const yellow = summaries.filter((s) => s.healthScore === "yellow").length
  const red = summaries.filter((s) => s.healthScore === "red").length
  const totalMrr = summaries.reduce((sum, s) => sum + (s.mrr || 0), 0)

  lines.push("## Portfolio Summary")
  lines.push("")
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| **Total Accounts** | ${summaries.length} |`)
  lines.push(`| **Healthy (Green)** | ${green} |`)
  lines.push(`| **Monitor (Yellow)** | ${yellow} |`)
  lines.push(`| **At Risk (Red)** | ${red} |`)
  lines.push(`| **Total MRR** | $${totalMrr.toLocaleString()} |`)
  lines.push("")

  // Detailed table
  lines.push("## Account Details")
  lines.push("")
  lines.push("| Company | Health | MRR | Plan | Payment | Risks |")
  lines.push("|---------|--------|-----|------|---------|-------|")

  for (const summary of summaries) {
    const healthIcon =
      summary.healthScore === "green"
        ? "🟢"
        : summary.healthScore === "yellow"
          ? "🟡"
          : summary.healthScore === "red"
            ? "🔴"
            : "⚪"
    const mrr = summary.mrr ? `$${summary.mrr.toLocaleString()}` : "—"
    const risks =
      summary.riskSignals.length > 0 ? summary.riskSignals.slice(0, 2).join("; ") : "None"

    lines.push(
      `| ${summary.companyName} | ${healthIcon} | ${mrr} | ${summary.plan || "—"} | ${summary.paymentStatus} | ${risks} |`
    )
  }

  // At-risk accounts detail
  const atRisk = summaries.filter((s) => s.healthScore === "red")
  if (atRisk.length > 0) {
    lines.push("")
    lines.push("## At-Risk Accounts (Action Required)")
    lines.push("")
    for (const account of atRisk) {
      lines.push(`### ${account.companyName}`)
      lines.push(`- **Health:** 🔴 Red`)
      lines.push(`- **MRR:** ${account.mrr ? `$${account.mrr.toLocaleString()}` : "Unknown"}`)
      lines.push(`- **Risk Signals:**`)
      for (const risk of account.riskSignals) {
        lines.push(`  - ${risk}`)
      }
      lines.push("")
    }
  }

  return lines.join("\n")
}

// ============================================================================
// Exports
// ============================================================================

export {
  gatherHubSpotContext,
  gatherStripeContext,
  gatherNotionContext,
  formatContextAsMarkdown,
  extractCompanyIdentifier,
  extractEmail,
  calculateHealthSummary,
}
