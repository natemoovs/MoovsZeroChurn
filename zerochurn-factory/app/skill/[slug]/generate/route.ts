import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { getSkill } from "@/lib/skills"
import fs from "fs"
import path from "path"

const anthropic = new Anthropic()

function loadKnowledgeBase(): string {
  const knowledgePath = path.join(process.cwd(), "factory", "knowledge")

  if (!fs.existsSync(knowledgePath)) {
    return ""
  }

  const files = fs.readdirSync(knowledgePath).filter(f => f.endsWith(".md"))

  if (files.length === 0) {
    return ""
  }

  const knowledge = files.map(file => {
    const content = fs.readFileSync(path.join(knowledgePath, file), "utf-8")
    return `## ${file}\n${content}`
  }).join("\n\n")

  return knowledge
}

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params
    const skill = getSkill(slug)

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 })
    }

    const { answers, tweaks } = await request.json()

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Invalid answers" }, { status: 400 })
    }

    const knowledgeBase = loadKnowledgeBase()

    // Build the prompt
    const answersText = skill.questions
      .map(q => `**${q.question}**\n${answers[q.id] || "Not provided"}`)
      .join("\n\n")

    const tweaksSection = tweaks ? `\n\n## Additional Instructions\n${tweaks}` : ""

    const prompt = `You are helping generate content for a business tool called ZeroChurn.

${knowledgeBase ? `## Knowledge Base\n${knowledgeBase}\n\n` : ""}## User Responses
${answersText}

## Template
${skill.template}${tweaksSection}

Based on the user's responses above, generate content following the template format. Replace all {{placeholders}} with appropriate content derived from the user's answers. Make the output practical, specific, and actionable.

Output only the generated markdown content, nothing else.`

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 500 })
    }

    return NextResponse.json({ result: content.text })
  } catch (error) {
    console.error("Generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    )
  }
}
