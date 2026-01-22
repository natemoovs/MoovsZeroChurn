import { NextRequest, NextResponse } from "next/server"

/**
 * Debug endpoint to test what data the skill generation receives
 * GET /api/debug/skill-context?segment=all
 *
 * This helps diagnose why portfolio skills might not be getting data
 */
export async function GET(request: NextRequest) {
  const segment = request.nextUrl.searchParams.get("segment") || "all"

  const debug: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    segment,
    environment: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "(not set)",
      VERCEL_URL: process.env.VERCEL_URL || "(not set)",
      NODE_ENV: process.env.NODE_ENV,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasMetabaseUrl: !!process.env.METABASE_URL,
      hasMetabaseKey: !!process.env.METABASE_API_KEY,
      hasHubspotToken: !!process.env.HUBSPOT_ACCESS_TOKEN,
    },
    portfolioFetch: {},
  }

  // Determine the base URL (same logic as skill generation)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || "http://localhost:3000"

  debug.baseUrl = baseUrl

  // Try to fetch portfolio data
  try {
    const portfolioUrl = `${baseUrl}/api/integrations/portfolio?segment=${encodeURIComponent(segment)}`
    debug.portfolioUrl = portfolioUrl

    const response = await fetch(portfolioUrl, {
      headers: { "Content-Type": "application/json" },
    })

    // Check content type
    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      const textPreview = await response.text()
      debug.portfolioFetch = {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        ok: response.ok,
        error: "Non-JSON response",
        bodyPreview: textPreview.slice(0, 500),
      }
    } else {
      const data = await response.json()
      debug.portfolioFetch = {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        ok: response.ok,
        summaryCount: data.summaries?.length || 0,
        total: data.total,
        configured: data.configured,
        sync: data.sync,
        // Include first 3 company names as sample
        sampleCompanies: data.summaries?.slice(0, 3).map((s: { companyName: string; healthScore: string; mrr: number }) => ({
          name: s.companyName,
          health: s.healthScore,
          mrr: s.mrr,
        })),
      }
    }
  } catch (error) {
    debug.portfolioFetch = {
      error: "Fetch failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }
  }

  return NextResponse.json(debug)
}
