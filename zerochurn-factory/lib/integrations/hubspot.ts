/**
 * HubSpot CRM Integration Client
 *
 * Requires HUBSPOT_ACCESS_TOKEN environment variable
 * API Docs: https://developers.hubspot.com/docs/api/overview
 */

const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN
const BASE_URL = "https://api.hubapi.com"

// ============================================================================
// Types
// ============================================================================

export interface HubSpotCompany {
  id: string
  properties: {
    name: string
    domain?: string
    industry?: string
    numberofemployees?: string
    annualrevenue?: string
    city?: string
    state?: string
    country?: string
    phone?: string
    website?: string
    description?: string
    lifecyclestage?: string
    hs_lead_status?: string
    createdate: string
    hs_lastmodifieddate: string
    [key: string]: string | undefined
  }
  createdAt: string
  updatedAt: string
  archived: boolean
}

export interface HubSpotContact {
  id: string
  properties: {
    firstname?: string
    lastname?: string
    email?: string
    phone?: string
    jobtitle?: string
    lifecyclestage?: string
    hs_lead_status?: string
    lastmodifieddate: string
    createdate: string
    [key: string]: string | undefined
  }
  createdAt: string
  updatedAt: string
  archived: boolean
}

export interface HubSpotDeal {
  id: string
  properties: {
    dealname: string
    amount?: string
    dealstage?: string
    pipeline?: string
    closedate?: string
    createdate: string
    hs_lastmodifieddate: string
    [key: string]: string | undefined
  }
  createdAt: string
  updatedAt: string
  archived: boolean
}

export interface HubSpotEngagement {
  id: string
  type: "NOTE" | "EMAIL" | "CALL" | "MEETING" | "TASK"
  timestamp: number
  ownerId?: number
  associations: {
    contactIds: number[]
    companyIds: number[]
    dealIds: number[]
  }
  metadata: Record<string, unknown>
}

export interface HubSpotActivity {
  engagements: HubSpotEngagement[]
  notes: Array<{
    id: string
    body: string
    timestamp: string
  }>
  emails: Array<{
    id: string
    subject: string
    timestamp: string
  }>
  calls: Array<{
    id: string
    disposition: string
    duration: number
    timestamp: string
  }>
  meetings: Array<{
    id: string
    title: string
    startTime: string
    endTime: string
  }>
}

export interface HubSpotSearchResult {
  total: number
  results: HubSpotCompany[]
}

export interface HubSpotError {
  status: string
  message: string
  correlationId: string
  category: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function getHeaders(): HeadersInit {
  if (!HUBSPOT_API_KEY) {
    throw new Error("HUBSPOT_API_KEY environment variable is not set")
  }
  return {
    "Authorization": `Bearer ${HUBSPOT_API_KEY}`,
    "Content-Type": "application/json",
  }
}

async function hubspotFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error: HubSpotError = await response.json()
    throw new Error(`HubSpot API Error: ${error.message} (${error.category})`)
  }

  return response.json()
}

// ============================================================================
// Client Functions
// ============================================================================

/**
 * Get a company by its HubSpot ID
 */
export async function getCompany(id: string): Promise<HubSpotCompany> {
  const properties = [
    "name", "domain", "industry", "numberofemployees", "annualrevenue",
    "city", "state", "country", "phone", "website", "description",
    "lifecyclestage", "hs_lead_status", "createdate", "hs_lastmodifieddate"
  ].join(",")

  return hubspotFetch<HubSpotCompany>(
    `/crm/v3/objects/companies/${id}?properties=${properties}`
  )
}

/**
 * Find a company by its domain
 */
export async function getCompanyByDomain(domain: string): Promise<HubSpotCompany | null> {
  const result = await hubspotFetch<HubSpotSearchResult>(
    "/crm/v3/objects/companies/search",
    {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: "domain",
            operator: "EQ",
            value: domain,
          }],
        }],
        properties: [
          "name", "domain", "industry", "numberofemployees", "annualrevenue",
          "city", "state", "country", "phone", "website", "description",
          "lifecyclestage", "hs_lead_status", "createdate", "hs_lastmodifieddate"
        ],
        limit: 1,
      }),
    }
  )

  return result.results[0] || null
}

/**
 * Get all contacts associated with a company
 */
export async function getContacts(companyId: string): Promise<HubSpotContact[]> {
  // First get the contact associations
  const associations = await hubspotFetch<{
    results: Array<{ id: string; type: string }>
  }>(`/crm/v3/objects/companies/${companyId}/associations/contacts`)

  if (associations.results.length === 0) {
    return []
  }

  // Batch read the contacts
  const contactIds = associations.results.map(a => a.id)
  const result = await hubspotFetch<{ results: HubSpotContact[] }>(
    "/crm/v3/objects/contacts/batch/read",
    {
      method: "POST",
      body: JSON.stringify({
        properties: [
          "firstname", "lastname", "email", "phone", "jobtitle",
          "lifecyclestage", "hs_lead_status", "lastmodifieddate", "createdate"
        ],
        inputs: contactIds.map(id => ({ id })),
      }),
    }
  )

  return result.results
}

/**
 * Get all deals associated with a company
 */
export async function getDeals(companyId: string): Promise<HubSpotDeal[]> {
  // First get the deal associations
  const associations = await hubspotFetch<{
    results: Array<{ id: string; type: string }>
  }>(`/crm/v3/objects/companies/${companyId}/associations/deals`)

  if (associations.results.length === 0) {
    return []
  }

  // Batch read the deals
  const dealIds = associations.results.map(a => a.id)
  const result = await hubspotFetch<{ results: HubSpotDeal[] }>(
    "/crm/v3/objects/deals/batch/read",
    {
      method: "POST",
      body: JSON.stringify({
        properties: [
          "dealname", "amount", "dealstage", "pipeline",
          "closedate", "createdate", "hs_lastmodifieddate"
        ],
        inputs: dealIds.map(id => ({ id })),
      }),
    }
  )

  return result.results
}

/**
 * Get recent activity (engagements) for a company
 */
export async function getRecentActivity(companyId: string): Promise<HubSpotActivity> {
  // Get recent engagements associated with the company
  const engagements = await hubspotFetch<{
    results: Array<{
      id: string
      properties: Record<string, string>
      createdAt: string
    }>
  }>(`/crm/v3/objects/companies/${companyId}/associations/notes`)

  const notes = await hubspotFetch<{
    results: Array<{
      id: string
      properties: Record<string, string>
      createdAt: string
    }>
  }>(`/crm/v3/objects/companies/${companyId}/associations/notes`)

  const emails = await hubspotFetch<{
    results: Array<{
      id: string
      properties: Record<string, string>
      createdAt: string
    }>
  }>(`/crm/v3/objects/companies/${companyId}/associations/emails`)

  const calls = await hubspotFetch<{
    results: Array<{
      id: string
      properties: Record<string, string>
      createdAt: string
    }>
  }>(`/crm/v3/objects/companies/${companyId}/associations/calls`)

  const meetings = await hubspotFetch<{
    results: Array<{
      id: string
      properties: Record<string, string>
      createdAt: string
    }>
  }>(`/crm/v3/objects/companies/${companyId}/associations/meetings`)

  return {
    engagements: [],
    notes: notes.results.map(n => ({
      id: n.id,
      body: n.properties.hs_note_body || "",
      timestamp: n.createdAt,
    })),
    emails: emails.results.map(e => ({
      id: e.id,
      subject: e.properties.hs_email_subject || "",
      timestamp: e.createdAt,
    })),
    calls: calls.results.map(c => ({
      id: c.id,
      disposition: c.properties.hs_call_disposition || "",
      duration: parseInt(c.properties.hs_call_duration || "0", 10),
      timestamp: c.createdAt,
    })),
    meetings: meetings.results.map(m => ({
      id: m.id,
      title: m.properties.hs_meeting_title || "",
      startTime: m.properties.hs_meeting_start_time || "",
      endTime: m.properties.hs_meeting_end_time || "",
    })),
  }
}

// Helper to add delay between requests to avoid rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * List all CUSTOMERS (lifecycle stage = customer) with pagination
 * This is what CSMs care about - not all 50k companies
 */
export async function listCustomers(): Promise<HubSpotCompany[]> {
  const properties = [
    "name", "domain", "industry", "numberofemployees", "annualrevenue",
    "city", "state", "country", "phone", "website", "description",
    "lifecyclestage", "hs_lead_status", "createdate", "hs_lastmodifieddate", "notes_last_updated"
  ]

  const allCustomers: HubSpotCompany[] = []
  let after: string | undefined
  let pageCount = 0

  // Use search API with filter for lifecycle stage = customer
  while (true) {
    const body: Record<string, unknown> = {
      filterGroups: [{
        filters: [{
          propertyName: "lifecyclestage",
          operator: "EQ",
          value: "customer"
        }]
      }],
      properties,
      limit: 100,
    }

    if (after) {
      body.after = after
    }

    const result = await hubspotFetch<{
      results: HubSpotCompany[]
      paging?: { next?: { after: string } }
    }>("/crm/v3/objects/companies/search", {
      method: "POST",
      body: JSON.stringify(body),
    })

    allCustomers.push(...result.results)
    pageCount++

    if (!result.paging?.next?.after) {
      break // No more pages
    }
    after = result.paging.next.after

    // Rate limit: HubSpot allows 100 requests per 10 seconds
    // Add 150ms delay between pages to stay under limit
    await delay(150)
  }

  return allCustomers
}

/**
 * List all companies with full pagination (no limit)
 * @deprecated Use listCustomers() instead for CSM use cases
 */
export async function listCompanies(): Promise<HubSpotCompany[]> {
  const properties = [
    "name", "domain", "industry", "numberofemployees", "annualrevenue",
    "city", "state", "country", "phone", "website", "description",
    "lifecyclestage", "hs_lead_status", "createdate", "hs_lastmodifieddate", "notes_last_updated"
  ].join(",")

  const allCompanies: HubSpotCompany[] = []
  let after: string | undefined

  // Keep paginating until no more results
  while (true) {
    const url = after
      ? `/crm/v3/objects/companies?limit=100&properties=${properties}&after=${after}`
      : `/crm/v3/objects/companies?limit=100&properties=${properties}`

    const result = await hubspotFetch<{
      results: HubSpotCompany[]
      paging?: { next?: { after: string } }
    }>(url)

    allCompanies.push(...result.results)

    if (!result.paging?.next?.after) {
      break // No more pages
    }
    after = result.paging.next.after
  }

  return allCompanies
}

/**
 * Search companies by query string
 * For CSM purposes, returns only customers when no query specified
 */
export async function searchCompanies(query: string): Promise<HubSpotCompany[]> {
  // If query is "*" or empty, list customers only (not all 50k companies)
  if (!query || query === "*") {
    return listCustomers()
  }

  const result = await hubspotFetch<HubSpotSearchResult>(
    "/crm/v3/objects/companies/search",
    {
      method: "POST",
      body: JSON.stringify({
        query,
        properties: [
          "name", "domain", "industry", "numberofemployees", "annualrevenue",
          "city", "state", "country", "phone", "website", "description",
          "lifecyclestage", "hs_lead_status", "createdate", "hs_lastmodifieddate"
        ],
        limit: 20,
      }),
    }
  )

  return result.results
}

// ============================================================================
// Export Client Object
// ============================================================================

export const hubspot = {
  getCompany,
  getCompanyByDomain,
  getContacts,
  getDeals,
  getRecentActivity,
  listCustomers,
  listCompanies,
  searchCompanies,
}
