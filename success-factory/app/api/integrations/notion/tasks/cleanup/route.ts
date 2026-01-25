import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { notion } from "@/lib/integrations"

const CSM_DATABASE_ID = process.env.NOTION_CSM_DATABASE_ID

/**
 * POST /api/integrations/notion/tasks/cleanup
 * Remove tasks that no longer exist in the configured Notion database
 * This is useful when switching databases or cleaning up orphaned tasks
 */
export async function POST() {
  if (!process.env.NOTION_API_KEY || !CSM_DATABASE_ID) {
    return NextResponse.json({ error: "Notion not configured" }, { status: 500 })
  }

  try {
    // Get all tasks that were synced from Notion
    const syncedTasks = await prisma.task.findMany({
      where: {
        metadata: {
          path: ["syncedFromNotion"],
          equals: true,
        },
      },
      select: {
        id: true,
        title: true,
        metadata: true,
      },
    })

    if (syncedTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No synced tasks found",
        deleted: 0,
        checked: 0,
      })
    }

    // Get all page IDs from the current Notion database
    const notionPageIds = new Set<string>()
    let hasMore = true
    let startCursor: string | undefined

    while (hasMore) {
      const result = await notion.queryDatabase(CSM_DATABASE_ID, {
        pageSize: 100,
        startCursor,
      })

      for (const page of result.results) {
        notionPageIds.add(page.id)
      }

      hasMore = result.has_more
      startCursor = result.next_cursor || undefined
    }

    // Find orphaned tasks (exist in DB but not in Notion)
    const orphanedTaskIds: string[] = []
    const orphanedTaskTitles: string[] = []

    for (const task of syncedTasks) {
      const notionPageId = (task.metadata as Record<string, unknown>)?.notionPageId as string
      if (notionPageId && !notionPageIds.has(notionPageId)) {
        orphanedTaskIds.push(task.id)
        orphanedTaskTitles.push(task.title)
      }
    }

    // Delete orphaned tasks
    if (orphanedTaskIds.length > 0) {
      await prisma.task.deleteMany({
        where: {
          id: { in: orphanedTaskIds },
        },
      })
    }

    return NextResponse.json({
      success: true,
      deleted: orphanedTaskIds.length,
      deletedTasks: orphanedTaskTitles.slice(0, 20), // Return first 20 for display
      checked: syncedTasks.length,
      notionPagesFound: notionPageIds.size,
    })
  } catch (error) {
    console.error("Notion cleanup error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cleanup tasks" },
      { status: 500 }
    )
  }
}
