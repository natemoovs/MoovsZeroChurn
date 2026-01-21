import { NextResponse } from "next/server"
import { getSkills } from "@/lib/skills"

export async function GET() {
  const skills = getSkills()
  return NextResponse.json({ skills })
}
