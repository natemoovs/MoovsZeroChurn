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
  {
    name: "get_tasks",
    description:
      "Get tasks from the task management system. Can filter by status, priority, or get overdue tasks. Use this when asked about tasks, to-dos, or action items.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description: "Filter by status: 'all', 'pending', 'in_progress', 'completed', 'overdue'",
          enum: ["all", "pending", "in_progress", "completed", "overdue"],
        },
        priority: {
          type: "string",
          description: "Filter by priority: 'all', 'urgent', 'high', 'medium', 'low'",
          enum: ["all", "urgent", "high", "medium", "low"],
        },
        limit: {
          type: "number",
          description: "Maximum number of tasks to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_upcoming_renewals",
    description:
      "Get accounts with upcoming renewals within a specified timeframe. Use this when asked about renewals, contracts expiring, or accounts up for renewal.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number",
          description: "Number of days to look ahead for renewals (default 90)",
        },
      },
      required: [],
    },
  },
  {
    name: "create_task",
    description:
      "Create a new task for an account. Use this when asked to create a task, follow-up, or action item for a customer.",
    input_schema: {
      type: "object" as const,
      properties: {
        companyId: {
          type: "string",
          description: "HubSpot company ID for the account",
        },
        companyName: {
          type: "string",
          description: "Name of the company/account",
        },
        title: {
          type: "string",
          description: "Task title describing what needs to be done",
        },
        description: {
          type: "string",
          description: "Detailed description of the task (optional)",
        },
        priority: {
          type: "string",
          description: "Task priority: urgent, high, medium, low",
          enum: ["urgent", "high", "medium", "low"],
        },
        dueDate: {
          type: "string",
          description: "Due date in ISO format (e.g., 2024-01-15)",
        },
      },
      required: ["companyId", "companyName", "title"],
    },
  },
  {
    name: "update_task",
    description:
      "Update an existing task's status or details. Use this when asked to complete, update, or modify a task.",
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "The task ID to update",
        },
        status: {
          type: "string",
          description: "New status: pending, in_progress, completed",
          enum: ["pending", "in_progress", "completed"],
        },
        priority: {
          type: "string",
          description: "New priority: urgent, high, medium, low",
          enum: ["urgent", "high", "medium", "low"],
        },
        notes: {
          type: "string",
          description: "Notes to add to the task",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "lookup_customer",
    description:
      "Search for a customer/account by name, email, or Stripe account ID. Use this when you need to find a specific account or when the user mentions a customer by name.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query - company name, email, or Stripe account ID (acct_...)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_account_details",
    description:
      "Get detailed information about a specific account including health score, MRR, risk signals, and contact info. Use this after looking up an account to get full details.",
    input_schema: {
      type: "object" as const,
      properties: {
        companyId: {
          type: "string",
          description: "HubSpot company ID",
        },
        companyName: {
          type: "string",
          description: "Company name (alternative to companyId)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_activity_feed",
    description:
      "Get recent activity and events across accounts. Use this when asked about recent activity, what's happened, or to get an overview of recent changes.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of activities to return (default 20)",
        },
        companyId: {
          type: "string",
          description: "Filter to activities for a specific company (optional)",
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

      case "get_tasks":
        return await executeGetTasks(toolInput, baseUrl)

      case "get_upcoming_renewals":
        return await executeGetUpcomingRenewals(toolInput, baseUrl)

      case "create_task":
        return await executeCreateTask(toolInput, baseUrl)

      case "update_task":
        return await executeUpdateTask(toolInput, baseUrl)

      case "lookup_customer":
        return await executeLookupCustomer(toolInput, baseUrl)

      case "get_account_details":
        return await executeGetAccountDetails(toolInput, baseUrl)

      case "get_activity_feed":
        return await executeGetActivityFeed(toolInput, baseUrl)

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
  const _days = (input.days as number) || 90 // Available for future date-range filtering

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

async function executeGetTasks(
  input: Record<string, unknown>,
  baseUrl: string
): Promise<ToolResult> {
  const status = (input.status as string) || "all"
  const priority = (input.priority as string) || "all"
  const limit = (input.limit as number) || 20

  // Build query params
  const params = new URLSearchParams()
  if (status !== "all" && status !== "overdue") {
    params.set("status", status)
  }
  if (priority !== "all") {
    params.set("priority", priority)
  }

  try {
    const response = await fetch(`${baseUrl}/api/tasks?${params.toString()}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (!response.ok) {
      return { success: false, error: `Tasks API returned ${response.status}` }
    }

    const data = await response.json()
    let tasks = data.tasks || []

    // Filter for overdue tasks if requested
    if (status === "overdue") {
      const now = new Date()
      tasks = tasks.filter(
        (t: { dueDate: string | null; status: string }) =>
          t.dueDate && new Date(t.dueDate) < now && t.status !== "completed"
      )
    }

    // Apply limit
    tasks = tasks.slice(0, limit)

    return {
      success: true,
      data: {
        tasks: tasks.map(
          (t: {
            id: string
            title: string
            description: string | null
            status: string
            priority: string
            dueDate: string | null
            companyId: string | null
            companyName: string | null
            createdAt: string
          }) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            companyId: t.companyId,
            companyName: t.companyName,
            createdAt: t.createdAt,
          })
        ),
        stats: data.stats,
        count: tasks.length,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Tasks fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function executeGetUpcomingRenewals(
  input: Record<string, unknown>,
  baseUrl: string
): Promise<ToolResult> {
  const days = (input.days as number) || 90

  try {
    // Get all accounts from portfolio
    const response = await fetch(`${baseUrl}/api/integrations/portfolio?segment=all`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (!response.ok) {
      return { success: false, error: `Portfolio API returned ${response.status}` }
    }

    const data = await response.json()
    const summaries = data.summaries || []

    // For now, we'll return accounts that may need attention based on health
    // In a full implementation, this would check renewal dates from Stripe/Lago
    const now = new Date()
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    // Filter to accounts that need renewal attention
    // Red/Yellow health scores within the window are considered "renewal concerns"
    const renewalAccounts = summaries
      .filter(
        (s: { healthScore: string; mrr: number | null }) =>
          (s.healthScore === "red" || s.healthScore === "yellow") && (s.mrr ?? 0) > 0
      )
      .slice(0, 20)

    return {
      success: true,
      data: {
        accounts: renewalAccounts.map(
          (s: {
            companyId: string
            companyName: string
            healthScore: string
            mrr: number | null
            plan: string | null
            riskSignals: string[]
          }) => ({
            companyId: s.companyId,
            companyName: s.companyName,
            healthScore: s.healthScore,
            mrr: s.mrr,
            plan: s.plan,
            riskSignals: s.riskSignals,
            renewalUrgency: s.healthScore === "red" ? "high" : "medium",
          })
        ),
        count: renewalAccounts.length,
        lookAheadDays: days,
        generatedAt: now.toISOString(),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Renewals fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function executeCreateTask(
  input: Record<string, unknown>,
  baseUrl: string
): Promise<ToolResult> {
  const companyId = input.companyId as string
  const companyName = input.companyName as string
  const title = input.title as string
  const description = input.description as string | undefined
  const priority = (input.priority as string) || "medium"
  const dueDate = input.dueDate as string | undefined

  if (!companyId || !companyName || !title) {
    return { success: false, error: "companyId, companyName, and title are required" }
  }

  try {
    const response = await fetch(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        companyName,
        title,
        description,
        priority,
        dueDate,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `Failed to create task: ${errorData.error || response.status}`,
      }
    }

    const task = await response.json()
    return {
      success: true,
      data: {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        companyName: task.companyName,
        notionUrl: task.notionUrl,
        message: `Task "${title}" created successfully for ${companyName}`,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Task creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function executeUpdateTask(
  input: Record<string, unknown>,
  baseUrl: string
): Promise<ToolResult> {
  const taskId = input.taskId as string
  const status = input.status as string | undefined
  const priority = input.priority as string | undefined
  const notes = input.notes as string | undefined

  if (!taskId) {
    return { success: false, error: "taskId is required" }
  }

  const updateData: Record<string, unknown> = {}
  if (status) updateData.status = status
  if (priority) updateData.priority = priority
  if (notes) updateData.notes = notes

  if (Object.keys(updateData).length === 0) {
    return { success: false, error: "At least one field to update is required" }
  }

  try {
    const response = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `Failed to update task: ${errorData.error || response.status}`,
      }
    }

    const task = await response.json()
    return {
      success: true,
      data: {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        message: `Task updated successfully`,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Task update failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function executeLookupCustomer(
  input: Record<string, unknown>,
  baseUrl: string
): Promise<ToolResult> {
  const query = input.query as string

  if (!query) {
    return { success: false, error: "query is required" }
  }

  try {
    // Search portfolio for matching accounts
    const response = await fetch(`${baseUrl}/api/integrations/portfolio?segment=all`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (!response.ok) {
      return { success: false, error: `Portfolio API returned ${response.status}` }
    }

    const data = await response.json()
    const summaries = data.summaries || []

    // Search by name, domain, or company ID
    const searchLower = query.toLowerCase()
    const matches = summaries.filter(
      (s: { companyName: string; domain: string | null; companyId: string }) =>
        s.companyName?.toLowerCase().includes(searchLower) ||
        s.domain?.toLowerCase().includes(searchLower) ||
        s.companyId?.toLowerCase().includes(searchLower)
    )

    if (matches.length === 0) {
      return {
        success: true,
        data: {
          matches: [],
          count: 0,
          message: `No accounts found matching "${query}"`,
        },
      }
    }

    return {
      success: true,
      data: {
        matches: matches.slice(0, 10).map(
          (s: {
            companyId: string
            companyName: string
            domain: string | null
            healthScore: string
            mrr: number | null
            plan: string | null
            customerSegment: string | null
          }) => ({
            companyId: s.companyId,
            companyName: s.companyName,
            domain: s.domain,
            healthScore: s.healthScore,
            mrr: s.mrr,
            plan: s.plan,
            segment: s.customerSegment,
          })
        ),
        count: matches.length,
        message:
          matches.length === 1
            ? `Found 1 account matching "${query}"`
            : `Found ${matches.length} accounts matching "${query}"`,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Customer lookup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function executeGetAccountDetails(
  input: Record<string, unknown>,
  baseUrl: string
): Promise<ToolResult> {
  const companyId = input.companyId as string | undefined
  const companyName = input.companyName as string | undefined

  if (!companyId && !companyName) {
    return { success: false, error: "Either companyId or companyName is required" }
  }

  try {
    // Get portfolio data
    const response = await fetch(`${baseUrl}/api/integrations/portfolio?segment=all`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (!response.ok) {
      return { success: false, error: `Portfolio API returned ${response.status}` }
    }

    const data = await response.json()
    const summaries = data.summaries || []

    // Find the account
    let account
    if (companyId) {
      account = summaries.find(
        (s: { companyId: string }) => s.companyId === companyId
      )
    } else if (companyName) {
      const searchLower = companyName.toLowerCase()
      account = summaries.find(
        (s: { companyName: string }) =>
          s.companyName?.toLowerCase() === searchLower ||
          s.companyName?.toLowerCase().includes(searchLower)
      )
    }

    if (!account) {
      return {
        success: false,
        error: `Account not found: ${companyId || companyName}`,
      }
    }

    // Get tasks for this account
    const tasksResponse = await fetch(
      `${baseUrl}/api/tasks?companyId=${account.companyId}`,
      {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    )

    let tasks: unknown[] = []
    if (tasksResponse.ok) {
      const tasksData = await tasksResponse.json()
      tasks = (tasksData.tasks || []).slice(0, 5)
    }

    return {
      success: true,
      data: {
        account: {
          companyId: account.companyId,
          companyName: account.companyName,
          domain: account.domain,
          healthScore: account.healthScore,
          mrr: account.mrr,
          plan: account.plan,
          paymentStatus: account.paymentStatus,
          customerSince: account.customerSince,
          lastActivity: account.lastActivity,
          segment: account.customerSegment,
          owner: account.ownerName,
          totalTrips: account.totalTrips,
        },
        riskSignals: account.riskSignals || [],
        positiveSignals: account.positiveSignals || [],
        recentTasks: tasks,
        healthSummary: getHealthSummary(account.healthScore, account.riskSignals || []),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Account details failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

function getHealthSummary(healthScore: string, riskSignals: string[]): string {
  if (healthScore === "green") {
    return "Account is healthy with no significant risk signals."
  } else if (healthScore === "yellow") {
    return `Account needs attention. ${riskSignals.length} risk signal(s) detected: ${riskSignals.slice(0, 3).join(", ")}`
  } else if (healthScore === "red") {
    return `Account is at risk! ${riskSignals.length} risk signal(s) require immediate attention: ${riskSignals.slice(0, 3).join(", ")}`
  }
  return "Health status unknown."
}

async function executeGetActivityFeed(
  input: Record<string, unknown>,
  baseUrl: string
): Promise<ToolResult> {
  const limit = (input.limit as number) || 20
  const companyId = input.companyId as string | undefined

  try {
    // Get recent tasks as activity proxy
    const params = new URLSearchParams()
    if (companyId) {
      params.set("companyId", companyId)
    }

    const tasksResponse = await fetch(`${baseUrl}/api/tasks?${params.toString()}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    const activities: Array<{
      type: string
      title: string
      description: string | null
      timestamp: string
      companyName: string | null
      status?: string
      priority?: string
    }> = []

    if (tasksResponse.ok) {
      const tasksData = await tasksResponse.json()
      const tasks = tasksData.tasks || []

      // Convert recent tasks to activity items
      tasks.slice(0, limit).forEach(
        (t: {
          title: string
          description: string | null
          status: string
          priority: string
          companyName: string | null
          createdAt: string
          updatedAt: string
        }) => {
          activities.push({
            type: t.status === "completed" ? "task_completed" : "task_created",
            title: t.title,
            description: t.description,
            timestamp: t.updatedAt || t.createdAt,
            companyName: t.companyName,
            status: t.status,
            priority: t.priority,
          })
        }
      )
    }

    // Sort by timestamp
    activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return {
      success: true,
      data: {
        activities: activities.slice(0, limit),
        count: activities.length,
        generatedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Activity feed failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
