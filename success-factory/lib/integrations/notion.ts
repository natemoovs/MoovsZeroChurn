/**
 * Notion Integration Client
 *
 * Requires NOTION_API_KEY environment variable
 * API Docs: https://developers.notion.com/reference
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY
const BASE_URL = "https://api.notion.com/v1"
const NOTION_VERSION = "2022-06-28"

// ============================================================================
// Types
// ============================================================================

export interface NotionPage {
  id: string
  object: "page"
  created_time: string
  last_edited_time: string
  created_by: NotionUser
  last_edited_by: NotionUser
  parent: NotionParent
  archived: boolean
  properties: Record<string, NotionPropertyValue>
  url: string
}

export interface NotionUser {
  object: "user"
  id: string
  name?: string
  avatar_url?: string
  type?: "person" | "bot"
  person?: {
    email: string
  }
}

export type NotionParent =
  | { type: "database_id"; database_id: string }
  | { type: "page_id"; page_id: string }
  | { type: "workspace"; workspace: true }

export interface NotionDatabase {
  id: string
  object: "database"
  created_time: string
  last_edited_time: string
  title: NotionRichText[]
  properties: Record<string, NotionPropertySchema>
  parent: NotionParent
  url: string
  archived: boolean
}

export interface NotionRichText {
  type: "text" | "mention" | "equation"
  text?: {
    content: string
    link: { url: string } | null
  }
  mention?: {
    type: "user" | "page" | "database" | "date"
    user?: NotionUser
    page?: { id: string }
    database?: { id: string }
    date?: { start: string; end: string | null }
  }
  annotations: {
    bold: boolean
    italic: boolean
    strikethrough: boolean
    underline: boolean
    code: boolean
    color: string
  }
  plain_text: string
  href: string | null
}

export interface NotionPropertySchema {
  id: string
  name: string
  type: NotionPropertyType
  [key: string]: unknown
}

export type NotionPropertyType =
  | "title"
  | "rich_text"
  | "number"
  | "select"
  | "multi_select"
  | "date"
  | "people"
  | "files"
  | "checkbox"
  | "url"
  | "email"
  | "phone_number"
  | "formula"
  | "relation"
  | "rollup"
  | "created_time"
  | "created_by"
  | "last_edited_time"
  | "last_edited_by"
  | "status"

export type NotionPropertyValue =
  | { type: "title"; title: NotionRichText[]; id: string }
  | { type: "rich_text"; rich_text: NotionRichText[]; id: string }
  | { type: "number"; number: number | null; id: string }
  | { type: "select"; select: { id: string; name: string; color: string } | null; id: string }
  | {
      type: "multi_select"
      multi_select: Array<{ id: string; name: string; color: string }>
      id: string
    }
  | {
      type: "date"
      date: { start: string; end: string | null; time_zone: string | null } | null
      id: string
    }
  | { type: "people"; people: NotionUser[]; id: string }
  | {
      type: "files"
      files: Array<{
        name: string
        type: "file" | "external"
        file?: { url: string }
        external?: { url: string }
      }>
      id: string
    }
  | { type: "checkbox"; checkbox: boolean; id: string }
  | { type: "url"; url: string | null; id: string }
  | { type: "email"; email: string | null; id: string }
  | { type: "phone_number"; phone_number: string | null; id: string }
  | {
      type: "formula"
      formula: {
        type: "string" | "number" | "boolean" | "date"
        string?: string
        number?: number
        boolean?: boolean
        date?: { start: string }
      }
      id: string
    }
  | { type: "relation"; relation: Array<{ id: string }>; id: string }
  | {
      type: "rollup"
      rollup: {
        type: "number" | "date" | "array"
        number?: number
        date?: { start: string }
        array?: NotionPropertyValue[]
      }
      id: string
    }
  | { type: "created_time"; created_time: string; id: string }
  | { type: "created_by"; created_by: NotionUser; id: string }
  | { type: "last_edited_time"; last_edited_time: string; id: string }
  | { type: "last_edited_by"; last_edited_by: NotionUser; id: string }
  | { type: "status"; status: { id: string; name: string; color: string } | null; id: string }

export interface NotionFilter {
  property?: string
  and?: NotionFilter[]
  or?: NotionFilter[]
  title?: NotionTextFilter
  rich_text?: NotionTextFilter
  number?: NotionNumberFilter
  checkbox?: { equals: boolean } | { does_not_equal: boolean }
  select?:
    | { equals: string }
    | { does_not_equal: string }
    | { is_empty: true }
    | { is_not_empty: true }
  multi_select?:
    | { contains: string }
    | { does_not_contain: string }
    | { is_empty: true }
    | { is_not_empty: true }
  date?: NotionDateFilter
  status?:
    | { equals: string }
    | { does_not_equal: string }
    | { is_empty: true }
    | { is_not_empty: true }
}

export interface NotionTextFilter {
  equals?: string
  does_not_equal?: string
  contains?: string
  does_not_contain?: string
  starts_with?: string
  ends_with?: string
  is_empty?: true
  is_not_empty?: true
}

export interface NotionNumberFilter {
  equals?: number
  does_not_equal?: number
  greater_than?: number
  less_than?: number
  greater_than_or_equal_to?: number
  less_than_or_equal_to?: number
  is_empty?: true
  is_not_empty?: true
}

export interface NotionDateFilter {
  equals?: string
  before?: string
  after?: string
  on_or_before?: string
  on_or_after?: string
  past_week?: Record<string, never>
  past_month?: Record<string, never>
  past_year?: Record<string, never>
  next_week?: Record<string, never>
  next_month?: Record<string, never>
  next_year?: Record<string, never>
  is_empty?: true
  is_not_empty?: true
}

export interface NotionSort {
  property?: string
  timestamp?: "created_time" | "last_edited_time"
  direction: "ascending" | "descending"
}

export interface NotionQueryResult {
  object: "list"
  results: NotionPage[]
  next_cursor: string | null
  has_more: boolean
}

export interface NotionError {
  object: "error"
  status: number
  code: string
  message: string
}

export type NotionPropertyInput =
  | { title: Array<{ text: { content: string } }> }
  | { rich_text: Array<{ text: { content: string } }> }
  | { number: number | null }
  | { select: { name: string } | null }
  | { multi_select: Array<{ name: string }> }
  | { date: { start: string; end?: string } | null }
  | { people: Array<{ id: string }> }
  | { checkbox: boolean }
  | { url: string | null }
  | { email: string | null }
  | { phone_number: string | null }
  | { relation: Array<{ id: string }> }
  | { status: { name: string } }

// ============================================================================
// Helper Functions
// ============================================================================

function getHeaders(): HeadersInit {
  if (!NOTION_API_KEY) {
    throw new Error("NOTION_API_KEY environment variable is not set")
  }
  return {
    Authorization: `Bearer ${NOTION_API_KEY}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  }
}

async function notionFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    const error = data as NotionError
    throw new Error(`Notion API Error: ${error.message} (${error.code})`)
  }

  return data as T
}

// ============================================================================
// Client Functions
// ============================================================================

/**
 * Query a Notion database with optional filters and sorts
 */
export async function queryDatabase(
  databaseId: string,
  options: {
    filter?: NotionFilter
    sorts?: NotionSort[]
    startCursor?: string
    pageSize?: number
  } = {}
): Promise<NotionQueryResult> {
  const body: Record<string, unknown> = {}

  if (options.filter) {
    body.filter = options.filter
  }
  if (options.sorts) {
    body.sorts = options.sorts
  }
  if (options.startCursor) {
    body.start_cursor = options.startCursor
  }
  if (options.pageSize) {
    body.page_size = Math.min(options.pageSize, 100)
  }

  return notionFetch<NotionQueryResult>(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/**
 * Get a single page by ID
 */
export async function getPage(pageId: string): Promise<NotionPage> {
  return notionFetch<NotionPage>(`/pages/${pageId}`)
}

/**
 * Create a new page in a database
 */
export async function createPage(
  databaseId: string,
  properties: Record<string, NotionPropertyInput>,
  children?: unknown[]
): Promise<NotionPage> {
  const body: Record<string, unknown> = {
    parent: { database_id: databaseId },
    properties,
  }

  if (children && children.length > 0) {
    body.children = children
  }

  return notionFetch<NotionPage>("/pages", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/**
 * Update an existing page's properties
 */
export async function updatePage(
  pageId: string,
  properties: Record<string, NotionPropertyInput>,
  options: { archived?: boolean } = {}
): Promise<NotionPage> {
  const body: Record<string, unknown> = { properties }

  if (options.archived !== undefined) {
    body.archived = options.archived
  }

  return notionFetch<NotionPage>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

/**
 * Get a database schema
 */
export async function getDatabase(databaseId: string): Promise<NotionDatabase> {
  return notionFetch<NotionDatabase>(`/databases/${databaseId}`)
}

// ============================================================================
// Comments API
// ============================================================================

export interface NotionComment {
  object: "comment"
  id: string
  parent: { type: "page_id"; page_id: string } | { type: "block_id"; block_id: string }
  discussion_id: string
  created_time: string
  last_edited_time: string
  created_by: NotionUser
  rich_text: NotionRichText[]
}

export interface NotionCommentList {
  object: "list"
  results: NotionComment[]
  next_cursor: string | null
  has_more: boolean
}

/**
 * Get comments on a page
 */
export async function getComments(pageId: string): Promise<NotionComment[]> {
  const result = await notionFetch<NotionCommentList>(`/comments?block_id=${pageId}`, {
    method: "GET",
  })
  return result.results
}

/**
 * Add a comment to a page
 */
export async function addComment(pageId: string, text: string): Promise<NotionComment> {
  return notionFetch<NotionComment>("/comments", {
    method: "POST",
    body: JSON.stringify({
      parent: { page_id: pageId },
      rich_text: [{ text: { content: text } }],
    }),
  })
}

// ============================================================================
// Helper: Extract plain text from properties
// ============================================================================

export function extractTitle(property: NotionPropertyValue): string {
  if (property.type === "title") {
    return property.title.map((t) => t.plain_text).join("")
  }
  return ""
}

export function extractRichText(property: NotionPropertyValue): string {
  if (property.type === "rich_text") {
    return property.rich_text.map((t) => t.plain_text).join("")
  }
  return ""
}

export function extractSelect(property: NotionPropertyValue): string | null {
  if (property.type === "select") {
    return property.select?.name || null
  }
  return null
}

export function extractNumber(property: NotionPropertyValue): number | null {
  if (property.type === "number") {
    return property.number
  }
  return null
}

export function extractDate(property: NotionPropertyValue): string | null {
  if (property.type === "date") {
    return property.date?.start || null
  }
  return null
}

// ============================================================================
// Moovs-Specific: Ticket Functions
// ============================================================================

// Moovs Tickets database ID (from RESEARCH_GUIDE.md)
export const MOOVS_TICKETS_DATABASE_ID = "13b8aeaa-3759-80f8-8d7c-dd2f627d2578"

export interface MoovsTicket {
  id: string
  title: string
  status: string | null
  priority: string | null
  stage: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  url: string
}

/**
 * Extract multi-select values as string array
 */
export function extractMultiSelect(property: NotionPropertyValue): string[] {
  if (property.type === "multi_select") {
    return property.multi_select.map((s) => s.name)
  }
  return []
}

/**
 * Extract status value
 */
export function extractStatus(property: NotionPropertyValue): string | null {
  if (property.type === "status") {
    return property.status?.name || null
  }
  return null
}

/**
 * Query Moovs tickets database
 */
export async function queryTickets(options: {
  filter?: NotionFilter
  limit?: number
}): Promise<MoovsTicket[]> {
  if (!NOTION_API_KEY) {
    console.log("Notion not configured (missing NOTION_API_KEY)")
    return []
  }

  try {
    const result = await queryDatabase(MOOVS_TICKETS_DATABASE_ID, {
      filter: options.filter,
      pageSize: options.limit || 100,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    })

    return result.results.map((page) => {
      const props = page.properties

      return {
        id: page.id,
        title: props.Name
          ? extractTitle(props.Name)
          : props.Ticket
            ? extractTitle(props.Ticket)
            : "",
        status: props.Status ? extractStatus(props.Status) : null,
        priority: props.Priority ? extractSelect(props.Priority) : null,
        stage: props.Stage ? extractSelect(props.Stage) : null,
        tags: props.Tags ? extractMultiSelect(props.Tags) : [],
        createdAt: page.created_time,
        updatedAt: page.last_edited_time,
        url: page.url,
      }
    })
  } catch (err) {
    console.log("Failed to query Notion tickets:", err)
    return []
  }
}

/**
 * Get open tickets count (for support health scoring)
 * Returns counts by status and priority
 */
export async function getOpenTicketStats(): Promise<{
  total: number
  byStatus: Record<string, number>
  highPriority: number
  oldestOpenDays: number | null
}> {
  if (!NOTION_API_KEY) {
    return { total: 0, byStatus: {}, highPriority: 0, oldestOpenDays: null }
  }

  try {
    // Query for non-done tickets
    const tickets = await queryTickets({
      filter: {
        and: [
          {
            property: "Status",
            status: { does_not_equal: "Done" },
          },
          {
            property: "Status",
            status: { does_not_equal: "Archived" },
          },
        ],
      },
      limit: 100,
    })

    // Count by status
    const byStatus: Record<string, number> = {}
    let highPriority = 0
    let oldestDate: Date | null = null

    for (const ticket of tickets) {
      const status = ticket.status || "Unknown"
      byStatus[status] = (byStatus[status] || 0) + 1

      if (ticket.priority === "High" || ticket.priority === "Urgent") {
        highPriority++
      }

      const created = new Date(ticket.createdAt)
      if (!oldestDate || created < oldestDate) {
        oldestDate = created
      }
    }

    const oldestOpenDays = oldestDate
      ? Math.floor((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
      : null

    return {
      total: tickets.length,
      byStatus,
      highPriority,
      oldestOpenDays,
    }
  } catch (err) {
    console.log("Failed to get ticket stats:", err)
    return { total: 0, byStatus: {}, highPriority: 0, oldestOpenDays: null }
  }
}

/**
 * Search tickets by customer name or tag
 * Useful for customer research to find related tickets
 */
export async function searchTicketsByCustomer(customerName: string): Promise<MoovsTicket[]> {
  if (!NOTION_API_KEY) {
    return []
  }

  try {
    // Search by tag containing customer name
    const tickets = await queryTickets({
      filter: {
        or: [
          {
            property: "Tags",
            multi_select: { contains: customerName },
          },
          {
            property: "Name",
            title: { contains: customerName },
          },
        ],
      },
      limit: 50,
    })

    return tickets
  } catch (err) {
    console.log("Failed to search tickets:", err)
    return []
  }
}

// ============================================================================
// Export Client Object
// ============================================================================

export const notion = {
  queryDatabase,
  getPage,
  createPage,
  updatePage,
  getDatabase,
  // Comments
  getComments,
  addComment,
  // Helpers
  extractTitle,
  extractRichText,
  extractSelect,
  extractNumber,
  extractDate,
  extractMultiSelect,
  extractStatus,
  // Moovs Tickets
  queryTickets,
  getOpenTicketStats,
  searchTicketsByCustomer,
  MOOVS_TICKETS_DATABASE_ID,
}
