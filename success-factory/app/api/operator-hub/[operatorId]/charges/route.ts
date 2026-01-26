import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"
import { metabase } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/charges
 *
 * Fetches platform charges for an operator.
 * Uses Snowflake direct connection if configured, falls back to Metabase.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")

    // Try Snowflake first
    if (snowflake.isConfigured()) {
      const [charges, summary] = await Promise.all([
        snowflake.getOperatorPlatformCharges(operatorId, limit),
        snowflake.getMonthlyChargesSummary(operatorId),
      ])

      return NextResponse.json({
        source: "snowflake",
        charges,
        summary,
        totals: calculateTotals(charges),
      })
    }

    // Fallback to Metabase custom query
    const sql = `
      SELECT
        CHARGE_ID as "chargeId",
        OPERATOR_ID as "operatorId",
        OPERATOR_NAME as "operatorName",
        CREATED_DATE as "createdAt",
        STATUS as "status",
        TOTAL_DOLLARS_CHARGED as "amount",
        FEE_AMOUNT as "feeAmount",
        DESCRIPTION as "description",
        CUSTOMER_EMAIL as "customerEmail"
      FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
      WHERE OPERATOR_ID = '${operatorId}'
      ORDER BY CREATED_DATE DESC
      LIMIT ${limit}
    `

    const result = await metabase.runCustomQuery(metabase.METABASE_DATABASE_ID, sql)
    const charges = metabase.rowsToObjects(result)

    // Get monthly summary
    const summarySql = `
      SELECT
        DATE_TRUNC('month', CREATED_DATE) as "month",
        STATUS as "status",
        SUM(TOTAL_DOLLARS_CHARGED) as "totalAmount",
        COUNT(*) as "chargeCount"
      FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
      WHERE OPERATOR_ID = '${operatorId}'
      GROUP BY DATE_TRUNC('month', CREATED_DATE), STATUS
      ORDER BY "month" DESC
    `
    const summaryResult = await metabase.runCustomQuery(metabase.METABASE_DATABASE_ID, summarySql)
    const summary = metabase.rowsToObjects(summaryResult)

    return NextResponse.json({
      source: "metabase",
      charges,
      summary,
      totals: calculateTotals(charges as Array<{ amount: number; status: string }>),
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
