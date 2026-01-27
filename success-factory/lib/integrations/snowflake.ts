/**
 * Snowflake Integration Client
 *
 * All Snowflake operations are now routed through N8N webhooks.
 * N8N handles the actual database connections using securely stored credentials.
 *
 * This file maintains the same API surface for backward compatibility,
 * but internally calls N8N webhooks instead of direct database connections.
 *
 * Environment variables:
 *   - N8N_WEBHOOK_BASE_URL: Base URL for N8N webhooks
 *   - N8N_WEBHOOK_SECRET: Optional secret for authenticating requests
 */

import { n8nClient, N8N_ENDPOINTS, N8NWebhookResponse } from "./n8n"

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
// Operator Queries
// ============================================================================

async function searchOperators(searchTerm: string, limit = 50): Promise<OperatorDetails[]> {
  return n8nClient.getArray<OperatorDetails>(N8N_ENDPOINTS.SEARCH_OPERATORS, {
    searchTerm,
    limit,
  })
}

async function expandedSearch(searchTerm: string, limit = 50): Promise<ExpandedSearchResult[]> {
  return n8nClient.getArray<ExpandedSearchResult>(N8N_ENDPOINTS.EXPANDED_SEARCH, {
    searchTerm,
    limit,
  })
}

async function getOperatorById(operatorId: string): Promise<OperatorDetails | null> {
  return n8nClient.get<OperatorDetails>(N8N_ENDPOINTS.GET_OPERATOR_BY_ID, { operatorId })
}

async function getOperatorPlatformCharges(
  operatorId: string,
  limit = 100
): Promise<PlatformCharge[]> {
  return n8nClient.getArray<PlatformCharge>(N8N_ENDPOINTS.GET_OPERATOR_CHARGES, {
    operatorId,
    limit,
  })
}

async function getMonthlyChargesSummary(operatorId: string): Promise<MonthlySummary[]> {
  return n8nClient.getArray<MonthlySummary>(N8N_ENDPOINTS.GET_MONTHLY_CHARGES_SUMMARY, {
    operatorId,
  })
}

async function getReservationsOverview(operatorId: string): Promise<ReservationOverview[]> {
  return n8nClient.getArray<ReservationOverview>(N8N_ENDPOINTS.GET_RESERVATIONS_OVERVIEW, {
    operatorId,
  })
}

async function getRiskOverview(operatorId: string): Promise<RiskOverview | null> {
  return n8nClient.get<RiskOverview>(N8N_ENDPOINTS.GET_RISK_OVERVIEW, { operatorId })
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
  return n8nClient.getArray(N8N_ENDPOINTS.GET_TOP_OPERATORS_BY_REVENUE, { limit, period })
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
  return n8nClient.getArray(N8N_ENDPOINTS.GET_FAILED_INVOICES, { limit })
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
  return n8nClient.getArray(N8N_ENDPOINTS.GET_INACTIVE_ACCOUNTS, { daysSinceLastActivity, limit })
}

// ============================================================================
// Operator Portal Data
// ============================================================================

async function getOperatorMembers(operatorId: string): Promise<OperatorMember[]> {
  return n8nClient.getArray<OperatorMember>(N8N_ENDPOINTS.GET_OPERATOR_MEMBERS, { operatorId })
}

async function getOperatorDrivers(operatorId: string): Promise<OperatorDriver[]> {
  return n8nClient.getArray<OperatorDriver>(N8N_ENDPOINTS.GET_OPERATOR_DRIVERS, { operatorId })
}

async function getOperatorVehicles(operatorId: string): Promise<OperatorVehicle[]> {
  return n8nClient.getArray<OperatorVehicle>(N8N_ENDPOINTS.GET_OPERATOR_VEHICLES, { operatorId })
}

async function getDriverPerformance(operatorId: string): Promise<DriverPerformance[]> {
  return n8nClient.getArray<DriverPerformance>(N8N_ENDPOINTS.GET_DRIVER_PERFORMANCE, { operatorId })
}

async function getVehicleUtilization(operatorId: string): Promise<VehicleUtilization[]> {
  return n8nClient.getArray<VehicleUtilization>(N8N_ENDPOINTS.GET_VEHICLE_UTILIZATION, {
    operatorId,
  })
}

async function getOperatorEmailLog(operatorId: string, limit = 50): Promise<OperatorEmailLog[]> {
  return n8nClient.getArray<OperatorEmailLog>(N8N_ENDPOINTS.GET_OPERATOR_EMAIL_LOG, {
    operatorId,
    limit,
  })
}

async function getOperatorPromoCodes(operatorId: string): Promise<PromoCode[]> {
  return n8nClient.getArray<PromoCode>(N8N_ENDPOINTS.GET_OPERATOR_PROMO_CODES, { operatorId })
}

async function getOperatorPriceZones(operatorId: string): Promise<PriceZone[]> {
  return n8nClient.getArray<PriceZone>(N8N_ENDPOINTS.GET_OPERATOR_PRICE_ZONES, { operatorId })
}

async function getOperatorRules(operatorId: string): Promise<BusinessRule[]> {
  return n8nClient.getArray<BusinessRule>(N8N_ENDPOINTS.GET_OPERATOR_RULES, { operatorId })
}

async function getOperatorSettings(operatorId: string): Promise<Record<string, unknown> | null> {
  return n8nClient.get<Record<string, unknown>>(N8N_ENDPOINTS.GET_OPERATOR_SETTINGS, { operatorId })
}

async function getOperatorContacts(operatorId: string): Promise<PlatformContact[]> {
  return n8nClient.getArray<PlatformContact>(N8N_ENDPOINTS.GET_OPERATOR_CONTACTS, { operatorId })
}

async function getOperatorBankAccounts(operatorId: string): Promise<BankAccount[]> {
  return n8nClient.getArray<BankAccount>(N8N_ENDPOINTS.GET_OPERATOR_BANK_ACCOUNTS, { operatorId })
}

async function getOperatorSubscriptionLog(operatorId: string): Promise<SubscriptionLogEntry[]> {
  return n8nClient.getArray<SubscriptionLogEntry>(N8N_ENDPOINTS.GET_OPERATOR_SUBSCRIPTION_LOG, {
    operatorId,
  })
}

async function getOperatorFeedback(operatorId: string): Promise<CustomerFeedback[]> {
  return n8nClient.getArray<CustomerFeedback>(N8N_ENDPOINTS.GET_OPERATOR_FEEDBACK, { operatorId })
}

async function getOperatorBankTransactions(operatorId: string): Promise<BankTransaction[]> {
  return n8nClient.getArray<BankTransaction>(N8N_ENDPOINTS.GET_OPERATOR_BANK_TRANSACTIONS, {
    operatorId,
  })
}

async function getOperatorDriverAppUsers(operatorId: string): Promise<DriverAppUser[]> {
  return n8nClient.getArray<DriverAppUser>(N8N_ENDPOINTS.GET_OPERATOR_DRIVER_APP_USERS, {
    operatorId,
  })
}

async function getOperatorUserPermissions(operatorId: string): Promise<UserPermission[]> {
  return n8nClient.getArray<UserPermission>(N8N_ENDPOINTS.GET_OPERATOR_USER_PERMISSIONS, {
    operatorId,
  })
}

async function getOperatorRequestAnalytics(operatorId: string): Promise<RequestAnalytics[]> {
  return n8nClient.getArray<RequestAnalytics>(N8N_ENDPOINTS.GET_OPERATOR_REQUEST_ANALYTICS, {
    operatorId,
  })
}

async function getOperatorTrips(operatorId: string, limit = 50): Promise<TripSummary[]> {
  return n8nClient.getArray<TripSummary>(N8N_ENDPOINTS.GET_OPERATOR_TRIPS, { operatorId, limit })
}

// ============================================================================
// Disputes Data
// ============================================================================

async function getOperatorDisputes(stripeAccountId: string): Promise<DisputeRecord[]> {
  return n8nClient.getArray<DisputeRecord>(N8N_ENDPOINTS.GET_OPERATOR_DISPUTES, { stripeAccountId })
}

async function getOperatorDisputesSummary(stripeAccountId: string): Promise<DisputesSummary> {
  const result = await n8nClient.get<DisputesSummary>(N8N_ENDPOINTS.GET_OPERATOR_DISPUTES_SUMMARY, {
    stripeAccountId,
  })
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

// ============================================================================
// Quotes Data
// ============================================================================

async function getOperatorQuotes(operatorId: string, limit = 100): Promise<QuoteRecord[]> {
  return n8nClient.getArray<QuoteRecord>(N8N_ENDPOINTS.GET_OPERATOR_QUOTES, { operatorId, limit })
}

async function getOperatorQuotesSummary(operatorId: string): Promise<QuotesSummary> {
  const result = await n8nClient.get<QuotesSummary>(N8N_ENDPOINTS.GET_OPERATOR_QUOTES_SUMMARY, {
    operatorId,
  })
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

// ============================================================================
// Customer Data
// ============================================================================

async function getCustomerCharges(
  customerId: string,
  operatorId: string,
  limit = 100
): Promise<CustomerCharge[]> {
  return n8nClient.getArray<CustomerCharge>(N8N_ENDPOINTS.GET_CUSTOMER_CHARGES, {
    customerId,
    operatorId,
    limit,
  })
}

async function getCustomerSummary(
  customerId: string,
  operatorId: string
): Promise<CustomerSummary | null> {
  return n8nClient.get<CustomerSummary>(N8N_ENDPOINTS.GET_CUSTOMER_SUMMARY, {
    customerId,
    operatorId,
  })
}

// ============================================================================
// Risk Management
// ============================================================================

async function getOperatorRiskDetails(operatorId: string): Promise<OperatorRiskDetails | null> {
  return n8nClient.get<OperatorRiskDetails>(N8N_ENDPOINTS.GET_OPERATOR_RISK_DETAILS, { operatorId })
}

async function getOperatorCoreInfo(operatorId: string): Promise<OperatorCoreInfo | null> {
  return n8nClient.get<OperatorCoreInfo>(N8N_ENDPOINTS.GET_OPERATOR_CORE_INFO, { operatorId })
}

async function updateOperatorInstantPayoutLimit(
  operatorId: string,
  limitCents: number
): Promise<UpdateRiskFieldResult> {
  const response = await n8nClient.patch<UpdateRiskFieldResult>(
    N8N_ENDPOINTS.UPDATE_OPERATOR_RISK,
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
  const response = await n8nClient.patch<UpdateRiskFieldResult>(
    N8N_ENDPOINTS.UPDATE_OPERATOR_RISK,
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
  const response = await n8nClient.patch<UpdateRiskFieldResult>(
    N8N_ENDPOINTS.UPDATE_OPERATOR_RISK,
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
// Member Management (Write Operations)
// ============================================================================

async function addOperatorMember(input: AddMemberInput): Promise<AddMemberResult> {
  const response = await n8nClient.post<AddMemberResult>(N8N_ENDPOINTS.ADD_OPERATOR_MEMBER, {
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
  const response = await n8nClient.patch(N8N_ENDPOINTS.UPDATE_MEMBER_ROLE, {
    userId: input.userId,
    operatorId: input.operatorId,
    roleSlug: input.roleSlug,
  })

  return response.success
}

async function removeMember(userId: string, operatorId: string): Promise<boolean> {
  const response = await n8nClient.delete(N8N_ENDPOINTS.REMOVE_MEMBER, {
    userId,
    operatorId,
  })

  return response.success
}

// ============================================================================
// Subscription Management (Write Operations)
// ============================================================================

async function addSubscriptionLogEntry(
  input: AddSubscriptionLogInput
): Promise<AddSubscriptionLogResult> {
  const response = await n8nClient.post<AddSubscriptionLogResult>(
    N8N_ENDPOINTS.ADD_SUBSCRIPTION_LOG_ENTRY,
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
  const response = await n8nClient.delete(N8N_ENDPOINTS.REMOVE_SUBSCRIPTION_LOG_ENTRY, {
    operatorId,
    lagoPlanCode,
  })

  return response.success
}

async function updateOperatorPlan(
  input: UpdateOperatorPlanInput
): Promise<UpdateOperatorPlanResult> {
  const response = await n8nClient.patch<UpdateOperatorPlanResult>(
    N8N_ENDPOINTS.UPDATE_OPERATOR_PLAN,
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

  // Operator queries
  searchOperators,
  expandedSearch,
  getOperatorById,
  getOperatorPlatformCharges,
  getMonthlyChargesSummary,
  getReservationsOverview,
  getRiskOverview,

  // Operator portal data
  getOperatorMembers,
  getOperatorDrivers,
  getOperatorVehicles,
  getDriverPerformance,
  getVehicleUtilization,
  getOperatorEmailLog,

  // Additional platform data
  getOperatorPromoCodes,
  getOperatorPriceZones,
  getOperatorRules,
  getOperatorSettings,

  // More platform data
  getOperatorContacts,
  getOperatorBankAccounts,
  getOperatorSubscriptionLog,

  // Additional data (Retool parity)
  getOperatorFeedback,
  getOperatorBankTransactions,
  getOperatorDriverAppUsers,
  getOperatorUserPermissions,
  getOperatorRequestAnalytics,
  getOperatorTrips,

  // Dashboard/analytics queries
  getTopOperatorsByRevenue,
  getFailedInvoices,
  getInactiveAccounts,

  // Disputes data
  getOperatorDisputes,
  getOperatorDisputesSummary,

  // Quotes data
  getOperatorQuotes,
  getOperatorQuotesSummary,

  // Customer data (drill-down)
  getCustomerCharges,
  getCustomerSummary,

  // Write operations (CRUD)
  isWriteEnabled,
  addOperatorMember,
  updateMemberRole,
  removeMember,

  // Risk management write operations
  updateOperatorInstantPayoutLimit,
  updateOperatorDailyPaymentLimit,
  updateOperatorRiskScore,
  getOperatorRiskDetails,

  // Operator core info (for booking portal URL)
  getOperatorCoreInfo,

  // Subscription management write operations
  addSubscriptionLogEntry,
  removeSubscriptionLogEntry,
  updateOperatorPlan,
  handleSubscriptionChange,
  handleSubscriptionCancellation,
  extractPlanFromCode,
}

// Default export for consistency with other integrations
export { snowflakeClient as snowflake }
