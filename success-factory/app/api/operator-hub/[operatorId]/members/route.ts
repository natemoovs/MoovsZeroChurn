import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/members
 *
 * Fetches members/users from the operator's platform.
 * Data comes from Snowflake's POSTGRES_SWOOP schema.
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

    // Fetch members, drivers, and vehicles in parallel
    const [members, drivers, vehicles] = await Promise.all([
      snowflake.getOperatorMembers(operatorId),
      snowflake.getOperatorDrivers(operatorId),
      snowflake.getOperatorVehicles(operatorId),
    ])

    // Calculate stats
    const activeDrivers = drivers.filter((d) => d.status === "active").length
    const memberRoles: Record<string, number> = {}
    for (const member of members) {
      const role = member.role_slug || "unknown"
      memberRoles[role] = (memberRoles[role] || 0) + 1
    }

    return NextResponse.json({
      operatorId,
      members: members.map((m) => ({
        id: m.user_id,
        firstName: m.first_name,
        lastName: m.last_name,
        email: m.email,
        role: m.role_slug,
        createdAt: m.created_at,
        lastLoginAt: m.last_login_at,
      })),
      drivers: drivers.map((d) => ({
        id: d.driver_id,
        firstName: d.first_name,
        lastName: d.last_name,
        email: d.email,
        phone: d.phone,
        status: d.status,
        createdAt: d.created_at,
      })),
      vehicles: vehicles.map((v) => ({
        id: v.vehicle_id,
        name: v.vehicle_name,
        type: v.vehicle_type,
        licensePlate: v.license_plate,
        color: v.color,
        capacity: v.capacity,
        createdAt: v.created_at,
      })),
      stats: {
        totalMembers: members.length,
        totalDrivers: drivers.length,
        activeDrivers,
        totalVehicles: vehicles.length,
        memberRoles,
      },
    })
  } catch (error) {
    console.error("Failed to fetch operator members:", error)
    return NextResponse.json(
      { error: "Failed to fetch members", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
