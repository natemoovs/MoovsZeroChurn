import { NextRequest, NextResponse } from "next/server"
import { getSkill } from "@/lib/skills"

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const skill = getSkill(slug)

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 })
  }

  return NextResponse.json({ skill })
}
