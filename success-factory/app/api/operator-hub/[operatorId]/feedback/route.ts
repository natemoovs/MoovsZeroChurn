import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/feedback
 *
 * Get customer feedback for an operator
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params

    if (!snowflake.isConfigured()) {
      return NextResponse.json({ error: "Snowflake not configured" }, { status: 503 })
    }

    const feedback = await snowflake.getOperatorFeedback(operatorId)

    // Group feedback by product type
    const byProductType = feedback.reduce(
      (acc, f) => {
        const type = f.product_type || "other"
        if (!acc[type]) acc[type] = []
        acc[type].push(f)
        return acc
      },
      {} as Record<string, typeof feedback>
    )

    return NextResponse.json({
      operatorId,
      feedback,
      count: feedback.length,
      byProductType,
    })
  } catch (error) {
    console.error("Failed to fetch operator feedback:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch feedback",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
