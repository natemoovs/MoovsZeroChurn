/**
 * Pipelines API
 *
 * GET /api/pipelines - Get all sales pipelines
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const pipelines = await prisma.pipeline.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        hubspotId: true,
        name: true,
      },
    })

    return NextResponse.json({
      pipelines: pipelines.map((p) => ({
        id: p.id,
        hubspotId: p.hubspotId,
        name: p.name,
      })),
    })
  } catch (error) {
    console.error("Pipelines API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch pipelines" },
      { status: 500 }
    )
  }
}
