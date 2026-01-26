/**
 * Expansion Opportunity Detector Agent
 *
 * Identifies upsell, cross-sell, and upgrade opportunities based on:
 * - Usage growth trends
 * - Feature adoption signals
 * - Engagement patterns
 * - Payment health
 *
 * Runs weekly to find revenue growth opportunities.
 */

import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { inngest } from "@/lib/inngest/client"
import { complete } from "@/lib/ai"

// Expansion signal thresholds
const SIGNALS = {
  USAGE_GROWTH_THRESHOLD: 20, // 20% growth triggers signal
  HIGH_ENGAGEMENT_SCORE: 70,
  HEALTHY_PAYMENT_RATE: 95,
  MIN_MRR_FOR_EXPANSION: 500,
  DAYS_SINCE_LAST_EXPANSION: 90,
}

interface ExpansionSignal {
  type: string
  description: string
  strength: "strong" | "moderate" | "weak"
  data?: Record<string, unknown>
}

interface ExpansionCandidate {
  company: {
    id: string
    name: string
    mrr: number
    plan: string | null
    healthScore: string | null
    vehiclesTotal: number | null
    driversCount: number | null
  }
  signals: ExpansionSignal[]
  score: number
  opportunityType: "upsell" | "cross_sell" | "upgrade"
  potentialValue: number
}

export async function POST(request: NextRequest) {
  // Verify cron authorization
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  const isAuthorized =
    process.env.NODE_ENV === "development" ||
    request.headers.get("x-vercel-cron") === "1" ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`)

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[Expansion Detector] Starting analysis...")

  try {
    // Step 1: Get healthy, paying companies with good payment status
    const companies = await prisma.hubSpotCompany.findMany({
      where: {
        subscriptionStatus: "active",
        healthScore: { in: ["green", "yellow"] },
        mrr: { gte: SIGNALS.MIN_MRR_FOR_EXPANSION },
        OR: [{ paymentHealth: "good" }, { paymentHealth: null }],
      },
      select: {
        id: true,
        name: true,
        mrr: true,
        plan: true,
        healthScore: true,
        vehiclesTotal: true,
        driversCount: true,
        membersCount: true,
        setupScore: true,
        engagementScore: true,
        paymentSuccessRate: true,
        contractEndDate: true,
        createdAt: true,
      },
    })

    console.log(`[Expansion Detector] Analyzing ${companies.length} companies`)

    // Step 2: Get recent health snapshots for trend analysis
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const candidates: ExpansionCandidate[] = []

    for (const company of companies) {
      const signals: ExpansionSignal[] = []

      // Get health trends
      const snapshots = await prisma.healthScoreSnapshot.findMany({
        where: {
          companyId: company.id,
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "asc" },
        select: {
          healthScore: true,
          mrr: true,
          totalTrips: true,
          createdAt: true,
        },
      })

      // Check for existing recent expansion opportunities
      const recentOpportunity = await prisma.expansionOpportunity.findFirst({
        where: {
          companyId: company.id,
          createdAt: {
            gte: new Date(
              Date.now() - SIGNALS.DAYS_SINCE_LAST_EXPANSION * 24 * 60 * 60 * 1000
            ),
          },
        },
      })

      if (recentOpportunity) {
        continue // Skip if we already identified an opportunity recently
      }

      // Signal 1: Usage Growth
      if (snapshots.length >= 2) {
        const firstSnapshot = snapshots[0]
        const lastSnapshot = snapshots[snapshots.length - 1]

        if (firstSnapshot.totalTrips && lastSnapshot.totalTrips) {
          const growthRate =
            ((lastSnapshot.totalTrips - firstSnapshot.totalTrips) /
              firstSnapshot.totalTrips) *
            100

          if (growthRate >= SIGNALS.USAGE_GROWTH_THRESHOLD) {
            signals.push({
              type: "usage_growth",
              description: `Usage grew ${growthRate.toFixed(0)}% in the last 30 days`,
              strength: growthRate >= 50 ? "strong" : "moderate",
              data: { growthRate, firstTrips: firstSnapshot.totalTrips, lastTrips: lastSnapshot.totalTrips },
            })
          }
        }
      }

      // Signal 2: High Engagement
      if (
        company.engagementScore &&
        company.engagementScore >= SIGNALS.HIGH_ENGAGEMENT_SCORE
      ) {
        signals.push({
          type: "high_engagement",
          description: `Engagement score of ${company.engagementScore}%`,
          strength: company.engagementScore >= 85 ? "strong" : "moderate",
          data: { engagementScore: company.engagementScore },
        })
      }

      // Signal 3: Fleet Growth (vehicles/drivers increasing)
      if (company.vehiclesTotal && company.vehiclesTotal >= 20) {
        signals.push({
          type: "fleet_size",
          description: `Large fleet with ${company.vehiclesTotal} vehicles`,
          strength: company.vehiclesTotal >= 50 ? "strong" : "moderate",
          data: { vehicles: company.vehiclesTotal, drivers: company.driversCount },
        })
      }

      // Signal 4: High Setup Completion
      if (company.setupScore && company.setupScore >= 25) {
        signals.push({
          type: "fully_onboarded",
          description: `Setup score ${company.setupScore}/30 - fully adopted`,
          strength: company.setupScore >= 28 ? "strong" : "moderate",
          data: { setupScore: company.setupScore },
        })
      }

      // Signal 5: Perfect Payment History
      if (
        company.paymentSuccessRate &&
        company.paymentSuccessRate >= SIGNALS.HEALTHY_PAYMENT_RATE
      ) {
        signals.push({
          type: "payment_reliable",
          description: `${company.paymentSuccessRate}% payment success rate`,
          strength: "moderate",
          data: { paymentSuccessRate: company.paymentSuccessRate },
        })
      }

      // Signal 6: Approaching contract end (renewal opportunity)
      if (company.contractEndDate) {
        const daysUntilRenewal = Math.floor(
          (new Date(company.contractEndDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )

        if (daysUntilRenewal > 30 && daysUntilRenewal <= 90) {
          signals.push({
            type: "renewal_approaching",
            description: `Contract renews in ${daysUntilRenewal} days`,
            strength: "strong",
            data: { daysUntilRenewal, contractEndDate: company.contractEndDate },
          })
        }
      }

      // Calculate expansion score (0-100)
      if (signals.length >= 2) {
        const score = calculateExpansionScore(signals)
        const opportunityType = determineOpportunityType(signals, company)
        const potentialValue = estimatePotentialValue(company, opportunityType)

        if (score >= 50) {
          candidates.push({
            company: {
              id: company.id,
              name: company.name,
              mrr: company.mrr || 0,
              plan: company.plan,
              healthScore: company.healthScore,
              vehiclesTotal: company.vehiclesTotal,
              driversCount: company.driversCount,
            },
            signals,
            score,
            opportunityType,
            potentialValue,
          })
        }
      }
    }

    // Sort by score and potential value
    candidates.sort((a, b) => {
      const scoreWeight = (b.score - a.score) * 1000
      const valueWeight = b.potentialValue - a.potentialValue
      return scoreWeight + valueWeight
    })

    // Take top 20 opportunities
    const topCandidates = candidates.slice(0, 20)

    console.log(
      `[Expansion Detector] Found ${topCandidates.length} expansion opportunities`
    )

    // Step 3: Create expansion opportunities and tasks
    const createdOpportunities = []
    const createdTasks = []

    for (const candidate of topCandidates) {
      // Generate AI recommendations
      const aiRecommendation = await generateExpansionRecommendation(candidate)

      // Create expansion opportunity record
      const confidenceLevel = candidate.score >= 75 ? "high" : candidate.score >= 50 ? "medium" : "low"
      const nextSteps = extractNextSteps(aiRecommendation)

      const opportunity = await prisma.expansionOpportunity.create({
        data: {
          companyId: candidate.company.id,
          companyName: candidate.company.name,
          type: candidate.opportunityType,
          status: "identified",
          source: "ai_detected",
          title: `${candidate.opportunityType.replace("_", "-")} opportunity for ${candidate.company.name}`,
          description: aiRecommendation,
          currentValue: candidate.company.mrr,
          potentialValue: candidate.potentialValue,
          confidence: confidenceLevel,
          signals: candidate.signals as unknown as Prisma.InputJsonValue,
          nextSteps: nextSteps.length > 0 ? nextSteps.join("\n") : null,
        },
      })

      createdOpportunities.push(opportunity)

      // Create task for CSM
      const task = await prisma.task.create({
        data: {
          companyId: candidate.company.id,
          companyName: candidate.company.name,
          title: `Expansion Opportunity: ${candidate.company.name} (+$${candidate.potentialValue - candidate.company.mrr}/mo potential)`,
          description: `AI detected expansion signals for ${candidate.company.name}.\n\n**Current MRR:** $${candidate.company.mrr}\n**Potential MRR:** $${candidate.potentialValue}\n**Confidence:** ${candidate.score}%\n\n**Signals:**\n${candidate.signals.map((s) => `• ${s.description}`).join("\n")}\n\n**Recommended Approach:**\n${aiRecommendation}`,
          priority: candidate.score >= 75 ? "high" : "medium",
          status: "pending",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
          metadata: {
            source: "expansion_agent",
            opportunityId: opportunity.id,
            expansionType: candidate.opportunityType,
            signals: candidate.signals.map((s) => s.type),
            score: candidate.score,
          },
        },
      })

      createdTasks.push(task)

      // Send Inngest event
      await inngest.send({
        name: "expansion/opportunity.detected",
        data: {
          companyId: candidate.company.id,
          companyName: candidate.company.name,
          type: candidate.opportunityType,
          signals: candidate.signals.map((s) => s.description),
          potentialValue: candidate.potentialValue,
          confidence: candidate.score,
        },
      })
    }

    // Log activity
    await prisma.activityEvent.createMany({
      data: topCandidates.map((c) => ({
        companyId: c.company.id,
        source: "expansion_agent",
        eventType: "expansion_opportunity",
        title: `Expansion opportunity detected`,
        description: `${c.opportunityType}: +$${c.potentialValue - c.company.mrr}/mo potential`,
        importance: c.score >= 75 ? "high" : "medium",
        metadata: { score: c.score, type: c.opportunityType },
        occurredAt: new Date(),
      })),
    })

    const summary = {
      companiesAnalyzed: companies.length,
      opportunitiesFound: topCandidates.length,
      totalPotentialRevenue: topCandidates.reduce(
        (sum, c) => sum + (c.potentialValue - c.company.mrr),
        0
      ),
      byType: {
        upsell: topCandidates.filter((c) => c.opportunityType === "upsell").length,
        cross_sell: topCandidates.filter((c) => c.opportunityType === "cross_sell")
          .length,
        upgrade: topCandidates.filter((c) => c.opportunityType === "upgrade").length,
      },
      topOpportunities: topCandidates.slice(0, 5).map((c) => ({
        company: c.company.name,
        type: c.opportunityType,
        score: c.score,
        potentialValue: c.potentialValue,
        currentMrr: c.company.mrr,
      })),
    }

    console.log("[Expansion Detector] Summary:", summary)

    return NextResponse.json({
      success: true,
      summary,
      tasksCreated: createdTasks.length,
      opportunitiesCreated: createdOpportunities.length,
    })
  } catch (error) {
    console.error("[Expansion Detector] Error:", error)
    return NextResponse.json(
      { error: "Failed to run expansion detection", details: String(error) },
      { status: 500 }
    )
  }
}

function calculateExpansionScore(signals: ExpansionSignal[]): number {
  let score = 0

  for (const signal of signals) {
    switch (signal.strength) {
      case "strong":
        score += 25
        break
      case "moderate":
        score += 15
        break
      case "weak":
        score += 5
        break
    }
  }

  // Bonus for multiple signal types
  const uniqueTypes = new Set(signals.map((s) => s.type))
  score += uniqueTypes.size * 5

  return Math.min(100, score)
}

function determineOpportunityType(
  signals: ExpansionSignal[],
  company: { plan: string | null; vehiclesTotal: number | null }
): "upsell" | "cross_sell" | "upgrade" {
  const signalTypes = signals.map((s) => s.type)

  // Upgrade: High usage + basic plan
  if (
    signalTypes.includes("usage_growth") &&
    company.plan?.toLowerCase().includes("basic")
  ) {
    return "upgrade"
  }

  // Upsell: Fleet growth or renewal approaching
  if (
    signalTypes.includes("fleet_size") ||
    signalTypes.includes("renewal_approaching")
  ) {
    return "upsell"
  }

  // Cross-sell: High engagement + fully onboarded
  if (
    signalTypes.includes("high_engagement") &&
    signalTypes.includes("fully_onboarded")
  ) {
    return "cross_sell"
  }

  return "upsell" // Default
}

function estimatePotentialValue(
  company: { mrr: number | null; vehiclesTotal: number | null },
  opportunityType: "upsell" | "cross_sell" | "upgrade"
): number {
  const currentMrr = company.mrr || 0

  switch (opportunityType) {
    case "upgrade":
      return Math.round(currentMrr * 1.5) // 50% increase for plan upgrade
    case "upsell":
      // Add per-vehicle estimate
      const vehicleUpsell = (company.vehiclesTotal || 10) * 5
      return currentMrr + vehicleUpsell
    case "cross_sell":
      return Math.round(currentMrr * 1.25) // 25% increase for add-ons
    default:
      return Math.round(currentMrr * 1.3)
  }
}

async function generateExpansionRecommendation(
  candidate: ExpansionCandidate
): Promise<string> {
  try {
    const prompt = `You are a Customer Success expert. Generate a brief expansion recommendation for this account.

Account: ${candidate.company.name}
Current MRR: $${candidate.company.mrr}
Plan: ${candidate.company.plan || "Unknown"}
Health Score: ${candidate.company.healthScore}
Fleet Size: ${candidate.company.vehiclesTotal || "Unknown"} vehicles

Expansion Signals:
${candidate.signals.map((s) => `- ${s.description} (${s.strength})`).join("\n")}

Opportunity Type: ${candidate.opportunityType}
Potential Value: $${candidate.potentialValue}/mo

Provide 2-3 sentences on the recommended approach, then 2-3 specific next steps.`

    const recommendation = await complete("general", prompt, {
      maxTokens: 300,
    })

    return recommendation
  } catch (error) {
    console.error("[Expansion Detector] AI recommendation error:", error)
    return `Based on the signals detected, consider scheduling a call to discuss ${candidate.opportunityType} opportunities.`
  }
}

function extractNextSteps(recommendation: string): string[] {
  // Simple extraction - look for numbered items or bullet points
  const lines = recommendation.split("\n")
  const steps: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (
      trimmed.match(/^[\d\-\*•]/) ||
      trimmed.toLowerCase().startsWith("next step")
    ) {
      steps.push(trimmed.replace(/^[\d\.\-\*•]+\s*/, ""))
    }
  }

  return steps.slice(0, 3)
}

// Status endpoint
export async function GET() {
  const recentOpportunities = await prisma.expansionOpportunity.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  const stats = await prisma.expansionOpportunity.groupBy({
    by: ["status"],
    _count: true,
  })

  return NextResponse.json({
    status: "ok",
    agent: "expansion-detector",
    recentOpportunities: recentOpportunities.map((o) => ({
      company: o.companyName,
      type: o.type,
      status: o.status,
      potentialValue: o.potentialValue,
      confidence: o.confidence,
      createdAt: o.createdAt,
    })),
    stats,
  })
}
