/**
 * HubSpot Deal Enrichment API
 *
 * POST /api/hubspot/deals/enrich - Push deal scores and insights to HubSpot
 *
 * Syncs to custom deal properties:
 * - success_factory_multi_threading_score (0-100)
 * - success_factory_contact_count (number)
 * - success_factory_competitor (text)
 * - success_factory_risk_flags (text)
 * - success_factory_last_enriched (datetime)
 *
 * Requires scopes: crm.objects.deals.write
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN
const BASE_URL = "https://api.hubapi.com"

interface EnrichRequest {
  dealIds?: string[] // HubSpot deal IDs - if not provided, sync all
  pipelineId?: string // Filter by pipeline: specific ID, "moovs", "swoop", or undefined for all
  includeMultiThreading?: boolean
  includeCompetitor?: boolean
  includeRiskFlags?: boolean
}

interface DealUpdate {
  id: string
  properties: Record<string, string>
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

function getRiskFlags(deal: {
  daysInCurrentStage: number | null
  multiThreadingScore: number | null
  contactCount: number | null
}): string[] {
  const flags: string[] = []

  // Stalled deal
  if (deal.daysInCurrentStage && deal.daysInCurrentStage > 14) {
    flags.push(`Stalled ${deal.daysInCurrentStage} days`)
  }

  // Single threaded
  if (deal.contactCount !== null && deal.contactCount <= 1) {
    flags.push("Single-threaded")
  }

  // Low multi-threading score
  if (deal.multiThreadingScore !== null && deal.multiThreadingScore < 30) {
    flags.push("Low engagement score")
  }

  return flags
}

/**
 * POST /api/hubspot/deals/enrich - Enrich deals with Success Factory data
 */
export async function POST(request: NextRequest) {
  if (!HUBSPOT_API_KEY) {
    return NextResponse.json({ error: "HubSpot not configured" }, { status: 400 })
  }

  try {
    const body: EnrichRequest = await request.json()
    const {
      dealIds,
      pipelineId,
      includeMultiThreading = true,
      includeCompetitor = true,
      includeRiskFlags = true,
    } = body

    // Build pipeline filter
    let pipelineFilter: { pipelineId?: string | { in: string[] } } = {}
    if (pipelineId === "moovs") {
      // Get all Moovs pipeline IDs
      const moovsPipelines = await prisma.pipeline.findMany({
        where: { name: { contains: "Moovs", mode: "insensitive" } },
        select: { id: true },
      })
      if (moovsPipelines.length > 0) {
        pipelineFilter = { pipelineId: { in: moovsPipelines.map((p) => p.id) } }
      }
    } else if (pipelineId === "swoop") {
      // Get all Swoop pipeline IDs
      const swoopPipelines = await prisma.pipeline.findMany({
        where: { name: { contains: "Swoop", mode: "insensitive" } },
        select: { id: true },
      })
      if (swoopPipelines.length > 0) {
        pipelineFilter = { pipelineId: { in: swoopPipelines.map((p) => p.id) } }
      }
    } else if (pipelineId && pipelineId !== "all") {
      pipelineFilter = { pipelineId }
    }

    // Get deals from our database
    const deals = await prisma.deal.findMany({
      where: {
        ...(dealIds?.length ? { hubspotId: { in: dealIds } } : { isClosed: false }),
        ...pipelineFilter,
      },
      select: {
        id: true,
        hubspotId: true,
        name: true,
        multiThreadingScore: true,
        contactCount: true,
        daysInCurrentStage: true,
        competitorNames: true,
      },
    })

    if (deals.length === 0) {
      return NextResponse.json({
        success: true,
        enriched: 0,
        message: "No deals found with HubSpot IDs",
      })
    }

    // Prepare batch updates
    const updates: DealUpdate[] = []
    const now = new Date().toISOString()

    for (const deal of deals) {
      if (!deal.hubspotId) continue

      const properties: Record<string, string> = {
        success_factory_last_enriched: now,
      }

      if (includeMultiThreading) {
        if (deal.multiThreadingScore !== null) {
          properties.success_factory_multi_threading_score = String(
            Math.round(deal.multiThreadingScore)
          )
        }
        if (deal.contactCount !== null) {
          properties.success_factory_contact_count = String(deal.contactCount)
        }
      }

      if (includeCompetitor && deal.competitorNames.length > 0) {
        properties.success_factory_competitor = deal.competitorNames.join(", ")
      }

      if (includeRiskFlags) {
        const flags = getRiskFlags(deal)
        if (flags.length > 0) {
          properties.success_factory_risk_flags = flags.join("; ")
        }
      }

      updates.push({
        id: deal.hubspotId,
        properties,
      })
    }

    // Batch update deals in HubSpot (max 100 per request)
    const batchSize = 100
    let successCount = 0
    const errors: Array<{ dealId: string; error: string }> = []

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)

      try {
        await hubspotFetch("/crm/v3/objects/deals/batch/update", {
          method: "POST",
          body: JSON.stringify({
            inputs: batch,
          }),
        })
        successCount += batch.length
      } catch (error) {
        // If batch fails, try individual updates
        for (const update of batch) {
          try {
            await hubspotFetch(`/crm/v3/objects/deals/${update.id}`, {
              method: "PATCH",
              body: JSON.stringify({ properties: update.properties }),
            })
            successCount++
          } catch (err) {
            errors.push({
              dealId: update.id,
              error: err instanceof Error ? err.message : "Unknown error",
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      enriched: successCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      message: `Successfully enriched ${successCount} deals in HubSpot`,
    })
  } catch (error) {
    console.error("HubSpot deal enrichment error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to enrich deals" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/hubspot/deals/enrich - Check if custom properties exist
 */
export async function GET() {
  if (!HUBSPOT_API_KEY) {
    return NextResponse.json({ error: "HubSpot not configured" }, { status: 400 })
  }

  try {
    // Check if our custom properties exist
    const propertiesResponse = await hubspotFetch<{
      results: Array<{ name: string; label: string; type: string }>
    }>("/crm/v3/properties/deals")

    const ourProperties = [
      "success_factory_multi_threading_score",
      "success_factory_contact_count",
      "success_factory_competitor",
      "success_factory_risk_flags",
      "success_factory_last_enriched",
    ]

    const existingProperties = propertiesResponse.results
      .filter((p) => ourProperties.includes(p.name))
      .map((p) => p.name)

    const missingProperties = ourProperties.filter((p) => !existingProperties.includes(p))

    return NextResponse.json({
      configured: true,
      existingProperties,
      missingProperties,
      allPropertiesExist: missingProperties.length === 0,
      setupInstructions:
        missingProperties.length > 0
          ? "Create these custom properties in HubSpot Settings > Properties > Deal properties"
          : null,
    })
  } catch (error) {
    console.error("HubSpot deal properties check error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check properties" },
      { status: 500 }
    )
  }
}
