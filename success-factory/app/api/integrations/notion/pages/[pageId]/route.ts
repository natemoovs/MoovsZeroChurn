import { NextRequest, NextResponse } from "next/server"

const NOTION_API_KEY = process.env.NOTION_API_KEY

/**
 * GET /api/integrations/notion/pages/[pageId]
 * Get full Notion page details including content blocks
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
    // Fetch page properties
    const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    })

    if (!pageRes.ok) {
      const error = await pageRes.json()
      return NextResponse.json(
        { error: error.message || "Failed to fetch page" },
        { status: pageRes.status }
      )
    }

    const page = await pageRes.json()

    // Fetch page content (blocks)
    const blocksRes = await fetch(
      `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
        },
      }
    )

    let blocks: unknown[] = []
    if (blocksRes.ok) {
      const blocksData = await blocksRes.json()
      blocks = blocksData.results || []
    }

    // Fetch comments
    const commentsRes = await fetch(
      `https://api.notion.com/v1/comments?block_id=${pageId}&page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
        },
      }
    )

    let comments: unknown[] = []
    if (commentsRes.ok) {
      const commentsData = await commentsRes.json()
      comments = commentsData.results || []
    }

    // Extract all properties
    const properties = extractAllProperties(page.properties)

    return NextResponse.json({
      id: page.id,
      url: page.url,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
      createdBy: page.created_by,
      lastEditedBy: page.last_edited_by,
      properties,
      content: blocks.map(formatBlock),
      comments: comments.map(formatComment),
    })
  } catch (error) {
    console.error("[Notion Page] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch page" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/integrations/notion/pages/[pageId]
 * Update Notion page properties
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  if (!NOTION_API_KEY) {
    return NextResponse.json({ error: "Notion not configured" }, { status: 500 })
  }

  const { pageId } = await params
  const body = await request.json()
  const { properties } = body

  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    })

    if (!res.ok) {
      const error = await res.json()
      return NextResponse.json(
        { error: error.message || "Failed to update page" },
        { status: res.status }
      )
    }

    const page = await res.json()
    return NextResponse.json({ success: true, page })
  } catch (error) {
    console.error("[Notion Page Update] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update page" },
      { status: 500 }
    )
  }
}

function extractAllProperties(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(props)) {
    const prop = value as Record<string, unknown>
    const type = prop.type as string

    switch (type) {
      case "title":
        result[key] = {
          type: "title",
          value:
            (prop.title as Array<{ plain_text: string }>)?.map((t) => t.plain_text).join("") || "",
        }
        break
      case "rich_text":
        result[key] = {
          type: "rich_text",
          value:
            (prop.rich_text as Array<{ plain_text: string }>)?.map((t) => t.plain_text).join("") ||
            "",
        }
        break
      case "number":
        result[key] = { type: "number", value: prop.number }
        break
      case "select":
        result[key] = {
          type: "select",
          value: (prop.select as { name: string; color: string } | null)?.name || null,
          color: (prop.select as { name: string; color: string } | null)?.color,
        }
        break
      case "multi_select":
        result[key] = {
          type: "multi_select",
          value:
            (prop.multi_select as Array<{ name: string; color: string }>)?.map((s) => ({
              name: s.name,
              color: s.color,
            })) || [],
        }
        break
      case "status":
        result[key] = {
          type: "status",
          value: (prop.status as { name: string; color: string } | null)?.name || null,
          color: (prop.status as { name: string; color: string } | null)?.color,
        }
        break
      case "date":
        result[key] = {
          type: "date",
          value: prop.date
            ? {
                start: (prop.date as { start: string; end?: string }).start,
                end: (prop.date as { start: string; end?: string }).end,
              }
            : null,
        }
        break
      case "people":
        result[key] = {
          type: "people",
          value:
            (
              prop.people as Array<{
                id: string
                name?: string
                avatar_url?: string
                person?: { email: string }
              }>
            )?.map((p) => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar_url,
              email: p.person?.email,
            })) || [],
        }
        break
      case "checkbox":
        result[key] = { type: "checkbox", value: prop.checkbox }
        break
      case "url":
        result[key] = { type: "url", value: prop.url }
        break
      case "email":
        result[key] = { type: "email", value: prop.email }
        break
      case "phone_number":
        result[key] = { type: "phone_number", value: prop.phone_number }
        break
      case "created_time":
        result[key] = { type: "created_time", value: prop.created_time }
        break
      case "created_by":
        result[key] = {
          type: "created_by",
          value: {
            id: (prop.created_by as { id: string; name?: string })?.id,
            name: (prop.created_by as { id: string; name?: string })?.name,
          },
        }
        break
      case "last_edited_time":
        result[key] = { type: "last_edited_time", value: prop.last_edited_time }
        break
      case "relation":
        result[key] = {
          type: "relation",
          value: (prop.relation as Array<{ id: string }>)?.map((r) => r.id) || [],
        }
        break
      case "rollup":
        result[key] = { type: "rollup", value: prop.rollup }
        break
      case "formula":
        result[key] = { type: "formula", value: prop.formula }
        break
      case "unique_id":
        result[key] = {
          type: "unique_id",
          value: prop.unique_id
            ? `${(prop.unique_id as { prefix?: string; number: number }).prefix || ""}${(prop.unique_id as { number: number }).number}`
            : null,
        }
        break
      default:
        result[key] = { type, value: prop[type] }
    }
  }

  return result
}

function formatBlock(block: unknown): { type: string; content: string; children?: unknown[] } {
  const b = block as Record<string, unknown>
  const type = b.type as string
  const blockData = b[type] as Record<string, unknown> | undefined

  let content = ""
  if (blockData?.rich_text) {
    content = (blockData.rich_text as Array<{ plain_text: string }>)
      .map((t) => t.plain_text)
      .join("")
  }

  return {
    type,
    content,
    ...(b.has_children ? { hasChildren: true } : {}),
  }
}

function formatComment(comment: unknown): {
  id: string
  content: string
  createdTime: string
  createdBy: { id: string; name?: string; avatar?: string }
} {
  const c = comment as Record<string, unknown>
  const richText = c.rich_text as Array<{ plain_text: string }> | undefined
  const createdBy = c.created_by as { id: string; name?: string; avatar_url?: string } | undefined

  return {
    id: c.id as string,
    content: richText?.map((t) => t.plain_text).join("") || "",
    createdTime: c.created_time as string,
    createdBy: {
      id: createdBy?.id || "",
      name: createdBy?.name,
      avatar: createdBy?.avatar_url,
    },
  }
}
