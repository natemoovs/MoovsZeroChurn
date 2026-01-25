import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { notion, NotionPropertyInput } from "@/lib/integrations"

// Map internal priority to Notion priority names
function mapPriorityToNotion(priority: string): string {
  const map: Record<string, string> = {
    urgent: "Urgent",
    high: "High",
    medium: "Medium",
    low: "Low",
  }
  return map[priority] || "Medium"
}

/**
 * Get a specific task
 * GET /api/tasks/[id]
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        playbook: {
          select: {
            id: true,
            name: true,
            trigger: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Task fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 })
  }
}

/**
 * Update a task
 * PATCH /api/tasks/[id]
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const body = await request.json()

    const {
      title,
      description,
      priority,
      status,
      dueDate,
      ownerId,
      ownerEmail,
      metadata,
      notionAssigneeId,
    } = body

    // Get existing task to access current metadata
    const existingTask = await prisma.task.findUnique({ where: { id } })
    const existingMetadata = (existingTask?.metadata as Record<string, unknown>) || {}

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) {
      updateData.status = status
      // Set completedAt when marking as completed
      if (status === "completed") {
        updateData.completedAt = new Date()
      } else if (status !== "completed") {
        updateData.completedAt = null
      }
    }
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null
    }
    if (ownerId !== undefined) updateData.ownerId = ownerId
    if (ownerEmail !== undefined) updateData.ownerEmail = ownerEmail
    if (metadata !== undefined) updateData.metadata = metadata

    // Handle notionAssigneeId - merge into metadata
    if (notionAssigneeId !== undefined) {
      updateData.metadata = {
        ...existingMetadata,
        notionAssigneeId,
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        playbook: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Sync changes to Notion if task has a notionPageId
    const taskMetadata = task.metadata as {
      notionPageId?: string
      notionAssigneeId?: string
    } | null
    if (taskMetadata?.notionPageId && process.env.NOTION_API_KEY) {
      try {
        const notionUpdate: Record<string, NotionPropertyInput> = {}

        // Sync status change
        if (status !== undefined) {
          const notionStatus =
            status === "completed"
              ? "Done"
              : status === "in_progress"
                ? "In Progress"
                : status === "cancelled"
                  ? "Cancelled"
                  : "To Do"
          notionUpdate["Status"] = { status: { name: notionStatus } }
        }

        // Sync assignee change
        if (notionAssigneeId !== undefined) {
          notionUpdate["Assignee"] = {
            people: [{ id: notionAssigneeId }],
          }
        }

        // Sync priority change
        if (priority !== undefined) {
          notionUpdate["Priority"] = { select: { name: mapPriorityToNotion(priority) } }
        }

        // Sync due date change
        if (dueDate !== undefined) {
          notionUpdate["Due"] = dueDate
            ? { date: { start: new Date(dueDate).toISOString().split("T")[0] } }
            : { date: null }
        }

        // Sync title change
        if (title !== undefined) {
          notionUpdate["Task Name"] = { title: [{ text: { content: title } }] }
        }

        if (Object.keys(notionUpdate).length > 0) {
          await notion.updatePage(taskMetadata.notionPageId, notionUpdate)
        }
      } catch (err) {
        console.error("Failed to sync task to Notion:", err)
      }
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Task update error:", error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

/**
 * Delete a task
 * DELETE /api/tasks/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.task.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Task delete error:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
