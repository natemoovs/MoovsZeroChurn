import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Get a single playbook
 * GET /api/playbooks/[id]
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const playbook = await prisma.playbook.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: { tasks: true },
        },
      },
    })

    if (!playbook) {
      return NextResponse.json({ error: "Playbook not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...playbook,
      taskCount: playbook._count.tasks,
    })
  } catch (error) {
    console.error("Playbook fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch playbook" }, { status: 500 })
  }
}

/**
 * Update a playbook
 * PATCH /api/playbooks/[id]
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const body = await request.json()
    const { name, description, trigger, actions, isActive } = body

    const playbook = await prisma.playbook.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(trigger !== undefined && { trigger }),
        ...(actions !== undefined && { actions }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(playbook)
  } catch (error) {
    console.error("Playbook update error:", error)
    return NextResponse.json({ error: "Failed to update playbook" }, { status: 500 })
  }
}

/**
 * Delete a playbook
 * DELETE /api/playbooks/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.playbook.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Playbook delete error:", error)
    return NextResponse.json({ error: "Failed to delete playbook" }, { status: 500 })
  }
}
