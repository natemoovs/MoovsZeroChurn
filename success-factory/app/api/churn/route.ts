import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Churn Reason Documentation API
 *
 * Structured capture of churn reasons for pattern learning.
 * Adapts the /problem skill methodology for CSM.
 *
 * POST /api/churn - Document a churn event
 * GET /api/churn - List churn records with filters
 * GET /api/churn/patterns - Get AI-analyzed patterns
 * GET /api/churn/stats - Get churn statistics
 */

// Primary churn reasons (categorized)
export const CHURN_REASONS = {
  price: "Price / Budget",
  product_fit: "Product Fit / Missing Features",
  support: "Support / Service Issues",
  competitor: "Lost to Competitor",
  business_closed: "Business Closed / Downsized",
  budget: "Budget Cuts / Economic Factors",
  internal: "Internal Changes (New Decision Maker)",
  implementation: "Failed Implementation / Adoption",
  other: "Other",
} as const

interface ChurnRecordInput {
  companyId: string
  companyName: string
  domain?: string
  churnDate?: string
  customerSince?: string
  lostMrr?: number
  lifetimeValue?: number
  primaryReason: keyof typeof CHURN_REASONS
  secondaryReason?: string
  reasonDetails?: string
  competitorName?: string
  featureGaps?: string[]
  healthScoreAtChurn?: string
  daysSinceLastLogin?: number
  totalTrips?: number
  lastContactDate?: string
  exitInterviewDone?: boolean
  exitInterviewNotes?: string
  willingToReturn?: boolean
  returnConditions?: string
  documentedBy?: string
}

/**
 * POST /api/churn
 * Document a churn event
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChurnRecordInput = await request.json()

    if (!body.companyId || !body.companyName || !body.primaryReason) {
      return NextResponse.json(
        { error: "companyId, companyName, and primaryReason are required" },
        { status: 400 }
      )
    }

    if (!Object.keys(CHURN_REASONS).includes(body.primaryReason)) {
      return NextResponse.json(
        { error: `Invalid primaryReason. Must be one of: ${Object.keys(CHURN_REASONS).join(", ")}` },
        { status: 400 }
      )
    }

    // Create churn record
    const record = await prisma.churnRecord.create({
      data: {
        companyId: body.companyId,
        companyName: body.companyName,
        domain: body.domain,
        churnDate: body.churnDate ? new Date(body.churnDate) : new Date(),
        customerSince: body.customerSince ? new Date(body.customerSince) : undefined,
        lostMrr: body.lostMrr,
        lifetimeValue: body.lifetimeValue,
        primaryReason: body.primaryReason,
        secondaryReason: body.secondaryReason,
        reasonDetails: body.reasonDetails,
        competitorName: body.competitorName,
        featureGaps: body.featureGaps || [],
        healthScoreAtChurn: body.healthScoreAtChurn,
        daysSinceLastLogin: body.daysSinceLastLogin,
        totalTrips: body.totalTrips,
        lastContactDate: body.lastContactDate ? new Date(body.lastContactDate) : undefined,
        exitInterviewDone: body.exitInterviewDone || false,
        exitInterviewNotes: body.exitInterviewNotes,
        willingToReturn: body.willingToReturn,
        returnConditions: body.returnConditions,
        documentedBy: body.documentedBy,
      },
    })

    // Update customer journey to churned stage
    await prisma.customerJourney.upsert({
      where: { companyId: body.companyId },
      update: {
        previousStage: undefined, // Will be set by trigger
        stage: "churned",
        stageChangedAt: new Date(),
        notes: `Churned: ${CHURN_REASONS[body.primaryReason]}`,
        metadata: {
          churnRecordId: record.id,
          reason: body.primaryReason,
        },
      },
      create: {
        companyId: body.companyId,
        companyName: body.companyName,
        stage: "churned",
        notes: `Churned: ${CHURN_REASONS[body.primaryReason]}`,
        metadata: {
          churnRecordId: record.id,
          reason: body.primaryReason,
        },
      },
    })

    return NextResponse.json({
      success: true,
      record: {
        id: record.id,
        companyId: record.companyId,
        companyName: record.companyName,
        primaryReason: record.primaryReason,
        lostMrr: record.lostMrr,
        churnDate: record.churnDate,
      },
    })
  } catch (error) {
    console.error("Churn documentation error:", error)
    return NextResponse.json(
      { error: "Failed to document churn" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/churn
 * List churn records with filters
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const reason = searchParams.get("reason")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const limit = parseInt(searchParams.get("limit") || "50", 10)

  try {
    const where: Record<string, unknown> = {}

    if (reason) {
      where.primaryReason = reason
    }

    if (startDate || endDate) {
      where.churnDate = {}
      if (startDate) {
        (where.churnDate as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.churnDate as Record<string, Date>).lte = new Date(endDate)
      }
    }

    const records = await prisma.churnRecord.findMany({
      where,
      orderBy: { churnDate: "desc" },
      take: Math.min(limit, 100),
    })

    // Calculate summary stats
    const totalLostMrr = records.reduce((sum, r) => sum + (r.lostMrr || 0), 0)
    const reasonBreakdown = records.reduce((acc, r) => {
      acc[r.primaryReason] = (acc[r.primaryReason] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      records,
      total: records.length,
      summary: {
        totalLostMrr,
        reasonBreakdown,
        avgMrrLost: records.length > 0 ? totalLostMrr / records.length : 0,
      },
      reasons: CHURN_REASONS,
    })
  } catch (error) {
    console.error("Churn list error:", error)
    return NextResponse.json(
      { error: "Failed to fetch churn records" },
      { status: 500 }
    )
  }
}
