import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface NotificationPreferences {
  channels: {
    slack: boolean
    email: boolean
  }
  alerts: {
    at_risk: boolean
    health_change: boolean
    renewal_upcoming: boolean
    payment_failed: boolean
    inactive: boolean
    journey_change: boolean
  }
  digest: {
    enabled: boolean
    frequency: "daily" | "weekly"
    channels: ("slack" | "email")[]
  }
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  channels: { slack: true, email: false },
  alerts: {
    at_risk: true,
    health_change: true,
    renewal_upcoming: true,
    payment_failed: true,
    inactive: true,
    journey_change: false,
  },
  digest: {
    enabled: true,
    frequency: "daily",
    channels: ["slack"],
  },
}

/**
 * Get notification preferences from database
 * GET /api/settings/notifications
 */
export async function GET() {
  try {
    const settings = await prisma.globalSettings.findUnique({
      where: { id: "default" },
    })

    if (settings?.notifications) {
      return NextResponse.json({
        preferences: settings.notifications as unknown as NotificationPreferences,
      })
    }

    return NextResponse.json({ preferences: DEFAULT_PREFERENCES })
  } catch (error) {
    console.error("Failed to get preferences:", error)
    return NextResponse.json({ preferences: DEFAULT_PREFERENCES })
  }
}

/**
 * Save notification preferences to database
 * POST /api/settings/notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { preferences } = body as { preferences: NotificationPreferences }

    if (!preferences) {
      return NextResponse.json(
        { error: "Preferences required" },
        { status: 400 }
      )
    }

    // Validate structure
    if (!preferences.channels || !preferences.alerts || !preferences.digest) {
      return NextResponse.json(
        { error: "Invalid preferences structure" },
        { status: 400 }
      )
    }

    // Upsert settings (create if doesn't exist, update if does)
    await prisma.globalSettings.upsert({
      where: { id: "default" },
      update: {
        notifications: JSON.parse(JSON.stringify(preferences)),
      },
      create: {
        id: "default",
        notifications: JSON.parse(JSON.stringify(preferences)),
      },
    })

    return NextResponse.json({ success: true, preferences })
  } catch (error) {
    console.error("Failed to save preferences:", error)
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    )
  }
}
