import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * POST /api/accounts/handoff
 * Transfer account ownership with full handoff process
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      companyId,
      newOwnerEmail,
      newOwnerName,
      handoffNotes,
      openItems,
      transferTasks,
      notifyStakeholders,
    } = body

    if (!companyId || !newOwnerEmail) {
      return NextResponse.json(
        { error: "companyId and newOwnerEmail required" },
        { status: 400 }
      )
    }

    // Get company
    const company = await prisma.hubSpotCompany.findFirst({
      where: {
        OR: [{ hubspotId: companyId }, { id: companyId }],
      },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const previousOwner = {
      email: company.ownerEmail,
      name: company.ownerName,
    }

    // Update company owner
    await prisma.hubSpotCompany.update({
      where: { id: company.id },
      data: {
        ownerEmail: newOwnerEmail,
        ownerName: newOwnerName,
      },
    })

    // Create handoff task for new owner
    await prisma.task.create({
      data: {
        companyId: company.hubspotId,
        companyName: company.name,
        title: `Account Handoff: Review ${company.name}`,
        description: `This account was transferred to you from ${previousOwner.name || previousOwner.email || "previous owner"}.

**Handoff Notes:**
${handoffNotes || "No notes provided."}

**Open Items:**
${openItems?.length ? openItems.map((item: string) => `- ${item}`).join("\n") : "- None listed"}

Please review the account, reach out to stakeholders, and update any open tasks.`,
        priority: "high",
        status: "pending",
        ownerEmail: newOwnerEmail,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        metadata: {
          handoff: true,
          previousOwnerEmail: previousOwner.email,
          previousOwnerName: previousOwner.name,
          handoffAt: new Date().toISOString(),
        },
      },
    })

    // Transfer open tasks if requested
    if (transferTasks) {
      await prisma.task.updateMany({
        where: {
          companyId: company.hubspotId,
          status: { notIn: ["completed", "cancelled"] },
        },
        data: {
          ownerEmail: newOwnerEmail,
        },
      })
    }

    // Log the handoff as an activity event
    await prisma.activityEvent.create({
      data: {
        companyId: company.hubspotId,
        source: "platform",
        eventType: "account_handoff",
        title: `Account transferred to ${newOwnerName}`,
        description: `Ownership transferred from ${previousOwner.name || previousOwner.email || "unassigned"} to ${newOwnerName}`,
        metadata: {
          previousOwnerEmail: previousOwner.email,
          previousOwnerName: previousOwner.name,
          newOwnerEmail,
          newOwnerName,
          handoffNotes,
          openItems,
          transferTasks,
          notifyStakeholders,
        },
        importance: "high",
        occurredAt: new Date(),
      },
    })

    // TODO: If notifyStakeholders, send emails to mapped stakeholders

    return NextResponse.json({
      success: true,
      companyId: company.hubspotId,
      previousOwner,
      newOwner: {
        email: newOwnerEmail,
        name: newOwnerName,
      },
      tasksTransferred: transferTasks,
    })
  } catch (error) {
    console.error("[Account Handoff] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Handoff failed" },
      { status: 500 }
    )
  }
}
