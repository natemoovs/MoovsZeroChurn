import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createTask } from "@/lib/tasks/sync"
import { requireAuth, isAuthError } from "@/lib/auth/api-middleware"

/**
 * Get all tasks with filtering
 * GET /api/tasks?status=pending&ownerId=123&companyId=456
 */
export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status")
  const ownerId = searchParams.get("ownerId")
  const companyId = searchParams.get("companyId")
  const priority = searchParams.get("priority")

  try {
    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }
    if (ownerId) {
      where.ownerId = ownerId
    }
    if (companyId) {
      where.companyId = companyId
    }
    if (priority) {
      where.priority = priority
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        playbook: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Calculate stats
    const stats = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      overdue: tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed"
      ).length,
      byPriority: {
        urgent: tasks.filter((t) => t.priority === "urgent").length,
        high: tasks.filter((t) => t.priority === "high").length,
        medium: tasks.filter((t) => t.priority === "medium").length,
        low: tasks.filter((t) => t.priority === "low").length,
      },
    }

    return NextResponse.json({
      tasks,
      stats,
    })
  } catch (error) {
    console.error("Tasks fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

/**
 * Create a new task (syncs to both DB and Notion)
 * POST /api/tasks
 */
export async function POST(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  try {
    const body = await request.json()

    const {
      companyId,
      companyName,
      title,
      description,
      priority = "medium",
      dueDate,
      ownerId,
      ownerEmail,
      playbookId,
      metadata,
    } = body

    if (!companyId || !companyName || !title) {
      return NextResponse.json(
        { error: "companyId, companyName, and title are required" },
        { status: 400 }
      )
    }

    // Create task in both DB and Notion
    const result = await createTask({
      companyId,
      companyName,
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      ownerId,
      ownerEmail,
      playbookId,
      metadata,
    })

    // Fetch the full task with playbook relation
    const task = await prisma.task.findUnique({
      where: { id: result.task.id },
      include: {
        playbook: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        ...task,
        notionUrl: result.notionUrl,
        notionSynced: !!result.notionPageId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Task create error:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
