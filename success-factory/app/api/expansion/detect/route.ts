import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

interface ExpansionSignal {
  type: "upsell" | "cross_sell" | "add_on" | "upgrade"
  source: string
  title: string
  description: string
  confidence: "high" | "medium" | "low"
  potentialValue: number | null
  signals: Record<string, unknown>
}

/**
 * Detect expansion signals for a specific company
 */
async function detectExpansionSignals(companyId: string): Promise<ExpansionSignal[]> {
  const signals: ExpansionSignal[] = []

  // Get company data
  const company = await prisma.hubSpotCompany.findFirst({
    where: { hubspotId: companyId },
  })

  if (!company) return signals

  const currentMrr = company.mrr || 0
  const segment = company.customerSegment || "free"
  const planCode = company.planCode || ""
  const totalTrips = company.totalTrips || 0
  const daysSinceLastLogin = company.daysSinceLastLogin

  // Signal 1: Usage Growth - High trip volume on lower tier
  if (segment === "smb" && totalTrips > 100) {
    signals.push({
      type: "upgrade",
      source: "usage_growth",
      title: "High usage on SMB plan",
      description: `${totalTrips} total trips suggests they may benefit from Mid-Market tier features`,
      confidence: "high",
      potentialValue: Math.round(currentMrr * 0.5), // 50% MRR increase potential
      signals: { totalTrips, currentPlan: planCode, segment },
    })
  }

  if (segment === "mid_market" && totalTrips > 500) {
    signals.push({
      type: "upgrade",
      source: "usage_growth",
      title: "Enterprise-level usage",
      description: `${totalTrips} trips indicates Enterprise-level operation`,
      confidence: "high",
      potentialValue: Math.round(currentMrr * 0.75),
      signals: { totalTrips, currentPlan: planCode, segment },
    })
  }

  // Signal 2: Plan Limits Approaching (for monthly plans)
  if (planCode.includes("monthly") && totalTrips > 50) {
    signals.push({
      type: "upsell",
      source: "plan_limit",
      title: "Annual plan opportunity",
      description: "High activity customer on monthly billing - annual discount opportunity",
      confidence: "medium",
      potentialValue: Math.round(currentMrr * 2), // 2 months free typically
      signals: { planCode, billingCycle: "monthly", totalTrips },
    })
  }

  // Signal 3: High Engagement + Active Usage = Ready for expansion
  if (
    daysSinceLastLogin !== null &&
    daysSinceLastLogin <= 7 &&
    totalTrips > 20 &&
    company.healthScore === "green"
  ) {
    signals.push({
      type: "cross_sell",
      source: "usage_growth",
      title: "High engagement - cross-sell ready",
      description: "Active, healthy customer may be interested in additional services",
      confidence: "medium",
      potentialValue: Math.round(currentMrr * 0.25),
      signals: {
        daysSinceLastLogin,
        totalTrips,
        healthScore: company.healthScore,
      },
    })
  }

  // Signal 4: Free tier with high activity
  if (segment === "free" && totalTrips > 10) {
    signals.push({
      type: "upgrade",
      source: "usage_growth",
      title: "Active free user",
      description: `Free account with ${totalTrips} trips - conversion opportunity`,
      confidence: "high",
      potentialValue: 99, // Entry-level paid plan
      signals: { segment, totalTrips },
    })
  }

  // Signal 5: Long tenure without upgrade
  const customerSinceDate = company.hubspotCreatedAt || company.createdAt
  const monthsAsCustomer = customerSinceDate
    ? Math.floor((Date.now() - new Date(customerSinceDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0

  if (monthsAsCustomer > 12 && segment !== "enterprise" && company.healthScore === "green") {
    signals.push({
      type: "upsell",
      source: "csm_identified",
      title: "Loyal customer - review needed",
      description: `${monthsAsCustomer} months tenure with no recent upgrade - QBR opportunity`,
      confidence: "medium",
      potentialValue: Math.round(currentMrr * 0.3),
      signals: { monthsAsCustomer, segment, healthScore: company.healthScore },
    })
  }

  return signals
}

/**
 * GET /api/expansion/detect?companyId=xxx
 * Detect expansion signals for a company
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get("companyId")

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 })
  }

  try {
    const signals = await detectExpansionSignals(companyId)

    // Get company info for context
    const company = await prisma.hubSpotCompany.findFirst({
      where: { hubspotId: companyId },
      select: {
        name: true,
        mrr: true,
        customerSegment: true,
        planCode: true,
        totalTrips: true,
        healthScore: true,
      },
    })

    // Get existing opportunities to avoid duplicates
    const existingOpportunities = await prisma.expansionOpportunity.findMany({
      where: {
        companyId,
        status: { in: ["identified", "qualified", "in_progress"] },
      },
      select: { source: true, type: true },
    })

    const existingKeys = new Set(
      existingOpportunities.map((o: { source: string; type: string }) => `${o.source}-${o.type}`)
    )

    // Filter out signals that already have opportunities
    const newSignals = signals.filter((s) => !existingKeys.has(`${s.source}-${s.type}`))

    return NextResponse.json({
      company,
      signals: newSignals,
      existingOpportunityCount: existingOpportunities.length,
      totalSignals: signals.length,
    })
  } catch (error) {
    console.error("Failed to detect expansion signals:", error)
    return NextResponse.json({ error: "Failed to detect signals" }, { status: 500 })
  }
}

/**
 * POST /api/expansion/detect
 * Run detection across all accounts and create opportunities
 */
export async function POST() {
  try {
    // Get all paid accounts with good health
    const companies = await prisma.hubSpotCompany.findMany({
      where: {
        mrr: { gt: 0 },
        healthScore: { in: ["green", "yellow"] },
      },
    })

    let created = 0
    let skipped = 0

    for (const company of companies) {
      const signals = await detectExpansionSignals(company.hubspotId)

      // Check for existing opportunities
      const existingOpportunities = await prisma.expansionOpportunity.findMany({
        where: {
          companyId: company.hubspotId,
          status: { in: ["identified", "qualified", "in_progress"] },
        },
        select: { source: true, type: true },
      })

      const existingKeys = new Set(
        existingOpportunities.map((o: { source: string; type: string }) => `${o.source}-${o.type}`)
      )

      // Create new opportunities for high-confidence signals
      for (const signal of signals) {
        if (signal.confidence === "high" && !existingKeys.has(`${signal.source}-${signal.type}`)) {
          await prisma.expansionOpportunity.create({
            data: {
              companyId: company.hubspotId,
              companyName: company.name,
              type: signal.type,
              source: signal.source,
              title: signal.title,
              description: signal.description,
              currentValue: company.mrr,
              potentialValue: signal.potentialValue,
              confidence: signal.confidence,
              signals: signal.signals as Prisma.InputJsonValue,
            },
          })
          created++
        } else {
          skipped++
        }
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      companiesScanned: companies.length,
    })
  } catch (error) {
    console.error("Failed to run expansion detection:", error)
    return NextResponse.json({ error: "Failed to run detection" }, { status: 500 })
  }
}
