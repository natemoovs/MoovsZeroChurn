import { NextRequest, NextResponse } from "next/server"
import { twilio } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/sms
 *
 * Fetches SMS message history for a contact.
 * Query params:
 * - phone: The phone number to fetch messages for (required)
 * - limit: Maximum number of messages to return (default: 100)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")
    const limit = parseInt(searchParams.get("limit") || "100", 10)

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      )
    }

    if (!twilio.isConfigured()) {
      return NextResponse.json(
        { error: "Twilio not configured" },
        { status: 503 }
      )
    }

    // Fetch combined message history (both to and from the phone number)
    const messageHistory = await twilio.getMessageHistory(phone, limit)

    return NextResponse.json({
      operatorId,
      phone,
      ...messageHistory,
    })
  } catch (error) {
    console.error("Failed to fetch SMS history:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch SMS history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
