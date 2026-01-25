import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAnthropicClient, AI_MODEL, TOKEN_LIMITS, extractText } from "@/lib/ai"
import crypto from "crypto"

/**
 * Slack Slash Commands Handler
 * POST /api/slack/commands
 *
 * Supports:
 * /sf health <company> - Get health summary
 * /sf task <title> - Create a quick task
 * /sf ask <question> - Ask Claude about accounts
 * /sf portfolio - Get portfolio summary
 */

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET

/**
 * Verify Slack request signature
 * See: https://api.slack.com/authentication/verifying-requests-from-slack
 */
function verifySlackSignature(
  signature: string | null,
  timestamp: string | null,
  body: string
): boolean {
  if (!signature || !timestamp || !SLACK_SIGNING_SECRET) {
    return false
  }

  // Check timestamp is within 5 minutes (prevent replay attacks)
  const time = Math.floor(Date.now() / 1000)
  if (Math.abs(time - parseInt(timestamp, 10)) > 300) {
    return false
  }

  // Create the signature base string
  const sigBasestring = `v0:${timestamp}:${body}`

  // Compute HMAC SHA256
  const mySignature =
    "v0=" +
    crypto.createHmac("sha256", SLACK_SIGNING_SECRET).update(sigBasestring, "utf8").digest("hex")

  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(Buffer.from(mySignature, "utf8"), Buffer.from(signature, "utf8"))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    // Verify Slack signature (skip in development)
    if (process.env.NODE_ENV !== "development") {
      const signature = request.headers.get("x-slack-signature")
      const timestamp = request.headers.get("x-slack-request-timestamp")

      if (!verifySlackSignature(signature, timestamp, rawBody)) {
        console.error("[Slack Commands] Invalid signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    // Parse form data from raw body
    const formData = new URLSearchParams(rawBody)
    const command = formData.get("command") || ""
    const text = formData.get("text") || ""
    const userId = formData.get("user_id") || ""
    const userName = formData.get("user_name") || ""
    const responseUrl = formData.get("response_url") || ""

    // Parse subcommand
    const parts = text?.trim().split(/\s+/) || []
    const subcommand = parts[0]?.toLowerCase()
    const args = parts.slice(1).join(" ")

    // Acknowledge immediately (Slack requires response within 3s)
    // Then process async and respond via response_url
    if (responseUrl) {
      processCommandAsync(subcommand, args, userId, userName, responseUrl)
    }

    // Return immediate acknowledgment
    return NextResponse.json({
      response_type: "ephemeral",
      text: `Processing \`${command} ${text}\`...`,
    })
  } catch (error) {
    console.error("[Slack Commands] Error:", error)
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Sorry, something went wrong. Please try again.",
    })
  }
}

async function processCommandAsync(
  subcommand: string,
  args: string,
  userId: string,
  userName: string,
  responseUrl: string
) {
  let response: SlackResponse

  try {
    switch (subcommand) {
      case "health":
        response = await handleHealth(args)
        break
      case "task":
        response = await handleTask(args, userId, userName)
        break
      case "ask":
        response = await handleAsk(args)
        break
      case "portfolio":
        response = await handlePortfolio()
        break
      case "help":
      default:
        response = handleHelp()
        break
    }
  } catch (error) {
    console.error(`[Slack Commands] Error in ${subcommand}:`, error)
    response = {
      response_type: "ephemeral",
      text: `Error: ${error instanceof Error ? error.message : "Command failed"}`,
    }
  }

  // Send response to Slack
  await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(response),
  })
}

interface SlackResponse {
  response_type: "ephemeral" | "in_channel"
  text?: string
  blocks?: SlackBlock[]
}

type SlackBlock = {
  type: string
  text?: { type: string; text: string; emoji?: boolean }
  fields?: Array<{ type: string; text: string }>
  elements?: Array<{ type: string; text?: { type: string; text: string }; url?: string }>
  accessory?: { type: string; text?: { type: string; text: string }; url?: string }
}

// ============================================================================
// Command Handlers
// ============================================================================

async function handleHealth(companyName: string): Promise<SlackResponse> {
  if (!companyName) {
    return {
      response_type: "ephemeral",
      text: "Please provide a company name. Usage: `/sf health Acme Corp`",
    }
  }

  // Search for company
  const company = await prisma.hubSpotCompany.findFirst({
    where: {
      name: { contains: companyName, mode: "insensitive" },
    },
  })

  if (!company) {
    return {
      response_type: "ephemeral",
      text: `Company "${companyName}" not found. Try a different search term.`,
    }
  }

  const healthEmoji = {
    green: ":large_green_circle:",
    yellow: ":large_yellow_circle:",
    red: ":red_circle:",
    unknown: ":white_circle:",
  }[company.healthScore || "unknown"]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  return {
    response_type: "in_channel",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${company.name}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Health:* ${healthEmoji} ${company.healthScore || "Unknown"}`,
          },
          {
            type: "mrkdwn",
            text: `*MRR:* $${(company.mrr || 0).toLocaleString()}/mo`,
          },
          {
            type: "mrkdwn",
            text: `*Plan:* ${company.plan || "N/A"}`,
          },
          {
            type: "mrkdwn",
            text: `*Last Login:* ${company.daysSinceLastLogin ? `${company.daysSinceLastLogin} days ago` : "N/A"}`,
          },
        ],
      },
      ...(company.riskSignals && company.riskSignals.length > 0
        ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Risk Signals:*\n${company.riskSignals.map((s) => `• ${s}`).join("\n")}`,
              },
            },
          ]
        : []),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View in Success Factory",
            },
            url: `${appUrl}/accounts/${company.hubspotId}`,
          },
        ],
      },
    ],
  }
}

async function handleTask(title: string, userId: string, userName: string): Promise<SlackResponse> {
  if (!title) {
    return {
      response_type: "ephemeral",
      text: "Please provide a task title. Usage: `/sf task Follow up with Acme`",
    }
  }

  // Create task
  const task = await prisma.task.create({
    data: {
      companyId: "slack",
      companyName: "Quick Task",
      title,
      status: "pending",
      priority: "medium",
      metadata: {
        createdVia: "slack",
        slackUserId: userId,
        slackUserName: userName,
      },
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  return {
    response_type: "ephemeral",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:white_check_mark: Task created: *${title}*`,
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Tasks",
          },
          url: `${appUrl}/tasks`,
        },
      },
    ],
  }
}

async function handleAsk(question: string): Promise<SlackResponse> {
  if (!question) {
    return {
      response_type: "ephemeral",
      text: "Please provide a question. Usage: `/sf ask Why is Acme at risk?`",
    }
  }

  try {
    const anthropic = getAnthropicClient()

    // Get portfolio context
    const companies = await prisma.hubSpotCompany.findMany({
      select: {
        name: true,
        healthScore: true,
        mrr: true,
        riskSignals: true,
        daysSinceLastLogin: true,
      },
      take: 50,
      orderBy: { mrr: "desc" },
    })

    const context = companies
      .map(
        (c) =>
          `- ${c.name}: Health=${c.healthScore}, MRR=$${c.mrr || 0}, LastLogin=${c.daysSinceLastLogin || "?"}d${c.riskSignals?.length ? `, Risks: ${c.riskSignals.join(", ")}` : ""}`
      )
      .join("\n")

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: TOKEN_LIMITS.medium,
      messages: [
        {
          role: "user",
          content: `You are a Customer Success AI. Answer this question based on the portfolio data below. Be concise (2-3 sentences max).

Portfolio:
${context}

Question: ${question}`,
        },
      ],
    })

    const answer = extractText(response)

    return {
      response_type: "in_channel",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Q:* ${question}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*A:* ${answer}`,
          },
        },
      ],
    }
  } catch (error) {
    return {
      response_type: "ephemeral",
      text: `Sorry, I couldn't answer that: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function handlePortfolio(): Promise<SlackResponse> {
  const companies = await prisma.hubSpotCompany.findMany({
    select: {
      healthScore: true,
      mrr: true,
    },
  })

  const stats = {
    total: companies.length,
    healthy: companies.filter((c) => c.healthScore === "green").length,
    warning: companies.filter((c) => c.healthScore === "yellow").length,
    atRisk: companies.filter((c) => c.healthScore === "red").length,
    totalMrr: companies.reduce((sum, c) => sum + (c.mrr || 0), 0),
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  return {
    response_type: "in_channel",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: ":chart_with_upwards_trend: Portfolio Summary",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Total Accounts:* ${stats.total}`,
          },
          {
            type: "mrkdwn",
            text: `*Total MRR:* $${stats.totalMrr.toLocaleString()}/mo`,
          },
          {
            type: "mrkdwn",
            text: `:large_green_circle: Healthy: ${stats.healthy}`,
          },
          {
            type: "mrkdwn",
            text: `:large_yellow_circle: Warning: ${stats.warning}`,
          },
          {
            type: "mrkdwn",
            text: `:red_circle: At Risk: ${stats.atRisk}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Dashboard",
            },
            url: appUrl,
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "At-Risk Accounts",
            },
            url: `${appUrl}/accounts?filter=at-risk`,
          },
        ],
      },
    ],
  }
}

function handleHelp(): SlackResponse {
  return {
    response_type: "ephemeral",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: ":robot_face: Success Factory Commands",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Available commands:*

• \`/sf health <company>\` - Get health summary for a company
• \`/sf task <title>\` - Create a quick task
• \`/sf ask <question>\` - Ask AI about your accounts
• \`/sf portfolio\` - Get portfolio overview
• \`/sf help\` - Show this help message`,
        },
      },
    ],
  }
}
