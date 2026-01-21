import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hubspot } from "@/lib/integrations"
import Anthropic from "@anthropic-ai/sdk"

/**
 * Pre-QBR Prep Agent
 *
 * Autonomous agent that:
 * 1. Finds accounts with upcoming QBRs (based on renewal date or custom field)
 * 2. Generates comprehensive QBR prep briefs using AI
 * 3. Creates tasks with the brief for CSMs
 *
 * Trigger: Weekly cron or on-demand
 * POST /api/agents/qbr-prep
 */

const DAYS_BEFORE_QBR = 7 // Generate prep 7 days before

export async function POST(request: NextRequest) {
  // Verify cron auth
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const isAuthorized =
    !cronSecret ||
    authHeader === `Bearer ${cronSecret}` ||
    request.headers.get("x-vercel-cron") === "1" ||
    process.env.NODE_ENV === "development"

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  console.log("[QBR Prep Agent] Starting QBR prep scan...")

  try {
    // Find accounts with upcoming renewals/QBRs
    const upcomingQBRs = await findUpcomingQBRs()

    if (upcomingQBRs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No upcoming QBRs found",
        briefsGenerated: 0,
      })
    }

    console.log(`[QBR Prep Agent] Found ${upcomingQBRs.length} upcoming QBRs`)

    const anthropic = new Anthropic({ apiKey })
    const briefsGenerated: string[] = []

    // Generate briefs for each account
    for (const account of upcomingQBRs) {
      try {
        // Check if we already have a recent task for this account
        const existingTask = await prisma.task.findFirst({
          where: {
            companyId: account.id,
            title: { contains: "QBR Prep" },
            createdAt: {
              gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Last 14 days
            },
          },
        })

        if (existingTask) {
          console.log(`[QBR Prep Agent] Skipping ${account.name} - already has recent prep task`)
          continue
        }

        // Fetch additional context
        const [contacts, deals] = await Promise.all([
          hubspot.getContacts(account.id).catch(() => []),
          hubspot.getDeals(account.id).catch(() => []),
        ])

        // Build context for AI
        const context = buildAccountContext(account, contacts, deals)

        // Generate QBR brief with Claude
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `You are a Customer Success Manager preparing for a Quarterly Business Review.

Generate a comprehensive QBR prep document for this account:

${context}

Include:
1. **Executive Summary** (2-3 sentences on account health)
2. **Key Wins** (what's going well)
3. **Areas of Concern** (risks, issues to address)
4. **Agenda Items** (5 bullet points for the QBR)
5. **Expansion Opportunities** (upsell potential)
6. **Preparation Checklist** (what CSM should do before the call)

Be specific and actionable. Format with clear headers.`,
            },
          ],
        })

        const briefContent = message.content[0].type === "text"
          ? message.content[0].text
          : ""

        // Create task with the brief
        const task = await prisma.task.create({
          data: {
            companyId: account.id,
            companyName: account.name,
            title: `📋 QBR Prep: ${account.name}`,
            description: briefContent,
            priority: "medium",
            status: "pending",
            dueDate: account.qbrDate
              ? new Date(new Date(account.qbrDate).getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days before QBR
              : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            metadata: {
              source: "qbr-prep-agent",
              qbrDate: account.qbrDate,
              mrr: account.mrr,
            },
          },
        })

        briefsGenerated.push(task.id)
        console.log(`[QBR Prep Agent] Generated brief for ${account.name}`)
      } catch (err) {
        console.error(`[QBR Prep Agent] Error generating brief for ${account.name}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        accountsFound: upcomingQBRs.length,
        briefsGenerated: briefsGenerated.length,
      },
      accounts: upcomingQBRs.map(a => ({
        id: a.id,
        name: a.name,
        qbrDate: a.qbrDate,
      })),
    })
  } catch (error) {
    console.error("[QBR Prep Agent] Error:", error)
    return NextResponse.json(
      { error: "QBR prep agent failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}

interface UpcomingQBR {
  id: string
  name: string
  domain: string | null
  qbrDate: string | null
  mrr: number | null
  lifecycleStage: string | null
}

async function findUpcomingQBRs(): Promise<UpcomingQBR[]> {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    return []
  }

  try {
    // Fetch all customers
    const companies = await hubspot.searchCompanies("*")

    // Filter to those with upcoming renewals/QBRs
    const now = new Date()
    const targetDate = new Date(now.getTime() + DAYS_BEFORE_QBR * 24 * 60 * 60 * 1000)
    const windowStart = new Date(now.getTime() + (DAYS_BEFORE_QBR - 3) * 24 * 60 * 60 * 1000)

    const upcoming: UpcomingQBR[] = []

    for (const company of companies) {
      const props = company.properties

      // Check for renewal date (could be QBR date)
      const renewalDateStr = props.contract_end_date || props.renewal_date
      if (renewalDateStr) {
        const renewalDate = new Date(renewalDateStr)

        // Check if renewal is within our window (DAYS_BEFORE_QBR +/- 3 days)
        if (renewalDate >= windowStart && renewalDate <= targetDate) {
          upcoming.push({
            id: company.id,
            name: props.name || "Unknown",
            domain: props.domain || null,
            qbrDate: renewalDateStr,
            mrr: parseFloat(props.mrr || props.monthly_recurring_revenue || "0") || null,
            lifecycleStage: props.lifecyclestage || null,
          })
        }
      }

      // Also check lifecycle stage - include active customers even without renewal date
      // (They might need periodic check-ins)
      if (props.lifecyclestage === "customer" && !renewalDateStr) {
        // For customers without renewal dates, check if they haven't had a QBR prep recently
        // This is handled in the main loop by checking existing tasks
        const lastModified = props.hs_lastmodifieddate
        if (lastModified) {
          const daysSinceUpdate = Math.floor(
            (now.getTime() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24)
          )
          // If customer hasn't been touched in 80+ days, might be due for QBR
          if (daysSinceUpdate >= 80 && daysSinceUpdate <= 95) {
            upcoming.push({
              id: company.id,
              name: props.name || "Unknown",
              domain: props.domain || null,
              qbrDate: null, // No specific date
              mrr: parseFloat(props.mrr || props.monthly_recurring_revenue || "0") || null,
              lifecycleStage: props.lifecyclestage || null,
            })
          }
        }
      }
    }

    return upcoming
  } catch (error) {
    console.error("[QBR Prep Agent] Error finding upcoming QBRs:", error)
    return []
  }
}

function buildAccountContext(
  account: UpcomingQBR,
  contacts: Array<{ id: string; properties: Record<string, string | undefined> }>,
  deals: Array<{ id: string; properties: Record<string, string | undefined> }>
): string {
  const lines: string[] = []

  lines.push(`## Account: ${account.name}`)
  if (account.domain) lines.push(`Domain: ${account.domain}`)
  if (account.mrr) lines.push(`MRR: $${account.mrr.toLocaleString()}`)
  if (account.qbrDate) lines.push(`QBR/Renewal Date: ${account.qbrDate}`)
  lines.push("")

  if (contacts.length > 0) {
    lines.push("### Key Contacts:")
    for (const contact of contacts.slice(0, 5)) {
      const name = [contact.properties.firstname, contact.properties.lastname]
        .filter(Boolean)
        .join(" ") || "Unknown"
      const title = contact.properties.jobtitle || ""
      const email = contact.properties.email || ""
      lines.push(`- ${name}${title ? ` (${title})` : ""} - ${email}`)
    }
    lines.push("")
  }

  if (deals.length > 0) {
    lines.push("### Recent Deals:")
    for (const deal of deals.slice(0, 3)) {
      const name = deal.properties.dealname || "Unknown deal"
      const amount = deal.properties.amount
        ? `$${parseFloat(deal.properties.amount).toLocaleString()}`
        : "N/A"
      const stage = deal.properties.dealstage || "Unknown"
      lines.push(`- ${name}: ${amount} (${stage})`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

// GET endpoint for status
export async function GET() {
  try {
    const recentTasks = await prisma.task.findMany({
      where: {
        title: { contains: "QBR Prep" },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    return NextResponse.json({
      recentBriefs: recentTasks.map(t => ({
        id: t.id,
        companyName: t.companyName,
        createdAt: t.createdAt,
        status: t.status,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 })
  }
}
