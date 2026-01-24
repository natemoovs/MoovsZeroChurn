/**
 * Task Sync - Creates tasks in both local DB and Notion
 */

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { notion } from "@/lib/integrations"

const CSM_DATABASE_ID = process.env.NOTION_CSM_DATABASE_ID

// Notion user IDs for CSM assignment
const NOTION_USERS = {
  nate: "2d5d872b-594c-8152-a869-0002a290d93f",      // nate@moovsapp.com - Enterprise
  andrea: "2e6d872b-594c-815e-9450-0002a2899317",   // andrea@moovsapp.com - Mid-Market & SMB
} as const

export interface CreateTaskInput {
  companyId: string
  companyName: string
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  dueDate?: Date
  ownerId?: string
  ownerEmail?: string
  ownerName?: string
  playbookId?: string
  segment?: string           // enterprise, mid-market, smb, free
  tags?: string[]            // Optional tags for the task
  notionAssigneeId?: string  // Direct Notion user ID for assignment (overrides auto-assignment)
  metadata?: Prisma.InputJsonValue
}

interface CreateTaskResult {
  task: {
    id: string
    title: string
    companyName: string
  }
  notionPageId?: string
  notionUrl?: string
  notionError?: string
}

/**
 * Create a task in both local DB and Notion
 * Local DB is the source of truth, Notion sync is best-effort
 */
export async function createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
  // 1. Create in local DB first (always)
  const task = await prisma.task.create({
    data: {
      companyId: input.companyId,
      companyName: input.companyName,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: "pending",
      dueDate: input.dueDate,
      ownerId: input.ownerId,
      ownerEmail: input.ownerEmail,
      playbookId: input.playbookId,
      metadata: input.metadata,
    },
  })

  const result: CreateTaskResult = {
    task: {
      id: task.id,
      title: task.title,
      companyName: task.companyName,
    },
  }

  // 2. Sync to Notion (best-effort, don't fail if Notion is down)
  if (CSM_DATABASE_ID && process.env.NOTION_API_KEY) {
    try {
      const notionProps: Record<string, unknown> = {
        // Task Name - title field
        "Task Name": {
          title: [{ text: { content: input.title } }],
        },
        // Company - rich text
        Company: {
          rich_text: [{ text: { content: input.companyName } }],
        },
        // Status - status field
        Status: {
          status: { name: "To Do" },
        },
        // Priority - select field
        Priority: {
          select: { name: mapPriority(input.priority) },
        },
      }

      // Due - date field (3 days default if not specified)
      const dueDate = input.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      notionProps["Due"] = {
        date: { start: dueDate.toISOString().split("T")[0] },
      }

      // Assignee - people field
      // Priority: direct notionAssigneeId > owner email match > segment-based
      const assigneeId = input.notionAssigneeId || getNotionAssignee(input.ownerEmail, input.segment)
      if (assigneeId) {
        notionProps["Assignee"] = {
          people: [{ id: assigneeId }],
        }
      }

      // Tags - multi_select field
      const tags: string[] = input.tags || []
      if (input.playbookId) {
        tags.push("Playbook Task")
      }
      if (tags.length > 0) {
        notionProps["Tags"] = {
          multi_select: tags.map(name => ({ name })),
        }
      }

      // Notes - rich text for description
      if (input.description) {
        notionProps["Notes"] = {
          rich_text: [{ text: { content: input.description } }],
        }
      }

      const page = await notion.createPage(
        CSM_DATABASE_ID,
        notionProps as Parameters<typeof notion.createPage>[1]
      )

      result.notionPageId = page.id
      result.notionUrl = page.url

      // Store Notion page ID in task metadata for future sync
      const existingMetadata = (input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata))
        ? input.metadata as Record<string, unknown>
        : {}
      await prisma.task.update({
        where: { id: task.id },
        data: {
          metadata: {
            ...existingMetadata,
            notionPageId: page.id,
            notionUrl: page.url,
          },
        },
      })
    } catch (error) {
      console.error("Failed to sync task to Notion:", error)
      result.notionError = error instanceof Error ? error.message : "Unknown error"
    }
  }

  return result
}

/**
 * Map internal priority to Notion priority names
 */
function mapPriority(priority: string): string {
  const map: Record<string, string> = {
    urgent: "Urgent",
    high: "High",
    medium: "Medium",
    low: "Low",
  }
  return map[priority] || "Medium"
}

/**
 * Get Notion user ID for task assignment
 * Rules:
 * - Enterprise accounts → Nate
 * - Mid-Market & SMB → Andrea
 * - Can also match by owner email
 */
function getNotionAssignee(ownerEmail?: string, segment?: string): string | null {
  // First try to match by email
  if (ownerEmail) {
    const email = ownerEmail.toLowerCase()
    if (email.includes("nate")) return NOTION_USERS.nate
    if (email.includes("andrea")) return NOTION_USERS.andrea
  }

  // Fall back to segment-based assignment
  if (segment) {
    const seg = segment.toLowerCase()
    if (seg === "enterprise") return NOTION_USERS.nate
    if (seg === "mid-market" || seg === "smb" || seg === "free") return NOTION_USERS.andrea
  }

  // Default to Andrea for unassigned
  return NOTION_USERS.andrea
}

/**
 * Update task status in both DB and Notion
 */
export async function updateTaskStatus(
  taskId: string,
  status: "pending" | "in_progress" | "completed" | "cancelled"
): Promise<void> {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
  })

  // Sync to Notion if we have the page ID
  const metadata = task.metadata as { notionPageId?: string } | null
  if (metadata?.notionPageId && process.env.NOTION_API_KEY) {
    try {
      const notionStatus = mapStatusToNotion(status)
      await notion.updatePage(metadata.notionPageId, {
        Status: { status: { name: notionStatus } },
      })
    } catch (error) {
      console.error("Failed to sync task status to Notion:", error)
    }
  }
}

function mapStatusToNotion(status: string): string {
  const map: Record<string, string> = {
    pending: "To Do",
    in_progress: "In Progress",
    completed: "Done",
    cancelled: "Cancelled",
  }
  return map[status] || "To Do"
}

/**
 * Check if a similar task already exists (for deduplication)
 */
export async function taskExists(
  companyId: string,
  playbookId: string
): Promise<boolean> {
  const existing = await prisma.task.findFirst({
    where: {
      companyId,
      playbookId,
      status: { not: "completed" },
    },
  })
  return !!existing
}
