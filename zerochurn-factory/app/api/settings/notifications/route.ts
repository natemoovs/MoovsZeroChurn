import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// In production, this would be stored in the database per user
// For now, we'll use a simple in-memory store / cookie approach
const PREFS_COOKIE = "zerochurn_notification_prefs"

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
 * Get notification preferences
 * GET /api/settings/notifications
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const prefsCookie = cookieStore.get(PREFS_COOKIE)

    if (prefsCookie?.value) {
      const preferences = JSON.parse(prefsCookie.value) as NotificationPreferences
      return NextResponse.json({ preferences })
    }

    return NextResponse.json({ preferences: DEFAULT_PREFERENCES })
  } catch (error) {
    console.error("Failed to get preferences:", error)
    return NextResponse.json({ preferences: DEFAULT_PREFERENCES })
  }
}

/**
 * Save notification preferences
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

    // Store in cookie (in production, store in database)
    const cookieStore = await cookies()
    cookieStore.set(PREFS_COOKIE, JSON.stringify(preferences), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
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
