import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { notion } from "@/lib/integrations"

/**
 * GET /api/tasks/[id]/comments
 * Get comments for a task from Notion
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Get the task to find its Notion page ID
    const task = await prisma.task.findUnique({
      where: { id },
      select: { metadata: true },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const metadata = task.metadata as { notionPageId?: string } | null
    if (!metadata?.notionPageId) {
      return NextResponse.json({ comments: [], message: "Task not synced to Notion" })
    }

    if (!process.env.NOTION_API_KEY) {
      return NextResponse.json({ error: "Notion not configured" }, { status: 500 })
    }

    // Fetch comments from Notion
    const comments = await notion.getComments(metadata.notionPageId)

    // Format comments for the frontend
    const formattedComments = comments.map((comment) => ({
      id: comment.id,
      text: comment.rich_text.map((rt) => rt.plain_text).join(""),
      createdAt: comment.created_time,
      author: {
        id: comment.created_by.id,
        name: comment.created_by.name || "Unknown",
        avatar: comment.created_by.avatar_url,
      },
    }))

    return NextResponse.json({ comments: formattedComments })
  } catch (error) {
    console.error("Failed to fetch comments:", error)
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks/[id]/comments
 * Add a comment to a task in Notion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      )
    }

    // Get the task to find its Notion page ID
    const task = await prisma.task.findUnique({
      where: { id },
      select: { metadata: true },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const metadata = task.metadata as { notionPageId?: string } | null
    if (!metadata?.notionPageId) {
      return NextResponse.json(
        { error: "Task not synced to Notion - cannot add comment" },
        { status: 400 }
      )
    }

    if (!process.env.NOTION_API_KEY) {
      return NextResponse.json({ error: "Notion not configured" }, { status: 500 })
    }

    // Add comment to Notion
    const comment = await notion.addComment(metadata.notionPageId, text.trim())

    return NextResponse.json({
      comment: {
        id: comment.id,
        text: comment.rich_text.map((rt) => rt.plain_text).join(""),
        createdAt: comment.created_time,
        author: {
          id: comment.created_by.id,
          name: comment.created_by.name || "Unknown",
          avatar: comment.created_by.avatar_url,
        },
      },
    })
  } catch (error) {
    console.error("Failed to add comment:", error)
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    )
  }
}
