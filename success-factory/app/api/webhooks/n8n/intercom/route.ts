/**
 * n8n Intercom Webhook Receiver
 *
 * Receives Intercom support ticket events forwarded from n8n.
 * Tracks support interactions and CSAT for health scoring.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

function validateWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-webhook-secret")
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET
  if (!expectedSecret) return process.env.NODE_ENV === "development"
  return secret === expectedSecret
}

type IntercomEventType =
  | "conversation.created"
  | "conversation.closed"
  | "conversation.rated"
  | "conversation.replied"

interface N8nIntercomPayload {
  event: IntercomEventType
  conversationId: string
  contactEmail?: string
  contactName?: string
  companyName?: string
  companyId?: string
  subject?: string
  rating?: number // 1-5
  responseTimeMinutes?: number
  messageCount?: number
  tags?: string[]
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  if (!validateWebhookSecret(request)) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 })
  }

  let payload: N8nIntercomPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { event, conversationId, contactEmail, companyName } = payload

  if (!event || !conversationId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  console.log(`[n8n Intercom] Received: ${event} for conversation ${conversationId}`)

  try {
    // Try to find company by name or email domain
    let company = payload.companyId
      ? await prisma.hubSpotCompany.findFirst({ where: { hubspotId: payload.companyId } })
      : null

    if (!company && companyName) {
      company = await prisma.hubSpotCompany.findFirst({
        where: { name: { contains: companyName, mode: "insensitive" } },
      })
    }

    if (!company && contactEmail) {
      const domain = contactEmail.split("@")[1]
      company = await prisma.hubSpotCompany.findFirst({
        where: { domain: { contains: domain, mode: "insensitive" } },
      })
    }

    const companyId = company?.hubspotId || payload.companyId || "unknown"

    switch (event) {
      case "conversation.created":
        await handleConversationCreated(companyId, company?.name || companyName, payload)
        break

      case "conversation.closed":
        await handleConversationClosed(companyId, company?.name || companyName, payload)
        break

      case "conversation.rated":
        await handleConversationRated(companyId, company?.name || companyName, payload)
        break

      default:
        console.log(`[n8n Intercom] Unhandled event: ${event}`)
    }

    return NextResponse.json({
      success: true,
      matched: !!company,
      companyId,
    })
  } catch (error) {
    console.error("[n8n Intercom] Error:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    webhook: "n8n/intercom",
    events: ["conversation.created", "conversation.closed", "conversation.rated"],
  })
}

async function handleConversationCreated(
  companyId: string,
  companyName: string | undefined,
  payload: N8nIntercomPayload
) {
  const { conversationId, contactEmail, subject, tags } = payload

  // Log activity
  await prisma.activityEvent.create({
    data: {
      companyId,
      source: "intercom",
      eventType: "support_ticket_created",
      title: subject || "New support conversation",
      description: `Support ticket opened by ${contactEmail || "unknown"}`,
      importance: tags?.includes("urgent") ? "high" : "medium",
      occurredAt: new Date(),
      metadata: { conversationId, contactEmail, tags },
    },
  })

  // Check for high ticket volume (risk signal)
  const recentTickets = await prisma.activityEvent.count({
    where: {
      companyId,
      eventType: "support_ticket_created",
      occurredAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  })

  if (recentTickets >= 5) {
    await prisma.task.create({
      data: {
        companyId,
        companyName: companyName || "Unknown",
        title: `⚠️ High support volume: ${companyName || companyId}`,
        description: `${recentTickets} support tickets in the last 7 days.\n\nAction: Review issues and consider proactive outreach.`,
        priority: "high",
        status: "pending",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: { source: "n8n_intercom_webhook", event: "high_ticket_volume" },
      },
    })
  }

  console.log(`[n8n Intercom] Ticket created for ${companyId}`)
}

async function handleConversationClosed(
  companyId: string,
  companyName: string | undefined,
  payload: N8nIntercomPayload
) {
  const { conversationId, responseTimeMinutes, messageCount } = payload

  await prisma.activityEvent.create({
    data: {
      companyId,
      source: "intercom",
      eventType: "support_ticket_closed",
      title: "Support conversation resolved",
      description: `Resolved${responseTimeMinutes ? ` in ${responseTimeMinutes} minutes` : ""}${messageCount ? ` (${messageCount} messages)` : ""}`,
      importance: "low",
      occurredAt: new Date(),
      metadata: { conversationId, responseTimeMinutes, messageCount },
    },
  })

  console.log(`[n8n Intercom] Ticket closed for ${companyId}`)
}

async function handleConversationRated(
  companyId: string,
  companyName: string | undefined,
  payload: N8nIntercomPayload
) {
  const { conversationId, rating, contactEmail } = payload

  const isNegative = rating !== undefined && rating <= 2
  const isPositive = rating !== undefined && rating >= 4

  await prisma.activityEvent.create({
    data: {
      companyId,
      source: "intercom",
      eventType: isNegative ? "negative_csat" : "csat_rating",
      title: `Support rated ${rating}/5`,
      description: `Customer ${contactEmail || "unknown"} rated support ${rating}/5`,
      importance: isNegative ? "high" : "low",
      occurredAt: new Date(),
      metadata: { conversationId, rating, contactEmail },
    },
  })

  // Create task for negative ratings
  if (isNegative) {
    await prisma.task.create({
      data: {
        companyId,
        companyName: companyName || "Unknown",
        title: `😞 Negative support rating: ${companyName || companyId}`,
        description: `Customer rated support ${rating}/5.\nContact: ${contactEmail || "unknown"}\n\nAction: Follow up to understand and resolve concerns.`,
        priority: "high",
        status: "pending",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: { source: "n8n_intercom_webhook", event: "negative_csat", rating },
      },
    })
  }

  console.log(`[n8n Intercom] Rating ${rating}/5 for ${companyId}`)
}
