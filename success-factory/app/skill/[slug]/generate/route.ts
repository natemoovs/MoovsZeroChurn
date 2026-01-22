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

/**
 * Normalize segment input to match API expectations
 * Handles variations like "Enterprise (accounts $1M+)" -> "enterprise"
 */
function normalizeSegment(input: string): string {
  const lower = input.toLowerCase().trim()

  // Check for enterprise
  if (lower.includes("enterprise")) {
    return "enterprise"
  }

  // Check for mid-market (various formats)
  if (lower.includes("mid-market") || lower.includes("midmarket") || lower.includes("mid market")) {
    return "mid-market"
  }

  // Check for SMB
  if (lower.includes("smb") || lower.includes("small")) {
    return "smb"
  }

  // Check for specific health filters
  if (lower.includes("at-risk") || lower.includes("at risk") || lower.includes("red")) {
    return "at-risk"
  }

  if (lower.includes("healthy") || lower.includes("green")) {
    return "healthy"
  }

  if (lower.includes("monitor") || lower.includes("warning") || lower.includes("yellow")) {
    return "warning"
  }

  if (lower.includes("churn")) {
    return "churned"
  }

  // Default to all
  return "all"
}

async function gatherPortfolioContext(rawSegment: string): Promise<string> {
  const segment = normalizeSegment(rawSegment)
  console.log(`[Portfolio] Normalized segment: "${rawSegment}" -> "${segment}"`)

  // Use NEXT_PUBLIC_APP_URL if set, otherwise try VERCEL_URL, then localhost
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || "http://localhost:3000"

  const portfolioUrl = `${baseUrl}/api/integrations/portfolio?segment=${encodeURIComponent(segment)}`
  console.log(`[Portfolio] Fetching from: ${portfolioUrl}`)

  try {
    const response = await fetch(portfolioUrl, {
      headers: { "Content-Type": "application/json" },
      // Add cache: no-store to ensure fresh data
      cache: "no-store",
    })

    console.log(`[Portfolio] Response status: ${response.status}, content-type: ${response.headers.get("content-type")}`)

    // Check if we got HTML instead of JSON (indicates wrong URL or auth redirect)
    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      const bodyPreview = await response.text()
      console.error(`[Portfolio] Non-JSON response (${contentType}), URL: ${baseUrl}`)
      console.error(`[Portfolio] Body preview: ${bodyPreview.slice(0, 200)}`)
      return `## Portfolio Data Error

Unable to fetch portfolio data. The API returned a non-JSON response.

**Debug Info:**
- URL: ${portfolioUrl}
- Status: ${response.status}
- Content-Type: ${contentType}
- This may indicate an authentication redirect or incorrect URL.

Please check that NEXT_PUBLIC_APP_URL is set correctly in your environment variables.`
    }

    const data = await response.json()

    console.log(`[Portfolio] Got ${data.summaries?.length || 0} companies`)

    if (!data.summaries || data.summaries.length === 0) {
      return `## Portfolio Data

No companies found for segment: **${segment}**

**Possible reasons:**
- The database sync hasn't completed yet (run POST /api/sync/hubspot)
- The segment filter is too restrictive
- All accounts in this segment have been filtered out (churned, etc.)

**Sync Status:**
${data.sync ? `- Last sync: ${data.sync.lastSyncAt || "Never"}\n- Records synced: ${data.sync.recordsSynced || 0}` : "- Sync info not available"}
`
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

    // For batch/portfolio skills, prioritize live data over knowledge base
    // The knowledge base contains templates/guides, but we want ACTUAL account data
    const isBatchSkill = skill.data?.batch === true

    let prompt: string
    if (isBatchSkill && integrationContext) {
      // Portfolio/batch skill - focus on the actual data
      prompt = `You are a Customer Success Manager reviewing your portfolio of accounts.

## CRITICAL INSTRUCTIONS
You are generating a REAL portfolio review using ACTUAL customer data provided below.
- Every company name, MRR value, health score, and signal MUST come from the "Live Account Data" section
- Do NOT use placeholder text like "[Company 1]" or "[Count from data]" - use the REAL data
- Do NOT generate hypothetical or example accounts - only use accounts from the data
- If there are no accounts for a category (e.g., no red accounts), say so explicitly

## Live Account Data
${integrationContext}

## User Responses
${answersText}

## Output Template
${skill.template}${tweaksSection}

Generate the portfolio review using ONLY the real account data above.
- Replace all placeholders with actual values from the data
- List real companies by name with their actual health scores and MRR
- Provide specific, actionable recommendations based on the actual risk signals for each account
- If the portfolio data shows 0 accounts or limited data, acknowledge this in the output

Output only the completed markdown content with real data filled in.`
    } else {
      // Regular skill - use knowledge base for context
      prompt = `You are helping generate content for a business tool called Success Factory.

${knowledgeBase ? `## Knowledge Base\n${knowledgeBase}\n\n` : ""}${integrationContext ? `## Live Data from Integrations\n${integrationContext}\n\n` : ""}## User Responses
${answersText}

## Template
${skill.template}${tweaksSection}

Based on the user's responses and any live data provided above, generate content following the template format. Replace all {{placeholders}} with appropriate content derived from the user's answers and integration data. Make the output practical, specific, and actionable.

Output only the generated markdown content, nothing else.`
    }

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
