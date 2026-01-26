import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/platform-data
 *
 * Fetches additional platform data: promo codes, price zones, rules, settings.
 * Data comes from Snowflake's SWOOP and POSTGRES_SWOOP schemas.
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

    // Fetch all platform data in parallel
    const [promoCodes, priceZones, rules, settings] = await Promise.all([
      snowflake.getOperatorPromoCodes(operatorId).catch(() => []),
      snowflake.getOperatorPriceZones(operatorId).catch(() => []),
      snowflake.getOperatorRules(operatorId).catch(() => []),
      snowflake.getOperatorSettings(operatorId).catch(() => null),
    ])

    // Calculate stats
    const activePromoCodes = promoCodes.filter((p) => p.is_active).length
    const activeRules = rules.filter((r) => r.is_active).length

    return NextResponse.json({
      operatorId,
      promoCodes: promoCodes.map((p) => ({
        id: p.promo_code_id,
        code: p.code,
        description: p.description,
        discountType: p.discount_type,
        discountValue: p.discount_value,
        validFrom: p.valid_from,
        validUntil: p.valid_until,
        usageLimit: p.usage_limit,
        timesUsed: p.times_used,
        isActive: p.is_active,
        createdAt: p.created_at,
      })),
      priceZones: priceZones.map((z) => ({
        id: z.zone_id,
        name: z.name,
        type: z.zone_type,
        baseFare: z.base_fare,
        perMileRate: z.per_mile_rate,
        perMinuteRate: z.per_minute_rate,
        minimumFare: z.minimum_fare,
        createdAt: z.created_at,
      })),
      rules: rules.map((r) => ({
        id: r.rule_id,
        name: r.name,
        type: r.rule_type,
        conditions: r.conditions,
        actions: r.actions,
        isActive: r.is_active,
        priority: r.priority,
        createdAt: r.created_at,
      })),
      settings,
      stats: {
        totalPromoCodes: promoCodes.length,
        activePromoCodes,
        totalZones: priceZones.length,
        totalRules: rules.length,
        activeRules,
        hasSettings: !!settings,
      },
    })
  } catch (error) {
    console.error("Failed to fetch operator platform data:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch platform data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
