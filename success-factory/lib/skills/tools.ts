/**
 * Skill Tools - Enables Claude to dynamically query integrations during skill generation
 *
 * This gives web app skills the same power as MCP-enabled Claude Code CLI.
 * Claude can call these tools to gather data, then synthesize it into reports.
 */

import { hubspot, metabase, notion } from "@/lib/integrations"
import type Anthropic from "@anthropic-ai/sdk"

// ============================================================================
// Tool Definitions (sent to Claude API)
// ============================================================================

export const skillTools: Anthropic.Tool[] = [
  {
    name: "get_portfolio_summary",
    description:
      "Get a summary of all accounts in the portfolio with health scores, MRR, and risk signals. Use this first to get an overview before drilling into specific accounts.",
    input_schema: {
      type: "object" as const,
      properties: {
        segment: {
          type: "string",
          description:
            "Filter by segment: 'all', 'enterprise', 'mid-market', 'smb', 'at-risk', 'healthy', 'churned'",
          enum: [
            "all",
            "enterprise",
            "mid-market",
            "smb",
            "at-risk",
            "healthy",
            "warning",
            "churned",
          ],
        },
      },
      required: [],
    },
  },
  {
    name: "search_hubspot_companies",
    description:
      "Search for companies in HubSpot by name, domain, or other criteria. Returns up to 20 matching companies with basic info.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query - company name, domain, or partial match",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_hubspot_company_details",
    description:
      "Get detailed information about a specific company including contacts, deals, and recent activity.",
    input_schema: {
      type: "object" as const,
      properties: {
        companyId: {
          type: "string",
          description: "HubSpot company ID",
        },
        includeContacts: {
          type: "boolean",
          description: "Include associated contacts (default true)",
        },
        includeDeals: {
          type: "boolean",
          description: "Include associated deals (default true)",
        },
        includeActivity: {
          type: "boolean",
          description: "Include recent activity like notes, emails, calls (default true)",
        },
      },
      required: ["companyId"],
    },
  },
  {
    name: "query_metabase",
    description:
      "Run a Metabase query to get usage data, billing info, or custom analytics. Use card IDs for pre-built queries or write custom SQL.",
    input_schema: {
      type: "object" as const,
      properties: {
        cardId: {
          type: "number",
          description:
            "Metabase card/question ID to run. Known cards: 1469 (CSM_MOOVS master view), 642 (Reservations), 855 (Stripe charges)",
        },
        customSql: {
          type: "string",
          description: "Custom SQL query to run (use instead of cardId). Database is Snowflake.",
        },
        filters: {
          type: "object",
          description: "Filter parameters for the query (e.g., { operator_id: '123' })",
        },
      },
      required: [],
    },
  },
  {
    name: "search_notion_tickets",
    description:
      "Search Notion for support tickets related to a customer. Returns ticket status, priority, and details.",
    input_schema: {
      type: "object" as const,
      properties: {
        customerName: {
          type: "string",
          description: "Customer/company name to search for in tickets",
        },
        databaseId: {
          type: "string",
          description:
            "Specific Notion database ID to search (optional, defaults to Moovs Tickets)",
        },
      },
      required: ["customerName"],
    },
  },
  {
    name: "get_customer_usage",
    description:
      "Get detailed usage metrics for a specific customer - trips, reservations, revenue trends.",
    input_schema: {
      type: "object" as const,
      properties: {
        operatorId: {
          type: "string",
          description: "Moovs operator ID (UUID)",
        },
        stripeAccountId: {
          type: "string",
          description: "Stripe connected account ID (acct_...)",
        },
        days: {
          type: "number",
          description: "Number of days of history (default 90)",
        },
      },
      required: [],
    },
  },
]

// ============================================================================
// Tool Executor
// ============================================================================

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

/**
 * Execute a tool call and return results
 */
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  baseUrl: string
): Promise<ToolResult> {
  console.log(`[Tools] Executing: ${toolName}`, toolInput)

  try {
    switch (toolName) {
      case "get_portfolio_summary":
        return await executeGetPortfolioSummary(toolInput, baseUrl)

      case "search_hubspot_companies":
        return await executeSearchHubSpotCompanies(toolInput)

      case "get_hubspot_company_details":
        return await executeGetHubSpotCompanyDetails(toolInput)

      case "query_metabase":
        return await executeQueryMetabase(toolInput)

      case "search_notion_tickets":
        return await executeSearchNotionTickets(toolInput)

      case "get_customer_usage":
        return await executeGetCustomerUsage(toolInput)

      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (error) {
    console.error(`[Tools] Error executing ${toolName}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ============================================================================
// Tool Implementations
// ============================================================================

async function executeGetPortfolioSummary(
  input: Record<string, unknown>,
  baseUrl: string
): Promise<ToolResult> {
  const segment = (input.segment as string) || "all"

  const response = await fetch(
    `${baseUrl}/api/integrations/portfolio?segment=${encodeURIComponent(segment)}`,
    { headers: { "Content-Type": "application/json" }, cache: "no-store" }
  )

  if (!response.ok) {
    return { success: false, error: `Portfolio API returned ${response.status}` }
  }

  const data = await response.json()
  return { success: true, data }
}

async function executeSearchHubSpotCompanies(input: Record<string, unknown>): Promise<ToolResult> {
  const query = input.query as string

  if (!query) {
    return { success: false, error: "Query is required" }
  }

  // searchCompanies returns up to 20 results (hardcoded in the function)
  const companies = await hubspot.searchCompanies(query)

  return {
    success: true,
    data: companies.map((c) => ({
      id: c.id,
      name: c.properties.name,
      domain: c.properties.domain,
      industry: c.properties.industry,
      lifecycleStage: c.properties.lifecyclestage,
      annualRevenue: c.properties.annualrevenue,
      createdAt: c.properties.createdate,
    })),
  }
}

async function executeGetHubSpotCompanyDetails(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const companyId = input.companyId as string
  const includeContacts = input.includeContacts !== false
  const includeDeals = input.includeDeals !== false
  const includeActivity = input.includeActivity !== false

  if (!companyId) {
    return { success: false, error: "companyId is required" }
  }

  const company = await hubspot.getCompany(companyId)
  if (!company) {
    return { success: false, error: `Company ${companyId} not found` }
  }

  const result: Record<string, unknown> = {
    company: {
      id: company.id,
      ...company.properties,
    },
  }

  if (includeContacts) {
    try {
      const contacts = await hubspot.getContacts(companyId)
      result.contacts = contacts.map((c) => ({
        id: c.id,
        name: `${c.properties.firstname || ""} ${c.properties.lastname || ""}`.trim(),
        email: c.properties.email,
        title: c.properties.jobtitle,
        phone: c.properties.phone,
      }))
    } catch {
      result.contacts = []
      result.contactsError = "Failed to fetch contacts"
    }
  }

  if (includeDeals) {
    try {
      const deals = await hubspot.getDeals(companyId)
      result.deals = deals.map((d) => ({
        id: d.id,
        name: d.properties.dealname,
        stage: d.properties.dealstage,
        amount: d.properties.amount,
        closeDate: d.properties.closedate,
      }))
    } catch {
      result.deals = []
      result.dealsError = "Failed to fetch deals"
    }
  }

  if (includeActivity) {
    try {
      const activity = await hubspot.getRecentActivity(companyId)
      result.recentActivity = {
        noteCount: activity.notes.length,
        emailCount: activity.emails.length,
        callCount: activity.calls.length,
        meetingCount: activity.meetings.length,
        recentNotes: activity.notes.slice(0, 3).map((n) => ({
          date: n.timestamp,
          preview: n.body?.slice(0, 200),
        })),
        recentEmails: activity.emails.slice(0, 3).map((e) => ({
          date: e.timestamp,
          subject: e.subject,
        })),
      }
    } catch {
      result.recentActivity = null
      result.activityError = "Failed to fetch activity"
    }
  }

  return { success: true, data: result }
}

async function executeQueryMetabase(input: Record<string, unknown>): Promise<ToolResult> {
  const cardId = input.cardId as number | undefined
  const customSql = input.customSql as string | undefined
  const filters = input.filters as Record<string, unknown> | undefined

  if (!cardId && !customSql) {
    return { success: false, error: "Either cardId or customSql is required" }
  }

  let result
  if (cardId) {
    result = await metabase.runQuery(cardId, filters)
  } else if (customSql) {
    // Snowflake database ID is 2
    result = await metabase.runCustomQuery(2, customSql)
  }

  if (!result) {
    return { success: false, error: "Query returned no results" }
  }

  // Convert to objects for easier reading
  const rows = metabase.rowsToObjects(result)

  return {
    success: true,
    data: {
      rowCount: rows.length,
      columns: result.data?.cols?.map((c: { name: string }) => c.name) || [],
      rows: rows.slice(0, 50), // Limit to 50 rows to avoid token overload
    },
  }
}

async function executeSearchNotionTickets(input: Record<string, unknown>): Promise<ToolResult> {
  const customerName = input.customerName as string
  const databaseId = input.databaseId as string | undefined

  if (!customerName) {
    return { success: false, error: "customerName is required" }
  }

  // If database ID provided, search that specific database
  if (databaseId) {
    try {
      const results = await notion.queryDatabase(databaseId, {
        filter: {
          or: [
            { property: "Name", title: { contains: customerName } },
            { property: "Title", title: { contains: customerName } },
            { property: "Customer", rich_text: { contains: customerName } },
          ],
        },
        pageSize: 20,
      })

      return {
        success: true,
        data: results.results.map((page) => ({
          id: page.id,
          url: page.url,
          properties: Object.fromEntries(
            Object.entries(page.properties).map(([key, val]) => [
              key,
              extractNotionPropertyValue(val),
            ])
          ),
        })),
      }
    } catch (error) {
      return {
        success: false,
        error: `Database query failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  // Default: Search the Moovs Tickets database by customer name
  try {
    const tickets = await notion.searchTicketsByCustomer(customerName)

    return {
      success: true,
      data: {
        ticketCount: tickets.length,
        tickets: tickets.map((ticket) => ({
          id: ticket.id,
          url: ticket.url,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          stage: ticket.stage,
          createdAt: ticket.createdAt,
          tags: ticket.tags,
        })),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Ticket search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function executeGetCustomerUsage(input: Record<string, unknown>): Promise<ToolResult> {
  const operatorId = input.operatorId as string | undefined
  const stripeAccountId = input.stripeAccountId as string | undefined
  const days = (input.days as number) || 90

  if (!operatorId && !stripeAccountId) {
    return { success: false, error: "Either operatorId or stripeAccountId is required" }
  }

  // Build SQL query for usage data
  const whereClause = operatorId
    ? `LAGO_EXTERNAL_CUSTOMER_ID = '${operatorId}'`
    : `P_STRIPE_ACCOUNT_ID = '${stripeAccountId}'`

  const sql = `
    SELECT
      P_COMPANY_NAME as company_name,
      LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
      P_STRIPE_ACCOUNT_ID as stripe_account_id,
      CALCULATED_MRR as mrr,
      LAGO_PLAN_NAME as plan,
      R_TOTAL_RESERVATIONS_COUNT as total_trips,
      R_LAST_30_DAYS_RESERVATIONS_COUNT as trips_30d,
      R_LAST_90_DAYS_RESERVATIONS_COUNT as trips_90d,
      DA_DAYS_SINCE_LAST_ASSIGNMENT as days_since_last_activity,
      DA_ENGAGEMENT_STATUS as engagement_status,
      HS_D_CHURN_STATUS as churn_status
    FROM MOOVS.CSM_MOOVS
    WHERE ${whereClause}
    LIMIT 1
  `

  try {
    const result = await metabase.runCustomQuery(2, sql)
    const rows = metabase.rowsToObjects(result)

    if (rows.length === 0) {
      return { success: false, error: "Customer not found" }
    }

    return { success: true, data: rows[0] }
  } catch (error) {
    return {
      success: false,
      error: `Usage query failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function extractNotionPropertyValue(prop: unknown): unknown {
  if (!prop || typeof prop !== "object") return prop

  const p = prop as Record<string, unknown>
  const type = p.type as string

  switch (type) {
    case "title":
    case "rich_text":
      return (p[type] as Array<{ plain_text: string }>)?.map((t) => t.plain_text).join("") || ""
    case "number":
      return p.number
    case "select":
      return (p.select as { name: string } | null)?.name
    case "multi_select":
      return (p.multi_select as Array<{ name: string }>)?.map((s) => s.name)
    case "date":
      return (p.date as { start: string } | null)?.start
    case "checkbox":
      return p.checkbox
    case "url":
      return p.url
    case "email":
      return p.email
    case "phone_number":
      return p.phone_number
    case "status":
      return (p.status as { name: string } | null)?.name
    default:
      return `[${type}]`
  }
}
