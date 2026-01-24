import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { notion } from "@/lib/integrations"

const CSM_DATABASE_ID = process.env.NOTION_CSM_DATABASE_ID

/**
 * POST /api/integrations/notion/tasks/sync
 * Sync tasks FROM Notion into the local database
 * This pulls tasks created by other teams/automations
 */
export async function POST() {
  if (!process.env.NOTION_API_KEY || !CSM_DATABASE_ID) {
    return NextResponse.json(
      { error: "Notion not configured" },
      { status: 500 }
    )
  }

  try {
    // Query all non-done tasks from Notion
    const result = await notion.queryDatabase(CSM_DATABASE_ID, {
      filter: {
        property: "Status",
        status: { does_not_equal: "Done" },
      },
      pageSize: 100,
    })

    let created = 0
    let updated = 0
    let skipped = 0

    for (const page of result.results) {
      const props = page.properties

      // Extract task data from Notion
      const title = extractTitle(props["Task Name"] || props["Name"])
      const company = extractRichText(props["Company"])
      const status = extractStatus(props["Status"])
      const priority = extractSelect(props["Priority"])
      const dueDate = extractDate(props["Due"] || props["Due Date"])
      const assignee = extractPerson(props["Assignee"])
      const notes = extractRichText(props["Notes"])

      if (!title) {
        skipped++
        continue
      }

      // Map Notion status to our status
      const mappedStatus = mapNotionStatus(status)
      const mappedPriority = mapNotionPriority(priority)

      // Check if we already have this task (by notionPageId in metadata)
      const existingTask = await prisma.task.findFirst({
        where: {
          metadata: {
            path: ["notionPageId"],
            equals: page.id,
          },
        },
      })

      if (existingTask) {
        // Update existing task
        await prisma.task.update({
          where: { id: existingTask.id },
          data: {
            title,
            description: notes || undefined,
            status: mappedStatus,
            priority: mappedPriority,
            dueDate: dueDate ? new Date(dueDate) : null,
            metadata: {
              notionPageId: page.id,
              notionUrl: page.url,
              notionAssigneeId: assignee?.id,
              notionAssigneeName: assignee?.name,
              syncedAt: new Date().toISOString(),
            },
          },
        })
        updated++
      } else {
        // Create new task
        await prisma.task.create({
          data: {
            companyId: company || "unknown",
            companyName: company || "Unknown Company",
            title,
            description: notes,
            status: mappedStatus,
            priority: mappedPriority,
            dueDate: dueDate ? new Date(dueDate) : null,
            ownerEmail: assignee?.email,
            metadata: {
              notionPageId: page.id,
              notionUrl: page.url,
              notionAssigneeId: assignee?.id,
              notionAssigneeName: assignee?.name,
              syncedFromNotion: true,
              syncedAt: new Date().toISOString(),
            },
          },
        })
        created++
      }
    }

    return NextResponse.json({
      success: true,
      synced: {
        created,
        updated,
        skipped,
        total: result.results.length,
      },
    })
  } catch (error) {
    console.error("Notion sync error:", error)
    return NextResponse.json(
      { error: "Failed to sync from Notion" },
      { status: 500 }
    )
  }
}

// Helper functions
function extractTitle(prop: unknown): string {
  if (!prop || typeof prop !== "object") return ""
  const p = prop as { type?: string; title?: Array<{ plain_text: string }> }
  if (p.type === "title" && p.title) {
    return p.title.map((t) => t.plain_text).join("")
  }
  return ""
}

function extractRichText(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null
  const p = prop as { type?: string; rich_text?: Array<{ plain_text: string }> }
  if (p.type === "rich_text" && p.rich_text) {
    const text = p.rich_text.map((t) => t.plain_text).join("")
    return text || null
  }
  return null
}

function extractSelect(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null
  const p = prop as { type?: string; select?: { name: string } | null }
  if (p.type === "select" && p.select) {
    return p.select.name
  }
  return null
}

function extractStatus(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null
  const p = prop as { type?: string; status?: { name: string } | null }
  if (p.type === "status" && p.status) {
    return p.status.name
  }
  return null
}

function extractDate(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null
  const p = prop as { type?: string; date?: { start: string } | null }
  if (p.type === "date" && p.date) {
    return p.date.start
  }
  return null
}

function extractPerson(prop: unknown): { id: string; name?: string; email?: string } | null {
  if (!prop || typeof prop !== "object") return null
  const p = prop as {
    type?: string
    people?: Array<{ id: string; name?: string; person?: { email: string } }>
  }
  if (p.type === "people" && p.people && p.people.length > 0) {
    const person = p.people[0]
    return {
      id: person.id,
      name: person.name,
      email: person.person?.email,
    }
  }
  return null
}

function mapNotionStatus(status: string | null): "pending" | "in_progress" | "completed" | "cancelled" {
  if (!status) return "pending"
  const s = status.toLowerCase()
  if (s === "done" || s === "complete" || s === "completed") return "completed"
  if (s === "in progress" || s === "doing") return "in_progress"
  if (s === "cancelled" || s === "canceled") return "cancelled"
  return "pending"
}

function mapNotionPriority(priority: string | null): "low" | "medium" | "high" | "urgent" {
  if (!priority) return "medium"
  const p = priority.toLowerCase()
  if (p === "urgent" || p === "critical") return "urgent"
  if (p === "high") return "high"
  if (p === "low") return "low"
  return "medium"
}
