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
      return NextResponse.json({ error: "Snowflake/Metabase not configured" }, { status: 503 })
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
      {
        error: "Failed to fetch members",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/operator-hub/[operatorId]/members
 *
 * Add a new member to the operator's platform.
 * Requires direct Snowflake connection for write operations.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params

    if (!snowflake.isWriteEnabled()) {
      return NextResponse.json(
        { error: "Write operations not available. Direct Snowflake connection required." },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { email, firstName, lastName, roleSlug } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const result = await snowflake.addOperatorMember({
      operatorId,
      email,
      firstName,
      lastName,
      roleSlug: roleSlug || "member",
    })

    return NextResponse.json({
      success: true,
      userId: result.userId,
      message: "Member added successfully",
    })
  } catch (error) {
    console.error("Failed to add member:", error)
    return NextResponse.json(
      {
        error: "Failed to add member",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/operator-hub/[operatorId]/members
 *
 * Update a member's role.
 * Requires direct Snowflake connection for write operations.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params

    if (!snowflake.isWriteEnabled()) {
      return NextResponse.json(
        { error: "Write operations not available. Direct Snowflake connection required." },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { userId, roleSlug } = body

    if (!userId || !roleSlug) {
      return NextResponse.json({ error: "userId and roleSlug are required" }, { status: 400 })
    }

    const validRoles = ["owner", "admin", "member", "dispatcher", "driver_manager", "accountant"]
    if (!validRoles.includes(roleSlug)) {
      return NextResponse.json(
        { error: `Invalid role. Valid roles: ${validRoles.join(", ")}` },
        { status: 400 }
      )
    }

    const success = await snowflake.updateMemberRole({
      userId,
      operatorId,
      roleSlug,
    })

    if (!success) {
      return NextResponse.json({ error: "Member not found or already removed" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Member role updated successfully",
    })
  } catch (error) {
    console.error("Failed to update member role:", error)
    return NextResponse.json(
      {
        error: "Failed to update member role",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/operator-hub/[operatorId]/members
 *
 * Remove a member from the operator's platform (soft delete).
 * Requires direct Snowflake connection for write operations.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params

    if (!snowflake.isWriteEnabled()) {
      return NextResponse.json(
        { error: "Write operations not available. Direct Snowflake connection required." },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 })
    }

    const success = await snowflake.removeMember(userId, operatorId)

    if (!success) {
      return NextResponse.json({ error: "Member not found or already removed" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    })
  } catch (error) {
    console.error("Failed to remove member:", error)
    return NextResponse.json(
      {
        error: "Failed to remove member",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
