import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/risk
 *
 * Fetches risk overview data for an operator including:
 * - Failed payments count and volume
 * - Disputes count
 * - Risk score
 * - Bank account status
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

    const riskData = await snowflake.getRiskOverview(operatorId)

    if (!riskData) {
      return NextResponse.json({
        operatorId,
        risk_score: null,
        failed_payments_count: 0,
        dispute_count: 0,
        avg_transaction_amount: null,
        last_failed_payment_date: null,
        risk_level: "unknown",
      })
    }

    // Calculate risk level
    let riskLevel = "low"
    if (riskData.failed_payments_count > 5 || riskData.dispute_count > 2) {
      riskLevel = "high"
    } else if (riskData.failed_payments_count > 2 || riskData.dispute_count > 0) {
      riskLevel = "medium"
    }

    return NextResponse.json({
      ...riskData,
      risk_level: riskLevel,
    })
  } catch (error) {
    console.error("Failed to fetch operator risk data:", error)
    return NextResponse.json(
      { error: "Failed to fetch risk data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
