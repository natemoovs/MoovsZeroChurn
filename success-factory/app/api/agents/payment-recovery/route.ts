import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { stripe, hubspot } from "@/lib/integrations"
import Anthropic from "@anthropic-ai/sdk"
import { getAnthropicClient, createMessage, AI_MODEL, TOKEN_LIMITS } from "@/lib/ai"

/**
 * Payment Recovery Agent
 *
 * Autonomous agent that runs daily to:
 * 1. Scan for failed charges in Stripe
 * 2. Match to customer accounts
 * 3. Generate personalized recovery outreach
 * 4. Create escalating tasks based on failure count
 *
 * Trigger: Daily cron at 9 AM UTC
 * POST /api/agents/payment-recovery
 */

interface FailedPayment {
  customerId: string
  customerName: string
  customerEmail: string
  chargeId: string
  amount: number
  failureCode: string | null
  failureMessage: string | null
  failedAt: Date
  attemptCount: number
}

interface RecoveryAction {
  customer: FailedPayment
  hubspotCompany: { id: string; name: string; mrr: number | null } | null
  escalationLevel: "low" | "medium" | "high" | "critical"
  suggestedActions: string[]
}

export async function POST(request: NextRequest) {
  // Verify cron auth
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  // Auth: require valid CRON_SECRET or Vercel cron header (dev mode allows all)
  const isAuthorized =
    process.env.NODE_ENV === "development" ||
    request.headers.get("x-vercel-cron") === "1" ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`)

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not configured" }, { status: 500 })
  }

  console.log("[Payment Recovery Agent] Starting payment failure scan...")

  try {
    // Find recent failed charges (last 7 days)
    const failedPayments = await findFailedPayments()

    if (failedPayments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No failed payments found",
        tasksCreated: 0,
      })
    }

    console.log(`[Payment Recovery Agent] Found ${failedPayments.length} failed payments`)

    // Get HubSpot companies for enrichment
    const companies = await hubspot.searchCompanies("*").catch(() => [])
    const companyMap = new Map<string, { id: string; name: string; mrr: number | null }>()
    for (const company of companies) {
      const name = company.properties.name?.toLowerCase()
      const email = company.properties.email?.toLowerCase()
      if (name) {
        companyMap.set(name, {
          id: company.id,
          name: company.properties.name || "",
          mrr: parseFloat(company.properties.mrr || "0") || null,
        })
      }
      if (email) {
        companyMap.set(email, {
          id: company.id,
          name: company.properties.name || "",
          mrr: parseFloat(company.properties.mrr || "0") || null,
        })
      }
    }

    // Analyze each failed payment
    const recoveryActions: RecoveryAction[] = []
    for (const payment of failedPayments) {
      // Try to match to HubSpot company
      const hubspotCompany =
        companyMap.get(payment.customerName.toLowerCase()) ||
        companyMap.get(payment.customerEmail.toLowerCase()) ||
        null

      // Determine escalation level
      const escalationLevel = getEscalationLevel(payment.attemptCount, payment.amount)

      // Generate suggested actions
      const suggestedActions = getSuggestedActions(payment, escalationLevel)

      recoveryActions.push({
        customer: payment,
        hubspotCompany,
        escalationLevel,
        suggestedActions,
      })
    }

    // Sort by escalation level (critical first) and amount
    const levelOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    recoveryActions.sort((a, b) => {
      const levelDiff = levelOrder[a.escalationLevel] - levelOrder[b.escalationLevel]
      if (levelDiff !== 0) return levelDiff
      return b.customer.amount - a.customer.amount
    })

    // Create tasks for each recovery action
    const tasksCreated: string[] = []
    let anthropic: Anthropic | null = null
    try {
      anthropic = getAnthropicClient()
    } catch {
      // API key not configured, continue without AI
    }

    for (const action of recoveryActions) {
      try {
        // Check for existing task (avoid duplicates within 3 days)
        const existingTask = await prisma.task.findFirst({
          where: {
            title: { contains: action.customer.customerName },
            metadata: {
              path: ["source"],
              equals: "payment-recovery-agent",
            },
            createdAt: {
              gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            },
          },
        })

        if (existingTask) {
          console.log(
            `[Payment Recovery Agent] Skipping ${action.customer.customerName} - already has recent task`
          )
          continue
        }

        // Generate personalized outreach if AI available
        let outreachMessage = ""
        if (anthropic && action.escalationLevel !== "low") {
          outreachMessage = await generateOutreach(anthropic, action)
        }

        // Create task
        const priority = escalationLevelToPriority(action.escalationLevel)
        const task = await prisma.task.create({
          data: {
            companyId: action.hubspotCompany?.id || action.customer.customerId,
            companyName: action.hubspotCompany?.name || action.customer.customerName,
            title: getTaskTitle(action),
            description: buildTaskDescription(action, outreachMessage),
            priority,
            status: "pending",
            dueDate: getDueDate(action.escalationLevel),
            metadata: {
              source: "payment-recovery-agent",
              stripeCustomerId: action.customer.customerId,
              chargeId: action.customer.chargeId,
              amount: action.customer.amount,
              attemptCount: action.customer.attemptCount,
              escalationLevel: action.escalationLevel,
              failureCode: action.customer.failureCode,
            },
          },
        })

        tasksCreated.push(task.id)
        console.log(
          `[Payment Recovery Agent] Created task for ${action.customer.customerName} (${action.escalationLevel})`
        )
      } catch (err) {
        console.error(
          `[Payment Recovery Agent] Error creating task for ${action.customer.customerName}:`,
          err
        )
      }
    }

    // Calculate summary stats
    const totalAtRisk = recoveryActions.reduce((sum, a) => sum + a.customer.amount, 0)

    console.log(`[Payment Recovery Agent] Complete:
    - Failed payments found: ${failedPayments.length}
    - Tasks created: ${tasksCreated.length}
    - Total revenue at risk: $${(totalAtRisk / 100).toFixed(2)}`)

    return NextResponse.json({
      success: true,
      summary: {
        failedPaymentsFound: failedPayments.length,
        tasksCreated: tasksCreated.length,
        totalRevenueAtRisk: totalAtRisk / 100, // Convert from cents
        escalationBreakdown: {
          critical: recoveryActions.filter((a) => a.escalationLevel === "critical").length,
          high: recoveryActions.filter((a) => a.escalationLevel === "high").length,
          medium: recoveryActions.filter((a) => a.escalationLevel === "medium").length,
          low: recoveryActions.filter((a) => a.escalationLevel === "low").length,
        },
      },
      recoveryActions: recoveryActions.slice(0, 20).map((a) => ({
        customerName: a.customer.customerName,
        amount: a.customer.amount / 100,
        attemptCount: a.customer.attemptCount,
        escalationLevel: a.escalationLevel,
        failureCode: a.customer.failureCode,
      })),
    })
  } catch (error) {
    console.error("[Payment Recovery Agent] Error:", error)
    return NextResponse.json(
      {
        error: "Payment recovery agent failed",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    )
  }
}

// GET endpoint for status
export async function GET() {
  try {
    const recentTasks = await prisma.task.findMany({
      where: {
        metadata: {
          path: ["source"],
          equals: "payment-recovery-agent",
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    // Calculate recovery stats
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const completedTasks = await prisma.task.count({
      where: {
        metadata: {
          path: ["source"],
          equals: "payment-recovery-agent",
        },
        status: "completed",
        updatedAt: { gte: last7Days },
      },
    })

    const totalTasks = await prisma.task.count({
      where: {
        metadata: {
          path: ["source"],
          equals: "payment-recovery-agent",
        },
        createdAt: { gte: last7Days },
      },
    })

    return NextResponse.json({
      recentTasks: recentTasks.map((t) => ({
        id: t.id,
        companyName: t.companyName,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt,
        amount: (t.metadata as Record<string, unknown>)?.amount,
        escalationLevel: (t.metadata as Record<string, unknown>)?.escalationLevel,
      })),
      stats: {
        tasksLast7Days: totalTasks,
        completedLast7Days: completedTasks,
        recoveryRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 })
  }
}

async function findFailedPayments(): Promise<FailedPayment[]> {
  try {
    // Get customers with recent activity
    const customers = await stripe.listCustomers(100)
    const failedPayments: FailedPayment[] = []

    // Check each customer for failed charges
    for (const customer of customers) {
      if (!customer.id) continue

      const charges = await stripe.getRecentCharges(customer.id, 20)
      const failedCharges = charges.filter((c) => c.status === "failed")

      // Count total failures in last 30 days
      const recentFailures = failedCharges.filter((c) => {
        const chargeDate = new Date(c.created * 1000)
        const daysAgo = (Date.now() - chargeDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysAgo <= 30
      })

      // Get most recent failure from last 7 days
      const recentFailure = failedCharges.find((c) => {
        const chargeDate = new Date(c.created * 1000)
        const daysAgo = (Date.now() - chargeDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysAgo <= 7
      })

      if (recentFailure) {
        failedPayments.push({
          customerId: customer.id,
          customerName: customer.name || customer.email || "Unknown",
          customerEmail: customer.email || "",
          chargeId: recentFailure.id,
          amount: recentFailure.amount,
          failureCode: recentFailure.failure_code || null,
          failureMessage: recentFailure.failure_message || null,
          failedAt: new Date(recentFailure.created * 1000),
          attemptCount: recentFailures.length,
        })
      }
    }

    return failedPayments.sort((a, b) => b.amount - a.amount)
  } catch (error) {
    console.error("[Payment Recovery Agent] Error fetching failed payments:", error)
    return []
  }
}

function getEscalationLevel(
  attemptCount: number,
  amount: number
): "low" | "medium" | "high" | "critical" {
  // Amount in cents
  const amountDollars = amount / 100

  if (attemptCount >= 4 || amountDollars >= 5000) {
    return "critical"
  }
  if (attemptCount >= 3 || amountDollars >= 2000) {
    return "high"
  }
  if (attemptCount >= 2 || amountDollars >= 500) {
    return "medium"
  }
  return "low"
}

function getSuggestedActions(payment: FailedPayment, level: string): string[] {
  const actions: string[] = []

  // Based on failure code
  switch (payment.failureCode) {
    case "card_declined":
    case "insufficient_funds":
      actions.push("Request updated payment method")
      actions.push("Offer alternative payment options (ACH, wire)")
      break
    case "expired_card":
      actions.push("Request new card details")
      actions.push("Send card update link")
      break
    case "processing_error":
      actions.push("Retry payment in 24 hours")
      actions.push("Contact Stripe support if persistent")
      break
    default:
      actions.push("Verify payment details with customer")
  }

  // Based on escalation level
  if (level === "critical" || level === "high") {
    actions.push("Schedule call with account owner")
    actions.push("Consider pause/grace period to retain account")
  }

  if (level === "critical") {
    actions.push("Escalate to CS leadership")
    actions.push("Prepare retention offer if needed")
  }

  return actions
}

function escalationLevelToPriority(level: "low" | "medium" | "high" | "critical"): string {
  switch (level) {
    case "critical":
      return "critical"
    case "high":
      return "high"
    case "medium":
      return "medium"
    default:
      return "low"
  }
}

function getTaskTitle(action: RecoveryAction): string {
  const amount = (action.customer.amount / 100).toFixed(0)
  const emoji =
    action.escalationLevel === "critical" ? "🚨" : action.escalationLevel === "high" ? "⚠️" : "💳"

  return `${emoji} Payment Failed: ${action.customer.customerName} ($${amount})`
}

function getDueDate(level: "low" | "medium" | "high" | "critical"): Date {
  const hours = {
    critical: 4,
    high: 24,
    medium: 48,
    low: 72,
  }
  return new Date(Date.now() + hours[level] * 60 * 60 * 1000)
}

function buildTaskDescription(action: RecoveryAction, outreachMessage: string): string {
  const lines: string[] = []

  lines.push(`## Payment Failure Details`)
  lines.push(`- **Customer:** ${action.customer.customerName}`)
  lines.push(`- **Email:** ${action.customer.customerEmail}`)
  lines.push(`- **Amount:** $${(action.customer.amount / 100).toFixed(2)}`)
  lines.push(`- **Attempt #:** ${action.customer.attemptCount}`)
  lines.push(`- **Failed At:** ${action.customer.failedAt.toISOString()}`)

  if (action.customer.failureCode) {
    lines.push(`- **Failure Code:** ${action.customer.failureCode}`)
  }
  if (action.customer.failureMessage) {
    lines.push(`- **Failure Message:** ${action.customer.failureMessage}`)
  }

  if (action.hubspotCompany?.mrr) {
    lines.push(`- **MRR:** $${action.hubspotCompany.mrr.toLocaleString()}`)
  }

  lines.push("")
  lines.push(`## Suggested Actions`)
  for (const action_item of action.suggestedActions) {
    lines.push(`- [ ] ${action_item}`)
  }

  if (outreachMessage) {
    lines.push("")
    lines.push(`## Suggested Outreach`)
    lines.push(outreachMessage)
  }

  return lines.join("\n")
}

async function generateOutreach(anthropic: Anthropic, action: RecoveryAction): Promise<string> {
  try {
    const message = await createMessage(anthropic, {
      model: AI_MODEL,
      max_tokens: TOKEN_LIMITS.small,
      messages: [
        {
          role: "user",
          content: `Write a brief, friendly payment recovery email for this situation:

Customer: ${action.customer.customerName}
Failed Amount: $${(action.customer.amount / 100).toFixed(2)}
Attempt Count: ${action.customer.attemptCount}
Failure Reason: ${action.customer.failureMessage || action.customer.failureCode || "Unknown"}

Write a short email (3-4 sentences) that:
- Is friendly and non-accusatory
- Explains the payment issue
- Provides a clear call-to-action
- Offers to help

Do not include subject line. Just the email body.`,
        },
      ],
    })

    return message.content[0].type === "text" ? message.content[0].text : ""
  } catch {
    return ""
  }
}
