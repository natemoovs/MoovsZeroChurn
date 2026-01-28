/**
 * HubSpot Lists API
 *
 * POST /api/hubspot/lists - Create a new list and add companies
 * GET /api/hubspot/lists - Get all lists
 *
 * Requires scopes: crm.lists.read, crm.lists.write
 */

import { NextRequest, NextResponse } from "next/server"

const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN
const BASE_URL = "https://api.hubapi.com"

interface HubSpotList {
  listId: string
  name: string
  objectTypeId: string
  processingType: string
  createdAt: string
  updatedAt: string
}

interface CreateListRequest {
  name: string
  description?: string
  companyIds: string[]
}

function getHeaders(): HeadersInit {
  if (!HUBSPOT_API_KEY) {
    throw new Error("HUBSPOT_ACCESS_TOKEN environment variable is not set")
  }
  return {
    Authorization: `Bearer ${HUBSPOT_API_KEY}`,
    "Content-Type": "application/json",
  }
}

async function hubspotFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }))
    throw new Error(`HubSpot API Error: ${error.message || response.statusText}`)
  }

  return response.json()
}

/**
 * GET /api/hubspot/lists - Get all lists
 */
export async function GET() {
  if (!HUBSPOT_API_KEY) {
    return NextResponse.json({ error: "HubSpot not configured" }, { status: 400 })
  }

  try {
    // Get company lists (objectTypeId: 0-2 for companies)
    const result = await hubspotFetch<{
      lists: HubSpotList[]
      total: number
    }>("/crm/v3/lists?count=100")

    const companyLists = result.lists.filter(
      (list) => list.objectTypeId === "0-2" // Companies
    )

    return NextResponse.json({
      lists: companyLists.map((list) => ({
        id: list.listId,
        name: list.name,
        type: list.processingType,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      })),
      total: companyLists.length,
    })
  } catch (error) {
    console.error("HubSpot lists error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch lists" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/hubspot/lists - Create a new list and add companies
 */
export async function POST(request: NextRequest) {
  if (!HUBSPOT_API_KEY) {
    return NextResponse.json({ error: "HubSpot not configured" }, { status: 400 })
  }

  try {
    const body: CreateListRequest = await request.json()
    const { name, description, companyIds } = body

    if (!name) {
      return NextResponse.json({ error: "List name is required" }, { status: 400 })
    }

    if (!companyIds || companyIds.length === 0) {
      return NextResponse.json({ error: "At least one company ID is required" }, { status: 400 })
    }

    // Step 1: Create a static list for companies
    const createListResponse = await hubspotFetch<{
      listId: string
      name: string
    }>("/crm/v3/lists", {
      method: "POST",
      body: JSON.stringify({
        name,
        objectTypeId: "0-2", // Companies
        processingType: "MANUAL", // Static list
        filterBranch: {
          filterBranchType: "OR",
          filterBranches: [],
          filters: [],
        },
      }),
    })

    const listId = createListResponse.listId

    // Step 2: Add companies to the list
    // HubSpot lists API requires adding records in batches of 500
    const batchSize = 500
    let addedCount = 0

    for (let i = 0; i < companyIds.length; i += batchSize) {
      const batch = companyIds.slice(i, i + batchSize)

      await hubspotFetch(`/crm/v3/lists/${listId}/memberships/add`, {
        method: "PUT",
        body: JSON.stringify({
          recordIdsToAdd: batch,
        }),
      })

      addedCount += batch.length
    }

    return NextResponse.json({
      success: true,
      listId,
      name,
      description,
      companiesAdded: addedCount,
      hubspotUrl: `https://app.hubspot.com/contacts/lists/${listId}`,
    })
  } catch (error) {
    console.error("HubSpot create list error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create list" },
      { status: 500 }
    )
  }
}
