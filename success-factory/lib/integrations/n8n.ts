/**
 * N8N Integration Client
 *
 * Sends webhook requests to N8N for database operations.
 * N8N handles the actual Snowflake writes using its configured credentials.
 *
 * Environment variables:
 *   - N8N_WEBHOOK_BASE_URL: Base URL for N8N webhooks (e.g., https://moovs.app.n8n.cloud/webhook)
 *   - N8N_WEBHOOK_SECRET: Secret for authenticating webhook requests
 */

const N8N_WEBHOOK_BASE_URL =
  process.env.N8N_WEBHOOK_BASE_URL || "https://moovs.app.n8n.cloud/webhook"
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

// ============================================================================
// Types
// ============================================================================

export interface N8NWebhookResponse {
  success: boolean
  message?: string
  data?: Record<string, unknown>
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
  payload: Record<string, unknown>
): Promise<T> {
  const url = `${N8N_WEBHOOK_BASE_URL}/${webhookPath}`

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  // Add secret header if configured
  if (N8N_WEBHOOK_SECRET) {
    headers["x-webhook-secret"] = N8N_WEBHOOK_SECRET
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[N8N] Webhook failed: ${response.status} - ${errorText}`)
      throw new Error(`N8N webhook failed: ${response.status}`)
    }

    // N8N may return empty response for successful webhooks
    const text = await response.text()
    if (!text) {
      return { success: true } as T
    }

    try {
      return JSON.parse(text) as T
    } catch {
      // If response isn't JSON, treat as success
      return { success: true, message: text } as T
    }
  } catch (error) {
    console.error(`[N8N] Webhook error for ${webhookPath}:`, error)
    throw error
  }
}

// ============================================================================
// Subscription Management Webhooks
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

  return sendWebhook("subscription-sync", payload as unknown as Record<string, unknown>)
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

  return sendWebhook("subscription-sync", payload as unknown as Record<string, unknown>)
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

  return sendWebhook("subscription-sync", payload as unknown as Record<string, unknown>)
}

// ============================================================================
// Export Client Object
// ============================================================================

export const n8nClient = {
  // Configuration
  isConfigured,
  hasSecret,

  // Core
  sendWebhook,

  // Subscription management
  syncSubscriptionCreate,
  syncSubscriptionChange,
  syncSubscriptionCancel,
}

// Default export
export { n8nClient as n8n }
