/**
 * N8N Integration Client
 *
 * Sends webhook requests to N8N for database operations.
 * N8N handles the actual Snowflake queries using its configured credentials.
 *
 * Uses 9 consolidated workflows instead of 44 separate endpoints:
 * 1. operator-search - Search operations
 * 2. operator-data - Core operator data
 * 3. financial - Financial/charges data
 * 4. risk - Risk & disputes
 * 5. team - Team management
 * 6. fleet - Drivers & vehicles
 * 7. bookings - Trips & quotes
 * 8. platform - Misc platform data
 * 9. subscriptions - Subscription & analytics
 *
 * Environment variables:
 *   - N8N_WEBHOOK_BASE_URL: Base URL for N8N webhooks (e.g., https://moovs.app.n8n.cloud/webhook)
 *   - N8N_WEBHOOK_SECRET: Secret for authenticating webhook requests
 */

const N8N_WEBHOOK_BASE_URL =
  process.env.N8N_WEBHOOK_BASE_URL || "https://moovs.app.n8n.cloud/webhook"
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

// ============================================================================
// Consolidated Webhook Endpoints (9 workflows)
// ============================================================================

export const N8N_WORKFLOWS = {
  SUBSCRIPTION_SYNC: "subscription-sync", // Existing
  OPERATOR_SEARCH: "snowflake/operator-search",
  OPERATOR_DATA: "snowflake/operator-data",
  FINANCIAL: "snowflake/financial",
  RISK: "snowflake/risk",
  TEAM: "snowflake/team",
  FLEET: "snowflake/fleet",
  BOOKINGS: "snowflake/bookings",
  PLATFORM: "snowflake/platform",
  SUBSCRIPTIONS: "snowflake/subscriptions",
} as const

export type N8NWorkflow = (typeof N8N_WORKFLOWS)[keyof typeof N8N_WORKFLOWS]

// ============================================================================
// Action Types for Each Workflow
// ============================================================================

export type OperatorSearchAction = "search" | "expanded"

export type OperatorDataAction =
  | "details"
  | "core-info"
  | "settings"
  | "risk-details"
  | "risk-overview"

export type FinancialAction =
  | "charges"
  | "monthly-summary"
  | "reservations"
  | "customer-charges"
  | "customer-summary"
  | "bank-accounts"
  | "bank-transactions"

export type RiskAction = "disputes" | "disputes-summary" | "failed-invoices" | "update-risk"

export type TeamAction = "members" | "permissions" | "add-member" | "update-role" | "remove-member"

export type FleetAction =
  | "drivers"
  | "driver-performance"
  | "driver-app-users"
  | "vehicles"
  | "vehicle-utilization"

export type BookingsAction = "trips" | "quotes" | "quotes-summary" | "request-analytics"

export type PlatformAction =
  | "contacts"
  | "email-log"
  | "promo-codes"
  | "price-zones"
  | "rules"
  | "feedback"

export type SubscriptionsAction =
  | "log"
  | "add-log"
  | "remove-log"
  | "update-plan"
  | "top-operators"
  | "inactive-accounts"

// ============================================================================
// Types
// ============================================================================

export interface N8NWebhookResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
  executionTime?: number
}

export interface SubscriptionSyncPayload {
  action: "create" | "change" | "cancel"
  operatorId: string
  newPlanCode?: string
  previousPlanCode?: string
  overrideAmountCents?: number
  notes?: string
  timestamp: string
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Check if N8N webhooks are configured
 */
export function isConfigured(): boolean {
  return !!N8N_WEBHOOK_BASE_URL
}

/**
 * Check if webhook secret is configured (for secure calls)
 */
export function hasSecret(): boolean {
  return !!N8N_WEBHOOK_SECRET
}

// ============================================================================
// Core Webhook Function
// ============================================================================

/**
 * Send a webhook request to N8N
 */
async function sendWebhook<T = N8NWebhookResponse>(
  webhookPath: string,
  payload: Record<string, unknown>,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; timeout?: number } = {}
): Promise<T> {
  const { method = "POST", timeout = 30000 } = options
  const startTime = Date.now()

  // Build URL with query params for GET requests
  let url = `${N8N_WEBHOOK_BASE_URL}/${webhookPath}`
  if (method === "GET" && Object.keys(payload).length > 0) {
    const params = new URLSearchParams()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value))
      }
    })
    url += `?${params.toString()}`
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  // Add secret header if configured
  if (N8N_WEBHOOK_SECRET) {
    headers["x-webhook-secret"] = N8N_WEBHOOK_SECRET
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    }

    // Add body for non-GET requests
    if (method !== "GET") {
      fetchOptions.body = JSON.stringify(payload)
    }

    const response = await fetch(url, fetchOptions)

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[N8N] Webhook failed: ${response.status} - ${errorText}`)
      throw new Error(`N8N webhook failed: ${response.status}`)
    }

    // N8N may return empty response for successful webhooks
    const text = await response.text()
    if (!text) {
      return { success: true, executionTime: Date.now() - startTime } as T
    }

    try {
      const jsonData = JSON.parse(text)
      // N8N can return data in different formats
      // Handle both direct data and wrapped responses
      if (jsonData.data !== undefined) {
        return jsonData as T
      }
      if (jsonData.rows !== undefined) {
        return { success: true, data: jsonData.rows, executionTime: Date.now() - startTime } as T
      }
      // If it's an array, wrap it
      if (Array.isArray(jsonData)) {
        return { success: true, data: jsonData, executionTime: Date.now() - startTime } as T
      }
      return { success: true, data: jsonData, executionTime: Date.now() - startTime } as T
    } catch {
      // If response isn't JSON, treat as success
      return { success: true, message: text, executionTime: Date.now() - startTime } as T
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[N8N] Webhook timed out after ${timeout}ms: ${webhookPath}`)
      throw new Error(`N8N webhook timed out after ${timeout}ms`)
    }

    console.error(`[N8N] Webhook error for ${webhookPath}:`, error)
    throw error
  }
}

// ============================================================================
// Consolidated Workflow Helper Functions
// ============================================================================

/**
 * Call a consolidated workflow with an action parameter
 */
async function callWorkflow<T = unknown>(
  workflow: N8NWorkflow,
  action: string,
  params: Record<string, unknown> = {},
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE" } = {}
): Promise<N8NWebhookResponse<T>> {
  const { method = "POST" } = options
  const payload = { action, ...params }

  try {
    return await sendWebhook<N8NWebhookResponse<T>>(workflow, payload, { method })
  } catch (error) {
    console.error(`[N8N] ${workflow}/${action} failed:`, error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * GET request to consolidated workflow - returns single object or null
 */
export async function workflowGet<T = unknown>(
  workflow: N8NWorkflow,
  action: string,
  params: Record<string, unknown> = {}
): Promise<T | null> {
  const response = await callWorkflow<T>(workflow, action, params, { method: "POST" })
  return response.data ?? null
}

/**
 * GET request to consolidated workflow - returns array
 */
export async function workflowGetArray<T = unknown>(
  workflow: N8NWorkflow,
  action: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const response = await callWorkflow<T[]>(workflow, action, params, { method: "POST" })
  return Array.isArray(response.data) ? response.data : []
}

/**
 * POST/write request to consolidated workflow
 */
export async function workflowPost<T = unknown>(
  workflow: N8NWorkflow,
  action: string,
  body: Record<string, unknown>
): Promise<N8NWebhookResponse<T>> {
  return callWorkflow<T>(workflow, action, body, { method: "POST" })
}

// ============================================================================
// Subscription Management Webhooks (existing)
// ============================================================================

/**
 * Sync subscription change to database via N8N
 *
 * N8N workflow will:
 * 1. Close existing subscription_log entries (if previousPlanCode provided)
 * 2. Insert new subscription_log entry
 * 3. Update operator.plan field
 */
export async function syncSubscriptionChange(input: {
  operatorId: string
  newPlanCode: string
  previousPlanCode?: string
  overrideAmountCents?: number
  notes?: string
}): Promise<N8NWebhookResponse> {
  const payload: SubscriptionSyncPayload = {
    action: "change",
    operatorId: input.operatorId,
    newPlanCode: input.newPlanCode,
    previousPlanCode: input.previousPlanCode,
    overrideAmountCents: input.overrideAmountCents,
    notes: input.notes,
    timestamp: new Date().toISOString(),
  }

  console.log(
    `[N8N] Syncing subscription change for ${input.operatorId}: ${input.previousPlanCode || "new"} -> ${input.newPlanCode}`
  )

  return sendWebhook(N8N_WORKFLOWS.SUBSCRIPTION_SYNC, payload as unknown as Record<string, unknown>)
}

/**
 * Sync new subscription creation to database via N8N
 *
 * N8N workflow will:
 * 1. Insert new subscription_log entry
 * 2. Update operator.plan field
 */
export async function syncSubscriptionCreate(input: {
  operatorId: string
  planCode: string
  overrideAmountCents?: number
  notes?: string
}): Promise<N8NWebhookResponse> {
  const payload: SubscriptionSyncPayload = {
    action: "create",
    operatorId: input.operatorId,
    newPlanCode: input.planCode,
    overrideAmountCents: input.overrideAmountCents,
    notes: input.notes,
    timestamp: new Date().toISOString(),
  }

  console.log(`[N8N] Syncing subscription create for ${input.operatorId}: ${input.planCode}`)

  return sendWebhook(N8N_WORKFLOWS.SUBSCRIPTION_SYNC, payload as unknown as Record<string, unknown>)
}

/**
 * Sync subscription cancellation to database via N8N
 *
 * N8N workflow will:
 * 1. Update subscription_log entry with removed_at
 * 2. Optionally update operator.plan to 'free' (depending on immediate vs end-of-period)
 */
export async function syncSubscriptionCancel(input: {
  operatorId: string
  planCode?: string
  immediate?: boolean
  notes?: string
}): Promise<N8NWebhookResponse> {
  const payload: SubscriptionSyncPayload = {
    action: "cancel",
    operatorId: input.operatorId,
    previousPlanCode: input.planCode,
    notes: input.notes,
    timestamp: new Date().toISOString(),
  }

  console.log(
    `[N8N] Syncing subscription cancel for ${input.operatorId}: ${input.planCode || "all"}`
  )

  return sendWebhook(N8N_WORKFLOWS.SUBSCRIPTION_SYNC, payload as unknown as Record<string, unknown>)
}

// ============================================================================
// Export Client Object
// ============================================================================

export const n8nClient = {
  // Configuration
  isConfigured,
  hasSecret,
  WORKFLOWS: N8N_WORKFLOWS,

  // Core
  sendWebhook,

  // Consolidated workflow helpers
  callWorkflow,
  workflowGet,
  workflowGetArray,
  workflowPost,

  // Subscription management
  syncSubscriptionCreate,
  syncSubscriptionChange,
  syncSubscriptionCancel,
}

// Default export
export { n8nClient as n8n }
