/**
 * Snowflake Integration Client (via Metabase)
 *
 * Uses Metabase's custom SQL query capability to run Snowflake queries.
 * This avoids the Turbopack compatibility issues with the native snowflake-sdk.
 *
 * Requires METABASE_URL and METABASE_API_KEY environment variables.
 */

import { metabase } from "./metabase"

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

// ============================================================================
// Configuration Check
// ============================================================================

function isConfigured(): boolean {
  // Uses Metabase to query Snowflake, so check Metabase config
  return !!(process.env.METABASE_URL && process.env.METABASE_API_KEY)
}

// ============================================================================
// Query Execution (via Metabase)
// ============================================================================

async function executeQuery<T = Record<string, unknown>>(
  sql: string
): Promise<SnowflakeQueryResult<T>> {
  const startTime = Date.now()

  const result = await metabase.runCustomQuery(metabase.METABASE_DATABASE_ID, sql)
  const rows = metabase.rowsToObjects<T>(result)
  const columns = metabase.getColumnNames(result)

  return {
    rows,
    columns,
    rowCount: rows.length,
    executionTime: Date.now() - startTime,
  }
}

// ============================================================================
// Operator Queries (from Retool export)
// ============================================================================

/**
 * Search operators by various fields (replaces Retool's search functionality)
 */
async function searchOperators(searchTerm: string, limit = 50): Promise<OperatorDetails[]> {
  const searchPattern = `%${searchTerm.replace(/'/g, "''")}%`
  const escapedTerm = searchTerm.replace(/'/g, "''")

  const sql = `
    SELECT
      LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
      P_COMPANY_NAME as company_name,
      HS_C_PROPERTY_NAME as hubspot_company_name,
      LAGO_EXTERNAL_CUSTOMER_ID as lago_external_id,
      STRIPE_CONNECT_ACCOUNT_ID as stripe_account_id,
      LAGO_PLAN_NAME as plan,
      CALCULATED_MRR as mrr,
      R_TOTAL_RESERVATIONS_COUNT as total_reservations,
      R_LAST_30_DAYS_RESERVATIONS_COUNT as last_30_days_reservations,
      DA_DAYS_SINCE_LAST_ASSIGNMENT as days_since_last_assignment,
      DA_ENGAGEMENT_STATUS as engagement_status,
      P_VEHICLES_TOTAL as vehicles_total,
      P_TOTAL_MEMBERS as members_count,
      P_DRIVERS_COUNT as drivers_count,
      P_SETUP_SCORE as setup_score
    FROM MOOVS.CSM_MOOVS
    WHERE
      LOWER(P_COMPANY_NAME) LIKE LOWER('${searchPattern}')
      OR LOWER(HS_C_PROPERTY_NAME) LIKE LOWER('${searchPattern}')
      OR LAGO_EXTERNAL_CUSTOMER_ID = '${escapedTerm}'
      OR STRIPE_CONNECT_ACCOUNT_ID = '${escapedTerm}'
    ORDER BY CALCULATED_MRR DESC NULLS LAST
    LIMIT ${limit}
  `

  const result = await executeQuery<OperatorDetails>(sql)
  return result.rows
}

/**
 * Get detailed operator info by operator ID
 */
async function getOperatorById(operatorId: string): Promise<OperatorDetails | null> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
      P_COMPANY_NAME as company_name,
      HS_C_PROPERTY_NAME as hubspot_company_name,
      LAGO_EXTERNAL_CUSTOMER_ID as lago_external_id,
      STRIPE_CONNECT_ACCOUNT_ID as stripe_account_id,
      LAGO_PLAN_NAME as plan,
      CALCULATED_MRR as mrr,
      R_TOTAL_RESERVATIONS_COUNT as total_reservations,
      R_LAST_30_DAYS_RESERVATIONS_COUNT as last_30_days_reservations,
      DA_DAYS_SINCE_LAST_ASSIGNMENT as days_since_last_assignment,
      DA_ENGAGEMENT_STATUS as engagement_status,
      P_VEHICLES_TOTAL as vehicles_total,
      P_TOTAL_MEMBERS as members_count,
      P_DRIVERS_COUNT as drivers_count,
      P_SETUP_SCORE as setup_score
    FROM MOOVS.CSM_MOOVS
    WHERE LAGO_EXTERNAL_CUSTOMER_ID = '${escapedId}'
    LIMIT 1
  `

  const result = await executeQuery<OperatorDetails>(sql)
  return result.rows[0] || null
}

/**
 * Get platform charges for an operator (replaces Retool's charges view)
 */
async function getOperatorPlatformCharges(
  operatorId: string,
  limit = 100
): Promise<PlatformCharge[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      CHARGE_ID as charge_id,
      OPERATOR_ID as operator_id,
      OPERATOR_NAME as operator_name,
      CREATED_DATE as created_date,
      STATUS as status,
      TOTAL_DOLLARS_CHARGED as total_dollars_charged,
      COALESCE(FEE_AMOUNT, 0) as fee_amount,
      COALESCE(NET_AMOUNT, 0) as net_amount,
      DESCRIPTION as description,
      CUSTOMER_EMAIL as customer_email
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE OPERATOR_ID = '${escapedId}'
    ORDER BY CREATED_DATE DESC
    LIMIT ${limit}
  `

  const result = await executeQuery<PlatformCharge>(sql)
  return result.rows
}

/**
 * Get monthly platform charges summary
 */
async function getMonthlyChargesSummary(operatorId: string): Promise<MonthlySummary[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      TO_VARCHAR(DATE_TRUNC('month', CREATED_DATE), 'YYYY-MM') as charge_month,
      STATUS as status,
      SUM(TOTAL_DOLLARS_CHARGED) as total_charges,
      COUNT(*) as charge_count
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE OPERATOR_ID = '${escapedId}'
    GROUP BY DATE_TRUNC('month', CREATED_DATE), STATUS
    ORDER BY charge_month DESC, STATUS
    LIMIT 24
  `

  const result = await executeQuery<MonthlySummary>(sql)
  return result.rows
}

/**
 * Get reservations overview for an operator
 */
async function getReservationsOverview(operatorId: string): Promise<ReservationOverview[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      OPERATOR_ID as operator_id,
      OPERATOR_NAME as operator_name,
      TO_VARCHAR(DATE_TRUNC('month', CREATED_AT), 'YYYY-MM') AS created_month,
      COUNT(*) AS total_trips,
      SUM(TOTAL_AMOUNT) AS total_amount
    FROM MOZART_NEW.RESERVATIONS
    WHERE OPERATOR_ID = '${escapedId}'
    GROUP BY OPERATOR_ID, OPERATOR_NAME, DATE_TRUNC('month', CREATED_AT)
    ORDER BY created_month DESC
    LIMIT 24
  `

  const result = await executeQuery<ReservationOverview>(sql)
  return result.rows
}

/**
 * Get risk overview for an operator
 */
async function getRiskOverview(operatorId: string): Promise<RiskOverview | null> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      OPERATOR_ID as operator_id,
      AVG(RISK_SCORE) as risk_score,
      COUNT(CASE WHEN STATUS = 'failed' THEN 1 END) as failed_payments_count,
      COUNT(CASE WHEN IS_DISPUTED = TRUE THEN 1 END) as dispute_count,
      AVG(TOTAL_DOLLARS_CHARGED) as avg_transaction_amount,
      MAX(CASE WHEN STATUS = 'failed' THEN CREATED_DATE END) as last_failed_payment_date
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE OPERATOR_ID = '${escapedId}'
    GROUP BY OPERATOR_ID
  `

  const result = await executeQuery<RiskOverview>(sql)
  return result.rows[0] || null
}

/**
 * Get top operators by revenue (for leaderboard/dashboard)
 */
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
  const periodFilter =
    period === "week"
      ? "DATE_TRUNC('week', CREATED_DATE) = DATE_TRUNC('week', CURRENT_DATE)"
      : period === "month"
        ? "DATE_TRUNC('month', CREATED_DATE) = DATE_TRUNC('month', CURRENT_DATE)"
        : "DATE_TRUNC('year', CREATED_DATE) = DATE_TRUNC('year', CURRENT_DATE)"

  const sql = `
    SELECT
      OPERATOR_ID as operator_id,
      OPERATOR_NAME as operator_name,
      SUM(TOTAL_DOLLARS_CHARGED) AS total_charged,
      COUNT(*) AS total_trips
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE ${periodFilter}
    GROUP BY OPERATOR_ID, OPERATOR_NAME
    ORDER BY total_charged DESC
    LIMIT ${limit}
  `

  const result = await executeQuery<{
    operator_id: string
    operator_name: string
    total_charged: number
    total_trips: number
  }>(sql)

  return result.rows
}

/**
 * Get failed invoices across all operators (for alerts)
 */
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
  const sql = `
    SELECT
      OPERATOR_ID as operator_id,
      OPERATOR_NAME as operator_name,
      CHARGE_ID as charge_id,
      TOTAL_DOLLARS_CHARGED as amount,
      CREATED_DATE as failed_at,
      FAILURE_MESSAGE as failure_reason
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE STATUS = 'failed'
    ORDER BY CREATED_DATE DESC
    LIMIT ${limit}
  `

  const result = await executeQuery<{
    operator_id: string
    operator_name: string
    charge_id: string
    amount: number
    failed_at: string
    failure_reason: string | null
  }>(sql)

  return result.rows
}

/**
 * Get inactive accounts (operators with no recent activity)
 */
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
  const sql = `
    SELECT
      LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
      P_COMPANY_NAME as company_name,
      R_LAST_TRIP_CREATED_AT as last_activity_date,
      DATEDIFF('day', R_LAST_TRIP_CREATED_AT, CURRENT_DATE) as days_inactive,
      CALCULATED_MRR as mrr
    FROM MOOVS.CSM_MOOVS
    WHERE
      DATEDIFF('day', R_LAST_TRIP_CREATED_AT, CURRENT_DATE) > ${daysSinceLastActivity}
      AND LAGO_STATUS = 'active'
    ORDER BY CALCULATED_MRR DESC NULLS LAST
    LIMIT ${limit}
  `

  const result = await executeQuery<{
    operator_id: string
    company_name: string
    last_activity_date: string | null
    days_inactive: number
    mrr: number | null
  }>(sql)

  return result.rows
}

// ============================================================================
// Operator Portal Data (from POSTGRES_SWOOP schema)
// ============================================================================

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

/**
 * Get members/users for an operator (from their platform)
 */
async function getOperatorMembers(operatorId: string): Promise<OperatorMember[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      user_id,
      first_name,
      last_name,
      email,
      role_slug,
      created_at,
      last_login_at
    FROM POSTGRES_SWOOP.USER
    WHERE operator_id = '${escapedId}'
      AND removed_at IS NULL
    ORDER BY last_name, first_name
    LIMIT 100
  `

  const result = await executeQuery<OperatorMember>(sql)
  return result.rows
}

/**
 * Get drivers for an operator
 */
async function getOperatorDrivers(operatorId: string): Promise<OperatorDriver[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      d.driver_id,
      d.first_name,
      d.last_name,
      d.email,
      d.phone,
      d.created_at,
      CASE
        WHEN d.removed_at IS NOT NULL THEN 'removed'
        WHEN d.deactivated_at IS NOT NULL THEN 'inactive'
        ELSE 'active'
      END as status
    FROM POSTGRES_SWOOP.DRIVER d
    WHERE d.operator_id = '${escapedId}'
    ORDER BY d.created_at DESC
    LIMIT 100
  `

  const result = await executeQuery<OperatorDriver>(sql)
  return result.rows
}

/**
 * Get vehicles for an operator
 */
async function getOperatorVehicles(operatorId: string): Promise<OperatorVehicle[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      vehicle_id,
      name as vehicle_name,
      vehicle_type,
      license_plate,
      exterior_color as color,
      capacity,
      created_at
    FROM POSTGRES_SWOOP.VEHICLE
    WHERE operator_id = '${escapedId}'
      AND removed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 100
  `

  const result = await executeQuery<OperatorVehicle>(sql)
  return result.rows
}

/**
 * Get email log for an operator
 */
async function getOperatorEmailLog(operatorId: string, limit = 50): Promise<OperatorEmailLog[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      email_log_id,
      to_email,
      subject,
      template_name,
      created_at as sent_at,
      status
    FROM POSTGRES_SWOOP.EMAIL_LOG
    WHERE operator_id = '${escapedId}'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  const result = await executeQuery<OperatorEmailLog>(sql)
  return result.rows
}

// ============================================================================
// Additional Platform Data (Promo Codes, Zones, Rules)
// ============================================================================

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

/**
 * Get promo codes for an operator
 */
async function getOperatorPromoCodes(operatorId: string): Promise<PromoCode[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      promo_code_id,
      code,
      promo_label as description,
      promo_type as discount_type,
      promo_value as discount_value,
      valid_start as valid_from,
      valid_end as valid_until,
      total_usage_limit as usage_limit,
      current_usage_count as times_used,
      CASE WHEN removed_at IS NULL THEN TRUE ELSE FALSE END as is_active,
      created_at
    FROM SWOOP.PROMO_CODE
    WHERE operator_id = '${escapedId}'
    ORDER BY created_at DESC
    LIMIT 100
  `

  const result = await executeQuery<PromoCode>(sql)
  return result.rows
}

/**
 * Get price zones for an operator
 */
async function getOperatorPriceZones(operatorId: string): Promise<PriceZone[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      price_zone_id as zone_id,
      name,
      zone_type,
      base_fare,
      per_mile_rate,
      per_minute_rate,
      minimum_fare,
      created_at
    FROM SWOOP.PRICE_ZONE
    WHERE operator_id = '${escapedId}'
      AND removed_at IS NULL
    ORDER BY name
    LIMIT 100
  `

  const result = await executeQuery<PriceZone>(sql)
  return result.rows
}

/**
 * Get business rules for an operator
 */
async function getOperatorRules(operatorId: string): Promise<BusinessRule[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      rule_id,
      name,
      rule_type,
      conditions,
      actions,
      CASE WHEN removed_at IS NULL THEN TRUE ELSE FALSE END as is_active,
      priority,
      created_at
    FROM SWOOP.RULE
    WHERE operator_id = '${escapedId}'
    ORDER BY priority, name
    LIMIT 100
  `

  const result = await executeQuery<BusinessRule>(sql)
  return result.rows
}

/**
 * Get operator settings
 */
async function getOperatorSettings(operatorId: string): Promise<Record<string, unknown> | null> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT *
    FROM POSTGRES_SWOOP.OPERATOR_SETTINGS
    WHERE operator_id = '${escapedId}'
    LIMIT 1
  `

  const result = await executeQuery<Record<string, unknown>>(sql)
  return result.rows[0] || null
}

// ============================================================================
// Additional Data: Contacts, Bank Accounts, Subscription History
// ============================================================================

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

/**
 * Get platform contacts for an operator (distinct from HubSpot contacts)
 */
async function getOperatorContacts(operatorId: string): Promise<PlatformContact[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      contact_id,
      first_name,
      last_name,
      email,
      phone,
      company_name,
      notes,
      created_at
    FROM SWOOP.CONTACT
    WHERE operator_id = '${escapedId}'
      AND removed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 100
  `

  const result = await executeQuery<PlatformContact>(sql)
  return result.rows
}

/**
 * Get bank accounts (Stripe Financial Connections) for an operator
 */
async function getOperatorBankAccounts(operatorId: string): Promise<BankAccount[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      stripe_financial_connections_account_id as account_id,
      institution_name,
      display_name as account_name,
      subcategory as account_type,
      last4 as last_four,
      status,
      created_at
    FROM SWOOP.STRIPE_FINANCIAL_CONNECTIONS_ACCOUNT
    WHERE operator_id = '${escapedId}'
    ORDER BY created_at DESC
    LIMIT 20
  `

  const result = await executeQuery<BankAccount>(sql)
  return result.rows
}

/**
 * Get subscription history/log for an operator
 */
async function getOperatorSubscriptionLog(operatorId: string): Promise<SubscriptionLogEntry[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      subscription_log_id as log_id,
      event_type,
      plan_name,
      previous_plan_name as previous_plan,
      amount,
      created_at as event_date,
      notes
    FROM POSTGRES_SWOOP.SUBSCRIPTION_LOG
    WHERE operator_id = '${escapedId}'
    ORDER BY created_at DESC
    LIMIT 50
  `

  const result = await executeQuery<SubscriptionLogEntry>(sql)
  return result.rows
}

// ============================================================================
// Export Client Object
// ============================================================================

export const snowflakeClient = {
  // Core
  isConfigured,
  executeQuery,

  // Operator queries
  searchOperators,
  getOperatorById,
  getOperatorPlatformCharges,
  getMonthlyChargesSummary,
  getReservationsOverview,
  getRiskOverview,

  // Operator portal data
  getOperatorMembers,
  getOperatorDrivers,
  getOperatorVehicles,
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

  // Dashboard/analytics queries
  getTopOperatorsByRevenue,
  getFailedInvoices,
  getInactiveAccounts,
}

// Default export for consistency with other integrations
export { snowflakeClient as snowflake }
