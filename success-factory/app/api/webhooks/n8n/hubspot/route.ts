/**
 * n8n HubSpot Webhook Receiver
 *
 * Receives HubSpot events forwarded from n8n workflows.
 * Handles company property changes and deal stage updates.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

function validateWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-webhook-secret")
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET
  if (!expectedSecret) return process.env.NODE_ENV === "development"
  return secret === expectedSecret
}

type HubSpotEventType =
  | "company.propertyChange"
  | "deal.stageChange"
  | "contact.created"
  | "contact.deleted"

interface N8nHubSpotPayload {
  event: HubSpotEventType
  companyId: string
  companyName?: string
  dealId?: string
  dealName?: string
  dealAmount?: number
  previousStage?: string
  newStage?: string
  changedProperties?: string[]
  contactEmail?: string
  contactName?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  if (!validateWebhookSecret(request)) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 })
  }

  let payload: N8nHubSpotPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { event, companyId, companyName } = payload

  if (!event || !companyId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  console.log(`[n8n HubSpot] Received: ${event} for company ${companyId}`)

  try {
    switch (event) {
      case "company.propertyChange":
        await handleCompanyPropertyChange(payload)
        break

      case "deal.stageChange":
        await handleDealStageChange(payload)
        break

      case "contact.created":
        await handleContactCreated(payload)
        break

      case "contact.deleted":
        await handleContactDeleted(payload)
        break

      default:
        console.log(`[n8n HubSpot] Unhandled event: ${event}`)
    }

    return NextResponse.json({
      success: true,
      companyId,
      companyName,
    })
  } catch (error) {
    console.error("[n8n HubSpot] Error:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    webhook: "n8n/hubspot",
    events: ["company.propertyChange", "deal.stageChange", "contact.created", "contact.deleted"],
  })
}

async function handleCompanyPropertyChange(payload: N8nHubSpotPayload) {
  const { companyId, companyName, changedProperties } = payload

  // Log the property change as an activity
  await prisma.activityEvent.create({
    data: {
      companyId,
      source: "hubspot",
      eventType: "company_updated",
      title: "Company properties updated",
      description: `Properties changed: ${changedProperties?.join(", ") || "unknown"}`,
      importance: "low",
      occurredAt: new Date(),
      metadata: { changedProperties },
    },
  })

  console.log(`[n8n HubSpot] Company ${companyName} properties updated: ${changedProperties?.join(", ")}`)
}

async function handleDealStageChange(payload: N8nHubSpotPayload) {
  const { companyId, companyName, dealId, dealName, dealAmount, previousStage, newStage } = payload

  // Check for lost deals -> potential churn
  const isLostDeal = newStage?.toLowerCase().includes("lost") || newStage?.toLowerCase().includes("closed lost")

  // Log activity
  await prisma.activityEvent.create({
    data: {
      companyId,
      source: "hubspot",
      eventType: isLostDeal ? "deal_lost" : "deal_stage_changed",
      title: isLostDeal ? `Deal lost: ${dealName}` : `Deal stage changed: ${dealName}`,
      description: `Stage: ${previousStage} → ${newStage}${dealAmount ? ` | Amount: $${dealAmount}` : ""}`,
      importance: isLostDeal ? "high" : "medium",
      occurredAt: new Date(),
      metadata: { dealId, dealName, dealAmount, previousStage, newStage },
    },
  })

  // Create task for lost deals
  if (isLostDeal && dealAmount && dealAmount > 500) {
    await prisma.task.create({
      data: {
        companyId,
        companyName: companyName || "Unknown",
        title: `⚠️ Deal lost: ${dealName || "Unknown deal"}`,
        description: `Deal worth $${dealAmount} was lost.\nPrevious stage: ${previousStage}\n\nAction: Review reason and consider churn risk.`,
        priority: "high",
        status: "pending",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        metadata: { source: "n8n_hubspot_webhook", event: "deal_lost", dealId },
      },
    })
  }

  console.log(`[n8n HubSpot] Deal ${dealName} stage changed: ${previousStage} → ${newStage}`)
}

async function handleContactCreated(payload: N8nHubSpotPayload) {
  const { companyId, contactEmail, contactName } = payload

  if (!contactEmail) return

  // Check if stakeholder already exists
  const existing = await prisma.stakeholder.findFirst({
    where: { companyId, email: contactEmail },
  })

  if (!existing) {
    await prisma.stakeholder.create({
      data: {
        companyId,
        name: contactName || contactEmail.split("@")[0],
        email: contactEmail,
        role: "Contact",
        isActive: true,
      },
    })
    console.log(`[n8n HubSpot] Created stakeholder: ${contactEmail}`)
  }
}

async function handleContactDeleted(payload: N8nHubSpotPayload) {
  const { companyId, contactEmail } = payload

  if (!contactEmail) return

  // Mark stakeholder as inactive
  await prisma.stakeholder.updateMany({
    where: { companyId, email: contactEmail },
    data: { isActive: false },
  })

  console.log(`[n8n HubSpot] Deactivated stakeholder: ${contactEmail}`)
}
