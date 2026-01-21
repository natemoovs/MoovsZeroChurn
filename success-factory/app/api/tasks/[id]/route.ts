import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Get a specific task
 * GET /api/tasks/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    )
  }
}

/**
 * Update a task
 * PATCH /api/tasks/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    } = body

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

    return NextResponse.json(task)
  } catch (error) {
    console.error("Task update error:", error)
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    )
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
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    )
  }
}
