import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"
import { requireAdmin } from "@/lib/auth/api-middleware"

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

    // Fetch risk overview from charges data and risk details from operator table in parallel
    const [riskData, riskDetails] = await Promise.all([
      snowflake.getRiskOverview(operatorId),
      snowflake.getOperatorRiskDetails(operatorId).catch(() => null),
    ])

    if (!riskData) {
      return NextResponse.json({
        operatorId,
        risk_score: riskDetails?.risk_score ?? null,
        failed_payments_count: 0,
        dispute_count: 0,
        avg_transaction_amount: null,
        last_failed_payment_date: null,
        risk_level: "unknown",
        // Risk management settings
        instant_payout_limit_cents: riskDetails?.instant_payout_limit_cents ?? null,
        daily_payment_limit_cents: riskDetails?.daily_payment_limit_cents ?? null,
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
      // Override with internal risk score if set, include risk management settings
      risk_score: riskDetails?.risk_score ?? riskData.risk_score,
      instant_payout_limit_cents: riskDetails?.instant_payout_limit_cents ?? null,
      daily_payment_limit_cents: riskDetails?.daily_payment_limit_cents ?? null,
    })
  } catch (error) {
    console.error("Failed to fetch operator risk data:", error)
    return NextResponse.json(
      { error: "Failed to fetch risk data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/operator-hub/[operatorId]/risk
 *
 * Update risk settings for an operator. Supports updating:
 * - instantPayoutLimitCents: The total instant payout volume an operator can process
 * - dailyPaymentLimitCents: The total daily payment volume an operator can process
 * - riskScore: Internal risk score for the operator
 *
 * Requires admin role.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  // Require admin role for updating risk settings
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { operatorId } = await params

    if (!snowflake.isWriteEnabled()) {
      return NextResponse.json(
        { error: "Write operations not available. Direct Snowflake connection required." },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { instantPayoutLimitCents, dailyPaymentLimitCents, riskScore } = body

    // Validate at least one field is provided
    if (
      instantPayoutLimitCents === undefined &&
      dailyPaymentLimitCents === undefined &&
      riskScore === undefined
    ) {
      return NextResponse.json(
        { error: "At least one field (instantPayoutLimitCents, dailyPaymentLimitCents, or riskScore) is required" },
        { status: 400 }
      )
    }

    const results: Record<string, unknown> = {}

    // Update instant payout limit if provided
    if (instantPayoutLimitCents !== undefined) {
      if (typeof instantPayoutLimitCents !== "number" || instantPayoutLimitCents < 0) {
        return NextResponse.json(
          { error: "instantPayoutLimitCents must be a non-negative number" },
          { status: 400 }
        )
      }
      const result = await snowflake.updateOperatorInstantPayoutLimit(operatorId, instantPayoutLimitCents)
      results.instantPayoutLimit = result
    }

    // Update daily payment limit if provided
    if (dailyPaymentLimitCents !== undefined) {
      if (typeof dailyPaymentLimitCents !== "number" || dailyPaymentLimitCents < 0) {
        return NextResponse.json(
          { error: "dailyPaymentLimitCents must be a non-negative number" },
          { status: 400 }
        )
      }
      const result = await snowflake.updateOperatorDailyPaymentLimit(operatorId, dailyPaymentLimitCents)
      results.dailyPaymentLimit = result
    }

    // Update risk score if provided
    if (riskScore !== undefined) {
      if (typeof riskScore !== "number") {
        return NextResponse.json(
          { error: "riskScore must be a number" },
          { status: 400 }
        )
      }
      const result = await snowflake.updateOperatorRiskScore(operatorId, riskScore)
      results.riskScore = result
    }

    return NextResponse.json({
      success: true,
      operatorId,
      updates: results,
      message: "Risk settings updated successfully",
    })
  } catch (error) {
    console.error("Failed to update operator risk settings:", error)
    return NextResponse.json(
      {
        error: "Failed to update risk settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

