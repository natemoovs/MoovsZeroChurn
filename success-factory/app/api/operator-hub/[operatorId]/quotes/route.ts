import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/quotes
 *
 * Fetches quotes and reservations data for an operator including:
 * - List of recent quotes and reservations
 * - Summary statistics (totals, conversion rate)
 * - Monthly breakdown for charts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")

    if (!snowflake.isConfigured()) {
      return NextResponse.json({ error: "Snowflake not configured" }, { status: 503 })
    }

    // Fetch quotes and summary in parallel
    const [quotes, summary] = await Promise.all([
      snowflake.getOperatorQuotes(operatorId, limit),
      snowflake.getOperatorQuotesSummary(operatorId),
    ])

    return NextResponse.json({
      operatorId,
      quotes,
      summary,
    })
  } catch (error) {
    console.error("Failed to fetch operator quotes:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch quotes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
