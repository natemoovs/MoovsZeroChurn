import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/trips
 *
 * Get trips and request analytics for an operator
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!snowflake.isConfigured()) {
      return NextResponse.json({ error: "Snowflake not configured" }, { status: 503 })
    }

    const [trips, analytics] = await Promise.all([
      snowflake.getOperatorTrips(operatorId, limit),
      snowflake.getOperatorRequestAnalytics(operatorId),
    ])

    // Calculate summary stats
    const totalTrips = trips.length
    const completedTrips = trips.filter((t) => t.status === "completed").length
    const cancelledTrips = trips.filter((t) => t.status === "cancelled").length
    const totalRevenue = trips.reduce((sum, t) => sum + (t.total_amount || 0), 0)

    return NextResponse.json({
      operatorId,
      trips,
      analytics,
      summary: {
        totalTrips,
        completedTrips,
        cancelledTrips,
        completionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0,
        totalRevenue,
      },
    })
  } catch (error) {
    console.error("Failed to fetch operator trips:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch trips",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
