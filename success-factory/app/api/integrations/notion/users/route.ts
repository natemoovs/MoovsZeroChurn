import { NextResponse } from "next/server"

const NOTION_API_KEY = process.env.NOTION_API_KEY

interface NotionUser {
  id: string
  name: string
  email: string | null
  avatarUrl: string | null
  type: "person" | "bot"
}

/**
 * GET /api/integrations/notion/users
 * List all Notion users in the workspace (for task assignment)
 */
export async function GET() {
  if (!NOTION_API_KEY) {
    return NextResponse.json({
      users: [],
      configured: false,
      error: "Notion not configured. Set NOTION_API_KEY",
    })
  }

  try {
    const response = await fetch("https://api.notion.com/v1/users", {
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    })

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`)
    }

    const data = await response.json()

    // Filter to only real people (not bots) and format nicely
    const users: NotionUser[] = data.results
      .filter((u: { type: string }) => u.type === "person")
      .map(
        (u: {
          id: string
          name: string
          avatar_url: string | null
          person?: { email: string }
        }) => ({
          id: u.id,
          name: u.name,
          email: u.person?.email || null,
          avatarUrl: u.avatar_url,
          type: "person" as const,
        })
      )
      .sort((a: NotionUser, b: NotionUser) => a.name.localeCompare(b.name))

    return NextResponse.json({
      users,
      total: users.length,
      configured: true,
    })
  } catch (error) {
    console.error("Notion users fetch error:", error)
    return NextResponse.json({ users: [], error: "Failed to fetch Notion users" }, { status: 500 })
  }
}
