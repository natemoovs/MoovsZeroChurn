import { NextRequest, NextResponse } from "next/server"
import { metabase } from "@/lib/integrations/metabase"
import { isAuthenticated } from "@/lib/auth/server"

// Public dashboard token for Moovs Subscriptions
const PUBLIC_DASHBOARD_TOKEN = "a5f94698-23ff-4785-8448-403523a1c21f"

/**
 * Sync data from Metabase public dashboard
 * GET /api/sync/metabase-dashboard - Get dashboard data
 * POST /api/sync/metabase-dashboard - Trigger sync (requires auth)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get("token") || PUBLIC_DASHBOARD_TOKEN

  try {
    console.log(`Fetching public dashboard: ${token}`)

    const dashboardData = await metabase.getPublicDashboardData(token)

    return NextResponse.json({
      success: true,
      dashboard: {
        name: dashboardData.dashboardName,
        id: dashboardData.dashboardId,
        syncedAt: dashboardData.syncedAt,
      },
      cardCount: Object.keys(dashboardData.cards).length,
      cards: Object.entries(dashboardData.cards).map(([name, data]) => ({
        name,
        cardId: data.cardId,
        display: data.display,
        rowCount: data.rowCount,
        columns: data.columns,
        error: data.error,
        // Include first 5 rows as preview
        preview: data.rows.slice(0, 5),
      })),
    })
  } catch (error) {
    console.error("Dashboard fetch failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}

/**
 * Sync dashboard data to database
 * POST /api/sync/metabase-dashboard
 */
export async function POST(request: NextRequest) {
  // Auth check
  const userLoggedIn = await isAuthenticated()
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  const isAuthorized =
    process.env.NODE_ENV === "development" ||
    userLoggedIn ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    request.headers.get("x-vercel-cron") === "1"

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const token = body.token || PUBLIC_DASHBOARD_TOKEN

    console.log(`Syncing public dashboard: ${token}`)

    const dashboardData = await metabase.getPublicDashboardData(token)

    // Log what we got
    const summary = {
      dashboardName: dashboardData.dashboardName,
      dashboardId: dashboardData.dashboardId,
      syncedAt: dashboardData.syncedAt,
      cards: Object.entries(dashboardData.cards).map(([name, data]) => ({
        name,
        rowCount: data.rowCount,
        columns: data.columns.length,
        hasError: !!data.error,
      })),
    }

    console.log("Dashboard sync summary:", JSON.stringify(summary, null, 2))

    // Return the full data for processing
    return NextResponse.json({
      success: true,
      ...dashboardData,
    })
  } catch (error) {
    console.error("Dashboard sync failed:", error)
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}
