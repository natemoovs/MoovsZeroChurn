/**
 * n8n Usage Metrics Webhook Receiver
 *
 * Receives daily usage data from Snowflake via n8n.
 * Updates company records with latest product usage metrics.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

function validateWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-webhook-secret")
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET
  if (!expectedSecret) return process.env.NODE_ENV === "development"
  return secret === expectedSecret
}

interface N8nUsageMetricsPayload {
  companyName: string
  companyId?: string
  totalTrips: number
  daysSinceLastLogin: number | null
  churnStatus: string | null
  mrr: number | null
  plan: string | null
}

// Can receive single object or array
type PayloadInput = N8nUsageMetricsPayload | N8nUsageMetricsPayload[]

export async function POST(request: NextRequest) {
  if (!validateWebhookSecret(request)) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 })
  }

  let payload: PayloadInput
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Handle both single object and array
  const records = Array.isArray(payload) ? payload : [payload]

  if (records.length === 0) {
    return NextResponse.json({ error: "No records provided" }, { status: 400 })
  }

  console.log(`[n8n Usage] Received ${records.length} usage metric records`)

  let updated = 0
  let notFound = 0
  let errors = 0

  for (const record of records) {
    try {
      const { companyName, totalTrips, daysSinceLastLogin, churnStatus, mrr, plan } = record

      if (!companyName) {
        errors++
        continue
      }

      // Find company by name
      const company = await prisma.hubSpotCompany.findFirst({
        where: { name: { equals: companyName, mode: "insensitive" } },
      })

      if (!company) {
        notFound++
        continue
      }

      // Determine health score based on metrics
      let healthScore = "green"
      if (churnStatus?.toLowerCase().includes("churn")) {
        healthScore = "churned"
      } else if (daysSinceLastLogin && daysSinceLastLogin > 60) {
        healthScore = "red"
      } else if (daysSinceLastLogin && daysSinceLastLogin > 30) {
        healthScore = "yellow"
      } else if (totalTrips <= 5) {
        healthScore = "yellow"
      }

      // Calculate numeric health score (0-100)
      let numericHealthScore = 50
      if (healthScore === "churned") {
        numericHealthScore = 0
      } else if (healthScore === "red") {
        numericHealthScore = 20
      } else if (healthScore === "yellow") {
        numericHealthScore = 50
      } else if (healthScore === "green") {
        numericHealthScore = 80
        if (totalTrips > 100) numericHealthScore = 90
        if (daysSinceLastLogin && daysSinceLastLogin <= 7) numericHealthScore = 95
      }

      // Update company record
      await prisma.hubSpotCompany.update({
        where: { id: company.id },
        data: {
          healthScore,
          numericHealthScore,
          mrr: mrr ?? company.mrr,
          plan: plan ?? company.plan,
          subscriptionStatus: churnStatus?.toLowerCase().includes("churn") ? "churned" : company.subscriptionStatus,
        },
      })

      // Store snapshot for trending
      await prisma.healthScoreSnapshot.create({
        data: {
          companyId: company.hubspotId,
          companyName,
          healthScore,
          mrr,
          totalTrips,
          daysSinceLastLogin,
          riskSignals: buildRiskSignals(record),
          positiveSignals: buildPositiveSignals(record),
        },
      })

      updated++
    } catch (err) {
      console.error(`[n8n Usage] Error processing ${record.companyName}:`, err)
      errors++
    }
  }

  console.log(`[n8n Usage] Complete: ${updated} updated, ${notFound} not found, ${errors} errors`)

  return NextResponse.json({
    success: true,
    processed: records.length,
    updated,
    notFound,
    errors,
  })
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    webhook: "n8n/usage-metrics",
    description: "Receives daily usage data from Snowflake",
    expectedFields: [
      "companyName",
      "totalTrips",
      "daysSinceLastLogin",
      "churnStatus",
      "mrr",
      "plan",
    ],
  })
}

function buildRiskSignals(record: N8nUsageMetricsPayload): string[] {
  const signals: string[] = []

  if (record.churnStatus?.toLowerCase().includes("churn")) {
    signals.push("Churned")
  }
  if (record.daysSinceLastLogin && record.daysSinceLastLogin > 60) {
    signals.push(`No login ${record.daysSinceLastLogin}d`)
  } else if (record.daysSinceLastLogin && record.daysSinceLastLogin > 30) {
    signals.push(`Inactive ${record.daysSinceLastLogin}d`)
  }
  if (record.totalTrips === 0) {
    signals.push("Zero usage")
  } else if (record.totalTrips <= 5) {
    signals.push("Low usage")
  }

  return signals
}

function buildPositiveSignals(record: N8nUsageMetricsPayload): string[] {
  const signals: string[] = []

  if (record.totalTrips > 100) {
    signals.push("High usage")
  }
  if (record.daysSinceLastLogin !== null && record.daysSinceLastLogin <= 7) {
    signals.push("Recent login")
  }
  if (record.mrr && record.mrr > 500) {
    signals.push("Good MRR")
  }

  return signals
}
