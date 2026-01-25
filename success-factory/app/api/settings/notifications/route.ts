import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/server"

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
 * Get notification preferences for current user
 * GET /api/settings/notifications
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (user) {
      // Get per-user preferences
      const userPref = await prisma.userPreference.findUnique({
        where: { neonUserId: user.id },
      })

      if (userPref?.alertPreferences) {
        return NextResponse.json({
          preferences: userPref.alertPreferences as unknown as NotificationPreferences,
          user: { email: user.email, name: user.name },
        })
      }
    }

    // Fallback to global settings
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
 * Save notification preferences for current user
 * POST /api/settings/notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { preferences } = body as { preferences: NotificationPreferences }

    if (!preferences) {
      return NextResponse.json({ error: "Preferences required" }, { status: 400 })
    }

    // Validate structure
    if (!preferences.channels || !preferences.alerts || !preferences.digest) {
      return NextResponse.json({ error: "Invalid preferences structure" }, { status: 400 })
    }

    const user = await getCurrentUser()

    if (user) {
      // Save per-user preferences
      await prisma.userPreference.upsert({
        where: { neonUserId: user.id },
        update: {
          alertPreferences: JSON.parse(JSON.stringify(preferences)),
        },
        create: {
          neonUserId: user.id,
          email: user.email,
          name: user.name,
          alertPreferences: JSON.parse(JSON.stringify(preferences)),
        },
      })

      return NextResponse.json({
        success: true,
        preferences,
        user: { email: user.email, name: user.name },
      })
    }

    // Fallback: save to global settings if no user
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
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 })
  }
}
