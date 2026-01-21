import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

/**
 * Deep Customer Research Agent
 *
 * Generates comprehensive health reports for accounts by:
 * 1. Pulling data from Customer 360 endpoint
 * 2. Using Claude to analyze and generate insights
 * 3. Producing QBR-ready briefs with talking points
 *
 * POST /api/ai/research
 * Body: { companyId?: string, companyName?: string, domain?: string, type?: "qbr" | "health" | "risk" }
 */

const REPORT_TYPES = {
  qbr: {
    name: "QBR Prep Brief",
    prompt: `You are a Customer Success Manager preparing for a Quarterly Business Review.
Generate a comprehensive QBR prep document with:

1. **Executive Summary** (2-3 sentences on overall account health)
2. **Key Wins This Quarter** (what's going well, usage highlights)
3. **Areas of Concern** (risks, declining metrics, support issues)
4. **Renewal Risk Assessment** (low/medium/high with reasoning)
5. **Recommended Discussion Topics** (3-5 bullet points for the QBR agenda)
6. **Expansion Opportunities** (upsell/cross-sell potential based on usage)
7. **Action Items** (what CSM should do before/during/after QBR)

Be specific and actionable. Reference actual data points.`,
  },
  health: {
    name: "Health Report",
    prompt: `You are a Customer Success analyst generating a health report.
Create a detailed health analysis with:

1. **Health Score Breakdown** (explain why green/yellow/red)
2. **Usage Analysis** (trends, comparisons, anomalies)
3. **Payment Health** (billing status, MRR, any issues)
4. **Engagement Level** (logins, feature adoption, support tickets)
5. **Risk Signals** (early warning indicators)
6. **Positive Signals** (retention indicators)
7. **Recommended Actions** (prioritized list)

Be data-driven. Highlight concerning trends early.`,
  },
  risk: {
    name: "Risk Assessment",
    prompt: `You are a churn prevention specialist assessing account risk.
Generate a risk assessment with:

1. **Overall Risk Level** (Critical/High/Medium/Low)
2. **Churn Probability** (percentage estimate with reasoning)
3. **Primary Risk Factors** (ranked by severity)
4. **Time to Potential Churn** (estimate: imminent/30 days/90 days/6+ months)
5. **Intervention Urgency** (immediate/this week/this month)
6. **Recommended Intervention** (specific playbook or action)
7. **Success Indicators** (how to know if intervention worked)

Be direct about risks. Don't sugarcoat.`,
  },
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { companyId, companyName, domain, type = "health" } = body

    if (!companyId && !companyName && !domain) {
      return NextResponse.json(
        { error: "Provide companyId, companyName, or domain" },
        { status: 400 }
      )
    }

    const reportConfig = REPORT_TYPES[type as keyof typeof REPORT_TYPES] || REPORT_TYPES.health

    // Fetch Customer 360 data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || "http://localhost:3000"

    const params = new URLSearchParams()
    if (companyId) params.set("id", companyId)
    else if (domain) params.set("domain", domain)
    else if (companyName) params.set("name", companyName)

    const customer360Res = await fetch(
      `${baseUrl}/api/integrations/customer-360?${params.toString()}`,
      { headers: { "Content-Type": "application/json" } }
    )

    if (!customer360Res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch customer data" },
        { status: 500 }
      )
    }

    const customerData = await customer360Res.json()

    if (!customerData.name) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Build context for Claude
    const context = buildCustomerContext(customerData)

    // Generate report with Claude
    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `${reportConfig.prompt}

## Customer Data

${context}

Generate the ${reportConfig.name} for ${customerData.name}.`,
        },
      ],
    })

    const reportContent = message.content[0].type === "text"
      ? message.content[0].text
      : ""

    return NextResponse.json({
      success: true,
      report: {
        type,
        name: reportConfig.name,
        company: customerData.name,
        generatedAt: new Date().toISOString(),
        content: reportContent,
      },
      customerData: {
        id: customerData.id,
        name: customerData.name,
        healthScore: customerData.healthScore,
        riskLevel: customerData.riskLevel,
        dataSources: customerData.dataSources,
      },
    })
  } catch (error) {
    console.error("Research agent error:", error)
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    )
  }
}

function buildCustomerContext(data: Record<string, unknown>): string {
  const lines: string[] = []

  // Basic info
  lines.push(`**Company:** ${data.name}`)
  lines.push(`**Domain:** ${data.domain || "Unknown"}`)
  lines.push(`**Health Score:** ${data.healthScore}`)
  lines.push(`**Risk Level:** ${data.riskLevel}`)
  lines.push("")

  // Risk/positive signals
  const riskSignals = data.riskSignals as string[] || []
  const positiveSignals = data.positiveSignals as string[] || []

  if (riskSignals.length > 0) {
    lines.push(`**Risk Signals:** ${riskSignals.join(", ")}`)
  }
  if (positiveSignals.length > 0) {
    lines.push(`**Positive Signals:** ${positiveSignals.join(", ")}`)
  }
  lines.push("")

  // CRM data
  const crm = data.crm as Record<string, unknown> | null
  if (crm) {
    lines.push("### CRM Data (HubSpot)")
    lines.push(`- Lifecycle Stage: ${crm.lifecycleStage || "Unknown"}`)
    lines.push(`- Industry: ${crm.industry || "Unknown"}`)
    lines.push(`- Customer Since: ${crm.customerSince || "Unknown"}`)
    lines.push(`- Last Activity: ${crm.lastActivity || "Unknown"}`)

    const contacts = crm.contacts as Array<Record<string, unknown>> || []
    if (contacts.length > 0) {
      lines.push(`- Key Contacts: ${contacts.map(c => `${c.name} (${c.title || "No title"})`).join(", ")}`)
    }

    const deals = crm.deals as Array<Record<string, unknown>> || []
    if (deals.length > 0) {
      lines.push(`- Deals: ${deals.map(d => `${d.name}: $${d.amount || 0} (${d.stage})`).join("; ")}`)
    }
    lines.push("")
  }

  // Usage data
  const usage = data.usage as Record<string, unknown> | null
  if (usage) {
    lines.push("### Usage Data (Metabase)")
    lines.push(`- Total Trips: ${usage.totalTrips}`)
    lines.push(`- Days Since Last Login: ${usage.daysSinceLastLogin ?? "Unknown"}`)
    lines.push(`- Customer Segment: ${usage.customerSegment || "Unknown"}`)
    lines.push(`- Current Plan: ${usage.plan || "Unknown"}`)
    lines.push(`- Churn Status: ${usage.churnStatus || "Active"}`)
    lines.push("")
  }

  // Billing data
  const billing = data.billing as Record<string, unknown> | null
  if (billing) {
    lines.push("### Billing Data (Stripe)")
    lines.push(`- Payment Status: ${billing.status}`)
    lines.push(`- MRR: $${billing.mrr}`)
    lines.push(`- Has Failed Payments: ${billing.hasFailedPayments ? "Yes" : "No"}`)

    const subscriptions = billing.subscriptions as Array<Record<string, unknown>> || []
    if (subscriptions.length > 0) {
      for (const sub of subscriptions) {
        lines.push(`- Subscription: ${sub.plan || "Unknown plan"} - ${sub.status} (renews ${sub.renewalDate})${sub.cancelPending ? " ⚠️ CANCELING" : ""}`)
      }
    }

    const lastPayment = billing.lastPayment as Record<string, unknown> | null
    if (lastPayment) {
      lines.push(`- Last Payment: $${lastPayment.amount} on ${lastPayment.date}`)
    }
    lines.push("")
  }

  // Tasks
  const tasks = data.tasks as Record<string, unknown> | null
  if (tasks) {
    lines.push("### CSM Tasks (Notion)")
    lines.push(`- Total Tasks: ${tasks.total}`)
    lines.push(`- Open Tasks: ${tasks.open}`)
    lines.push(`- Overdue Tasks: ${tasks.overdue}`)
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * GET /api/ai/research?id=xxx&type=qbr
 * Quick access to generate reports
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get("id")
  const companyName = searchParams.get("name")
  const domain = searchParams.get("domain")
  const type = searchParams.get("type") || "health"

  // Convert to POST request internally
  const fakeRequest = new NextRequest(request.url, {
    method: "POST",
    body: JSON.stringify({ companyId, companyName, domain, type }),
    headers: { "Content-Type": "application/json" },
  })

  return POST(fakeRequest)
}
