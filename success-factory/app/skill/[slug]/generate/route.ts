import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { getSkill } from "@/lib/skills"
import { gatherContext } from "@/lib/skills/context"
import { skillTools, executeTool } from "@/lib/skills/tools"
import fs from "fs"
import path from "path"

// Maximum tool use iterations to prevent infinite loops
const MAX_TOOL_ITERATIONS = 15

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

/**
 * Load knowledge base files for a skill
 * @param fileList - Optional list of files to load (paths relative to factory/knowledge/)
 *                   If not provided, loads ALL knowledge files (legacy behavior)
 * @returns Concatenated markdown content from all loaded files
 */
function loadKnowledgeBase(fileList?: string[]): string {
  const knowledgePath = path.join(process.cwd(), "factory", "knowledge")

  if (!fs.existsSync(knowledgePath)) {
    return ""
  }

  // If a specific file list is provided, only load those files
  if (fileList && fileList.length > 0) {
    const results: string[] = []

    for (const relativePath of fileList) {
      const fullPath = path.join(knowledgePath, relativePath)

      if (fs.existsSync(fullPath) && fullPath.endsWith(".md")) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8")
          results.push(`## ${relativePath}\n${content}`)
        } catch (error) {
          console.warn(`[Knowledge] Failed to load ${relativePath}:`, error)
        }
      } else {
        console.warn(`[Knowledge] File not found or not .md: ${relativePath}`)
      }
    }

    console.log(`[Knowledge] Loaded ${results.length}/${fileList.length} specified files`)
    return results.join("\n\n")
  }

  // Legacy behavior: load all files recursively
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
  console.log(`[Knowledge] Loaded all ${files.length} knowledge files (no selective list provided)`)
  return files.join("\n\n")
}

interface RouteContext {
  params: Promise<{ slug: string }>
}

/**
 * Generate content using dynamic tool use
 * Claude can call tools to gather data as needed, similar to MCP
 */
async function generateWithTools(
  anthropic: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  baseUrl: string
): Promise<string> {
  console.log("[Tools] Starting dynamic generation with tool use")

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt }
  ]

  let iterations = 0

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++
    console.log(`[Tools] Iteration ${iterations}`)

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      tools: skillTools,
      messages,
    })

    console.log(`[Tools] Response stop_reason: ${response.stop_reason}`)

    // Check if we're done (no more tool use)
    if (response.stop_reason === "end_turn") {
      // Extract the final text response
      const textBlock = response.content.find(block => block.type === "text")
      if (textBlock && textBlock.type === "text") {
        console.log(`[Tools] Generation complete after ${iterations} iterations`)
        return textBlock.text
      }
      throw new Error("No text content in final response")
    }

    // Handle tool use
    if (response.stop_reason === "tool_use") {
      // Add assistant's response (with tool use) to messages
      messages.push({ role: "assistant", content: response.content })

      // Find all tool use blocks and execute them
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        console.log(`[Tools] Executing tool: ${toolUse.name}`)

        const result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          baseUrl
        )

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result, null, 2),
          is_error: !result.success,
        })
      }

      // Add tool results to messages
      messages.push({ role: "user", content: toolResults })
    } else {
      // Unexpected stop reason
      console.error(`[Tools] Unexpected stop_reason: ${response.stop_reason}`)
      const textBlock = response.content.find(block => block.type === "text")
      if (textBlock && textBlock.type === "text") {
        return textBlock.text
      }
      throw new Error(`Unexpected response: ${response.stop_reason}`)
    }
  }

  throw new Error(`Tool use exceeded maximum iterations (${MAX_TOOL_ITERATIONS})`)
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

    // Check if skill wants to use dynamic tool use (like MCP)
    const useTools = skill.data?.useTools === true

    // Only load knowledge base for non-tool skills (tool skills query data dynamically)
    // This avoids hitting rate limits by not sending 96KB+ of docs in every request
    // If skill declares specific knowledge files, only load those (selective loading)
    const knowledgeBase = useTools ? "" : loadKnowledgeBase(skill.knowledge)

    // Determine base URL for tool execution
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || "http://localhost:3000"

    // Build the user's answers text
    const answersText = skill.questions
      .map(q => `**${q.question}**\n${answers[q.id] || "Not provided"}`)
      .join("\n\n")

    const tweaksSection = tweaks ? `\n\n## Additional Instructions\n${tweaks}` : ""

    // If using dynamic tools, let Claude gather data itself
    if (useTools) {
      let anthropic
      try {
        anthropic = getAnthropicClient()
      } catch {
        return NextResponse.json(
          { error: "API key not configured. Please add ANTHROPIC_API_KEY to your environment." },
          { status: 500 }
        )
      }

      // NOTE: We intentionally do NOT include the full knowledge base here.
      // Tool-based skills gather data dynamically, and including 96KB+ of
      // reference docs causes rate limit errors (30k token/min limit).
      // Claude has tools to query what it needs.
      const systemPrompt = `You are a Customer Success Manager with access to tools that let you query real customer data.

You have access to tools that can:
- Get portfolio summaries with health scores and MRR
- Search HubSpot for company details, contacts, deals, and activity
- Query Metabase for usage data, billing, and analytics
- Search Notion for support tickets related to customers

IMPORTANT INSTRUCTIONS:
1. Use tools to gather REAL data before generating your response
2. Start by getting the portfolio summary to understand the overall health
3. For at-risk accounts, drill deeper using get_hubspot_company_details and search_notion_tickets
4. Use query_metabase for usage trends if needed
5. Only after gathering sufficient data, generate your final response
6. Every company name, MRR value, and signal MUST come from tool results
7. Do NOT use placeholder text - use REAL data from tools`

      const userPrompt = `## Task: ${skill.name}

${skill.description}

## User Inputs
${answersText}

## Output Template
${skill.template}${tweaksSection}

Please use the available tools to gather real customer data, then generate the output following the template format. Replace all placeholders with actual data from the tools.`

      try {
        const result = await generateWithTools(anthropic, systemPrompt, userPrompt, baseUrl)
        return NextResponse.json({ result })
      } catch (error) {
        console.error("Tool-based generation error:", error)
        return NextResponse.json(
          { error: `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}` },
          { status: 500 }
        )
      }
    }

    // Legacy mode: Pre-gather integration context
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
