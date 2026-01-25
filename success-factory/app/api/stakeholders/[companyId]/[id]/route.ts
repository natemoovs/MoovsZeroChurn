import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Playbook action type
interface PlaybookAction {
  type: "create_task"
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  dueInDays?: number
}

/**
 * Execute playbooks for champion leaving
 */
async function executeChampionLeftPlaybooks(stakeholder: { companyId: string; name: string }) {
  try {
    // Get company name
    const company = await prisma.hubSpotCompany.findFirst({
      where: { hubspotId: stakeholder.companyId },
      select: { name: true },
    })
    const companyName = company?.name || "Unknown Company"

    const playbooks = await prisma.playbook.findMany({
      where: {
        trigger: "champion_left",
        isActive: true,
      },
    })

    for (const playbook of playbooks) {
      const actions = playbook.actions as unknown as PlaybookAction[]

      for (const action of actions) {
        if (action.type === "create_task") {
          const dueDate = action.dueInDays
            ? new Date(Date.now() + action.dueInDays * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // Default: 1 day - urgent

          await prisma.task.create({
            data: {
              companyId: stakeholder.companyId,
              companyName,
              title: action.title
                .replace("{companyName}", companyName)
                .replace("{championName}", stakeholder.name),
              description: action.description
                ?.replace("{companyName}", companyName)
                .replace("{championName}", stakeholder.name),
              priority: action.priority || "urgent",
              status: "pending",
              dueDate,
              playbookId: playbook.id,
              metadata: {
                trigger: "champion_left",
                championName: stakeholder.name,
                createdBy: "playbook",
              },
            },
          })
        }
      }
    }
  } catch (error) {
    console.error("Champion left playbook execution error:", error)
  }
}

/**
 * PATCH /api/stakeholders/[companyId]/[id]
 * Update a stakeholder
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const stakeholder = await prisma.stakeholder.findUnique({
      where: { id },
    })

    if (!stakeholder) {
      return NextResponse.json({ error: "Stakeholder not found" }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      "name",
      "email",
      "phone",
      "title",
      "role",
      "sentiment",
      "influence",
      "engagement",
      "notes",
      "isActive",
      "lastContactAt",
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Handle left company
    if (body.leftCompany === true) {
      updateData.leftCompanyAt = new Date()
      updateData.isActive = false

      // Log activity and trigger playbooks for champion leaving
      if (stakeholder.role === "champion") {
        await prisma.activityEvent.create({
          data: {
            companyId: stakeholder.companyId,
            source: "platform",
            eventType: "champion_left",
            title: `Champion left: ${stakeholder.name}`,
            description: "Key relationship risk - champion has left the company",
            importance: "critical",
            occurredAt: new Date(),
          },
        })

        // Execute champion_left playbooks
        await executeChampionLeftPlaybooks({
          companyId: stakeholder.companyId,
          name: stakeholder.name,
        })
      }
    }

    const updated = await prisma.stakeholder.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, stakeholder: updated })
  } catch (error) {
    console.error("Failed to update stakeholder:", error)
    return NextResponse.json({ error: "Failed to update stakeholder" }, { status: 500 })
  }
}

/**
 * DELETE /api/stakeholders/[companyId]/[id]
 * Delete a stakeholder
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> }
) {
  try {
    const { id } = await params

    await prisma.stakeholder.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete stakeholder:", error)
    return NextResponse.json({ error: "Failed to delete stakeholder" }, { status: 500 })
  }
}
