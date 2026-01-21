/**
 * Stripe Billing Integration Client
 *
 * Requires STRIPE_SECRET_KEY environment variable
 * API Docs: https://stripe.com/docs/api
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const BASE_URL = "https://api.stripe.com/v1"

// ============================================================================
// Types
// ============================================================================

export interface StripeCustomer {
  id: string
  object: "customer"
  email: string | null
  name: string | null
  phone: string | null
  description: string | null
  created: number
  currency: string | null
  default_source: string | null
  delinquent: boolean
  balance: number
  metadata: Record<string, string>
  address: StripeAddress | null
  shipping: {
    address: StripeAddress
    name: string
    phone: string
  } | null
}

export interface StripeAddress {
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
}

export interface StripeSubscription {
  id: string
  object: "subscription"
  customer: string
  status: StripeSubscriptionStatus
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at: number | null
  ended_at: number | null
  start_date: number
  trial_start: number | null
  trial_end: number | null
  items: {
    object: "list"
    data: StripeSubscriptionItem[]
  }
  latest_invoice: string | null
  default_payment_method: string | null
  metadata: Record<string, string>
  created: number
}

export type StripeSubscriptionStatus =
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "paused"

export interface StripeSubscriptionItem {
  id: string
  object: "subscription_item"
  price: StripePrice
  quantity: number
  subscription: string
  created: number
}

export interface StripePrice {
  id: string
  object: "price"
  active: boolean
  currency: string
  unit_amount: number | null
  unit_amount_decimal: string | null
  recurring: {
    interval: "day" | "week" | "month" | "year"
    interval_count: number
  } | null
  product: string
  nickname: string | null
  metadata: Record<string, string>
}

export interface StripeInvoice {
  id: string
  object: "invoice"
  customer: string
  customer_email: string | null
  customer_name: string | null
  status: StripeInvoiceStatus
  amount_due: number
  amount_paid: number
  amount_remaining: number
  currency: string
  due_date: number | null
  paid: boolean
  period_start: number
  period_end: number
  hosted_invoice_url: string | null
  invoice_pdf: string | null
  subscription: string | null
  created: number
  metadata: Record<string, string>
  lines: {
    object: "list"
    data: StripeInvoiceLineItem[]
  }
}

export type StripeInvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "uncollectible"
  | "void"

export interface StripeInvoiceLineItem {
  id: string
  object: "line_item"
  amount: number
  currency: string
  description: string | null
  quantity: number
  price: StripePrice | null
  period: {
    start: number
    end: number
  }
}

export interface StripePaymentIntent {
  id: string
  object: "payment_intent"
  amount: number
  currency: string
  status: StripePaymentIntentStatus
  customer: string | null
  description: string | null
  invoice: string | null
  payment_method: string | null
  created: number
  metadata: Record<string, string>
}

export type StripePaymentIntentStatus =
  | "requires_payment_method"
  | "requires_confirmation"
  | "requires_action"
  | "processing"
  | "requires_capture"
  | "canceled"
  | "succeeded"

export interface StripeCharge {
  id: string
  object: "charge"
  amount: number
  amount_refunded: number
  currency: string
  customer: string | null
  description: string | null
  invoice: string | null
  paid: boolean
  refunded: boolean
  status: "succeeded" | "pending" | "failed"
  created: number
  receipt_url: string | null
  payment_method_details: {
    type: string
    card?: {
      brand: string
      last4: string
      exp_month: number
      exp_year: number
    }
  } | null
}

export interface StripeListResponse<T> {
  object: "list"
  data: T[]
  has_more: boolean
  url: string
}

export interface StripeError {
  error: {
    type: string
    message: string
    code?: string
    param?: string
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getHeaders(): HeadersInit {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set")
  }
  return {
    "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  }
}

async function stripeFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    const error = data as StripeError
    throw new Error(`Stripe API Error: ${error.error.message} (${error.error.type})`)
  }

  return data as T
}

function toFormData(params: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&")
}

// ============================================================================
// Client Functions
// ============================================================================

/**
 * Get a customer by Stripe customer ID
 */
export async function getCustomer(id: string): Promise<StripeCustomer> {
  return stripeFetch<StripeCustomer>(`/customers/${id}`)
}

/**
 * Find a customer by email address
 */
export async function getCustomerByEmail(email: string): Promise<StripeCustomer | null> {
  const params = toFormData({ email, limit: 1 })
  const result = await stripeFetch<StripeListResponse<StripeCustomer>>(
    `/customers?${params}`
  )
  return result.data[0] || null
}

/**
 * Get all subscriptions for a customer
 */
export async function getSubscriptions(
  customerId: string,
  options: { status?: StripeSubscriptionStatus; limit?: number } = {}
): Promise<StripeSubscription[]> {
  const params = toFormData({
    customer: customerId,
    status: options.status,
    limit: options.limit || 100,
    expand: "data.items.data.price",
  })
  const result = await stripeFetch<StripeListResponse<StripeSubscription>>(
    `/subscriptions?${params}`
  )
  return result.data
}

/**
 * Get all invoices for a customer
 */
export async function getInvoices(
  customerId: string,
  options: { status?: StripeInvoiceStatus; limit?: number } = {}
): Promise<StripeInvoice[]> {
  const params = toFormData({
    customer: customerId,
    status: options.status,
    limit: options.limit || 100,
  })
  const result = await stripeFetch<StripeListResponse<StripeInvoice>>(
    `/invoices?${params}`
  )
  return result.data
}

/**
 * Get payment history (charges) for a customer
 */
export async function getPaymentHistory(
  customerId: string,
  options: { limit?: number } = {}
): Promise<StripeCharge[]> {
  const params = toFormData({
    customer: customerId,
    limit: options.limit || 100,
  })
  const result = await stripeFetch<StripeListResponse<StripeCharge>>(
    `/charges?${params}`
  )
  return result.data
}

// ============================================================================
// Export Client Object
// ============================================================================

export const stripe = {
  getCustomer,
  getCustomerByEmail,
  getSubscriptions,
  getInvoices,
  getPaymentHistory,
}
