import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAnthropicClient, createMessage, AI_MODEL, TOKEN_LIMITS, getErrorResponse } from "@/lib/ai"

// Playbook action type
interface PlaybookAction {
  type: "create_task"
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  dueInDays?: number
}

interface CustomerSignals {
  companyId: string
  companyName: string
  healthScore: string
  mrr: number | null
  totalTrips: number | null
  daysSinceLastLogin: number | null
  riskSignals: string[]
  positiveSignals: string[]
  journeyStage?: string
  npsScore?: number | null
  npsCategory?: string | null
  renewalDaysAway?: number | null
}

/**
 * Execute playbooks for high churn risk
 */
async function executeChurnRiskPlaybooks(
  trigger: "ai_high_churn_risk" | "ai_critical_churn_risk",
  company: { companyId: string; companyName: string; riskScore: number }
) {
  try {
    const playbooks = await prisma.playbook.findMany({
      where: { trigger, isActive: true },
    })

    for (const playbook of playbooks) {
      const actions = playbook.actions as unknown as PlaybookAction[]

      for (const action of actions) {
        if (action.type === "create_task") {
          const dueDate = action.dueInDays
            ? new Date(Date.now() + action.dueInDays * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)

          await prisma.task.create({
            data: {
              companyId: company.companyId,
              companyName: company.companyName,
              title: action.title
                .replace("{companyName}", company.companyName)
                .replace("{riskScore}", String(Math.round(company.riskScore))),
              description: action.description
                ?.replace("{companyName}", company.companyName)
                .replace("{riskScore}", String(Math.round(company.riskScore))),
              priority: action.priority || "urgent",
              status: "pending",
              dueDate,
              playbookId: playbook.id,
              metadata: {
                trigger,
                riskScore: company.riskScore,
                createdBy: "ai_prediction",
              },
            },
          })
        }
      }
    }
  } catch (error) {
    console.error("AI playbook execution error:", error)
  }
}

/**
 * Get AI churn prediction for a company
 * POST /api/ai/predict
 * Body: { companyId, companyName, signals }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signals = body as CustomerSignals

    if (!signals.companyId || !signals.companyName) {
      return NextResponse.json(
        { error: "companyId and companyName required" },
        { status: 400 }
      )
    }

    // Build context for Claude
    const prompt = buildPrompt(signals)

    // Call Claude for prediction
    const anthropic = getAnthropicClient()
    const message = await createMessage(anthropic, {
      model: AI_MODEL,
      max_tokens: TOKEN_LIMITS.medium,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    // Parse response
    const responseText = message.content[0].type === "text" ? message.content[0].text : ""
    const prediction = parseResponse(responseText)

    // Save prediction to database
    const saved = await prisma.aIPrediction.create({
      data: {
        companyId: signals.companyId,
        companyName: signals.companyName,
        riskScore: prediction.riskScore,
        riskLevel: prediction.riskLevel,
        reasoning: prediction.reasoning,
        signals: JSON.parse(JSON.stringify(signals)),
        recommendations: prediction.recommendations,
      },
    })

    // Trigger playbooks if high/critical risk
    if (prediction.riskScore >= 90) {
      await executeChurnRiskPlaybooks("ai_critical_churn_risk", {
        companyId: signals.companyId,
        companyName: signals.companyName,
        riskScore: prediction.riskScore,
      })
    } else if (prediction.riskScore >= 70) {
      await executeChurnRiskPlaybooks("ai_high_churn_risk", {
        companyId: signals.companyId,
        companyName: signals.companyName,
        riskScore: prediction.riskScore,
      })
    }

    return NextResponse.json({
      prediction: saved,
    })
  } catch (error) {
    console.error("AI prediction error:", error)
    return NextResponse.json(
      { error: "Failed to generate prediction" },
      { status: 500 }
    )
  }
}

/**
 * Get recent predictions
 * GET /api/ai/predict?companyId=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get("companyId")
  const limit = parseInt(searchParams.get("limit") || "10")

  try {
    const predictions = await prisma.aIPrediction.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    // Get high-risk summary
    const highRisk = await prisma.aIPrediction.findMany({
      where: {
        riskLevel: { in: ["high", "critical"] },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { riskScore: "desc" },
      take: 10,
    })

    return NextResponse.json({
      predictions,
      highRisk,
    })
  } catch (error) {
    console.error("AI predictions fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch predictions" },
      { status: 500 }
    )
  }
}

function buildPrompt(signals: CustomerSignals): string {
  return `You are a customer success AI analyzing churn risk. Based on the following customer signals, provide a churn risk assessment.

CUSTOMER: ${signals.companyName}
MRR: ${signals.mrr ? `$${signals.mrr}` : "Unknown"}
Health Score: ${signals.healthScore}
Total Usage (trips): ${signals.totalTrips ?? "Unknown"}
Days Since Last Login: ${signals.daysSinceLastLogin ?? "Unknown"}
Journey Stage: ${signals.journeyStage || "Unknown"}
NPS Score: ${signals.npsScore !== null && signals.npsScore !== undefined ? `${signals.npsScore} (${signals.npsCategory})` : "No response"}
Days Until Renewal: ${signals.renewalDaysAway ?? "Unknown"}

RISK SIGNALS:
${signals.riskSignals.length > 0 ? signals.riskSignals.map(s => `- ${s}`).join("\n") : "- None detected"}

POSITIVE SIGNALS:
${signals.positiveSignals.length > 0 ? signals.positiveSignals.map(s => `- ${s}`).join("\n") : "- None detected"}

Respond in this exact JSON format:
{
  "riskScore": <number 0-100>,
  "riskLevel": "<low|medium|high|critical>",
  "reasoning": "<2-3 sentence explanation>",
  "recommendations": ["<action 1>", "<action 2>", "<action 3>"]
}

Risk levels:
- low: 0-30% churn probability
- medium: 31-60% churn probability
- high: 61-85% churn probability
- critical: 86-100% churn probability

Consider:
- Inactive accounts (no login 30+ days) are higher risk
- Detractor NPS (0-6) significantly increases risk
- Red health scores indicate immediate attention needed
- Upcoming renewals with red/yellow health are critical
- Low usage correlates with higher churn`
}

function parseResponse(text: string): {
  riskScore: number
  riskLevel: string
  reasoning: string
  recommendations: string[]
} {
  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        riskScore: Math.max(0, Math.min(100, parsed.riskScore || 50)),
        riskLevel: parsed.riskLevel || "medium",
        reasoning: parsed.reasoning || "Unable to determine risk factors.",
        recommendations: parsed.recommendations || [],
      }
    }
  } catch (e) {
    console.error("Failed to parse AI response:", e)
  }

  // Fallback
  return {
    riskScore: 50,
    riskLevel: "medium",
    reasoning: "Unable to analyze risk factors. Manual review recommended.",
    recommendations: ["Review account manually", "Schedule check-in call"],
  }
}
