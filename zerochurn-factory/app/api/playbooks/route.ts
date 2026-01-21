import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Trigger types for playbooks
export const TRIGGER_TYPES = {
  // Health triggers
  health_drops_to_red: {
    label: "Health drops to Red",
    description: "When an account's health score changes to red",
    category: "health",
  },
  health_drops_to_yellow: {
    label: "Health drops to Yellow",
    description: "When an account's health score changes to yellow",
    category: "health",
  },
  health_improves_to_green: {
    label: "Health improves to Green",
    description: "When an account's health score improves to green",
    category: "health",
  },
  // Activity triggers
  inactive_30_days: {
    label: "Inactive 30+ days",
    description: "No login activity for 30+ days",
    category: "activity",
  },
  inactive_60_days: {
    label: "Inactive 60+ days",
    description: "No login activity for 60+ days",
    category: "activity",
  },
  low_usage: {
    label: "Low usage",
    description: "Less than 5 trips total",
    category: "activity",
  },
  // Journey triggers
  journey_to_at_risk: {
    label: "Journey: Moved to At Risk",
    description: "When account journey stage changes to at_risk",
    category: "journey",
  },
  journey_to_churned: {
    label: "Journey: Marked as Churned",
    description: "When account journey stage changes to churned",
    category: "journey",
  },
  journey_to_renewal: {
    label: "Journey: Entering Renewal",
    description: "When account journey stage changes to renewal",
    category: "journey",
  },
  journey_to_growth: {
    label: "Journey: Entering Growth",
    description: "When account reaches growth stage",
    category: "journey",
  },
  // Renewal triggers
  renewal_30_days: {
    label: "Renewal in 30 days",
    description: "Account renewal coming up in 30 days",
    category: "renewal",
  },
  renewal_60_days: {
    label: "Renewal in 60 days",
    description: "Account renewal coming up in 60 days",
    category: "renewal",
  },
  renewal_90_days: {
    label: "Renewal in 90 days",
    description: "Account renewal coming up in 90 days",
    category: "renewal",
  },
  renewal_at_risk: {
    label: "At-risk renewal approaching",
    description: "Renewal within 30 days with red/yellow health",
    category: "renewal",
  },
  // Lifecycle triggers
  new_customer: {
    label: "New customer onboarding",
    description: "When a new customer is added",
    category: "lifecycle",
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
