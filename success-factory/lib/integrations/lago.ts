/**
 * Lago Billing Integration Client
 *
 * Requires LAGO_API_KEY and LAGO_API_URL environment variables
 * API Docs: https://doc.getlago.com/api-reference/intro
 *
 * Key mapping: Moovs operator_id = Lago external_customer_id
 */

const LAGO_API_KEY = process.env.LAGO_API_KEY
const LAGO_API_URL = process.env.LAGO_API_URL || "https://api.getlago.com/api/v1"

// ============================================================================
// Types
// ============================================================================

export interface LagoCustomer {
  lago_id: string
  external_id: string // This is the Moovs operator_id
  name: string
  email?: string
  legal_name?: string
  legal_number?: string
  phone?: string
  currency: string
  net_payment_term: number
  tax_identification_number?: string
  timezone?: string
  created_at: string
  updated_at: string
  billing_configuration?: {
    invoice_grace_period?: number
    payment_provider?: string
    provider_customer_id?: string
  }
  metadata?: Array<{
    key: string
    value: string
  }>
}

export interface LagoSubscription {
  lago_id: string
  external_id: string
  lago_customer_id: string
  external_customer_id: string
  plan_code: string
  status: "active" | "pending" | "canceled" | "terminated"
  name?: string
  started_at: string
  ending_at?: string
  subscription_at: string
  canceled_at?: string
  terminated_at?: string
  created_at: string
  billing_time: "calendar" | "anniversary"
  plan: LagoPlan
}

export interface LagoPlan {
  lago_id: string
  name: string
  code: string
  interval: "weekly" | "monthly" | "quarterly" | "yearly"
  amount_cents: number
  amount_currency: string
  trial_period?: number
  pay_in_advance: boolean
  bill_charges_monthly?: boolean
  created_at: string
}

export interface LagoInvoice {
  lago_id: string
  sequential_id: number
  number: string
  invoice_type: "subscription" | "one_off" | "credit" | "advance_charges"
  status: "draft" | "finalized" | "voided" | "failed"
  payment_status: "pending" | "succeeded" | "failed"
  currency: string
  total_amount_cents: number
  taxes_amount_cents: number
  sub_total_excluding_taxes_amount_cents: number
  issuing_date: string
  payment_due_date?: string
  payment_overdue: boolean
  from_date?: string
  to_date?: string
  customer: {
    lago_id: string
    external_id: string
    name: string
    email?: string
  }
  subscriptions?: Array<{
    subscription: LagoSubscription
  }>
  credits?: Array<{
    lago_id: string
    amount_cents: number
    item: {
      type: string
      code: string
      name: string
    }
  }>
  applied_taxes?: Array<{
    lago_id: string
    tax_name: string
    tax_rate: number
  }>
  created_at: string
  updated_at: string
}

export interface LagoListResponse<T> {
  [key: string]: T[] | { current_page: number; total_pages: number; total_count: number }
}

export interface LagoError {
  status: number
  error: string
  code?: string
  error_details?: Record<string, string[]>
}

// ============================================================================
// Helper Functions
// ============================================================================

function getHeaders(): HeadersInit {
  if (!LAGO_API_KEY) {
    throw new Error("LAGO_API_KEY environment variable is not set")
  }
  return {
    Authorization: `Bearer ${LAGO_API_KEY}`,
    "Content-Type": "application/json",
  }
}

async function lagoFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${LAGO_API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    const error = data as LagoError
    throw new Error(`Lago API Error: ${error.error} (${response.status})`)
  }

  return data as T
}

// ============================================================================
// Client Functions
// ============================================================================

/**
 * Get a customer by external_id (operator_id)
 */
export async function getCustomer(operatorId: string): Promise<LagoCustomer | null> {
  if (!LAGO_API_KEY) {
    console.log("Lago not configured (missing LAGO_API_KEY)")
    return null
  }

  try {
    const result = await lagoFetch<{ customer: LagoCustomer }>(
      `/customers/${operatorId}`
    )
    return result.customer
  } catch (err) {
    console.log(`Failed to get Lago customer ${operatorId}:`, err)
    return null
  }
}

/**
 * List all customers with pagination
 */
export async function listCustomers(page = 1, perPage = 100): Promise<{
  customers: LagoCustomer[]
  meta: { current_page: number; total_pages: number; total_count: number }
}> {
  if (!LAGO_API_KEY) {
    return { customers: [], meta: { current_page: 1, total_pages: 0, total_count: 0 } }
  }

  const result = await lagoFetch<{
    customers: LagoCustomer[]
    meta: { current_page: number; total_pages: number; total_count: number }
  }>(`/customers?page=${page}&per_page=${perPage}`)

  return result
}

/**
 * Get invoices for a customer by external_id (operator_id)
 */
export async function getInvoices(
  operatorId: string,
  options: {
    status?: "draft" | "finalized" | "voided"
    paymentStatus?: "pending" | "succeeded" | "failed"
    page?: number
    perPage?: number
  } = {}
): Promise<{
  invoices: LagoInvoice[]
  meta: { current_page: number; total_pages: number; total_count: number }
}> {
  if (!LAGO_API_KEY) {
    return { invoices: [], meta: { current_page: 1, total_pages: 0, total_count: 0 } }
  }

  const params = new URLSearchParams({
    external_customer_id: operatorId,
    page: String(options.page || 1),
    per_page: String(options.perPage || 100),
  })

  if (options.status) params.append("status", options.status)
  if (options.paymentStatus) params.append("payment_status", options.paymentStatus)

  const result = await lagoFetch<{
    invoices: LagoInvoice[]
    meta: { current_page: number; total_pages: number; total_count: number }
  }>(`/invoices?${params}`)

  return result
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<LagoInvoice | null> {
  if (!LAGO_API_KEY) {
    return null
  }

  try {
    const result = await lagoFetch<{ invoice: LagoInvoice }>(
      `/invoices/${invoiceId}`
    )
    return result.invoice
  } catch (err) {
    console.log(`Failed to get Lago invoice ${invoiceId}:`, err)
    return null
  }
}

/**
 * Get subscriptions for a customer
 */
export async function getSubscriptions(
  operatorId: string
): Promise<LagoSubscription[]> {
  if (!LAGO_API_KEY) {
    return []
  }

  try {
    const result = await lagoFetch<{
      subscriptions: LagoSubscription[]
    }>(`/subscriptions?external_customer_id=${operatorId}`)
    return result.subscriptions
  } catch (err) {
    console.log(`Failed to get Lago subscriptions for ${operatorId}:`, err)
    return []
  }
}

/**
 * Get overdue invoices for a customer
 */
export async function getOverdueInvoices(operatorId: string): Promise<LagoInvoice[]> {
  const result = await getInvoices(operatorId, {
    status: "finalized",
    paymentStatus: "pending",
  })

  // Filter to only overdue ones
  const now = new Date()
  return result.invoices.filter((invoice) => {
    if (!invoice.payment_due_date) return false
    return new Date(invoice.payment_due_date) < now
  })
}

// ============================================================================
// Billing Health Analysis
// ============================================================================

export interface BillingHealthSummary {
  // Customer info
  customerId: string
  customerName: string
  currency: string

  // Subscription
  currentPlan: string | null
  planCode: string | null
  billingCycle: string | null
  subscriptionStatus: string | null
  subscriptionStartDate: string | null
  nextBillDate: string | null

  // Financials
  totalInvoiced: number // cents
  totalPaid: number // cents
  outstandingBalance: number // cents
  mrr: number // cents

  // Invoice counts
  totalInvoices: number
  paidInvoices: number
  pendingInvoices: number
  failedInvoices: number
  overdueInvoices: number

  // Health indicators
  paymentSuccessRate: number // 0-100%
  avgDaysToPay: number | null
  hasOverdueInvoices: boolean
  oldestOverdueDays: number | null
}

/**
 * Get comprehensive billing health summary for a customer
 */
export async function getBillingHealth(operatorId: string): Promise<BillingHealthSummary | null> {
  if (!LAGO_API_KEY) {
    return null
  }

  try {
    // Fetch customer, subscriptions, and invoices in parallel
    const [customer, subscriptions, invoicesResult] = await Promise.all([
      getCustomer(operatorId),
      getSubscriptions(operatorId),
      getInvoices(operatorId, { perPage: 100 }),
    ])

    if (!customer) {
      return null
    }

    const invoices = invoicesResult.invoices
    const activeSubscription = subscriptions.find((s) => s.status === "active")

    // Calculate totals
    const finalizedInvoices = invoices.filter((i) => i.status === "finalized")
    const totalInvoiced = finalizedInvoices.reduce(
      (sum, i) => sum + i.total_amount_cents,
      0
    )
    const paidInvoices = finalizedInvoices.filter(
      (i) => i.payment_status === "succeeded"
    )
    const totalPaid = paidInvoices.reduce(
      (sum, i) => sum + i.total_amount_cents,
      0
    )
    const pendingInvoices = finalizedInvoices.filter(
      (i) => i.payment_status === "pending"
    )
    const failedInvoices = finalizedInvoices.filter(
      (i) => i.payment_status === "failed"
    )

    // Calculate overdue
    const now = new Date()
    const overdueInvoices = pendingInvoices.filter((i) => {
      if (!i.payment_due_date) return false
      return new Date(i.payment_due_date) < now
    })

    // Calculate oldest overdue
    let oldestOverdueDays: number | null = null
    for (const invoice of overdueInvoices) {
      if (invoice.payment_due_date) {
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(invoice.payment_due_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
        if (oldestOverdueDays === null || daysOverdue > oldestOverdueDays) {
          oldestOverdueDays = daysOverdue
        }
      }
    }

    // Calculate MRR from active subscription
    let mrr = 0
    if (activeSubscription?.plan) {
      const plan = activeSubscription.plan
      switch (plan.interval) {
        case "monthly":
          mrr = plan.amount_cents
          break
        case "yearly":
          mrr = Math.round(plan.amount_cents / 12)
          break
        case "quarterly":
          mrr = Math.round(plan.amount_cents / 3)
          break
        case "weekly":
          mrr = plan.amount_cents * 4
          break
      }
    }

    // Calculate next bill date from most recent subscription invoice
    const subscriptionInvoices = invoices
      .filter((i) => i.invoice_type === "subscription" && i.to_date)
      .sort((a, b) => new Date(b.to_date!).getTime() - new Date(a.to_date!).getTime())

    const lastInvoice = subscriptionInvoices[0]
    const nextBillDate = lastInvoice?.to_date
      ? new Date(new Date(lastInvoice.to_date).getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      : null

    return {
      customerId: customer.external_id,
      customerName: customer.name,
      currency: customer.currency,

      currentPlan: activeSubscription?.plan?.name || null,
      planCode: activeSubscription?.plan?.code || null,
      billingCycle: activeSubscription?.plan?.interval || null,
      subscriptionStatus: activeSubscription?.status || null,
      subscriptionStartDate: activeSubscription?.subscription_at || null,
      nextBillDate,

      totalInvoiced,
      totalPaid,
      outstandingBalance: totalInvoiced - totalPaid,
      mrr,

      totalInvoices: finalizedInvoices.length,
      paidInvoices: paidInvoices.length,
      pendingInvoices: pendingInvoices.length,
      failedInvoices: failedInvoices.length,
      overdueInvoices: overdueInvoices.length,

      paymentSuccessRate:
        finalizedInvoices.length > 0
          ? Math.round((paidInvoices.length / finalizedInvoices.length) * 100)
          : 100,
      avgDaysToPay: null, // Would need payment timestamps to calculate
      hasOverdueInvoices: overdueInvoices.length > 0,
      oldestOverdueDays,
    }
  } catch (err) {
    console.error(`Failed to get billing health for ${operatorId}:`, err)
    return null
  }
}

// ============================================================================
// Export Client Object
// ============================================================================

export const lago = {
  getCustomer,
  listCustomers,
  getInvoices,
  getInvoice,
  getSubscriptions,
  getOverdueInvoices,
  getBillingHealth,
}
