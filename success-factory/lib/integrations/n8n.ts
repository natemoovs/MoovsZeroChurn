/**
 * N8N Integration Client
 *
 * Sends webhook requests to N8N for database operations.
 * N8N handles the actual Snowflake queries using its configured credentials.
 *
 * Environment variables:
 *   - N8N_WEBHOOK_BASE_URL: Base URL for N8N webhooks (e.g., https://moovs.app.n8n.cloud/webhook)
 *   - N8N_WEBHOOK_SECRET: Secret for authenticating webhook requests
 */

const N8N_WEBHOOK_BASE_URL =
  process.env.N8N_WEBHOOK_BASE_URL || "https://moovs.app.n8n.cloud/webhook"
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

// ============================================================================
// Webhook Endpoints
// ============================================================================

export const N8N_ENDPOINTS = {
  // Subscription Management (existing)
  SUBSCRIPTION_SYNC: "subscription-sync",

  // Search & Discovery
  SEARCH_OPERATORS: "snowflake/search-operators",
  EXPANDED_SEARCH: "snowflake/expanded-search",

  // Operator Core Data
  GET_OPERATOR_BY_ID: "snowflake/get-operator-by-id",
  GET_OPERATOR_CORE_INFO: "snowflake/get-operator-core-info",
  GET_OPERATOR_SETTINGS: "snowflake/get-operator-settings",

  // Financial Data
  GET_OPERATOR_CHARGES: "snowflake/get-operator-charges",
  GET_MONTHLY_CHARGES_SUMMARY: "snowflake/get-monthly-charges-summary",
  GET_RESERVATIONS_OVERVIEW: "snowflake/get-reservations-overview",
  GET_CUSTOMER_CHARGES: "snowflake/get-customer-charges",
  GET_CUSTOMER_SUMMARY: "snowflake/get-customer-summary",
  GET_OPERATOR_BANK_ACCOUNTS: "snowflake/get-operator-bank-accounts",
  GET_OPERATOR_BANK_TRANSACTIONS: "snowflake/get-operator-bank-transactions",

  // Risk & Disputes
  GET_RISK_OVERVIEW: "snowflake/get-risk-overview",
  GET_OPERATOR_RISK_DETAILS: "snowflake/get-operator-risk-details",
  GET_OPERATOR_DISPUTES: "snowflake/get-operator-disputes",
  GET_OPERATOR_DISPUTES_SUMMARY: "snowflake/get-operator-disputes-summary",
  GET_FAILED_INVOICES: "snowflake/get-failed-invoices",
  UPDATE_OPERATOR_RISK: "snowflake/update-operator-risk",

  // Team & Members
  GET_OPERATOR_MEMBERS: "snowflake/get-operator-members",
  GET_OPERATOR_USER_PERMISSIONS: "snowflake/get-operator-user-permissions",
  ADD_OPERATOR_MEMBER: "snowflake/add-operator-member",
  UPDATE_MEMBER_ROLE: "snowflake/update-member-role",
  REMOVE_MEMBER: "snowflake/remove-member",

  // Drivers & Vehicles
  GET_OPERATOR_DRIVERS: "snowflake/get-operator-drivers",
  GET_DRIVER_PERFORMANCE: "snowflake/get-driver-performance",
  GET_OPERATOR_DRIVER_APP_USERS: "snowflake/get-operator-driver-app-users",
  GET_OPERATOR_VEHICLES: "snowflake/get-operator-vehicles",
  GET_VEHICLE_UTILIZATION: "snowflake/get-vehicle-utilization",

  // Trips & Quotes
  GET_OPERATOR_TRIPS: "snowflake/get-operator-trips",
  GET_OPERATOR_QUOTES: "snowflake/get-operator-quotes",
  GET_OPERATOR_QUOTES_SUMMARY: "snowflake/get-operator-quotes-summary",
  GET_OPERATOR_REQUEST_ANALYTICS: "snowflake/get-operator-request-analytics",

  // Misc Data
  GET_OPERATOR_CONTACTS: "snowflake/get-operator-contacts",
  GET_OPERATOR_EMAIL_LOG: "snowflake/get-operator-email-log",
  GET_OPERATOR_PROMO_CODES: "snowflake/get-operator-promo-codes",
  GET_OPERATOR_PRICE_ZONES: "snowflake/get-operator-price-zones",
  GET_OPERATOR_RULES: "snowflake/get-operator-rules",
  GET_OPERATOR_FEEDBACK: "snowflake/get-operator-feedback",

  // Subscription Log
  GET_OPERATOR_SUBSCRIPTION_LOG: "snowflake/get-operator-subscription-log",
  ADD_SUBSCRIPTION_LOG_ENTRY: "snowflake/add-subscription-log-entry",
  REMOVE_SUBSCRIPTION_LOG_ENTRY: "snowflake/remove-subscription-log-entry",
  UPDATE_OPERATOR_PLAN: "snowflake/update-operator-plan",

  // Analytics & Leaderboard
  GET_TOP_OPERATORS_BY_REVENUE: "snowflake/get-top-operators-by-revenue",
  GET_INACTIVE_ACCOUNTS: "snowflake/get-inactive-accounts",
} as const

export type N8NEndpoint = (typeof N8N_ENDPOINTS)[keyof typeof N8N_ENDPOINTS]

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
// Helper Functions for Common Patterns
// ============================================================================

/**
 * GET request to N8N webhook - returns single object or null
 */
export async function n8nGet<T = unknown>(
  endpoint: N8NEndpoint,
  params: Record<string, unknown> = {}
): Promise<T | null> {
  try {
    const response = await sendWebhook<N8NWebhookResponse<T>>(endpoint, params, { method: "GET" })
    return response.data ?? null
  } catch (error) {
    console.error(`[N8N] GET ${endpoint} failed:`, error)
    return null
  }
}

/**
 * GET request to N8N webhook - returns array
 */
export async function n8nGetArray<T = unknown>(
  endpoint: N8NEndpoint,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  try {
    const response = await sendWebhook<N8NWebhookResponse<T[]>>(endpoint, params, { method: "GET" })
    return Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error(`[N8N] GET ${endpoint} failed:`, error)
    return []
  }
}

/**
 * POST request to N8N webhook
 */
export async function n8nPost<T = unknown>(
  endpoint: N8NEndpoint,
  body: Record<string, unknown>
): Promise<N8NWebhookResponse<T>> {
  try {
    return await sendWebhook<N8NWebhookResponse<T>>(endpoint, body, { method: "POST" })
  } catch (error) {
    console.error(`[N8N] POST ${endpoint} failed:`, error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * PATCH request to N8N webhook
 */
export async function n8nPatch<T = unknown>(
  endpoint: N8NEndpoint,
  body: Record<string, unknown>
): Promise<N8NWebhookResponse<T>> {
  try {
    return await sendWebhook<N8NWebhookResponse<T>>(endpoint, body, { method: "PATCH" })
  } catch (error) {
    console.error(`[N8N] PATCH ${endpoint} failed:`, error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * DELETE request to N8N webhook
 */
export async function n8nDelete<T = unknown>(
  endpoint: N8NEndpoint,
  body: Record<string, unknown> = {}
): Promise<N8NWebhookResponse<T>> {
  try {
    return await sendWebhook<N8NWebhookResponse<T>>(endpoint, body, { method: "DELETE" })
  } catch (error) {
    console.error(`[N8N] DELETE ${endpoint} failed:`, error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
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

  return sendWebhook(N8N_ENDPOINTS.SUBSCRIPTION_SYNC, payload as unknown as Record<string, unknown>)
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

  return sendWebhook(N8N_ENDPOINTS.SUBSCRIPTION_SYNC, payload as unknown as Record<string, unknown>)
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

  return sendWebhook(N8N_ENDPOINTS.SUBSCRIPTION_SYNC, payload as unknown as Record<string, unknown>)
}

// ============================================================================
// Export Client Object
// ============================================================================

export const n8nClient = {
  // Configuration
  isConfigured,
  hasSecret,
  ENDPOINTS: N8N_ENDPOINTS,

  // Core
  sendWebhook,

  // Helper methods
  get: n8nGet,
  getArray: n8nGetArray,
  post: n8nPost,
  patch: n8nPatch,
  delete: n8nDelete,

  // Subscription management
  syncSubscriptionCreate,
  syncSubscriptionChange,
  syncSubscriptionCancel,
}

// Default export
export { n8nClient as n8n }
