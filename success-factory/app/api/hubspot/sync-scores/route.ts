/**
 * HubSpot Score Sync API
 *
 * POST /api/hubspot/sync-scores - Sync health scores and propensity scores to HubSpot
 *
 * Syncs to custom company properties:
 * - success_factory_health_score (0-100)
 * - success_factory_propensity_score (0-100)
 * - success_factory_churn_risk (low/medium/high/critical)
 * - success_factory_expansion_potential (low/medium/high)
 * - success_factory_last_sync (datetime)
 *
 * Requires scopes: crm.objects.companies.write
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN
const BASE_URL = "https://api.hubapi.com"

interface SyncScoresRequest {
  companyIds?: string[] // Optional: sync specific companies, or sync all if not provided
  syncHealth?: boolean
  syncPropensity?: boolean
}

interface CompanyUpdate {
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

function getRiskLevel(score: number): string {
  if (score >= 80) return "low"
  if (score >= 60) return "medium"
  if (score >= 40) return "high"
  return "critical"
}

function getExpansionPotential(score: number): string {
  if (score >= 70) return "high"
  if (score >= 40) return "medium"
  return "low"
}

/**
 * POST /api/hubspot/sync-scores - Sync scores to HubSpot company properties
 */
export async function POST(request: NextRequest) {
  if (!HUBSPOT_API_KEY) {
    return NextResponse.json({ error: "HubSpot not configured" }, { status: 400 })
  }

  try {
    const body: SyncScoresRequest = await request.json()
    const { companyIds, syncHealth = true, syncPropensity = true } = body

    // Get companies with their scores from our database
    const whereClause = companyIds?.length ? { hubspotId: { in: companyIds } } : {}

    const companies = await prisma.hubSpotCompany.findMany({
      where: whereClause,
      select: {
        id: true,
        hubspotId: true,
        name: true,
        numericHealthScore: true,
        engagementScore: true,
        paymentScore: true,
        growthScore: true,
      },
    })

    if (companies.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: "No companies found with HubSpot IDs",
      })
    }

    // Prepare batch updates for HubSpot
    const updates: CompanyUpdate[] = []
    const now = new Date().toISOString()

    for (const company of companies) {
      if (!company.hubspotId) continue

      const properties: Record<string, string> = {
        success_factory_last_sync: now,
      }

      if (syncHealth && company.numericHealthScore !== null) {
        properties.success_factory_health_score = String(Math.round(company.numericHealthScore))
        properties.success_factory_churn_risk = getRiskLevel(company.numericHealthScore)
      }

      if (syncPropensity) {
        // Calculate a simple propensity score from available data
        const propensityScore = Math.round(
          (company.engagementScore || 0) * 0.35 +
            (company.paymentScore || 0) * 0.35 +
            (company.growthScore || 0) * 0.3
        )
        properties.success_factory_propensity_score = String(propensityScore)
        properties.success_factory_expansion_potential = getExpansionPotential(propensityScore)
      }

      updates.push({
        id: company.hubspotId,
        properties,
      })
    }

    // Batch update companies in HubSpot (max 100 per request)
    const batchSize = 100
    let successCount = 0
    const errors: Array<{ companyId: string; error: string }> = []

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)

      try {
        await hubspotFetch("/crm/v3/objects/companies/batch/update", {
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
            await hubspotFetch(`/crm/v3/objects/companies/${update.id}`, {
              method: "PATCH",
              body: JSON.stringify({ properties: update.properties }),
            })
            successCount++
          } catch (err) {
            errors.push({
              companyId: update.id,
              error: err instanceof Error ? err.message : "Unknown error",
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced: successCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      message: `Successfully synced ${successCount} companies to HubSpot`,
    })
  } catch (error) {
    console.error("HubSpot sync scores error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync scores" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/hubspot/sync-scores - Check if custom properties exist in HubSpot
 */
export async function GET() {
  if (!HUBSPOT_API_KEY) {
    return NextResponse.json({ error: "HubSpot not configured" }, { status: 400 })
  }

  try {
    // Check if our custom properties exist
    const propertiesResponse = await hubspotFetch<{
      results: Array<{ name: string; label: string; type: string }>
    }>("/crm/v3/properties/companies")

    const ourProperties = [
      "success_factory_health_score",
      "success_factory_propensity_score",
      "success_factory_churn_risk",
      "success_factory_expansion_potential",
      "success_factory_last_sync",
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
          ? "Create these custom properties in HubSpot Settings > Properties > Company properties"
          : null,
    })
  } catch (error) {
    console.error("HubSpot properties check error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check properties" },
      { status: 500 }
    )
  }
}
