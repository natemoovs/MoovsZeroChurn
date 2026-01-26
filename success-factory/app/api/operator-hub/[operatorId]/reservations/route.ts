import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/reservations
 *
 * Fetches reservations/trips overview for an operator.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params

    if (!snowflake.isConfigured()) {
      return NextResponse.json(
        { error: "Snowflake/Metabase not configured" },
        { status: 503 }
      )
    }

    const reservations = await snowflake.getReservationsOverview(operatorId)

    // Calculate totals
    const totalTrips = reservations.reduce((sum, r) => sum + (r.total_trips || 0), 0)
    const totalAmount = reservations.reduce((sum, r) => sum + (r.total_amount || 0), 0)

    // Get current month stats
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const currentMonthData = reservations.find((r) => r.created_month === currentMonth)

    return NextResponse.json({
      operatorId,
      monthlyData: reservations,
      totals: {
        totalTrips,
        totalAmount,
        monthsWithData: reservations.length,
      },
      currentMonth: currentMonthData || {
        total_trips: 0,
        total_amount: 0,
      },
    })
  } catch (error) {
    console.error("Failed to fetch operator reservations:", error)
    return NextResponse.json(
      { error: "Failed to fetch reservations", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
