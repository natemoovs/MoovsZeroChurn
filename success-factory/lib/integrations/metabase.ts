/**
 * Metabase Analytics Integration Client
 *
 * Requires METABASE_URL and METABASE_API_KEY environment variables
 * API Docs: https://www.metabase.com/docs/latest/api-documentation
 */

const METABASE_URL = process.env.METABASE_URL?.replace(/\/$/, "")
const METABASE_API_KEY = process.env.METABASE_API_KEY

// Moovs master customer view - swoop.metabaseapp.com db=3, table=5682
export const METABASE_DATABASE_ID = parseInt(process.env.METABASE_DATABASE_ID || "3")
export const METABASE_CUSTOMER_TABLE_ID = parseInt(process.env.METABASE_TABLE_ID || "5682")

// ============================================================================
// Types
// ============================================================================

export interface MetabaseQuestion {
  id: number
  name: string
  description: string | null
  display: MetabaseVisualizationType
  collection_id: number | null
  database_id: number
  table_id: number | null
  query_type: "query" | "native"
  dataset_query: MetabaseDatasetQuery
  visualization_settings: Record<string, unknown>
  created_at: string
  updated_at: string
  creator_id: number
  archived: boolean
}

export type MetabaseVisualizationType =
  | "table"
  | "bar"
  | "line"
  | "area"
  | "row"
  | "pie"
  | "scalar"
  | "progress"
  | "gauge"
  | "funnel"
  | "map"
  | "scatter"
  | "waterfall"
  | "combo"
  | "pivot"
  | "smartscalar"
  | "trend"

export interface MetabaseDatasetQuery {
  type: "query" | "native"
  database: number
  query?: MetabaseStructuredQuery
  native?: MetabaseNativeQuery
}

export interface MetabaseStructuredQuery {
  "source-table"?: number
  "source-query"?: MetabaseStructuredQuery
  aggregation?: unknown[]
  breakout?: unknown[]
  filter?: unknown[]
  "order-by"?: unknown[]
  limit?: number
  fields?: unknown[]
  joins?: unknown[]
}

export interface MetabaseNativeQuery {
  query: string
  "template-tags"?: Record<string, MetabaseTemplateTag>
}

export interface MetabaseTemplateTag {
  id: string
  name: string
  "display-name": string
  type: "text" | "number" | "date" | "dimension" | "card"
  required?: boolean
  default?: unknown
}

export interface MetabaseQueryResult {
  data: MetabaseResultData
  database_id: number
  started_at: string
  json_query: MetabaseDatasetQuery
  average_execution_time: number | null
  status: "completed" | "failed"
  context: string
  row_count: number
  running_time: number
  error?: string
  error_type?: string
}

export interface MetabaseResultData {
  rows: unknown[][]
  cols: MetabaseColumn[]
  native_form: {
    query: string
    params?: unknown[]
  }
  results_metadata: {
    columns: MetabaseColumnMetadata[]
  }
  rows_truncated?: number
  insights?: MetabaseInsight[]
}

export interface MetabaseColumn {
  name: string
  display_name: string
  base_type: MetabaseBaseType
  effective_type?: MetabaseBaseType
  semantic_type?: string
  field_ref?: unknown[]
  source?: "fields" | "aggregation" | "breakout"
}

export type MetabaseBaseType =
  | "type/Text"
  | "type/Integer"
  | "type/BigInteger"
  | "type/Float"
  | "type/Decimal"
  | "type/Boolean"
  | "type/DateTime"
  | "type/Date"
  | "type/Time"
  | "type/UUID"
  | "type/*"

export interface MetabaseColumnMetadata {
  name: string
  display_name: string
  base_type: MetabaseBaseType
  effective_type?: MetabaseBaseType
  semantic_type?: string
  fingerprint?: {
    global?: {
      "distinct-count"?: number
      "nil%"?: number
    }
    type?: Record<string, unknown>
  }
}

export interface MetabaseInsight {
  "previous-value"?: number
  unit?: string
  offset?: number
  "last-change"?: number
  "last-value"?: number
  col?: string
  slope?: number
  "best-fit"?: unknown[]
}

export interface MetabaseDatabase {
  id: number
  name: string
  description: string | null
  engine: string
  features: string[]
  is_full_sync: boolean
  is_sample: boolean
  cache_field_values_schedule: string
  metadata_sync_schedule: string
  created_at: string
  updated_at: string
}

export interface MetabaseTable {
  id: number
  name: string
  display_name: string
  description: string | null
  db_id: number
  schema: string | null
  entity_type: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface MetabaseError {
  message: string
  status?: number
  "error-code"?: string
}

export interface MetabaseCard {
  id: number
  name: string
  description: string | null
  display: MetabaseVisualizationType
  collection_id: number | null
}

// ============================================================================
// Helper Functions
// ============================================================================

function getHeaders(): HeadersInit {
  if (!METABASE_URL) {
    throw new Error("METABASE_URL environment variable is not set")
  }
  if (!METABASE_API_KEY) {
    throw new Error("METABASE_API_KEY environment variable is not set")
  }
  return {
    "x-api-key": METABASE_API_KEY,
    "Content-Type": "application/json",
  }
}

async function metabaseFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!METABASE_URL) {
    throw new Error("METABASE_URL environment variable is not set")
  }

  const response = await fetch(`${METABASE_URL}/api${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    const error = data as MetabaseError
    throw new Error(`Metabase API Error: ${error.message || "Unknown error"} (${response.status})`)
  }

  return data as T
}

// ============================================================================
// Client Functions
// ============================================================================

/**
 * Run a saved question by ID and return results
 */
export async function runQuery(
  questionId: number,
  parameters?: Record<string, unknown>
): Promise<MetabaseQueryResult> {
  const body: Record<string, unknown> = {}

  if (parameters && Object.keys(parameters).length > 0) {
    body.parameters = Object.entries(parameters).map(([key, value]) => ({
      type: "category", // Default type, can be overridden
      target: ["variable", ["template-tag", key]],
      value,
    }))
  }

  return metabaseFetch<MetabaseQueryResult>(`/card/${questionId}/query`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/**
 * Run a custom SQL query against a database
 * Note: This requires native query permissions in Metabase
 */
export async function runCustomQuery(
  databaseId: number,
  sql: string,
  parameters?: Record<string, unknown>
): Promise<MetabaseQueryResult> {
  const templateTags: Record<string, MetabaseTemplateTag> = {}

  // Build template tags from parameters
  if (parameters) {
    Object.entries(parameters).forEach(([key, value]) => {
      const type = typeof value === "number" ? "number" : value instanceof Date ? "date" : "text"
      templateTags[key] = {
        id: key,
        name: key,
        "display-name": key,
        type,
      }
    })
  }

  const body = {
    database: databaseId,
    type: "native",
    native: {
      query: sql,
      "template-tags": templateTags,
    },
    parameters: parameters
      ? Object.entries(parameters).map(([key, value]) => ({
          type: "category",
          target: ["variable", ["template-tag", key]],
          value,
        }))
      : [],
  }

  return metabaseFetch<MetabaseQueryResult>("/dataset", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/**
 * Get a question/card by ID
 */
export async function getQuestion(questionId: number): Promise<MetabaseQuestion> {
  return metabaseFetch<MetabaseQuestion>(`/card/${questionId}`)
}

/**
 * List all databases
 */
export async function getDatabases(): Promise<MetabaseDatabase[]> {
  const result = await metabaseFetch<{ data: MetabaseDatabase[] }>("/database")
  return result.data
}

/**
 * Get database tables
 */
export async function getTables(databaseId: number): Promise<MetabaseTable[]> {
  return metabaseFetch<MetabaseTable[]>(`/database/${databaseId}/tables`)
}

/**
 * Search for questions/cards
 */
export async function searchQuestions(query: string): Promise<MetabaseCard[]> {
  const params = new URLSearchParams({
    q: query,
    models: "card",
  })
  const result = await metabaseFetch<{ data: MetabaseCard[] }>(`/search?${params}`)
  return result.data
}

// ============================================================================
// Helper: Convert results to objects
// ============================================================================

/**
 * Convert Metabase row array results to objects with column names as keys
 */
export function rowsToObjects<T = Record<string, unknown>>(result: MetabaseQueryResult): T[] {
  const { cols, rows } = result.data
  const columnNames = cols.map((col) => col.name)

  return rows.map((row) => {
    const obj: Record<string, unknown> = {}
    columnNames.forEach((name, index) => {
      obj[name] = row[index]
    })
    return obj as T
  })
}

/**
 * Get column names from query result
 */
export function getColumnNames(result: MetabaseQueryResult): string[] {
  return result.data.cols.map((col) => col.display_name || col.name)
}

/**
 * Get a single scalar value from query result
 */
export function getScalarValue<T = unknown>(result: MetabaseQueryResult): T | null {
  if (result.data.rows.length > 0 && result.data.rows[0].length > 0) {
    return result.data.rows[0][0] as T
  }
  return null
}

// ============================================================================
// Moovs Customer Data Queries
// ============================================================================

/**
 * Master customer view columns from Metabase table 5682
 */
export interface MoovsCustomerRow {
  "Lago ID": string
  "Lago External ID": string
  "Lago Plan Code": string
  "Lago Status": string
  "Calculated Mrr": number | null
  "Lago Plan Name": string
  "P Company Name": string
  "P Plan": string
  "P Vehicles Total": number | null
  "P Total Members": number | null
  "P Drivers Count": number | null
  "P Setup Score": number | null
  "Hs C ID": number | null
  "Hs C Property Name": string | null
  "Hs C Property Customer Segment": string | null
  "Hs D Owner Name": string | null
  "Hs D Churn Status": string | null
  "R Total Reservations Count": number | null
  "R Last 30 Days Reservations Count": number | null
  "R Last Trip Created At": string | null
  "Da Days Since Last Assignment": number | null
  "Da Engagement Status": string | null
}

/**
 * Query the master customer table with optional filters
 */
export async function queryCustomers(options?: {
  segment?: "enterprise" | "mid-market" | "smb" | "free" | "all"
  status?: "active" | "churned" | "all"
  limit?: number
}): Promise<MoovsCustomerRow[]> {
  const { segment = "all", status = "active", limit = 1000 } = options || {}

  // Build WHERE clauses
  const conditions: string[] = []

  if (status === "active") {
    conditions.push(`"Lago Status" = 'active'`)
  } else if (status === "churned") {
    conditions.push(`"Lago Status" = 'terminated'`)
  }

  // Segment filtering based on Lago Plan Code
  if (segment === "enterprise") {
    conditions.push(`"Lago Plan Code" = 'vip-monthly'`)
  } else if (segment === "mid-market") {
    conditions.push(`"Lago Plan Code" IN ('pro-monthly', 'pro-annual', 'pro-legacy')`)
  } else if (segment === "smb") {
    conditions.push(`"Lago Plan Code" IN ('standard-monthly', 'standard-annual')`)
  } else if (segment === "free") {
    conditions.push(`("P Plan" = 'free' OR "Lago Plan Code" IS NULL)`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const sql = `
    SELECT
      "Lago ID", "Lago External ID", "Lago Plan Code", "Lago Status",
      "Calculated Mrr", "Lago Plan Name", "P Company Name", "P Plan",
      "P Vehicles Total", "P Total Members", "P Drivers Count", "P Setup Score",
      "Hs C ID", "Hs C Property Name", "Hs C Property Customer Segment",
      "Hs D Owner Name", "Hs D Churn Status",
      "R Total Reservations Count", "R Last 30 Days Reservations Count",
      "R Last Trip Created At", "Da Days Since Last Assignment", "Da Engagement Status"
    FROM "public"."customer_master_view"
    ${whereClause}
    ORDER BY "Calculated Mrr" DESC NULLS LAST
    LIMIT ${limit}
  `

  const result = await runCustomQuery(METABASE_DATABASE_ID, sql)
  return rowsToObjects<MoovsCustomerRow>(result)
}

// ============================================================================
// Export Client Object
// ============================================================================

export const metabase = {
  runQuery,
  runCustomQuery,
  getQuestion,
  getDatabases,
  getTables,
  searchQuestions,
  queryCustomers,
  // Helpers
  rowsToObjects,
  getColumnNames,
  getScalarValue,
  // Constants
  METABASE_DATABASE_ID,
  METABASE_CUSTOMER_TABLE_ID,
}
