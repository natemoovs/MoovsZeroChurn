import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth/api-middleware"

/**
 * GET /api/expansion
 * List expansion opportunities with filtering
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status")
  const type = searchParams.get("type")
  const companyId = searchParams.get("companyId")

  try {
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type
    if (companyId) where.companyId = companyId

    const opportunities = await prisma.expansionOpportunity.findMany({
      where,
      orderBy: [{ status: "asc" }, { potentialValue: "desc" }, { createdAt: "desc" }],
    })

    // Calculate summary stats
    const summary = {
      total: opportunities.length,
      identified: opportunities.filter((o) => o.status === "identified").length,
      qualified: opportunities.filter((o) => o.status === "qualified").length,
      inProgress: opportunities.filter((o) => o.status === "in_progress").length,
      won: opportunities.filter((o) => o.status === "won").length,
      lost: opportunities.filter((o) => o.status === "lost").length,
      totalPotentialValue: opportunities
        .filter((o) => ["identified", "qualified", "in_progress"].includes(o.status))
        .reduce((sum, o) => sum + (o.potentialValue || 0), 0),
      totalWonValue: opportunities
        .filter((o) => o.status === "won")
        .reduce((sum, o) => sum + (o.closedValue || 0), 0),
    }

    return NextResponse.json({
      opportunities,
      summary,
    })
  } catch (error) {
    console.error("Failed to fetch expansion opportunities:", error)
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 })
  }
}

/**
 * POST /api/expansion
 * Create a new expansion opportunity
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const {
      companyId,
      companyName,
      type,
      source,
      title,
      description,
      currentValue,
      potentialValue,
      confidence,
      signals,
      nextSteps,
      ownerId,
      targetCloseDate,
    } = body

    if (!companyId || !type || !title) {
      return NextResponse.json(
        { error: "companyId, type, and title are required" },
        { status: 400 }
      )
    }

    // Get company name if not provided
    let name = companyName
    if (!name) {
      const company = await prisma.hubSpotCompany.findFirst({
        where: { hubspotId: companyId },
        select: { name: true },
      })
      name = company?.name || "Unknown"
    }

    const opportunity = await prisma.expansionOpportunity.create({
      data: {
        companyId,
        companyName: name,
        type,
        source: source || "csm_identified",
        title,
        description,
        currentValue,
        potentialValue,
        confidence: confidence || "medium",
        signals,
        nextSteps,
        ownerId,
        targetCloseDate: targetCloseDate ? new Date(targetCloseDate) : undefined,
      },
    })

    // Log activity event
    await prisma.activityEvent.create({
      data: {
        companyId,
        source: "platform",
        eventType: "expansion_opportunity_created",
        title: `Expansion opportunity: ${title}`,
        description: `${type} opportunity identified with potential value of $${potentialValue?.toLocaleString() || "TBD"}`,
        importance: potentialValue && potentialValue > 1000 ? "high" : "normal",
        occurredAt: new Date(),
        metadata: { opportunityId: opportunity.id, type, potentialValue },
      },
    })

    return NextResponse.json({ success: true, opportunity })
  } catch (error) {
    console.error("Failed to create expansion opportunity:", error)
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 })
  }
}
