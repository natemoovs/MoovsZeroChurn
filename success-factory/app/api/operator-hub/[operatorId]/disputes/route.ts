import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/disputes
 *
 * Fetches disputes data for an operator including:
 * - List of all disputed charges
 * - Summary statistics for charts (by status, reason, risk level, over time)
 *
 * Query params:
 * - stripeAccountId: Required - The Stripe connected account ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params
    const { searchParams } = new URL(request.url)
    const stripeAccountId = searchParams.get("stripeAccountId")

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "stripeAccountId query parameter is required" },
        { status: 400 }
      )
    }

    if (!snowflake.isConfigured()) {
      return NextResponse.json({ error: "Snowflake not configured" }, { status: 503 })
    }

    // Fetch disputes and summary in parallel
    const [disputes, summary] = await Promise.all([
      snowflake.getOperatorDisputes(stripeAccountId),
      snowflake.getOperatorDisputesSummary(stripeAccountId),
    ])

    return NextResponse.json({
      operatorId,
      stripeAccountId,
      disputes,
      summary,
    })
  } catch (error) {
    console.error("Failed to fetch operator disputes:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch disputes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
