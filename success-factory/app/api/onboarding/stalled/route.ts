import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createTask, taskExists } from "@/lib/tasks/sync"

// Playbook action type
interface PlaybookAction {
  type: "create_task"
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  dueInDays?: number
}

/**
 * Execute playbooks for onboarding stalled accounts
 * Creates tasks in both local DB and Notion
 */
async function executeOnboardingPlaybooks(account: {
  companyId: string
  companyName: string
  overdueMilestones: string[]
  severity: string
  segment?: string
  ownerId?: string
  ownerEmail?: string
  ownerName?: string
}) {
  try {
    const trigger = account.severity === "critical" ? "onboarding_stalled" : "milestone_overdue"

    const playbooks = await prisma.playbook.findMany({
      where: {
        trigger,
        isActive: true,
      },
    })

    for (const playbook of playbooks) {
      const actions = playbook.actions as unknown as PlaybookAction[]

      for (const action of actions) {
        if (action.type === "create_task") {
          // Check if task already exists to avoid duplicates
          if (await taskExists(account.companyId, playbook.id)) {
            continue
          }

          const dueDate = action.dueInDays
            ? new Date(Date.now() + action.dueInDays * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Default: 2 days

          // Create task in both DB and Notion
          await createTask({
            companyId: account.companyId,
            companyName: account.companyName,
            title: action.title
              .replace("{companyName}", account.companyName)
              .replace("{milestones}", account.overdueMilestones.join(", ")),
            description: action.description
              ?.replace("{companyName}", account.companyName)
              .replace("{milestones}", account.overdueMilestones.join(", ")),
            priority: action.priority || "high",
            dueDate,
            ownerId: account.ownerId,
            ownerEmail: account.ownerEmail,
            ownerName: account.ownerName,
            segment: account.segment,
            tags: ["Onboarding"],
            playbookId: playbook.id,
            metadata: {
              trigger,
              overdueMilestones: account.overdueMilestones,
              severity: account.severity,
              createdBy: "playbook",
            },
          })
        }
      }
    }
  } catch (error) {
    console.error("Onboarding playbook execution error:", error)
  }
}

/**
 * GET /api/onboarding/stalled
 * Get all accounts with stalled onboardings (overdue milestones)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const triggerPlaybooks = searchParams.get("trigger") === "true"
  try {
    // Get all overdue milestones grouped by company
    const overdueMilestones = await prisma.onboardingMilestone.findMany({
      where: {
        isOverdue: true,
        completedAt: null,
      },
      orderBy: [{ companyId: "asc" }, { targetDays: "asc" }],
    })

    // Group by company
    const byCompany = new Map<
      string,
      { companyId: string; companyName: string; overdueMilestones: string[] }
    >()

    for (const m of overdueMilestones) {
      if (!byCompany.has(m.companyId)) {
        byCompany.set(m.companyId, {
          companyId: m.companyId,
          companyName: m.companyName,
          overdueMilestones: [],
        })
      }
      byCompany.get(m.companyId)!.overdueMilestones.push(m.milestone)
    }

    // Get company details for context
    const companyIds = Array.from(byCompany.keys())
    const companies = await prisma.hubSpotCompany.findMany({
      where: { hubspotId: { in: companyIds } },
      select: {
        hubspotId: true,
        name: true,
        mrr: true,
        customerSegment: true,
        planCode: true,
        healthScore: true,
        hubspotCreatedAt: true,
        createdAt: true,
        ownerId: true,
        ownerEmail: true,
        ownerName: true,
      },
    })

    // Enrich stalled accounts with company data
    const stalledAccounts = Array.from(byCompany.values()).map((account) => {
      const company = companies.find((c) => c.hubspotId === account.companyId)
      const signupDate = company?.hubspotCreatedAt || company?.createdAt || new Date()
      const daysSinceSignup = Math.floor(
        (Date.now() - new Date(signupDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        ...account,
        mrr: company?.mrr || 0,
        segment: company?.customerSegment || "free",
        healthScore: company?.healthScore || "unknown",
        daysSinceSignup,
        overdueCount: account.overdueMilestones.length,
        severity:
          account.overdueMilestones.length >= 3
            ? "critical"
            : account.overdueMilestones.length >= 2
            ? "high"
            : "medium",
        ownerId: company?.ownerId || undefined,
        ownerEmail: company?.ownerEmail || undefined,
        ownerName: company?.ownerName || undefined,
      }
    })

    // Sort by severity and MRR
    stalledAccounts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2 }
      const aSev = severityOrder[a.severity as keyof typeof severityOrder]
      const bSev = severityOrder[b.severity as keyof typeof severityOrder]
      if (aSev !== bSev) return aSev - bSev
      return (b.mrr || 0) - (a.mrr || 0)
    })

    // Summary stats
    const summary = {
      totalStalled: stalledAccounts.length,
      critical: stalledAccounts.filter((a) => a.severity === "critical").length,
      high: stalledAccounts.filter((a) => a.severity === "high").length,
      medium: stalledAccounts.filter((a) => a.severity === "medium").length,
      totalMrrAtRisk: stalledAccounts.reduce((sum, a) => sum + (a.mrr || 0), 0),
    }

    // Trigger playbooks if requested (e.g., from cron job)
    if (triggerPlaybooks) {
      for (const account of stalledAccounts) {
        await executeOnboardingPlaybooks(account)
      }
    }

    return NextResponse.json({
      stalledAccounts,
      summary,
    })
  } catch (error) {
    console.error("Failed to get stalled onboardings:", error)
    return NextResponse.json(
      { error: "Failed to get stalled onboardings" },
      { status: 500 }
    )
  }
}
