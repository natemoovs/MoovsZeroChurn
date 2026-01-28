/**
 * HubSpot Sequence Enrollment API
 *
 * POST /api/hubspot/sequences/enroll - Enroll contacts in sequences
 * GET /api/hubspot/sequences - List available sequences
 *
 * Use cases:
 * - Enroll at-risk accounts in save/retention sequences
 * - Enroll high propensity accounts in expansion sequences
 * - Auto-enroll churned customers in win-back sequences
 *
 * Requires scopes: automation, crm.objects.contacts.read
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN
const BASE_URL = "https://api.hubapi.com"

interface EnrollRequest {
  sequenceId: string
  contactIds?: string[] // HubSpot contact IDs
  companyIds?: string[] // Our company IDs - will find primary contacts
  senderId: string // HubSpot user ID who will send the emails
}

interface HubSpotSequence {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  folder?: { id: string; name: string }
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
 * GET /api/hubspot/sequences - List available sequences
 */
export async function GET() {
  if (!HUBSPOT_API_KEY) {
    return NextResponse.json({ error: "HubSpot not configured" }, { status: 400 })
  }

  try {
    const result = await hubspotFetch<{
      results: HubSpotSequence[]
      paging?: { next?: { after: string } }
    }>("/automation/v4/sequences?limit=100")

    return NextResponse.json({
      sequences: result.results.map((seq) => ({
        id: seq.id,
        name: seq.name,
        folder: seq.folder?.name,
        createdAt: seq.createdAt,
        updatedAt: seq.updatedAt,
      })),
      total: result.results.length,
    })
  } catch (error) {
    console.error("HubSpot sequences error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch sequences" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/hubspot/sequences/enroll - Enroll contacts in a sequence
 */
export async function POST(request: NextRequest) {
  if (!HUBSPOT_API_KEY) {
    return NextResponse.json({ error: "HubSpot not configured" }, { status: 400 })
  }

  try {
    const body: EnrollRequest = await request.json()
    const { sequenceId, contactIds, companyIds, senderId } = body

    if (!sequenceId) {
      return NextResponse.json({ error: "Sequence ID is required" }, { status: 400 })
    }

    if (!senderId) {
      return NextResponse.json({ error: "Sender ID is required" }, { status: 400 })
    }

    let enrollContactIds: string[] = contactIds || []

    // If company IDs provided, find primary contacts for those companies
    if (companyIds && companyIds.length > 0) {
      const companies = await prisma.hubSpotCompany.findMany({
        where: { id: { in: companyIds } },
        select: { hubspotId: true },
      })

      // Get contacts associated with these companies
      for (const company of companies) {
        if (!company.hubspotId) continue

        try {
          const associations = await hubspotFetch<{
            results: Array<{ id: string; type: string }>
          }>(`/crm/v3/objects/companies/${company.hubspotId}/associations/contacts`)

          // Take the first contact (primary) for each company
          if (associations.results.length > 0) {
            enrollContactIds.push(associations.results[0].id)
          }
        } catch {
          // Skip companies without contacts
        }
      }
    }

    if (enrollContactIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No contacts found to enroll",
      })
    }

    // Dedupe contact IDs
    enrollContactIds = [...new Set(enrollContactIds)]

    // Enroll contacts in sequence
    let successCount = 0
    const errors: Array<{ contactId: string; error: string }> = []

    for (const contactId of enrollContactIds) {
      try {
        await hubspotFetch(`/automation/v4/sequences/${sequenceId}/enrollments`, {
          method: "POST",
          body: JSON.stringify({
            contactId,
            senderId,
            enrollmentSettings: {
              startingStepOrder: 0,
            },
          }),
        })
        successCount++
      } catch (error) {
        errors.push({
          contactId,
          error: error instanceof Error ? error.message : "Enrollment failed",
        })
      }
    }

    return NextResponse.json({
      success: successCount > 0,
      enrolled: successCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      message: `Enrolled ${successCount} contacts in sequence`,
    })
  } catch (error) {
    console.error("HubSpot sequence enrollment error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to enroll in sequence" },
      { status: 500 }
    )
  }
}
