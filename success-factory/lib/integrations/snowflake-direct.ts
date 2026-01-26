/**
 * Direct Snowflake Connection Client
 *
 * Uses snowflake-sdk for direct database queries.
 * Requires the following environment variables:
 *   - SNOWFLAKE_ACCOUNT
 *   - SNOWFLAKE_USERNAME
 *   - SNOWFLAKE_PASSWORD
 *   - SNOWFLAKE_DATABASE
 *   - SNOWFLAKE_WAREHOUSE
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
}

// ============================================================================
// Types
// ============================================================================

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[]
  columns: string[]
  rowCount: number
  executionTime: number
}

// ============================================================================
// Connection Management
// ============================================================================

let connectionPool: snowflake.Connection | null = null

function isConfigured(): boolean {
  return !!(config.account && config.username && config.password)
}

async function getConnection(): Promise<snowflake.Connection> {
  if (connectionPool) {
    return connectionPool
  }

  if (!isConfigured()) {
    throw new Error("Snowflake is not configured. Missing required environment variables.")
  }

  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection({
      account: config.account,
      username: config.username,
      password: config.password,
      database: config.database,
      warehouse: config.warehouse,
      // Connection pooling and timeouts
      clientSessionKeepAlive: true,
      clientSessionKeepAliveHeartbeatFrequency: 3600,
    })

    connection.connect((err, conn) => {
      if (err) {
        console.error("Failed to connect to Snowflake:", err.message)
        reject(err)
      } else {
        console.log("Successfully connected to Snowflake")
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
): Promise<QueryResult<T>> {
  const startTime = Date.now()
  const connection = await getConnection()

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      binds,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error("Snowflake query error:", err.message)
          console.error("SQL:", sql)
          reject(err)
        } else {
          const stmtColumns = stmt.getColumns()
          const columns = stmtColumns ? stmtColumns.map((col) => col.getName()) : []
          const result: QueryResult<T> = {
            rows: (rows || []) as T[],
            columns,
            rowCount: rows?.length || 0,
            executionTime: Date.now() - startTime,
          }
          resolve(result)
        }
      },
    })
  })
}

// ============================================================================
// Operator Portal Queries
// ============================================================================

export interface OperatorMember {
  USER_ID: string
  FIRST_NAME: string | null
  LAST_NAME: string | null
  EMAIL: string | null
  ROLE_SLUG: string | null
  CREATED_AT: string | null
  LAST_LOGIN_AT: string | null
}

export interface OperatorDriver {
  DRIVER_ID: string
  FIRST_NAME: string | null
  LAST_NAME: string | null
  EMAIL: string | null
  PHONE: string | null
  CREATED_AT: string | null
  STATUS: string | null
}

export interface OperatorVehicle {
  VEHICLE_ID: string
  VEHICLE_NAME: string | null
  VEHICLE_TYPE: string | null
  LICENSE_PLATE: string | null
  COLOR: string | null
  CAPACITY: number | null
  CREATED_AT: string | null
}

/**
 * Get members/users for an operator
 */
async function getOperatorMembers(operatorId: string): Promise<OperatorMember[]> {
  const sql = `
    SELECT
      USER_ID,
      FIRST_NAME,
      LAST_NAME,
      EMAIL,
      ROLE_SLUG,
      CREATED_AT,
      LAST_LOGIN_AT
    FROM POSTGRES_SWOOP.USER
    WHERE OPERATOR_ID = ?
      AND REMOVED_AT IS NULL
    ORDER BY LAST_NAME, FIRST_NAME
    LIMIT 100
  `
  const result = await executeQuery<OperatorMember>(sql, [operatorId])
  return result.rows
}

/**
 * Get drivers for an operator
 */
async function getOperatorDrivers(operatorId: string): Promise<OperatorDriver[]> {
  const sql = `
    SELECT
      DRIVER_ID,
      FIRST_NAME,
      LAST_NAME,
      EMAIL,
      PHONE,
      CREATED_AT,
      CASE
        WHEN REMOVED_AT IS NOT NULL THEN 'removed'
        WHEN DEACTIVATED_AT IS NOT NULL THEN 'inactive'
        ELSE 'active'
      END as STATUS
    FROM POSTGRES_SWOOP.DRIVER
    WHERE OPERATOR_ID = ?
    ORDER BY CREATED_AT DESC
    LIMIT 100
  `
  const result = await executeQuery<OperatorDriver>(sql, [operatorId])
  return result.rows
}

/**
 * Get vehicles for an operator
 */
async function getOperatorVehicles(operatorId: string): Promise<OperatorVehicle[]> {
  const sql = `
    SELECT
      VEHICLE_ID,
      NAME as VEHICLE_NAME,
      VEHICLE_TYPE,
      LICENSE_PLATE,
      EXTERIOR_COLOR as COLOR,
      CAPACITY,
      CREATED_AT
    FROM SWOOP.VEHICLE
    WHERE OPERATOR_ID = ?
      AND REMOVED_AT IS NULL
    ORDER BY CREATED_AT DESC
    LIMIT 100
  `
  const result = await executeQuery<OperatorVehicle>(sql, [operatorId])
  return result.rows
}

// ============================================================================
// Platform Data Queries
// ============================================================================

export interface PromoCode {
  PROMO_CODE_ID: string
  CODE: string
  DESCRIPTION: string | null
  DISCOUNT_TYPE: string | null
  DISCOUNT_VALUE: number | null
  VALID_FROM: string | null
  VALID_UNTIL: string | null
  USAGE_LIMIT: number | null
  TIMES_USED: number | null
  IS_ACTIVE: boolean
  CREATED_AT: string | null
}

export interface PriceZone {
  ZONE_ID: string
  NAME: string | null
  ZONE_TYPE: string | null
  BASE_FARE: number | null
  PER_MILE_RATE: number | null
  PER_MINUTE_RATE: number | null
  MINIMUM_FARE: number | null
  CREATED_AT: string | null
}

export interface BusinessRule {
  RULE_ID: string
  NAME: string | null
  RULE_TYPE: string | null
  CONDITIONS: string | null
  ACTIONS: string | null
  IS_ACTIVE: boolean
  PRIORITY: number | null
  CREATED_AT: string | null
}

export interface PlatformContact {
  CONTACT_ID: string
  FIRST_NAME: string | null
  LAST_NAME: string | null
  EMAIL: string | null
  PHONE: string | null
  COMPANY_NAME: string | null
  NOTES: string | null
  CREATED_AT: string | null
}

export interface BankAccount {
  ACCOUNT_ID: string
  INSTITUTION_NAME: string | null
  ACCOUNT_NAME: string | null
  ACCOUNT_TYPE: string | null
  LAST_FOUR: string | null
  STATUS: string | null
  CREATED_AT: string | null
}

export interface SubscriptionLogEntry {
  LOG_ID: string
  EVENT_TYPE: string | null
  PLAN_NAME: string | null
  PREVIOUS_PLAN: string | null
  AMOUNT: number | null
  EVENT_DATE: string | null
  NOTES: string | null
}

async function getOperatorPromoCodes(operatorId: string): Promise<PromoCode[]> {
  const sql = `
    SELECT
      PROMO_CODE_ID,
      CODE,
      PROMO_LABEL as DESCRIPTION,
      PROMO_TYPE as DISCOUNT_TYPE,
      PROMO_VALUE as DISCOUNT_VALUE,
      VALID_START as VALID_FROM,
      VALID_END as VALID_UNTIL,
      TOTAL_USAGE_LIMIT as USAGE_LIMIT,
      CURRENT_USAGE_COUNT as TIMES_USED,
      CASE WHEN REMOVED_AT IS NULL THEN TRUE ELSE FALSE END as IS_ACTIVE,
      CREATED_AT
    FROM SWOOP.PROMO_CODE
    WHERE OPERATOR_ID = ?
    ORDER BY CREATED_AT DESC
    LIMIT 100
  `
  const result = await executeQuery<PromoCode>(sql, [operatorId])
  return result.rows
}

async function getOperatorPriceZones(operatorId: string): Promise<PriceZone[]> {
  const sql = `
    SELECT
      PRICE_ZONE_ID as ZONE_ID,
      NAME,
      ZONE_TYPE,
      BASE_FARE,
      PER_MILE_RATE,
      PER_MINUTE_RATE,
      MINIMUM_FARE,
      CREATED_AT
    FROM SWOOP.PRICE_ZONE
    WHERE OPERATOR_ID = ?
      AND REMOVED_AT IS NULL
    ORDER BY NAME
    LIMIT 100
  `
  const result = await executeQuery<PriceZone>(sql, [operatorId])
  return result.rows
}

async function getOperatorRules(operatorId: string): Promise<BusinessRule[]> {
  const sql = `
    SELECT
      RULE_ID,
      NAME,
      RULE_TYPE,
      CONDITIONS,
      ACTIONS,
      CASE WHEN REMOVED_AT IS NULL THEN TRUE ELSE FALSE END as IS_ACTIVE,
      PRIORITY,
      CREATED_AT
    FROM SWOOP.RULE
    WHERE OPERATOR_ID = ?
    ORDER BY PRIORITY, NAME
    LIMIT 100
  `
  const result = await executeQuery<BusinessRule>(sql, [operatorId])
  return result.rows
}

async function getOperatorContacts(operatorId: string): Promise<PlatformContact[]> {
  const sql = `
    SELECT
      CONTACT_ID,
      FIRST_NAME,
      LAST_NAME,
      EMAIL,
      PHONE,
      COMPANY_NAME,
      NOTES,
      CREATED_AT
    FROM SWOOP.CONTACT
    WHERE OPERATOR_ID = ?
      AND REMOVED_AT IS NULL
    ORDER BY CREATED_AT DESC
    LIMIT 100
  `
  const result = await executeQuery<PlatformContact>(sql, [operatorId])
  return result.rows
}

async function getOperatorBankAccounts(operatorId: string): Promise<BankAccount[]> {
  const sql = `
    SELECT
      STRIPE_FINANCIAL_CONNECTIONS_ACCOUNT_ID as ACCOUNT_ID,
      INSTITUTION_NAME,
      DISPLAY_NAME as ACCOUNT_NAME,
      SUBCATEGORY as ACCOUNT_TYPE,
      LAST4 as LAST_FOUR,
      STATUS,
      CREATED_AT
    FROM SWOOP.STRIPE_FINANCIAL_CONNECTIONS_ACCOUNT
    WHERE OPERATOR_ID = ?
    ORDER BY CREATED_AT DESC
    LIMIT 20
  `
  const result = await executeQuery<BankAccount>(sql, [operatorId])
  return result.rows
}

async function getOperatorSubscriptionLog(operatorId: string): Promise<SubscriptionLogEntry[]> {
  const sql = `
    SELECT
      SUBSCRIPTION_LOG_ID as LOG_ID,
      EVENT_TYPE,
      PLAN_NAME,
      PREVIOUS_PLAN_NAME as PREVIOUS_PLAN,
      AMOUNT,
      CREATED_AT as EVENT_DATE,
      NOTES
    FROM POSTGRES_SWOOP.SUBSCRIPTION_LOG
    WHERE OPERATOR_ID = ?
    ORDER BY CREATED_AT DESC
    LIMIT 50
  `
  const result = await executeQuery<SubscriptionLogEntry>(sql, [operatorId])
  return result.rows
}

async function getOperatorSettings(operatorId: string): Promise<Record<string, unknown> | null> {
  const sql = `
    SELECT *
    FROM POSTGRES_SWOOP.OPERATOR_SETTINGS
    WHERE OPERATOR_ID = ?
    LIMIT 1
  `
  const result = await executeQuery<Record<string, unknown>>(sql, [operatorId])
  return result.rows[0] || null
}

// ============================================================================
// Write Operations (CRUD)
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
 * Add a new member/user to an operator
 * Generates a UUID for the user and inserts into POSTGRES_SWOOP.USER
 */
async function addOperatorMember(input: AddMemberInput): Promise<AddMemberResult> {
  // Generate a UUID for the new user
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

  await executeQuery(sql, [
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

  const result = await executeQuery(sql, [input.roleSlug, input.userId, input.operatorId])

  return result.rowCount > 0
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

  const result = await executeQuery(sql, [userId, operatorId])
  return result.rowCount > 0
}

// ============================================================================
// Export Client Object
// ============================================================================

export const snowflakeDirect = {
  // Core
  isConfigured,
  executeQuery,

  // Operator portal data
  getOperatorMembers,
  getOperatorDrivers,
  getOperatorVehicles,

  // Platform data
  getOperatorPromoCodes,
  getOperatorPriceZones,
  getOperatorRules,
  getOperatorContacts,
  getOperatorBankAccounts,
  getOperatorSubscriptionLog,
  getOperatorSettings,

  // Write operations
  addOperatorMember,
  updateMemberRole,
  removeMember,
}

export default snowflakeDirect
