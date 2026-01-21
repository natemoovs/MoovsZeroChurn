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

// ============================================================================
// Types
// ============================================================================

export interface SkillDataRequirements {
  hubspot?: {
    company?: boolean      // fetch company by domain/name from form input
    contacts?: boolean     // fetch contacts for that company
    deals?: boolean        // fetch deals
    activity?: boolean     // recent activity
  }
  stripe?: {
    customer?: boolean     // fetch by email
    subscriptions?: boolean
    invoices?: boolean
  }
  notion?: {
    databases?: string[]   // database IDs to query
  }
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

  // Gather HubSpot data first (we may need contact emails for Stripe)
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
      errors.push(`Notion database ${dbId}: ${error instanceof Error ? error.message : "Unknown error"}`)
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
      const name = [contact.properties.firstname, contact.properties.lastname]
        .filter(Boolean)
        .join(" ") || "Unknown"
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
    if (data.customer.balance !== 0) lines.push(`- Balance: $${(data.customer.balance / 100).toFixed(2)}`)
    if (data.customer.delinquent) lines.push(`- **Delinquent: Yes**`)
    lines.push(`- Created: ${formatTimestamp(data.customer.created)}`)
  }

  if (data.subscriptions && data.subscriptions.length > 0) {
    lines.push("")
    lines.push("### Subscriptions")
    for (const sub of data.subscriptions) {
      const items = sub.items.data
      const planInfo = items.map((item) => {
        const price = item.price
        const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : "Custom"
        const interval = price.recurring?.interval || "one-time"
        return `${price.nickname || "Plan"} (${amount}/${interval})`
      }).join(", ")

      lines.push(`- ${planInfo}`)
      lines.push(`  - Status: ${sub.status}`)
      lines.push(`  - Current Period: ${formatTimestamp(sub.current_period_start)} to ${formatTimestamp(sub.current_period_end)}`)
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
// Exports
// ============================================================================

export {
  gatherHubSpotContext,
  gatherStripeContext,
  gatherNotionContext,
  formatContextAsMarkdown,
  extractCompanyIdentifier,
  extractEmail,
}
