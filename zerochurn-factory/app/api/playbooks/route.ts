import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Trigger types for playbooks
export const TRIGGER_TYPES = {
  health_drops_to_red: {
    label: "Health drops to Red",
    description: "When an account's health score changes to red",
  },
  health_drops_to_yellow: {
    label: "Health drops to Yellow",
    description: "When an account's health score changes to yellow",
  },
  inactive_30_days: {
    label: "Inactive 30+ days",
    description: "No login activity for 30+ days",
  },
  inactive_60_days: {
    label: "Inactive 60+ days",
    description: "No login activity for 60+ days",
  },
  low_usage: {
    label: "Low usage",
    description: "Less than 5 trips total",
  },
  new_customer: {
    label: "New customer onboarding",
    description: "When a new customer is added",
  },
}

/**
 * Get all playbooks
 * GET /api/playbooks?active=true
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const active = searchParams.get("active")

  try {
    const where: Record<string, unknown> = {}

    if (active !== null) {
      where.isActive = active === "true"
    }

    const playbooks = await prisma.playbook.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    })

    return NextResponse.json({
      playbooks: playbooks.map((p) => ({
        ...p,
        taskCount: p._count.tasks,
        _count: undefined,
      })),
      total: playbooks.length,
      triggerTypes: TRIGGER_TYPES,
    })
  } catch (error) {
    console.error("Playbooks fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch playbooks" },
      { status: 500 }
    )
  }
}

/**
 * Create a new playbook
 * POST /api/playbooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, description, trigger, actions, isActive = true } = body

    if (!name || !trigger || !actions) {
      return NextResponse.json(
        { error: "name, trigger, and actions are required" },
        { status: 400 }
      )
    }

    const playbook = await prisma.playbook.create({
      data: {
        name,
        description,
        trigger,
        actions,
        isActive,
      },
    })

    return NextResponse.json(playbook, { status: 201 })
  } catch (error) {
    console.error("Playbook create error:", error)
    return NextResponse.json(
      { error: "Failed to create playbook" },
      { status: 500 }
    )
  }
}
