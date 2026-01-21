import { NextResponse } from "next/server"
import { metabase } from "@/lib/integrations"

/**
 * Explore Metabase setup - databases, tables, and saved questions
 * GET /api/integrations/metabase/explore
 */
export async function GET() {
  if (!process.env.METABASE_URL || !process.env.METABASE_API_KEY) {
    return NextResponse.json({
      configured: false,
      error: "Metabase not configured - need METABASE_URL and METABASE_API_KEY",
    })
  }

  try {
    // Get all databases
    const databases = await metabase.getDatabases()

    // Get tables for each database
    const databasesWithTables = await Promise.all(
      databases.map(async (db) => {
        try {
          const tables = await metabase.getTables(db.id)
          return {
            id: db.id,
            name: db.name,
            engine: db.engine,
            tables: tables.map((t) => ({
              id: t.id,
              name: t.name,
              displayName: t.display_name,
              schema: t.schema,
            })),
          }
        } catch {
          return {
            id: db.id,
            name: db.name,
            engine: db.engine,
            tables: [],
            error: "Could not fetch tables",
          }
        }
      })
    )

    // Search for commonly useful questions
    const searchTerms = ["customer", "usage", "trip", "booking", "revenue", "active", "churn"]
    const questionResults: Record<string, Array<{ id: number; name: string; description: string | null }>> = {}

    for (const term of searchTerms) {
      try {
        const questions = await metabase.searchQuestions(term)
        if (questions.length > 0) {
          questionResults[term] = questions.slice(0, 10).map((q) => ({
            id: q.id,
            name: q.name,
            description: q.description,
          }))
        }
      } catch {
        // Skip failed searches
      }
    }

    return NextResponse.json({
      configured: true,
      metabaseUrl: process.env.METABASE_URL,
      databases: databasesWithTables,
      savedQuestions: questionResults,
    })
  } catch (error) {
    console.error("Metabase explore error:", error)
    return NextResponse.json(
      {
        configured: true,
        error: error instanceof Error ? error.message : "Failed to explore Metabase",
      },
      { status: 500 }
    )
  }
}
