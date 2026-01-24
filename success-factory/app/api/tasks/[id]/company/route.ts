import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * PATCH /api/tasks/[id]/company
 * Update the company association for a task
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { companyId, companyName } = body

    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 })
    }

    // If companyName not provided, look it up
    let resolvedCompanyName = companyName
    if (!resolvedCompanyName) {
      const company = await prisma.hubSpotCompany.findFirst({
        where: {
          OR: [
            { hubspotId: companyId },
            { id: companyId },
          ],
        },
        select: { name: true, hubspotId: true },
      })
      if (company) {
        resolvedCompanyName = company.name
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        companyId,
        companyName: resolvedCompanyName || companyId,
      },
    })

    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error("[Task Company Update] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update company" },
      { status: 500 }
    )
  }
}
