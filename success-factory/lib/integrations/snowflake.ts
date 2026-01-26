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

  // Dashboard/analytics queries
  getTopOperatorsByRevenue,
  getFailedInvoices,
  getInactiveAccounts,
}

// Default export for consistency with other integrations
export { snowflakeClient as snowflake }
