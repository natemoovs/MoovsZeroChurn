/**
 * Task Sync - Creates tasks in both local DB and Notion
 */

import { prisma } from "@/lib/db"
import { notion } from "@/lib/integrations"

const CSM_DATABASE_ID = process.env.NOTION_CSM_DATABASE_ID

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
  metadata?: Record<string, unknown>
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
        Name: {
          title: [{ text: { content: input.title } }],
        },
        Company: {
          rich_text: [{ text: { content: input.companyName } }],
        },
        Status: {
          status: { name: "To Do" },
        },
        Priority: {
          select: { name: mapPriority(input.priority) },
        },
      }

      if (input.dueDate) {
        notionProps["Due Date"] = {
          date: { start: input.dueDate.toISOString().split("T")[0] },
        }
      }

      if (input.description) {
        notionProps["Notes"] = {
          rich_text: [{ text: { content: input.description } }],
        }
      }

      // Add task type if from playbook
      if (input.playbookId) {
        notionProps["Task Type"] = {
          select: { name: "Playbook" },
        }
      }

      const page = await notion.createPage(
        CSM_DATABASE_ID,
        notionProps as Parameters<typeof notion.createPage>[1]
      )

      result.notionPageId = page.id
      result.notionUrl = page.url

      // Store Notion page ID in task metadata for future sync
      await prisma.task.update({
        where: { id: task.id },
        data: {
          metadata: {
            ...(input.metadata || {}),
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
