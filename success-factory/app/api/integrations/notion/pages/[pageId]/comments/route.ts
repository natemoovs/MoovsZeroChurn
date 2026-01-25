import { NextRequest, NextResponse } from "next/server"

const NOTION_API_KEY = process.env.NOTION_API_KEY

/**
 * GET /api/integrations/notion/pages/[pageId]/comments
 * Get all comments for a Notion page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  if (!NOTION_API_KEY) {
    return NextResponse.json({ error: "Notion not configured" }, { status: 500 })
  }

  const { pageId } = await params

  try {
    const res = await fetch(`https://api.notion.com/v1/comments?block_id=${pageId}&page_size=100`, {
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    })

    if (!res.ok) {
      const error = await res.json()
      return NextResponse.json(
        { error: error.message || "Failed to fetch comments" },
        { status: res.status }
      )
    }

    const data = await res.json()
    const comments = (data.results || []).map((c: Record<string, unknown>) => {
      const richText = c.rich_text as Array<{ plain_text: string }> | undefined
      const createdBy = c.created_by as
        | { id: string; name?: string; avatar_url?: string }
        | undefined

      return {
        id: c.id,
        content: richText?.map((t) => t.plain_text).join("") || "",
        createdTime: c.created_time,
        createdBy: {
          id: createdBy?.id || "",
          name: createdBy?.name,
          avatar: createdBy?.avatar_url,
        },
      }
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error("[Notion Comments] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch comments" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations/notion/pages/[pageId]/comments
 * Add a comment to a Notion page
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  if (!NOTION_API_KEY) {
    return NextResponse.json({ error: "Notion not configured" }, { status: 500 })
  }

  const { pageId } = await params
  const body = await request.json()
  const { content } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: "Comment content required" }, { status: 400 })
  }

  try {
    const res = await fetch("https://api.notion.com/v1/comments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { page_id: pageId },
        rich_text: [
          {
            type: "text",
            text: { content: content.trim() },
          },
        ],
      }),
    })

    if (!res.ok) {
      const error = await res.json()
      return NextResponse.json(
        { error: error.message || "Failed to post comment" },
        { status: res.status }
      )
    }

    const comment = await res.json()
    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: content.trim(),
        createdTime: comment.created_time,
        createdBy: {
          id: comment.created_by?.id,
          name: comment.created_by?.name,
          avatar: comment.created_by?.avatar_url,
        },
      },
    })
  } catch (error) {
    console.error("[Notion Comment Post] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to post comment" },
      { status: 500 }
    )
  }
}
