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
    // First, fetch all Notion users to get their names
    // The people property in tasks often doesn't include names
    const userMap = new Map<string, { name: string; email?: string }>()
    try {
      const usersRes = await fetch("https://api.notion.com/v1/users", {
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
        },
      })
      const usersData = await usersRes.json()
      if (usersData.results) {
        for (const user of usersData.results) {
          if (user.id && user.name) {
            userMap.set(user.id, {
              name: user.name,
              email: user.person?.email,
            })
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch Notion users:", e)
    }

    // Query active tasks from Notion (exclude completed/cancelled statuses)
    // Handle pagination to get all tasks
    const allPages: Array<{ id: string; url: string; properties: Record<string, unknown> }> = []
    let hasMore = true
    let startCursor: string | undefined

    while (hasMore) {
      const result = await notion.queryDatabase(CSM_DATABASE_ID, {
        filter: {
          and: [
            {
              property: "Status",
              status: { does_not_equal: "Done" },
            },
            {
              property: "Status",
              status: { does_not_equal: "Archived" },
            },
            {
              property: "Status",
              status: { does_not_equal: "Not doing anymore" },
            },
          ],
        },
        pageSize: 100,
        startCursor,
      })

      allPages.push(...(result.results as typeof allPages))
      hasMore = result.has_more
      startCursor = result.next_cursor || undefined
    }

    let created = 0
    let updated = 0
    let skipped = 0

    for (const page of allPages) {
      const props = page.properties

      // Extract task data from Notion
      // Support various property name conventions (including the title property which Notion uses)
      const title = extractTitle(props["Task Name"] || props["Name"] || props["Title"] || props["task"] || props["name"] || props["title"])
      const company = extractRichText(props["Company"])
      const status = extractStatus(props["Status"])
      const priority = extractSelect(props["Priority"])
      const dueDate = extractDate(props["Due"] || props["Due Date"])
      // Check both "Assigned To" (user's convention) and "Assignee" (common convention)
      const assigneeRaw = extractPerson(props["Assigned To"] || props["Assignee"])
      const notes = extractRichText(props["Notes"] || props["Description"] || props["Summary"])

      // Enrich assignee with name/email from user map if not present
      const assignee = assigneeRaw
        ? {
            ...assigneeRaw,
            name: assigneeRaw.name || userMap.get(assigneeRaw.id)?.name,
            email: assigneeRaw.email || userMap.get(assigneeRaw.id)?.email,
          }
        : null

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
        total: allPages.length,
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
  // Completed states (Notion "Complete" group: Archived, Done)
  if (s === "done" || s === "complete" || s === "completed" || s === "archived") return "completed"
  // In progress states (Notion "In progress" group)
  if (s === "in progress" || s === "doing" || s === "in-progress" || s === "active") return "in_progress"
  // Cancelled/skipped states
  if (s === "cancelled" || s === "canceled" || s === "closed" || s === "not doing anymore") return "cancelled"
  // Open/pending states (Notion "To-do" group: Accepted, Ingestion, etc.)
  if (s === "open" || s === "to do" || s === "todo" || s === "not started" || s === "backlog") return "pending"
  if (s === "accepted" || s === "ingestion") return "pending"
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
