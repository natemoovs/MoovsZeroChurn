import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Get journey for a specific company
 * GET /api/journey/[companyId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params

  try {
    const journey = await prisma.customerJourney.findUnique({
      where: { companyId },
      include: {
        history: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    })

    if (!journey) {
      return NextResponse.json({ journey: null })
    }

    return NextResponse.json({ journey })
  } catch (error) {
    console.error("Journey fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch journey" }, { status: 500 })
  }
}
