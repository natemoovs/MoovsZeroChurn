/**
 * Snowflake Direct Integration Client
 *
 * Requires environment variables:
 * - SNOWFLAKE_ACCOUNT (e.g., "xy12345.us-east-1")
 * - SNOWFLAKE_USERNAME
 * - SNOWFLAKE_PASSWORD
 * - SNOWFLAKE_DATABASE (default: "MOZART_NEW")
 * - SNOWFLAKE_WAREHOUSE (default: "COMPUTE_WH")
 * - SNOWFLAKE_SCHEMA (default: "PUBLIC")
 */

import snowflake from "snowflake-sdk"

// ============================================================================
// Configuration
// ============================================================================

const config = {
  account: process.env.SNOWFLAKE_ACCOUNT || "",
  username: process.env.SNOWFLAKE_USERNAME || "",
  password: process.env.SNOWFLAKE_PASSWORD || "",
  database: process.env.SNOWFLAKE_DATABASE || "MOZART_NEW",
  warehouse: process.env.SNOWFLAKE_WAREHOUSE || "COMPUTE_WH",
  schema: process.env.SNOWFLAKE_SCHEMA || "PUBLIC",
}

// Connection pool
let connectionPool: snowflake.Connection | null = null

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

// ============================================================================
// Connection Management
// ============================================================================

function isConfigured(): boolean {
  return !!(config.account && config.username && config.password)
}

async function getConnection(): Promise<snowflake.Connection> {
  if (!isConfigured()) {
    throw new Error(
      "Snowflake not configured. Set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, and SNOWFLAKE_PASSWORD"
    )
  }

  if (connectionPool) {
    return connectionPool
  }

  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection({
      account: config.account,
      username: config.username,
      password: config.password,
      database: config.database,
      warehouse: config.warehouse,
      schema: config.schema,
    })

    connection.connect((err, conn) => {
      if (err) {
        reject(new Error(`Snowflake connection failed: ${err.message}`))
      } else {
        connectionPool = conn
        resolve(conn)
      }
    })
  })
}

// ============================================================================
// Query Execution
// ============================================================================

async function executeQuery<T = Record<string, unknown>>(
  sql: string,
  binds: (string | number | boolean | null)[] = []
): Promise<SnowflakeQueryResult<T>> {
  const startTime = Date.now()
  const connection = await getConnection()

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      binds,
      complete: (err, stmt, rows) => {
        if (err) {
          reject(new Error(`Snowflake query failed: ${err.message}`))
          return
        }

        const columns = stmt.getColumns().map((col) => col.getName())
        const executionTime = Date.now() - startTime

        resolve({
          rows: (rows || []) as T[],
          columns,
          rowCount: rows?.length || 0,
          executionTime,
        })
      },
    })
  })
}

// ============================================================================
// Operator Queries (from Retool export)
// ============================================================================

/**
 * Search operators by various fields (replaces Retool's search functionality)
 */
async function searchOperators(searchTerm: string, limit = 50): Promise<OperatorDetails[]> {
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
      LOWER(P_COMPANY_NAME) LIKE LOWER(?)
      OR LOWER(HS_C_PROPERTY_NAME) LIKE LOWER(?)
      OR LAGO_EXTERNAL_CUSTOMER_ID = ?
      OR STRIPE_CONNECT_ACCOUNT_ID = ?
    ORDER BY CALCULATED_MRR DESC NULLS LAST
    LIMIT ?
  `

  const searchPattern = `%${searchTerm}%`
  const result = await executeQuery<OperatorDetails>(sql, [
    searchPattern,
    searchPattern,
    searchTerm,
    searchTerm,
    limit,
  ])

  return result.rows
}

/**
 * Get detailed operator info by operator ID
 */
async function getOperatorById(operatorId: string): Promise<OperatorDetails | null> {
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
    WHERE LAGO_EXTERNAL_CUSTOMER_ID = ?
    LIMIT 1
  `

  const result = await executeQuery<OperatorDetails>(sql, [operatorId])
  return result.rows[0] || null
}

/**
 * Get platform charges for an operator (replaces Retool's charges view)
 */
async function getOperatorPlatformCharges(
  operatorId: string,
  limit = 100
): Promise<PlatformCharge[]> {
  const sql = `
    SELECT
      CHARGE_ID as charge_id,
      OPERATOR_ID as operator_id,
      OPERATOR_NAME as operator_name,
      CREATED_DATE as created_date,
      STATUS as status,
      TOTAL_DOLLARS_CHARGED as total_dollars_charged,
      FEE_AMOUNT as fee_amount,
      NET_AMOUNT as net_amount,
      DESCRIPTION as description,
      CUSTOMER_EMAIL as customer_email
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE OPERATOR_ID = ?
    ORDER BY CREATED_DATE DESC
    LIMIT ?
  `

  const result = await executeQuery<PlatformCharge>(sql, [operatorId, limit])
  return result.rows
}

/**
 * Get monthly platform charges summary
 */
async function getMonthlyChargesSummary(operatorId: string): Promise<
  {
    charge_month: string
    status: string
    total_charges: number
    charge_count: number
  }[]
> {
  const sql = `
    SELECT
      DATE_TRUNC('month', CREATED_DATE) as charge_month,
      STATUS as status,
      SUM(TOTAL_DOLLARS_CHARGED) as total_charges,
      COUNT(*) as charge_count
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE OPERATOR_ID = ?
    GROUP BY DATE_TRUNC('month', CREATED_DATE), STATUS
    ORDER BY charge_month DESC, STATUS
  `

  const result = await executeQuery<{
    charge_month: string
    status: string
    total_charges: number
    charge_count: number
  }>(sql, [operatorId])

  return result.rows
}

/**
 * Get reservations overview for an operator
 */
async function getReservationsOverview(
  operatorId: string
): Promise<ReservationOverview[]> {
  const sql = `
    SELECT
      r.operator_id,
      o.name AS operator_name,
      DATE_TRUNC('month', r.created_at) AS created_month,
      COUNT(*) AS total_trips,
      SUM(r.total_amount) AS total_amount
    FROM MOZART_NEW.RESERVATIONS r
    LEFT JOIN MOZART_NEW.OPERATORS o ON r.operator_id = o.id
    WHERE r.operator_id = ?
    GROUP BY r.operator_id, o.name, DATE_TRUNC('month', r.created_at)
    ORDER BY created_month DESC
    LIMIT 24
  `

  const result = await executeQuery<ReservationOverview>(sql, [operatorId])
  return result.rows
}

/**
 * Get risk overview for an operator
 */
async function getRiskOverview(operatorId: string): Promise<RiskOverview | null> {
  const sql = `
    SELECT
      OPERATOR_ID as operator_id,
      AVG(RISK_SCORE) as risk_score,
      COUNT(CASE WHEN STATUS = 'failed' THEN 1 END) as failed_payments_count,
      COUNT(CASE WHEN IS_DISPUTED = TRUE THEN 1 END) as dispute_count,
      AVG(TOTAL_DOLLARS_CHARGED) as avg_transaction_amount,
      MAX(CASE WHEN STATUS = 'failed' THEN CREATED_DATE END) as last_failed_payment_date
    FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
    WHERE OPERATOR_ID = ?
    GROUP BY OPERATOR_ID
  `

  const result = await executeQuery<RiskOverview>(sql, [operatorId])
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
    LIMIT ?
  `

  const result = await executeQuery<{
    operator_id: string
    operator_name: string
    total_charged: number
    total_trips: number
  }>(sql, [limit])

  return result.rows
}

/**
 * Get failed invoices across all operators (for alerts)
 */
async function getFailedInvoices(
  limit = 50
): Promise<
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
    LIMIT ?
  `

  const result = await executeQuery<{
    operator_id: string
    operator_name: string
    charge_id: string
    amount: number
    failed_at: string
    failure_reason: string | null
  }>(sql, [limit])

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
      DATEDIFF('day', R_LAST_TRIP_CREATED_AT, CURRENT_DATE) > ?
      AND LAGO_STATUS = 'active'
    ORDER BY CALCULATED_MRR DESC NULLS LAST
    LIMIT ?
  `

  const result = await executeQuery<{
    operator_id: string
    company_name: string
    last_activity_date: string | null
    days_inactive: number
    mrr: number | null
  }>(sql, [daysSinceLastActivity, limit])

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
