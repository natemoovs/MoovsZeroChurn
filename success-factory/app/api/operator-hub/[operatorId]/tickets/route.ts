import { NextRequest, NextResponse } from "next/server"
import { notion } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/tickets
 *
 * Fetches support tickets from Notion related to an operator.
 * Searches by operator name in tags and ticket titles.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params

    // Get operator name from query param (passed from client)
    const searchParams = request.nextUrl.searchParams
    const operatorName = searchParams.get("name")

    if (!operatorName) {
      return NextResponse.json({
        operatorId,
        tickets: [],
        stats: { total: 0, open: 0, closed: 0, highPriority: 0 },
        message: "No operator name provided for ticket search",
      })
    }

    // Search tickets by operator name
    const tickets = await notion.searchTicketsByCustomer(operatorName)

    // Calculate stats
    const openStatuses = ["In Progress", "Todo", "Not Started", "Backlog", "Open"]
    const closedStatuses = ["Done", "Completed", "Closed", "Archived"]

    const stats = {
      total: tickets.length,
      open: tickets.filter((t) => t.status && openStatuses.some((s) => t.status?.includes(s)))
        .length,
      closed: tickets.filter((t) => t.status && closedStatuses.some((s) => t.status?.includes(s)))
        .length,
      highPriority: tickets.filter((t) => t.priority === "High" || t.priority === "Urgent").length,
    }

    return NextResponse.json({
      operatorId,
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        stage: ticket.stage,
        tags: ticket.tags,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        url: ticket.url,
      })),
      stats,
    })
  } catch (error) {
    console.error("Failed to fetch operator tickets:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch tickets",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
