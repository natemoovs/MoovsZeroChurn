import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/expansion/[id]
 * Get a single expansion opportunity
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const opportunity = await prisma.expansionOpportunity.findUnique({
      where: { id },
    })

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
    }

    return NextResponse.json({ opportunity })
  } catch (error) {
    console.error("Failed to fetch opportunity:", error)
    return NextResponse.json({ error: "Failed to fetch opportunity" }, { status: 500 })
  }
}

/**
 * PATCH /api/expansion/[id]
 * Update an expansion opportunity
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const body = await request.json()
    const {
      status,
      title,
      description,
      potentialValue,
      confidence,
      nextSteps,
      ownerId,
      targetCloseDate,
      closedValue,
      lostReason,
    } = body

    const opportunity = await prisma.expansionOpportunity.findUnique({
      where: { id },
    })

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (status !== undefined) updateData.status = status
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (potentialValue !== undefined) updateData.potentialValue = potentialValue
    if (confidence !== undefined) updateData.confidence = confidence
    if (nextSteps !== undefined) updateData.nextSteps = nextSteps
    if (ownerId !== undefined) updateData.ownerId = ownerId
    if (targetCloseDate !== undefined) {
      updateData.targetCloseDate = targetCloseDate ? new Date(targetCloseDate) : null
    }

    // Handle closing the opportunity
    if (status === "won" || status === "lost") {
      updateData.closedAt = new Date()
      if (closedValue !== undefined) updateData.closedValue = closedValue
      if (lostReason !== undefined) updateData.lostReason = lostReason
    }

    const updated = await prisma.expansionOpportunity.update({
      where: { id },
      data: updateData,
    })

    // Log activity event for status changes
    if (status && status !== opportunity.status) {
      await prisma.activityEvent.create({
        data: {
          companyId: opportunity.companyId,
          source: "platform",
          eventType:
            status === "won"
              ? "expansion_won"
              : status === "lost"
                ? "expansion_lost"
                : "expansion_status_changed",
          title:
            status === "won"
              ? `Expansion won: ${opportunity.title}`
              : status === "lost"
                ? `Expansion lost: ${opportunity.title}`
                : `Expansion updated: ${opportunity.title}`,
          description:
            status === "won"
              ? `Closed expansion opportunity for $${(closedValue || opportunity.potentialValue || 0).toLocaleString()}`
              : status === "lost"
                ? `Lost expansion opportunity: ${lostReason || "No reason provided"}`
                : `Status changed to ${status}`,
          importance: status === "won" ? "high" : "normal",
          occurredAt: new Date(),
          metadata: { opportunityId: id, status, closedValue },
        },
      })
    }

    return NextResponse.json({ success: true, opportunity: updated })
  } catch (error) {
    console.error("Failed to update opportunity:", error)
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 })
  }
}

/**
 * DELETE /api/expansion/[id]
 * Delete an expansion opportunity
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.expansionOpportunity.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete opportunity:", error)
    return NextResponse.json({ error: "Failed to delete opportunity" }, { status: 500 })
  }
}
