import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/integrations/stripe"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/charges
 *
 * Fetches charges for an operator.
 * Priority: Stripe (connected account) > Snowflake (for historical data)
 *
 * Financial data comes from Stripe (source of truth for payments).
 * Metabase removed - use Stripe/Lago for financial data to avoid data discrepancies.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")
    const stripeAccountId = searchParams.get("stripeAccountId")

    // Priority 1: Stripe connected account (source of truth for payments)
    if (stripeAccountId && stripe.isConnectedConfigured()) {
      try {
        const stripeCharges = await stripe.getConnectedAccountCharges(stripeAccountId, { limit })

        if (stripeCharges && stripeCharges.length > 0) {
          // Transform Stripe charges to match our format
          const charges = stripeCharges.map((c) => ({
            charge_id: c.id,
            operator_id: operatorId,
            operator_name: "",
            created_date: new Date(c.created * 1000).toISOString(),
            status: c.status,
            total_dollars_charged: c.amount / 100, // Stripe amounts are in cents
            fee_amount: 0,
            net_amount: c.amount / 100,
            description: c.description,
            customer_email: null,
          }))

          return NextResponse.json({
            source: "stripe",
            charges,
            summary: [],
            totals: calculateTotals(charges),
          })
        }
      } catch (err) {
        console.log("Stripe query failed, trying Snowflake:", err)
      }
    }

    // Priority 2: Snowflake (for historical/platform charge data if available)
    if (snowflake.isConfigured()) {
      try {
        const [charges, summary] = await Promise.all([
          snowflake.getOperatorPlatformCharges(operatorId, limit),
          snowflake.getMonthlyChargesSummary(operatorId),
        ])

        if (charges && charges.length > 0) {
          return NextResponse.json({
            source: "snowflake",
            charges,
            summary,
            totals: calculateTotals(charges),
          })
        }
      } catch (err) {
        console.log("Snowflake query failed:", err)
      }
    }

    // No data found from any source
    return NextResponse.json({
      source: "none",
      charges: [],
      summary: [],
      totals: {
        totalVolume: 0,
        totalCount: 0,
        successCount: 0,
        successVolume: 0,
        failedCount: 0,
        failedVolume: 0,
        successRate: 0,
      },
    })
  } catch (error) {
    console.error("Failed to fetch operator charges:", error)
    return NextResponse.json(
      { error: "Failed to fetch charges", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

function calculateTotals(charges: Array<{ amount?: number; total_dollars_charged?: number; status?: string }>) {
  const total = charges.reduce((sum, c) => sum + (c.amount || c.total_dollars_charged || 0), 0)
  const successful = charges.filter((c) => c.status === "succeeded" || c.status === "paid")
  const failed = charges.filter((c) => c.status === "failed")

  return {
    totalVolume: total,
    totalCount: charges.length,
    successCount: successful.length,
    successVolume: successful.reduce((sum, c) => sum + (c.amount || c.total_dollars_charged || 0), 0),
    failedCount: failed.length,
    failedVolume: failed.reduce((sum, c) => sum + (c.amount || c.total_dollars_charged || 0), 0),
    successRate: charges.length > 0 ? (successful.length / charges.length) * 100 : 0,
  }
}
