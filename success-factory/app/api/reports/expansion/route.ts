import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  classifySegment,
  getSegmentDisplayName,
  identifyPricingTier,
  checkPlanMisalignment,
  identifyUpsellOpportunities,
  calculateExpansionPotential,
  PRICING_TIERS,
} from "@/lib/segments"

/**
 * Expansion Opportunities Report API
 *
 * GET /api/reports/expansion
 *
 * Identifies upsell and expansion opportunities across the portfolio:
 * - Plan-segment misalignment (undermonetized accounts)
 * - Add-on opportunities
 * - Tier upgrade candidates
 *
 * Query params:
 * - limit: number of opportunities to return (default 20)
 * - minValue: minimum expansion value in $ (default 100)
 * - segment: filter by segment (smb, mid_market, enterprise, all - default all)
 */

interface ExpansionAccount {
  id: string
  hubspotId: string
  name: string
  domain: string | null
  segment: string
  segmentDisplay: string

  // Current state
  currentPlan: string | null
  currentTier: string
  mrr: number | null
  vehicleCount: number | null
  driverCount: number | null
  monthlyTrips: number | null

  // Health (only pursue expansion for healthy accounts)
  healthScore: string | null
  numericScore: number | null

  // Expansion analysis
  isMisaligned: boolean
  misalignmentReason: string | null
  recommendedTier: string
  expansionValue: number
  opportunities: Array<{
    type: string
    name: string
    value: number
    reason: string
  }>

  // Contact
  ownerName: string | null
  ownerEmail: string | null
}

interface ExpansionReport {
  generatedAt: string
  summary: {
    totalOpportunities: number
    totalExpansionValue: number
    tierUpgrades: number
    addOnOpportunities: number
    avgExpansionPerAccount: number
  }
  bySegment: Record<string, { count: number; value: number }>
  byOpportunityType: Record<string, number>
  accounts: ExpansionAccount[]
  insights: string[]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get("limit") || "20")
  const minValue = parseInt(searchParams.get("minValue") || "100")
  const segmentFilter = searchParams.get("segment") || "all"

  try {
    // Get healthy accounts (green or yellow) - don't try to upsell unhealthy accounts
    const companies = await prisma.hubSpotCompany.findMany({
      where: {
        OR: [
          { healthScore: "green" },
          { healthScore: "yellow" },
          { numericHealthScore: { gte: 50 } },
        ],
      },
      orderBy: { mrr: "desc" },
    })

    // Analyze each account for expansion opportunities
    const expansionAccounts: ExpansionAccount[] = []

    for (const company of companies) {
      const segment = classifySegment(company.mrr)

      // Filter by segment if specified
      if (segmentFilter !== "all" && segment !== segmentFilter) continue

      const segmentDisplay = getSegmentDisplayName(segment)
      const currentTier = identifyPricingTier(company.plan)

      // Calculate expansion potential
      const expansion = calculateExpansionPotential(
        company.plan,
        company.mrr,
        null, // vehicleCount - would need from Metabase
        null, // driverCount - would need from Metabase
        company.totalTrips // Using total trips as proxy for monthly
      )

      // Check plan misalignment
      const misalignment = checkPlanMisalignment(
        company.mrr,
        company.plan,
        null,
        null,
        company.totalTrips
      )

      // Only include if there's meaningful expansion opportunity
      if (expansion.expansionOpportunity < minValue) continue

      expansionAccounts.push({
        id: company.id,
        hubspotId: company.hubspotId,
        name: company.name,
        domain: company.domain,
        segment,
        segmentDisplay,

        currentPlan: company.plan,
        currentTier: PRICING_TIERS[currentTier].name,
        mrr: company.mrr,
        vehicleCount: null,
        driverCount: null,
        monthlyTrips: company.totalTrips,

        healthScore: company.healthScore,
        numericScore: company.numericHealthScore,

        isMisaligned: misalignment.isMisaligned,
        misalignmentReason: misalignment.isMisaligned ? misalignment.reason : null,
        recommendedTier: PRICING_TIERS[misalignment.recommendedTier].name,
        expansionValue: expansion.expansionOpportunity,
        opportunities: expansion.opportunities.map((o) => ({
          type: o.type,
          name: o.name,
          value: o.potentialValue - o.currentValue,
          reason: o.reason,
        })),

        ownerName: company.ownerName,
        ownerEmail: company.ownerEmail,
      })
    }

    // Sort by expansion value (highest first)
    expansionAccounts.sort((a, b) => b.expansionValue - a.expansionValue)
    const topAccounts = expansionAccounts.slice(0, limit)

    // Calculate summary stats
    const totalExpansionValue = topAccounts.reduce((sum, a) => sum + a.expansionValue, 0)
    const tierUpgrades = topAccounts.filter((a) => a.isMisaligned).length
    const addOnCount = topAccounts.reduce(
      (sum, a) => sum + a.opportunities.filter((o) => o.type === "add_on").length,
      0
    )

    // Group by segment
    const bySegment: Record<string, { count: number; value: number }> = {}
    for (const account of topAccounts) {
      if (!bySegment[account.segmentDisplay]) {
        bySegment[account.segmentDisplay] = { count: 0, value: 0 }
      }
      bySegment[account.segmentDisplay].count++
      bySegment[account.segmentDisplay].value += account.expansionValue
    }

    // Group by opportunity type
    const byOpportunityType: Record<string, number> = {}
    for (const account of topAccounts) {
      for (const opp of account.opportunities) {
        byOpportunityType[opp.name] = (byOpportunityType[opp.name] || 0) + 1
      }
    }

    // Generate insights
    const insights = generateExpansionInsights(topAccounts, bySegment, totalExpansionValue)

    const report: ExpansionReport = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalOpportunities: topAccounts.length,
        totalExpansionValue,
        tierUpgrades,
        addOnOpportunities: addOnCount,
        avgExpansionPerAccount:
          topAccounts.length > 0 ? Math.round(totalExpansionValue / topAccounts.length) : 0,
      },
      bySegment,
      byOpportunityType,
      accounts: topAccounts,
      insights,
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("Expansion report error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate expansion report",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    )
  }
}

function generateExpansionInsights(
  accounts: ExpansionAccount[],
  bySegment: Record<string, { count: number; value: number }>,
  totalValue: number
): string[] {
  const insights: string[] = []

  // Total opportunity
  if (totalValue > 0) {
    insights.push(
      `$${totalValue.toLocaleString()}/month expansion opportunity across ${accounts.length} accounts`
    )
  }

  // Segment-specific insights
  const sortedSegments = Object.entries(bySegment).sort((a, b) => b[1].value - a[1].value)
  if (sortedSegments.length > 0) {
    const [topSegment, data] = sortedSegments[0]
    insights.push(
      `${topSegment} segment has highest expansion potential: ${data.count} accounts, $${data.value.toLocaleString()}/month`
    )
  }

  // Undermonetized accounts
  const undermonetized = accounts.filter((a) => a.isMisaligned)
  if (undermonetized.length > 0) {
    const value = undermonetized.reduce((sum, a) => sum + a.expansionValue, 0)
    insights.push(
      `${undermonetized.length} accounts on wrong tier - $${value.toLocaleString()}/month in tier upgrade potential`
    )
  }

  // Enterprise on non-enterprise plans
  const enterpriseUndermonetized = accounts.filter(
    (a) => a.segment === "enterprise" && a.currentTier !== "Enterprise"
  )
  if (enterpriseUndermonetized.length > 0) {
    insights.push(
      `${enterpriseUndermonetized.length} Enterprise customers not on Enterprise plan - high-value upgrade opportunity`
    )
  }

  // Free plan with usage
  const freeWithUsage = accounts.filter(
    (a) => a.currentTier === "Free" && a.monthlyTrips && a.monthlyTrips > 10
  )
  if (freeWithUsage.length > 0) {
    insights.push(`${freeWithUsage.length} Free accounts with active usage - ready for conversion`)
  }

  // Add-on opportunities
  const addOnOpportunities = accounts.flatMap((a) =>
    a.opportunities.filter((o) => o.type === "add_on")
  )
  if (addOnOpportunities.length > 0) {
    const addOnValue = addOnOpportunities.reduce((sum, o) => sum + o.value, 0)
    insights.push(
      `${addOnOpportunities.length} add-on opportunities totaling $${addOnValue.toLocaleString()}/month`
    )
  }

  return insights.slice(0, 5)
}
