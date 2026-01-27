/**
 * Snowflake Integration Client
 *
 * Supports two modes:
 * 1. Direct connection via snowflake-sdk (preferred when SNOWFLAKE_* env vars are set)
 * 2. Via Metabase custom SQL (fallback when only METABASE_* env vars are set)
 *
 * Direct connection env vars:
 *   - SNOWFLAKE_ACCOUNT
 *   - SNOWFLAKE_USERNAME
 *   - SNOWFLAKE_PASSWORD
 *   - SNOWFLAKE_DATABASE (default: MOZART_NEW)
 *   - SNOWFLAKE_WAREHOUSE (default: COMPUTE_WH)
 *
 * Metabase fallback env vars:
 *   - METABASE_URL
 *   - METABASE_API_KEY
 *   - SNOWFLAKE_DATABASE_ID (default: 2)
 */

import { metabase } from "./metabase"

// Snowflake database ID in Metabase (different from customer master view db=3)
const SNOWFLAKE_DATABASE_ID = parseInt(process.env.SNOWFLAKE_DATABASE_ID || "2")

// Check if direct Snowflake connection is configured
const isDirectConfigured = !!(
  process.env.SNOWFLAKE_ACCOUNT &&
  process.env.SNOWFLAKE_USERNAME &&
  process.env.SNOWFLAKE_PASSWORD
)

// Dynamic import for snowflake-sdk to avoid Turbopack bundling issues
let snowflakeConnection: import("snowflake-sdk").Connection | null = null

async function getDirectConnection(): Promise<import("snowflake-sdk").Connection> {
  if (snowflakeConnection) {
    return snowflakeConnection
  }

  // Dynamic import to avoid Turbopack issues
  const snowflake = await import("snowflake-sdk")

  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT!,
      username: process.env.SNOWFLAKE_USERNAME!,
      password: process.env.SNOWFLAKE_PASSWORD!,
      database: process.env.SNOWFLAKE_DATABASE || "MOZART_NEW",
      warehouse: process.env.SNOWFLAKE_WAREHOUSE || "COMPUTE_WH",
      clientSessionKeepAlive: true,
    })

    connection.connect((err, conn) => {
      if (err) {
        console.error("Failed to connect to Snowflake:", err.message)
        reject(err)
      } else {
        console.log("Successfully connected to Snowflake directly")
        snowflakeConnection = conn
        resolve(conn)
      }
    })
  })
}

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
  // Extended fields for Retool parity
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

// ============================================================================
// Configuration Check
// ============================================================================

function isConfigured(): boolean {
  // Check if direct Snowflake or Metabase fallback is configured
  return isDirectConfigured || !!(process.env.METABASE_URL && process.env.METABASE_API_KEY)
}

// ============================================================================
// Query Execution (Direct or via Metabase)
// ============================================================================

async function executeQuery<T = Record<string, unknown>>(
  sql: string
): Promise<SnowflakeQueryResult<T>> {
  const startTime = Date.now()

  // Try direct connection first if configured
  if (isDirectConfigured) {
    try {
      const connection = await getDirectConnection()

      return new Promise((resolve, reject) => {
        connection.execute({
          sqlText: sql,
          complete: (err, stmt, rows) => {
            if (err) {
              console.error("Snowflake direct query error:", err.message)
              reject(err)
            } else {
              const stmtColumns = stmt.getColumns()
              const columns = stmtColumns ? stmtColumns.map((col) => col.getName()) : []
              // Snowflake returns rows with column names in UPPERCASE
              // Normalize to lowercase to match expected interface
              const normalizedRows = (rows || []).map((row) => {
                const normalized: Record<string, unknown> = {}
                for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
                  normalized[key.toLowerCase()] = value
                }
                return normalized as T
              })
              resolve({
                rows: normalizedRows,
                columns: columns.map((c) => c.toLowerCase()),
                rowCount: normalizedRows.length,
                executionTime: Date.now() - startTime,
              })
            }
          },
        })
      })
    } catch (error) {
      console.error("Direct Snowflake connection failed, falling back to Metabase:", error)
      // Fall through to Metabase
    }
  }

  // Fallback to Metabase
  const result = await metabase.runCustomQuery(SNOWFLAKE_DATABASE_ID, sql)
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
 * Includes extended fields for Retool parity (risk scores, disputes, refunds, etc.)
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
      CUSTOMER_EMAIL as customer_email,
      CUSTOMER_ID as customer_id,
      TOTAL_DOLLARS_REFUNDED as total_dollars_refunded,
      BILLING_DETAIL_NAME as billing_detail_name,
      OUTCOME_NETWORK_STATUS as outcome_network_status,
      OUTCOME_REASON as outcome_reason,
      OUTCOME_SELLER_MESSAGE as outcome_seller_message,
      OUTCOME_RISK_LEVEL as outcome_risk_level,
      OUTCOME_RISK_SCORE as outcome_risk_score,
      CARD_ID as card_id,
      CALCULATED_STATEMENT_DESCRIPTOR as calculated_statement_descriptor,
      DISPUTE_ID as dispute_id,
      DISPUTE_STATUS as dispute_status,
      DISPUTED_AMOUNT as disputed_amount,
      DISPUTE_REASON as dispute_reason,
      DISPUTE_DATE as dispute_date
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
    FROM SWOOP.VEHICLE
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
// Additional Data Queries (for Retool parity)
// ============================================================================

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

/**
 * Get customer feedback for an operator
 */
async function getOperatorFeedback(operatorId: string): Promise<CustomerFeedback[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      cf.customer_feedback_id as feedback_id,
      cf.title,
      cf.description,
      cf.product_type,
      cf.path,
      cf.created_at,
      u.first_name as user_first_name,
      u.last_name as user_last_name,
      u.email as user_email
    FROM SWOOP.CUSTOMER_FEEDBACK cf
    LEFT JOIN SWOOP.USER u ON cf.user_id = u.user_id
    WHERE cf.operator_id = '${escapedId}'
    ORDER BY cf.created_at DESC
    LIMIT 50
  `

  const result = await executeQuery<CustomerFeedback>(sql)
  return result.rows
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

/**
 * Get bank transactions for an operator
 */
async function getOperatorBankTransactions(operatorId: string): Promise<BankTransaction[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      t.stripe_financial_connections_transaction_id as transaction_id,
      t.account_id,
      t.amount,
      t.currency,
      t.description,
      t.status,
      t.transacted_at,
      t.posted_at
    FROM SWOOP.STRIPE_FINANCIAL_CONNECTIONS_TRANSACTION t
    JOIN SWOOP.STRIPE_FINANCIAL_CONNECTIONS_ACCOUNT a
      ON t.account_id = a.stripe_financial_connections_account_id
    WHERE a.operator_id = '${escapedId}'
    ORDER BY t.transacted_at DESC
    LIMIT 100
  `

  const result = await executeQuery<BankTransaction>(sql)
  return result.rows
}

export interface DriverAppUser {
  driver_id: string
  app_user_id: string | null
  app_version: string | null
  device_type: string | null
  last_active_at: string | null
  push_enabled: boolean | null
}

/**
 * Get driver app usage data
 */
async function getOperatorDriverAppUsers(operatorId: string): Promise<DriverAppUser[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      d.driver_id,
      dau.id as app_user_id,
      dau.app_version,
      dau.device_type,
      dau.last_active_at,
      dau.push_notifications_enabled as push_enabled
    FROM POSTGRES_SWOOP.DRIVER d
    LEFT JOIN MOZART_NEW.DRIVERAPP_USERS dau ON d.driver_id = dau.id
    WHERE d.operator_id = '${escapedId}'
    AND dau.id IS NOT NULL
    ORDER BY dau.last_active_at DESC NULLS LAST
  `

  const result = await executeQuery<DriverAppUser>(sql)
  return result.rows
}

export interface UserPermission {
  user_id: string
  permission_id: string
  permission_name: string | null
}

/**
 * Get user permissions for an operator's members
 */
async function getOperatorUserPermissions(operatorId: string): Promise<UserPermission[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      uap.user_id,
      uap.access_permission_id as permission_id,
      ap.name as permission_name
    FROM SWOOP.USER_ACCESS_PERMISSION uap
    JOIN SWOOP.ACCESS_PERMISSION ap ON uap.access_permission_id = ap.access_permission_id
    JOIN SWOOP.USER u ON uap.user_id = u.user_id
    WHERE u.operator_id = '${escapedId}'
    AND u.removed_at IS NULL
  `

  const result = await executeQuery<UserPermission>(sql)
  return result.rows
}

export interface RequestAnalytics {
  month: string
  total_requests: number
  completed_requests: number
  cancelled_requests: number
  total_revenue: number
}

/**
 * Get request/trip analytics for an operator
 */
async function getOperatorRequestAnalytics(operatorId: string): Promise<RequestAnalytics[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      TO_VARCHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
      COUNT(*) as total_requests,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_requests,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_requests,
      COALESCE(SUM(total_amount), 0) as total_revenue
    FROM SWOOP.REQUEST
    WHERE operator_id = '${escapedId}'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month DESC
    LIMIT 12
  `

  const result = await executeQuery<RequestAnalytics>(sql)
  return result.rows
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

/**
 * Get recent trips for an operator
 */
async function getOperatorTrips(operatorId: string, limit = 50): Promise<TripSummary[]> {
  const escapedId = operatorId.replace(/'/g, "''")

  const sql = `
    SELECT
      t.trip_id,
      t.request_id,
      t.status,
      ps.address as pickup_location,
      ds.address as dropoff_location,
      r.pickup_date_time as scheduled_at,
      t.completed_at,
      CONCAT(d.first_name, ' ', d.last_name) as driver_name,
      CONCAT(u.first_name, ' ', u.last_name) as passenger_name,
      r.total_amount
    FROM SWOOP.TRIP t
    JOIN SWOOP.REQUEST r ON t.request_id = r.request_id
    LEFT JOIN SWOOP.STOP ps ON r.pickup_stop_id = ps.stop_id
    LEFT JOIN SWOOP.STOP ds ON r.dropoff_stop_id = ds.stop_id
    LEFT JOIN POSTGRES_SWOOP.DRIVER d ON t.driver_id = d.driver_id
    LEFT JOIN SWOOP.USER u ON r.user_id = u.user_id
    WHERE r.operator_id = '${escapedId}'
    ORDER BY r.pickup_date_time DESC
    LIMIT ${limit}
  `

  const result = await executeQuery<TripSummary>(sql)
  return result.rows
}

// ============================================================================
// Write Operations (CRUD) - Requires Direct Connection
// ============================================================================

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

/**
 * Check if write operations are available (requires direct Snowflake connection)
 */
function isWriteEnabled(): boolean {
  return isDirectConfigured
}

/**
 * Execute a write query with parameterized binds (direct connection only)
 */
async function executeWriteQuery(
  sql: string,
  binds: (string | number | boolean | null)[] = []
): Promise<{ rowCount: number; success: boolean }> {
  if (!isDirectConfigured) {
    throw new Error("Write operations require direct Snowflake connection")
  }

  const connection = await getDirectConnection()

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      binds,
      complete: (err, _stmt, rows) => {
        if (err) {
          console.error("Snowflake write query error:", err.message)
          console.error("SQL:", sql)
          reject(err)
        } else {
          resolve({
            rowCount: rows?.length || 0,
            success: true,
          })
        }
      },
    })
  })
}

/**
 * Add a new member/user to an operator
 */
async function addOperatorMember(input: AddMemberInput): Promise<AddMemberResult> {
  const userId = crypto.randomUUID()

  const sql = `
    INSERT INTO POSTGRES_SWOOP.USER (
      USER_ID,
      OPERATOR_ID,
      EMAIL,
      FIRST_NAME,
      LAST_NAME,
      ROLE_SLUG,
      CREATED_AT,
      UPDATED_AT
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
  `

  await executeWriteQuery(sql, [
    userId,
    input.operatorId,
    input.email,
    input.firstName || null,
    input.lastName || null,
    input.roleSlug || "member",
  ])

  return { userId, success: true }
}

export interface UpdateMemberRoleInput {
  userId: string
  operatorId: string
  roleSlug: string
}

/**
 * Update a member's role
 */
async function updateMemberRole(input: UpdateMemberRoleInput): Promise<boolean> {
  const sql = `
    UPDATE POSTGRES_SWOOP.USER
    SET ROLE_SLUG = ?,
        UPDATED_AT = CURRENT_TIMESTAMP()
    WHERE USER_ID = ?
      AND OPERATOR_ID = ?
      AND REMOVED_AT IS NULL
  `

  const result = await executeWriteQuery(sql, [input.roleSlug, input.userId, input.operatorId])

  return result.success
}

/**
 * Remove a member (soft delete)
 */
async function removeMember(userId: string, operatorId: string): Promise<boolean> {
  const sql = `
    UPDATE POSTGRES_SWOOP.USER
    SET REMOVED_AT = CURRENT_TIMESTAMP(),
        UPDATED_AT = CURRENT_TIMESTAMP()
    WHERE USER_ID = ?
      AND OPERATOR_ID = ?
      AND REMOVED_AT IS NULL
  `

  const result = await executeWriteQuery(sql, [userId, operatorId])
  return result.success
}

// ============================================================================
// Disputes Data (for Risk tab analytics)
// ============================================================================

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

/**
 * Get all disputed charges for an operator (by Stripe account ID)
 */
async function getOperatorDisputes(stripeAccountId: string): Promise<DisputeRecord[]> {
  const escapedId = stripeAccountId.replace(/'/g, "''")

  const sql = `
    SELECT
      DISPUTE_ID as dispute_id,
      CHARGE_ID as charge_id,
      STRIPE_ACCOUNT_ID as stripe_account_id,
      DISPUTE_STATUS as dispute_status,
      DISPUTE_REASON as dispute_reason,
      DISPUTED_AMOUNT as disputed_amount,
      DISPUTE_DATE as dispute_date,
      CREATED_DATE as created_date,
      OUTCOME_RISK_LEVEL as outcome_risk_level,
      OUTCOME_RISK_SCORE as outcome_risk_score,
      CUSTOMER_ID as customer_id,
      BILLING_DETAIL_NAME as billing_detail_name
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE STRIPE_ACCOUNT_ID = '${escapedId}'
      AND DISPUTE_ID IS NOT NULL
    ORDER BY DISPUTE_DATE DESC NULLS LAST, CREATED_DATE DESC
    LIMIT 200
  `

  const result = await executeQuery<DisputeRecord>(sql)
  return result.rows
}

/**
 * Get disputes summary with aggregated data for charts
 */
async function getOperatorDisputesSummary(stripeAccountId: string): Promise<DisputesSummary> {
  const escapedId = stripeAccountId.replace(/'/g, "''")

  // Get total counts
  const totalsSql = `
    SELECT
      COUNT(DISTINCT DISPUTE_ID) as total_disputes,
      COALESCE(SUM(DISPUTED_AMOUNT), 0) as total_disputed_amount
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE STRIPE_ACCOUNT_ID = '${escapedId}'
      AND DISPUTE_ID IS NOT NULL
  `

  // Get disputes by status
  const byStatusSql = `
    SELECT
      COALESCE(DISPUTE_STATUS, 'unknown') as status,
      COUNT(DISTINCT DISPUTE_ID) as count
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE STRIPE_ACCOUNT_ID = '${escapedId}'
      AND DISPUTE_ID IS NOT NULL
    GROUP BY DISPUTE_STATUS
    ORDER BY count DESC
  `

  // Get disputes by reason
  const byReasonSql = `
    SELECT
      COALESCE(DISPUTE_REASON, 'unknown') as reason,
      COUNT(DISTINCT DISPUTE_ID) as count
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE STRIPE_ACCOUNT_ID = '${escapedId}'
      AND DISPUTE_ID IS NOT NULL
    GROUP BY DISPUTE_REASON
    ORDER BY count DESC
  `

  // Get disputes by risk level
  const byRiskSql = `
    SELECT
      COALESCE(OUTCOME_RISK_LEVEL, 'unknown') as risk_level,
      COUNT(DISTINCT DISPUTE_ID) as count
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE STRIPE_ACCOUNT_ID = '${escapedId}'
      AND DISPUTE_ID IS NOT NULL
    GROUP BY OUTCOME_RISK_LEVEL
    ORDER BY count DESC
  `

  // Get disputes over time (last 12 months)
  const overTimeSql = `
    SELECT
      TO_VARCHAR(DATE_TRUNC('month', COALESCE(DISPUTE_DATE, CREATED_DATE)), 'YYYY-MM') as date,
      COUNT(DISTINCT DISPUTE_ID) as count
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE STRIPE_ACCOUNT_ID = '${escapedId}'
      AND DISPUTE_ID IS NOT NULL
      AND COALESCE(DISPUTE_DATE, CREATED_DATE) >= DATEADD(month, -12, CURRENT_DATE())
    GROUP BY DATE_TRUNC('month', COALESCE(DISPUTE_DATE, CREATED_DATE))
    ORDER BY date ASC
  `

  // Execute all queries in parallel
  const [totalsResult, byStatusResult, byReasonResult, byRiskResult, overTimeResult] =
    await Promise.all([
      executeQuery<{ total_disputes: number; total_disputed_amount: number }>(totalsSql),
      executeQuery<{ status: string; count: number }>(byStatusSql),
      executeQuery<{ reason: string; count: number }>(byReasonSql),
      executeQuery<{ risk_level: string; count: number }>(byRiskSql),
      executeQuery<{ date: string; count: number }>(overTimeSql),
    ])

  const totals = totalsResult.rows[0] || { total_disputes: 0, total_disputed_amount: 0 }

  return {
    total_disputes: totals.total_disputes,
    total_disputed_amount: totals.total_disputed_amount,
    disputes_by_status: byStatusResult.rows,
    disputes_by_reason: byReasonResult.rows,
    disputes_by_risk_level: byRiskResult.rows,
    disputes_over_time: overTimeResult.rows,
  }
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

  // Write operations (CRUD)
  isWriteEnabled,
  addOperatorMember,
  updateMemberRole,
  removeMember,
}

// Default export for consistency with other integrations
export { snowflakeClient as snowflake }
