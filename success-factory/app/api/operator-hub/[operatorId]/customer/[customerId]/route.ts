import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/customer/[customerId]
 *
 * Fetches all charges and summary data for a specific customer.
 * Used for customer drill-down from the charges table.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string; customerId: string }> }
) {
  try {
    const { operatorId, customerId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")

    if (!snowflake.isConfigured()) {
      return NextResponse.json({ error: "Snowflake not configured" }, { status: 503 })
    }

    // Fetch customer charges and summary in parallel
    const [charges, summary] = await Promise.all([
      snowflake.getCustomerCharges(customerId, operatorId, limit),
      snowflake.getCustomerSummary(customerId, operatorId),
    ])

    if (!summary) {
      return NextResponse.json(
        { error: "Customer not found or has no charges" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      operatorId,
      customerId,
      summary,
      charges,
    })
  } catch (error) {
    console.error("Failed to fetch customer data:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch customer data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
