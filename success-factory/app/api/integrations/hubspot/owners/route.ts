import { NextResponse } from "next/server"
import { hubspot } from "@/lib/integrations"

/**
 * Get all HubSpot owners (CSMs/Users)
 * GET /api/integrations/hubspot/owners
 */
export async function GET() {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    return NextResponse.json({
      configured: false,
      error: "HubSpot not configured",
    })
  }

  try {
    const owners = await hubspot.getOwners()

    return NextResponse.json({
      configured: true,
      owners: owners.map((owner) => ({
        id: owner.id,
        email: owner.email,
        name: `${owner.firstName} ${owner.lastName}`.trim(),
        firstName: owner.firstName,
        lastName: owner.lastName,
      })),
      total: owners.length,
    })
  } catch (error) {
    console.error("Failed to fetch HubSpot owners:", error)
    return NextResponse.json(
      { error: "Failed to fetch owners" },
      { status: 500 }
    )
  }
}
