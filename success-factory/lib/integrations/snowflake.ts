/**
 * Snowflake Integration Client
 *
 * All Snowflake operations are now routed through N8N webhooks.
 * N8N handles the actual database connections using securely stored credentials.
 *
 * Uses 9 consolidated N8N workflows instead of 44 separate endpoints:
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
 *   - N8N_WEBHOOK_BASE_URL: Base URL for N8N webhooks
 *   - N8N_WEBHOOK_SECRET: Optional secret for authenticating requests
 */

import { n8nClient, N8N_WORKFLOWS, N8NWebhookResponse } from "./n8n"

// ============================================================================
// Types
// ============================================================================

export interface SnowflakeQueryResult<T = Record<string, unknown>> {
  rows: T[]
  columns: string[]
  rowCount: number
  executionTime: number
}

export interface OperatorDetails {
  operator_id: string
  company_name: string
  hubspot_company_name: string | null
  lago_external_id: string | null
  stripe_account_id: string | null
  plan: string | null
  mrr: number | null
  total_reservations: number | null
  last_30_days_reservations: number | null
  days_since_last_assignment: number | null
  engagement_status: string | null
  vehicles_total: number | null
  members_count: number | null
  drivers_count: number | null
  setup_score: number | null
}

export interface PlatformCharge {
  charge_id: string
  operator_id: string
  operator_name: string
  created_date: string
  status: string
  total_dollars_charged: number
  fee_amount: number
  net_amount: number
  description: string | null
  customer_email: string | null
  customer_id: string | null
  total_dollars_refunded: number | null
  billing_detail_name: string | null
  outcome_network_status: string | null
  outcome_reason: string | null
  outcome_seller_message: string | null
  outcome_risk_level: string | null
  outcome_risk_score: number | null
  card_id: string | null
  calculated_statement_descriptor: string | null
  dispute_id: string | null
  dispute_status: string | null
  disputed_amount: number | null
  dispute_reason: string | null
  dispute_date: string | null
}

export interface ReservationOverview {
  operator_id: string
  operator_name: string
  created_month: string
  total_trips: number
  total_amount: number
}

export interface RiskOverview {
  operator_id: string
  risk_score: number | null
  failed_payments_count: number
  dispute_count: number
  avg_transaction_amount: number | null
  last_failed_payment_date: string | null
}

export interface MonthlySummary {
  charge_month: string
  status: string
  total_charges: number
  charge_count: number
}

export interface OperatorMember {
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role_slug: string | null
  created_at: string | null
  last_login_at: string | null
}

export interface OperatorDriver {
  driver_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  created_at: string | null
  status: string | null
}

export interface OperatorVehicle {
  vehicle_id: string
  vehicle_name: string | null
  vehicle_type: string | null
  license_plate: string | null
  color: string | null
  capacity: number | null
  created_at: string | null
}

export interface OperatorEmailLog {
  email_log_id: string
  to_email: string | null
  subject: string | null
  template_name: string | null
  sent_at: string | null
  status: string | null
}

export interface DriverPerformance {
  driver_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  status: string
  total_trips: number
  completed_trips: number
  trips_last_30_days: number
  total_revenue: number | null
  last_trip_date: string | null
  completion_rate: number | null
}

export interface VehicleUtilization {
  vehicle_id: string
  vehicle_name: string | null
  vehicle_type: string | null
  license_plate: string | null
  capacity: number | null
  total_trips: number
  trips_last_30_days: number
  total_revenue: number | null
  last_trip_date: string | null
  days_since_last_trip: number | null
}

export interface PromoCode {
  promo_code_id: string
  code: string
  description: string | null
  discount_type: string | null
  discount_value: number | null
  valid_from: string | null
  valid_until: string | null
  usage_limit: number | null
  times_used: number | null
  is_active: boolean | null
  created_at: string | null
}

export interface PriceZone {
  zone_id: string
  name: string | null
  zone_type: string | null
  base_fare: number | null
  per_mile_rate: number | null
  per_minute_rate: number | null
  minimum_fare: number | null
  created_at: string | null
}

export interface BusinessRule {
  rule_id: string
  name: string | null
  rule_type: string | null
  conditions: string | null
  actions: string | null
  is_active: boolean | null
  priority: number | null
  created_at: string | null
}

export interface PlatformContact {
  contact_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  company_name: string | null
  notes: string | null
  created_at: string | null
}

export interface BankAccount {
  account_id: string
  institution_name: string | null
  account_name: string | null
  account_type: string | null
  last_four: string | null
  status: string | null
  created_at: string | null
}

export interface SubscriptionLogEntry {
  log_id: string
  event_type: string | null
  plan_name: string | null
  previous_plan: string | null
  amount: number | null
  event_date: string | null
  notes: string | null
}

export interface CustomerFeedback {
  feedback_id: string
  title: string | null
  description: string | null
  product_type: string | null
  path: string | null
  created_at: string
  user_first_name: string | null
  user_last_name: string | null
  user_email: string | null
}

export interface BankTransaction {
  transaction_id: string
  account_id: string
  amount: number
  currency: string
  description: string | null
  status: string
  transacted_at: string
  posted_at: string | null
}

export interface DriverAppUser {
  driver_id: string
  app_user_id: string | null
  app_version: string | null
  device_type: string | null
  last_active_at: string | null
  push_enabled: boolean | null
}

export interface UserPermission {
  user_id: string
  permission_id: string
  permission_name: string | null
}

export interface RequestAnalytics {
  month: string
  total_requests: number
  completed_requests: number
  cancelled_requests: number
  total_revenue: number
}

export interface TripSummary {
  trip_id: string
  request_id: string
  status: string
  pickup_location: string | null
  dropoff_location: string | null
  scheduled_at: string | null
  completed_at: string | null
  driver_name: string | null
  passenger_name: string | null
  total_amount: number | null
}

export interface ExpandedSearchResult {
  operator_id: string
  company_name: string
  stripe_account_id: string | null
  mrr: number | null
  match_type: "operator" | "trip" | "quote" | "charge" | "customer"
  match_field: string
  match_value: string
  additional_info?: string
}

export interface DisputeRecord {
  dispute_id: string
  charge_id: string
  stripe_account_id: string
  dispute_status: string
  dispute_reason: string | null
  disputed_amount: number
  dispute_date: string
  created_date: string
  outcome_risk_level: string | null
  outcome_risk_score: number | null
  customer_id: string | null
  billing_detail_name: string | null
}

export interface DisputesSummary {
  total_disputes: number
  total_disputed_amount: number
  disputes_by_status: { status: string; count: number }[]
  disputes_by_reason: { reason: string; count: number }[]
  disputes_by_risk_level: { risk_level: string; count: number }[]
  disputes_over_time: { date: string; count: number }[]
}

export interface QuoteRecord {
  request_id: string
  order_number: string | null
  stage: string
  order_type: string | null
  total_amount: number | null
  created_at: string
  pickup_date: string | null
  customer_name: string | null
  customer_email: string | null
  pickup_address: string | null
  dropoff_address: string | null
  vehicle_type: string | null
}

export interface QuotesSummary {
  total_quotes: number
  total_quotes_amount: number
  total_reservations: number
  total_reservations_amount: number
  conversion_rate: number
  quotes_by_month: Array<{ month: string; quotes: number; reservations: number; amount: number }>
}

export interface CustomerCharge {
  charge_id: string
  created_date: string
  status: string
  total_dollars_charged: number
  description: string | null
  total_dollars_refunded: number | null
  dispute_id: string | null
  dispute_status: string | null
  outcome_risk_level: string | null
}

export interface CustomerSummary {
  customer_id: string
  customer_email: string | null
  customer_name: string | null
  total_charges: number
  total_amount: number
  total_refunded: number
  total_disputes: number
  first_charge_date: string | null
  last_charge_date: string | null
}

export interface AddMemberInput {
  operatorId: string
  email: string
  firstName?: string
  lastName?: string
  roleSlug?: string
}

export interface AddMemberResult {
  userId: string
  success: boolean
}

export interface UpdateMemberRoleInput {
  userId: string
  operatorId: string
  roleSlug: string
}

export interface UpdateRiskFieldResult {
  success: boolean
  operatorId: string
  field: string
  newValue: number
}

export interface OperatorRiskDetails {
  operator_id: string
  instant_payout_limit_cents: number | null
  daily_payment_limit_cents: number | null
  risk_score: number | null
}

export interface OperatorCoreInfo {
  operator_id: string
  name: string | null
  name_slug: string | null
  email: string | null
  phone: string | null
  general_email: string | null
  terms_and_conditions_url: string | null
  website_url: string | null
  company_logo_url: string | null
}

export interface AddSubscriptionLogInput {
  operatorId: string
  lagoPlanCode: string
  startedAt?: Date
  notes?: string
}

export interface AddSubscriptionLogResult {
  subscriptionLogId: string
  success: boolean
}

export interface UpdateOperatorPlanInput {
  operatorId: string
  plan: string
  activeForAnalytics?: boolean
}

export interface UpdateOperatorPlanResult {
  success: boolean
  operatorId: string
  plan: string
}

export interface SubscriptionChangeInput {
  operatorId: string
  newPlanCode: string
  previousPlanCode?: string
  startedAt?: Date
  notes?: string
}

// ============================================================================
// Configuration Check
// ============================================================================

function isConfigured(): boolean {
  return n8nClient.isConfigured()
}

function isWriteEnabled(): boolean {
  return n8nClient.isConfigured()
}

// ============================================================================
// Operator Search (Workflow: operator-search)
// ============================================================================

async function searchOperators(searchTerm: string, limit = 50): Promise<OperatorDetails[]> {
  return n8nClient.workflowGetArray<OperatorDetails>(N8N_WORKFLOWS.OPERATOR_SEARCH, "search", {
    searchTerm,
    limit,
  })
}

async function expandedSearch(searchTerm: string, limit = 50): Promise<ExpandedSearchResult[]> {
  return n8nClient.workflowGetArray<ExpandedSearchResult>(
    N8N_WORKFLOWS.OPERATOR_SEARCH,
    "expanded",
    {
      searchTerm,
      limit,
    }
  )
}

// ============================================================================
// Operator Data (Workflow: operator-data)
// ============================================================================

async function getOperatorById(operatorId: string): Promise<OperatorDetails | null> {
  return n8nClient.workflowGet<OperatorDetails>(N8N_WORKFLOWS.OPERATOR_DATA, "details", {
    operatorId,
  })
}

async function getOperatorCoreInfo(operatorId: string): Promise<OperatorCoreInfo | null> {
  return n8nClient.workflowGet<OperatorCoreInfo>(N8N_WORKFLOWS.OPERATOR_DATA, "core-info", {
    operatorId,
  })
}

async function getOperatorSettings(operatorId: string): Promise<Record<string, unknown> | null> {
  return n8nClient.workflowGet<Record<string, unknown>>(N8N_WORKFLOWS.OPERATOR_DATA, "settings", {
    operatorId,
  })
}

async function getOperatorRiskDetails(operatorId: string): Promise<OperatorRiskDetails | null> {
  return n8nClient.workflowGet<OperatorRiskDetails>(N8N_WORKFLOWS.OPERATOR_DATA, "risk-details", {
    operatorId,
  })
}

async function getRiskOverview(operatorId: string): Promise<RiskOverview | null> {
  return n8nClient.workflowGet<RiskOverview>(N8N_WORKFLOWS.OPERATOR_DATA, "risk-overview", {
    operatorId,
  })
}

// ============================================================================
// Financial Data (Workflow: financial)
// ============================================================================

async function getOperatorPlatformCharges(
  operatorId: string,
  limit = 100
): Promise<PlatformCharge[]> {
  return n8nClient.workflowGetArray<PlatformCharge>(N8N_WORKFLOWS.FINANCIAL, "charges", {
    operatorId,
    limit,
  })
}

async function getMonthlyChargesSummary(operatorId: string): Promise<MonthlySummary[]> {
  return n8nClient.workflowGetArray<MonthlySummary>(N8N_WORKFLOWS.FINANCIAL, "monthly-summary", {
    operatorId,
  })
}

async function getReservationsOverview(operatorId: string): Promise<ReservationOverview[]> {
  return n8nClient.workflowGetArray<ReservationOverview>(N8N_WORKFLOWS.FINANCIAL, "reservations", {
    operatorId,
  })
}

async function getCustomerCharges(
  customerId: string,
  operatorId: string,
  limit = 100
): Promise<CustomerCharge[]> {
  return n8nClient.workflowGetArray<CustomerCharge>(N8N_WORKFLOWS.FINANCIAL, "customer-charges", {
    customerId,
    operatorId,
    limit,
  })
}

async function getCustomerSummary(
  customerId: string,
  operatorId: string
): Promise<CustomerSummary | null> {
  return n8nClient.workflowGet<CustomerSummary>(N8N_WORKFLOWS.FINANCIAL, "customer-summary", {
    customerId,
    operatorId,
  })
}

async function getOperatorBankAccounts(operatorId: string): Promise<BankAccount[]> {
  return n8nClient.workflowGetArray<BankAccount>(N8N_WORKFLOWS.FINANCIAL, "bank-accounts", {
    operatorId,
  })
}

async function getOperatorBankTransactions(operatorId: string): Promise<BankTransaction[]> {
  return n8nClient.workflowGetArray<BankTransaction>(N8N_WORKFLOWS.FINANCIAL, "bank-transactions", {
    operatorId,
  })
}

// ============================================================================
// Risk & Disputes (Workflow: risk)
// ============================================================================

async function getOperatorDisputes(stripeAccountId: string): Promise<DisputeRecord[]> {
  return n8nClient.workflowGetArray<DisputeRecord>(N8N_WORKFLOWS.RISK, "disputes", {
    stripeAccountId,
  })
}

async function getOperatorDisputesSummary(stripeAccountId: string): Promise<DisputesSummary> {
  const result = await n8nClient.workflowGet<DisputesSummary>(
    N8N_WORKFLOWS.RISK,
    "disputes-summary",
    { stripeAccountId }
  )
  return (
    result || {
      total_disputes: 0,
      total_disputed_amount: 0,
      disputes_by_status: [],
      disputes_by_reason: [],
      disputes_by_risk_level: [],
      disputes_over_time: [],
    }
  )
}

async function getFailedInvoices(limit = 50): Promise<
  {
    operator_id: string
    operator_name: string
    charge_id: string
    amount: number
    failed_at: string
    failure_reason: string | null
  }[]
> {
  return n8nClient.workflowGetArray(N8N_WORKFLOWS.RISK, "failed-invoices", { limit })
}

async function updateOperatorInstantPayoutLimit(
  operatorId: string,
  limitCents: number
): Promise<UpdateRiskFieldResult> {
  const response = await n8nClient.workflowPost<UpdateRiskFieldResult>(
    N8N_WORKFLOWS.RISK,
    "update-risk",
    {
      operatorId,
      field: "instant_payout_limit_cents",
      value: limitCents,
    }
  )

  return {
    success: response.success,
    operatorId,
    field: "instant_payout_limit_cents",
    newValue: limitCents,
  }
}

async function updateOperatorDailyPaymentLimit(
  operatorId: string,
  limitCents: number
): Promise<UpdateRiskFieldResult> {
  const response = await n8nClient.workflowPost<UpdateRiskFieldResult>(
    N8N_WORKFLOWS.RISK,
    "update-risk",
    {
      operatorId,
      field: "daily_payment_limit_cents",
      value: limitCents,
    }
  )

  return {
    success: response.success,
    operatorId,
    field: "daily_payment_limit_cents",
    newValue: limitCents,
  }
}

async function updateOperatorRiskScore(
  operatorId: string,
  riskScore: number
): Promise<UpdateRiskFieldResult> {
  const response = await n8nClient.workflowPost<UpdateRiskFieldResult>(
    N8N_WORKFLOWS.RISK,
    "update-risk",
    {
      operatorId,
      field: "risk_score",
      value: riskScore,
    }
  )

  return {
    success: response.success,
    operatorId,
    field: "risk_score",
    newValue: riskScore,
  }
}

// ============================================================================
// Team Management (Workflow: team)
// ============================================================================

async function getOperatorMembers(operatorId: string): Promise<OperatorMember[]> {
  return n8nClient.workflowGetArray<OperatorMember>(N8N_WORKFLOWS.TEAM, "members", { operatorId })
}

async function getOperatorUserPermissions(operatorId: string): Promise<UserPermission[]> {
  return n8nClient.workflowGetArray<UserPermission>(N8N_WORKFLOWS.TEAM, "permissions", {
    operatorId,
  })
}

async function addOperatorMember(input: AddMemberInput): Promise<AddMemberResult> {
  const response = await n8nClient.workflowPost<AddMemberResult>(N8N_WORKFLOWS.TEAM, "add-member", {
    operatorId: input.operatorId,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    roleSlug: input.roleSlug || "member",
  })

  return {
    userId: response.data?.userId || "",
    success: response.success,
  }
}

async function updateMemberRole(input: UpdateMemberRoleInput): Promise<boolean> {
  const response = await n8nClient.workflowPost(N8N_WORKFLOWS.TEAM, "update-role", {
    userId: input.userId,
    operatorId: input.operatorId,
    roleSlug: input.roleSlug,
  })

  return response.success
}

async function removeMember(userId: string, operatorId: string): Promise<boolean> {
  const response = await n8nClient.workflowPost(N8N_WORKFLOWS.TEAM, "remove-member", {
    userId,
    operatorId,
  })

  return response.success
}

// ============================================================================
// Fleet Management (Workflow: fleet)
// ============================================================================

async function getOperatorDrivers(operatorId: string): Promise<OperatorDriver[]> {
  return n8nClient.workflowGetArray<OperatorDriver>(N8N_WORKFLOWS.FLEET, "drivers", { operatorId })
}

async function getDriverPerformance(operatorId: string): Promise<DriverPerformance[]> {
  return n8nClient.workflowGetArray<DriverPerformance>(N8N_WORKFLOWS.FLEET, "driver-performance", {
    operatorId,
  })
}

async function getOperatorDriverAppUsers(operatorId: string): Promise<DriverAppUser[]> {
  return n8nClient.workflowGetArray<DriverAppUser>(N8N_WORKFLOWS.FLEET, "driver-app-users", {
    operatorId,
  })
}

async function getOperatorVehicles(operatorId: string): Promise<OperatorVehicle[]> {
  return n8nClient.workflowGetArray<OperatorVehicle>(N8N_WORKFLOWS.FLEET, "vehicles", {
    operatorId,
  })
}

async function getVehicleUtilization(operatorId: string): Promise<VehicleUtilization[]> {
  return n8nClient.workflowGetArray<VehicleUtilization>(
    N8N_WORKFLOWS.FLEET,
    "vehicle-utilization",
    {
      operatorId,
    }
  )
}

// ============================================================================
// Bookings - Trips & Quotes (Workflow: bookings)
// ============================================================================

async function getOperatorTrips(operatorId: string, limit = 50): Promise<TripSummary[]> {
  return n8nClient.workflowGetArray<TripSummary>(N8N_WORKFLOWS.BOOKINGS, "trips", {
    operatorId,
    limit,
  })
}

async function getOperatorQuotes(operatorId: string, limit = 100): Promise<QuoteRecord[]> {
  return n8nClient.workflowGetArray<QuoteRecord>(N8N_WORKFLOWS.BOOKINGS, "quotes", {
    operatorId,
    limit,
  })
}

async function getOperatorQuotesSummary(operatorId: string): Promise<QuotesSummary> {
  const result = await n8nClient.workflowGet<QuotesSummary>(
    N8N_WORKFLOWS.BOOKINGS,
    "quotes-summary",
    { operatorId }
  )
  return (
    result || {
      total_quotes: 0,
      total_quotes_amount: 0,
      total_reservations: 0,
      total_reservations_amount: 0,
      conversion_rate: 0,
      quotes_by_month: [],
    }
  )
}

async function getOperatorRequestAnalytics(operatorId: string): Promise<RequestAnalytics[]> {
  return n8nClient.workflowGetArray<RequestAnalytics>(N8N_WORKFLOWS.BOOKINGS, "request-analytics", {
    operatorId,
  })
}

// ============================================================================
// Platform Data (Workflow: platform)
// ============================================================================

async function getOperatorContacts(operatorId: string): Promise<PlatformContact[]> {
  return n8nClient.workflowGetArray<PlatformContact>(N8N_WORKFLOWS.PLATFORM, "contacts", {
    operatorId,
  })
}

async function getOperatorEmailLog(operatorId: string, limit = 50): Promise<OperatorEmailLog[]> {
  return n8nClient.workflowGetArray<OperatorEmailLog>(N8N_WORKFLOWS.PLATFORM, "email-log", {
    operatorId,
    limit,
  })
}

async function getOperatorPromoCodes(operatorId: string): Promise<PromoCode[]> {
  return n8nClient.workflowGetArray<PromoCode>(N8N_WORKFLOWS.PLATFORM, "promo-codes", {
    operatorId,
  })
}

async function getOperatorPriceZones(operatorId: string): Promise<PriceZone[]> {
  return n8nClient.workflowGetArray<PriceZone>(N8N_WORKFLOWS.PLATFORM, "price-zones", {
    operatorId,
  })
}

async function getOperatorRules(operatorId: string): Promise<BusinessRule[]> {
  return n8nClient.workflowGetArray<BusinessRule>(N8N_WORKFLOWS.PLATFORM, "rules", { operatorId })
}

async function getOperatorFeedback(operatorId: string): Promise<CustomerFeedback[]> {
  return n8nClient.workflowGetArray<CustomerFeedback>(N8N_WORKFLOWS.PLATFORM, "feedback", {
    operatorId,
  })
}

// ============================================================================
// Subscriptions & Analytics (Workflow: subscriptions)
// ============================================================================

async function getOperatorSubscriptionLog(operatorId: string): Promise<SubscriptionLogEntry[]> {
  return n8nClient.workflowGetArray<SubscriptionLogEntry>(N8N_WORKFLOWS.SUBSCRIPTIONS, "log", {
    operatorId,
  })
}

async function addSubscriptionLogEntry(
  input: AddSubscriptionLogInput
): Promise<AddSubscriptionLogResult> {
  const response = await n8nClient.workflowPost<AddSubscriptionLogResult>(
    N8N_WORKFLOWS.SUBSCRIPTIONS,
    "add-log",
    {
      operatorId: input.operatorId,
      lagoPlanCode: input.lagoPlanCode,
      startedAt: input.startedAt?.toISOString(),
      notes: input.notes,
    }
  )

  return {
    subscriptionLogId: response.data?.subscriptionLogId || "",
    success: response.success,
  }
}

async function removeSubscriptionLogEntry(
  operatorId: string,
  lagoPlanCode?: string
): Promise<boolean> {
  const response = await n8nClient.workflowPost(N8N_WORKFLOWS.SUBSCRIPTIONS, "remove-log", {
    operatorId,
    lagoPlanCode,
  })

  return response.success
}

async function updateOperatorPlan(
  input: UpdateOperatorPlanInput
): Promise<UpdateOperatorPlanResult> {
  const response = await n8nClient.workflowPost<UpdateOperatorPlanResult>(
    N8N_WORKFLOWS.SUBSCRIPTIONS,
    "update-plan",
    {
      operatorId: input.operatorId,
      plan: input.plan,
      activeForAnalytics: input.activeForAnalytics ?? true,
    }
  )

  return {
    success: response.success,
    operatorId: input.operatorId,
    plan: input.plan,
  }
}

async function getTopOperatorsByRevenue(
  limit = 10,
  period: "week" | "month" | "year" = "month"
): Promise<
  {
    operator_id: string
    operator_name: string
    total_charged: number
    total_trips: number
  }[]
> {
  return n8nClient.workflowGetArray(N8N_WORKFLOWS.SUBSCRIPTIONS, "top-operators", { limit, period })
}

async function getInactiveAccounts(
  daysSinceLastActivity = 30,
  limit = 50
): Promise<
  {
    operator_id: string
    company_name: string
    last_activity_date: string | null
    days_inactive: number
    mrr: number | null
  }[]
> {
  return n8nClient.workflowGetArray(N8N_WORKFLOWS.SUBSCRIPTIONS, "inactive-accounts", {
    daysSinceLastActivity,
    limit,
  })
}

// ============================================================================
// Subscription Change Handlers (Uses existing subscription-sync workflow)
// ============================================================================

function extractPlanFromCode(lagoPlanCode: string): string {
  const code = lagoPlanCode.toLowerCase()
  if (code.includes("enterprise")) return "enterprise"
  if (code.includes("pro")) return "pro"
  if (code.includes("standard")) return "standard"
  return "free"
}

async function handleSubscriptionChange(
  input: SubscriptionChangeInput
): Promise<{ success: boolean; subscriptionLogId: string; plan: string }> {
  // Use the N8N subscription sync webhook which handles the full workflow
  const response = await n8nClient.syncSubscriptionChange({
    operatorId: input.operatorId,
    newPlanCode: input.newPlanCode,
    previousPlanCode: input.previousPlanCode,
    notes: input.notes,
  })

  return {
    success: response.success,
    subscriptionLogId: "", // N8N handles this internally
    plan: extractPlanFromCode(input.newPlanCode),
  }
}

async function handleSubscriptionCancellation(
  operatorId: string,
  planCode?: string,
  notes?: string
): Promise<{ success: boolean }> {
  const response = await n8nClient.syncSubscriptionCancel({
    operatorId,
    planCode,
    notes,
  })

  return { success: response.success }
}

// ============================================================================
// Export Client Object
// ============================================================================

export const snowflakeClient = {
  // Core
  isConfigured,

  // Search (operator-search workflow)
  searchOperators,
  expandedSearch,

  // Operator data (operator-data workflow)
  getOperatorById,
  getOperatorCoreInfo,
  getOperatorSettings,
  getOperatorRiskDetails,
  getRiskOverview,

  // Financial data (financial workflow)
  getOperatorPlatformCharges,
  getMonthlyChargesSummary,
  getReservationsOverview,
  getCustomerCharges,
  getCustomerSummary,
  getOperatorBankAccounts,
  getOperatorBankTransactions,

  // Risk & disputes (risk workflow)
  getOperatorDisputes,
  getOperatorDisputesSummary,
  getFailedInvoices,
  updateOperatorInstantPayoutLimit,
  updateOperatorDailyPaymentLimit,
  updateOperatorRiskScore,

  // Team management (team workflow)
  getOperatorMembers,
  getOperatorUserPermissions,
  addOperatorMember,
  updateMemberRole,
  removeMember,
  isWriteEnabled,

  // Fleet management (fleet workflow)
  getOperatorDrivers,
  getDriverPerformance,
  getOperatorDriverAppUsers,
  getOperatorVehicles,
  getVehicleUtilization,

  // Bookings (bookings workflow)
  getOperatorTrips,
  getOperatorQuotes,
  getOperatorQuotesSummary,
  getOperatorRequestAnalytics,

  // Platform data (platform workflow)
  getOperatorContacts,
  getOperatorEmailLog,
  getOperatorPromoCodes,
  getOperatorPriceZones,
  getOperatorRules,
  getOperatorFeedback,

  // Subscriptions & analytics (subscriptions workflow)
  getOperatorSubscriptionLog,
  addSubscriptionLogEntry,
  removeSubscriptionLogEntry,
  updateOperatorPlan,
  getTopOperatorsByRevenue,
  getInactiveAccounts,

  // Subscription change handlers (uses subscription-sync workflow)
  handleSubscriptionChange,
  handleSubscriptionCancellation,
  extractPlanFromCode,
}

// Default export for consistency with other integrations
export { snowflakeClient as snowflake }
