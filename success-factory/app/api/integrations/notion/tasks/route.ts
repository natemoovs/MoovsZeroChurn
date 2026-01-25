import { NextRequest, NextResponse } from "next/server"
import { notion } from "@/lib/integrations"

const CSM_DATABASE_ID = process.env.NOTION_CSM_DATABASE_ID

// ============================================================================
// Types
// ============================================================================

interface CSMTask {
  id: string
  title: string
  status: string
  priority: string | null
  dueDate: string | null
  assignee: string | null
  companyName: string | null
  taskType: string | null
  notes: string | null
  createdAt: string
  lastEdited: string
  url: string
}

interface CreateTaskInput {
  title: string
  companyName: string
  status?: string
  priority?: string
  dueDate?: string
  taskType?: string
  notes?: string
}

// ============================================================================
// GET: List CSM tasks with optional filters
// ============================================================================

/**
 * GET /api/integrations/notion/tasks
 * Query params:
 *   - status: Filter by status (e.g., "To Do", "In Progress", "Done")
 *   - company: Filter by company name
 *   - limit: Max results (default 50)
 */
export async function GET(request: NextRequest) {
  if (!process.env.NOTION_API_KEY || !CSM_DATABASE_ID) {
    return NextResponse.json({
      tasks: [],
      configured: false,
      error: "Notion not configured. Set NOTION_API_KEY and NOTION_CSM_DATABASE_ID",
    })
  }

  const searchParams = request.nextUrl.searchParams
  const statusFilter = searchParams.get("status")
  const companyFilter = searchParams.get("company")
  const limit = parseInt(searchParams.get("limit") || "50", 10)

  try {
    // Build filter
    const filters: Array<{
      property: string
      status?: { equals: string }
      rich_text?: { contains: string }
    }> = []

    if (statusFilter) {
      filters.push({
        property: "Status",
        status: { equals: statusFilter },
      })
    }

    if (companyFilter) {
      filters.push({
        property: "Company",
        rich_text: { contains: companyFilter },
      })
    }

    const result = await notion.queryDatabase(CSM_DATABASE_ID, {
      filter:
        filters.length > 0 ? (filters.length === 1 ? filters[0] : { and: filters }) : undefined,
      sorts: [
        { property: "Due Date", direction: "ascending" },
        { property: "Priority", direction: "ascending" },
      ],
      pageSize: Math.min(limit, 100),
    })

    const tasks: CSMTask[] = result.results.map((page) => ({
      id: page.id,
      title: notion.extractTitle(page.properties["Title"] || page.properties["Name"]),
      status: notion.extractSelect(page.properties["Status"]) || "Unknown",
      priority: notion.extractSelect(page.properties["Priority"]),
      dueDate: notion.extractDate(page.properties["Due Date"]),
      assignee: extractPerson(page.properties["Assignee"]),
      companyName: notion.extractRichText(page.properties["Company"]) || null,
      taskType: notion.extractSelect(page.properties["Task Type"]),
      notes: notion.extractRichText(page.properties["Notes"]),
      createdAt: page.created_time,
      lastEdited: page.last_edited_time,
      url: page.url,
    }))

    return NextResponse.json({
      tasks,
      total: tasks.length,
      hasMore: result.has_more,
      configured: true,
    })
  } catch (error) {
    console.error("Notion tasks fetch error:", error)
    return NextResponse.json(
      { tasks: [], error: "Failed to fetch tasks from Notion" },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST: Create a new CSM task
// ============================================================================

/**
 * POST /api/integrations/notion/tasks
 * Body: CreateTaskInput
 */
export async function POST(request: NextRequest) {
  if (!process.env.NOTION_API_KEY || !CSM_DATABASE_ID) {
    return NextResponse.json({ error: "Notion not configured" }, { status: 500 })
  }

  try {
    const body: CreateTaskInput = await request.json()

    if (!body.title || !body.companyName) {
      return NextResponse.json({ error: "title and companyName are required" }, { status: 400 })
    }

    const properties: Record<string, unknown> = {
      // Title field - try common names
      Name: {
        title: [{ text: { content: body.title } }],
      },
      Company: {
        rich_text: [{ text: { content: body.companyName } }],
      },
    }

    // Optional fields
    if (body.status) {
      properties["Status"] = { status: { name: body.status } }
    }

    if (body.priority) {
      properties["Priority"] = { select: { name: body.priority } }
    }

    if (body.dueDate) {
      properties["Due Date"] = { date: { start: body.dueDate } }
    }

    if (body.taskType) {
      properties["Task Type"] = { select: { name: body.taskType } }
    }

    if (body.notes) {
      properties["Notes"] = {
        rich_text: [{ text: { content: body.notes } }],
      }
    }

    const page = await notion.createPage(
      CSM_DATABASE_ID,
      properties as Record<string, Parameters<typeof notion.createPage>[1][string]>
    )

    return NextResponse.json({
      success: true,
      task: {
        id: page.id,
        url: page.url,
        title: body.title,
        companyName: body.companyName,
      },
    })
  } catch (error) {
    console.error("Notion task create error:", error)
    return NextResponse.json({ error: "Failed to create task in Notion" }, { status: 500 })
  }
}

// ============================================================================
// Helpers
// ============================================================================

function extractPerson(
  property: { type: string; people?: Array<{ name?: string }> } | undefined
): string | null {
  if (property?.type === "people" && property.people && property.people.length > 0) {
    return property.people[0]?.name || null
  }
  return null
}
