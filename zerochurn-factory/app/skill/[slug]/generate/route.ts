import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { getSkill } from "@/lib/skills"
import { gatherContext } from "@/lib/skills/context"
import fs from "fs"
import path from "path"

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured")
  }
  return new Anthropic({ apiKey })
}

async function gatherPortfolioContext(segment: string): Promise<string> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"

  try {
    const response = await fetch(`${baseUrl}/api/integrations/portfolio?segment=${encodeURIComponent(segment)}`)
    const data = await response.json()

    if (!data.summaries || data.summaries.length === 0) {
      return `No companies found for segment: ${segment}`
    }

    // Format as markdown
    const lines: string[] = []
    lines.push(`## Portfolio Data for ${segment}`)
    lines.push("")

    // Summary stats
    const green = data.summaries.filter((s: { healthScore: string }) => s.healthScore === "green").length
    const yellow = data.summaries.filter((s: { healthScore: string }) => s.healthScore === "yellow").length
    const red = data.summaries.filter((s: { healthScore: string }) => s.healthScore === "red").length
    const totalMrr = data.summaries.reduce((sum: number, s: { mrr: number | null }) => sum + (s.mrr || 0), 0)

    lines.push("### Summary")
    lines.push(`- **Total Accounts:** ${data.summaries.length}`)
    lines.push(`- **Healthy (Green):** ${green}`)
    lines.push(`- **Monitor (Yellow):** ${yellow}`)
    lines.push(`- **At Risk (Red):** ${red}`)
    lines.push(`- **Total MRR:** $${totalMrr.toLocaleString()}`)
    lines.push("")

    // Account details
    lines.push("### Account Details")
    lines.push("")

    for (const summary of data.summaries) {
      const healthIcon = summary.healthScore === "green" ? "🟢" :
        summary.healthScore === "yellow" ? "🟡" :
        summary.healthScore === "red" ? "🔴" : "⚪"

      lines.push(`#### ${summary.companyName} ${healthIcon}`)
      lines.push(`- **Health:** ${summary.healthScore}`)
      lines.push(`- **MRR:** ${summary.mrr ? `$${summary.mrr.toLocaleString()}` : "Unknown"}`)
      lines.push(`- **Plan:** ${summary.plan || "Unknown"}`)
      lines.push(`- **Payment Status:** ${summary.paymentStatus}`)
      lines.push(`- **Contacts:** ${summary.contactCount}`)

      if (summary.riskSignals.length > 0) {
        lines.push(`- **Risk Signals:** ${summary.riskSignals.join("; ")}`)
      }
      if (summary.positiveSignals.length > 0) {
        lines.push(`- **Positive Signals:** ${summary.positiveSignals.join("; ")}`)
      }
      lines.push("")
    }

    return lines.join("\n")
  } catch (error) {
    console.error("Portfolio context error:", error)
    return `Error fetching portfolio data: ${error}`
  }
}

function loadKnowledgeBase(): string {
  const knowledgePath = path.join(process.cwd(), "factory", "knowledge")

  if (!fs.existsSync(knowledgePath)) {
    return ""
  }

  const loadFilesRecursively = (dir: string, prefix = ""): string[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const results: string[] = []

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...loadFilesRecursively(fullPath, `${prefix}${entry.name}/`))
      } else if (entry.name.endsWith(".md")) {
        const content = fs.readFileSync(fullPath, "utf-8")
        results.push(`## ${prefix}${entry.name}\n${content}`)
      }
    }

    return results
  }

  const files = loadFilesRecursively(knowledgePath)
  return files.join("\n\n")
}

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params
    const skill = getSkill(slug)

    if (!skill) {
      return NextResponse.json(
        { error: "Skill not found. Please check the skill exists and try again." },
        { status: 404 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid request format. Please try again." },
        { status: 400 }
      )
    }

    const { answers, tweaks } = body

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid answers. Please complete all questions." },
        { status: 400 }
      )
    }

    const knowledgeBase = loadKnowledgeBase()

    // Gather integration context if skill has data requirements
    let integrationContext = ""
    if (skill.data) {
      try {
        // Check if this is a batch/portfolio skill
        if (skill.data.batch) {
          // Use portfolio API for batch data
          const segment = answers.segment || "all"
          integrationContext = await gatherPortfolioContext(segment)
        } else {
          // Single customer context
          integrationContext = await gatherContext(skill.data, answers)
        }
      } catch (error) {
        console.error("Error gathering integration context:", error)
        // Continue without integration context - don't fail the request
      }
    }

    // Build the prompt
    const answersText = skill.questions
      .map(q => `**${q.question}**\n${answers[q.id] || "Not provided"}`)
      .join("\n\n")

    const tweaksSection = tweaks ? `\n\n## Additional Instructions\n${tweaks}` : ""

    const prompt = `You are helping generate content for a business tool called ZeroChurn.

${knowledgeBase ? `## Knowledge Base\n${knowledgeBase}\n\n` : ""}${integrationContext ? `## Live Data from Integrations\n${integrationContext}\n\n` : ""}## User Responses
${answersText}

## Template
${skill.template}${tweaksSection}

Based on the user's responses and any live data provided above, generate content following the template format. Replace all {{placeholders}} with appropriate content derived from the user's answers and integration data. Make the output practical, specific, and actionable.

Output only the generated markdown content, nothing else.`

    let anthropic
    try {
      anthropic = getAnthropicClient()
    } catch {
      return NextResponse.json(
        { error: "API key not configured. Please add ANTHROPIC_API_KEY to your environment." },
        { status: 500 }
      )
    }

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
      return NextResponse.json(
        { error: "Received an unexpected response format. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({ result: content.text })
  } catch (error) {
    console.error("Generation error:", error)

    // Handle specific Anthropic errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key. Please check your ANTHROPIC_API_KEY." },
          { status: 500 }
        )
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait a moment and try again." },
          { status: 429 }
        )
      }
      if (error.status === 500 || error.status === 503) {
        return NextResponse.json(
          { error: "Claude is temporarily unavailable. Please try again in a few moments." },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: "Something went wrong while generating content. Please try again." },
      { status: 500 }
    )
  }
}
