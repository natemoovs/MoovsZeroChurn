/**
 * n8n Quo (Phone/OpenPhone) Webhook Receiver
 *
 * Receives phone call and SMS events forwarded from n8n.
 * Tracks customer communication for engagement scoring.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

function validateWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-webhook-secret")
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET
  if (!expectedSecret) return process.env.NODE_ENV === "development"
  return secret === expectedSecret
}

type QuoEventType = "call_completed" | "call_missed" | "sms_received" | "voicemail"

interface N8nQuoPayload {
  event: QuoEventType
  callId?: string
  messageId?: string
  fromNumber: string
  toNumber: string
  durationSeconds?: number
  direction: "inbound" | "outbound"
  recordingUrl?: string
  outcome?: string
  messageBody?: string
  transcript?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  if (!validateWebhookSecret(request)) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 })
  }

  let payload: N8nQuoPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { event, fromNumber, toNumber, direction } = payload

  if (!event || !fromNumber || !toNumber) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  console.log(`[n8n Quo] Received: ${event} ${direction} ${fromNumber} -> ${toNumber}`)

  try {
    // Try to find company by phone number
    const customerNumber = direction === "inbound" ? fromNumber : toNumber
    const last10Digits = customerNumber.slice(-10)

    // Check company phone first, then stakeholder phones
    let company = await prisma.hubSpotCompany.findFirst({
      where: { phone: { contains: last10Digits } },
    })

    if (!company) {
      const stakeholder = await prisma.stakeholder.findFirst({
        where: { phone: { contains: last10Digits } },
      })
      if (stakeholder) {
        company = await prisma.hubSpotCompany.findFirst({
          where: { hubspotId: stakeholder.companyId }
        })
      }
    }

    // If no company found by phone, we can still log it for manual matching
    const companyId = company?.hubspotId || "unknown"
    const companyName = company?.name

    switch (event) {
      case "call_completed":
        await handleCallCompleted(companyId, companyName, payload)
        break

      case "call_missed":
        await handleCallMissed(companyId, companyName, payload)
        break

      case "sms_received":
        await handleSmsReceived(companyId, companyName, payload)
        break

      case "voicemail":
        await handleVoicemail(companyId, companyName, payload)
        break

      default:
        console.log(`[n8n Quo] Unhandled event: ${event}`)
    }

    return NextResponse.json({
      success: true,
      matched: !!company,
      companyId,
      companyName,
    })
  } catch (error) {
    console.error("[n8n Quo] Error:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    webhook: "n8n/quo",
    events: ["call_completed", "call_missed", "sms_received", "voicemail"],
  })
}

async function handleCallCompleted(
  companyId: string,
  companyName: string | undefined,
  payload: N8nQuoPayload
) {
  const { direction, durationSeconds, fromNumber, toNumber, recordingUrl, transcript } = payload
  const durationMinutes = Math.round((durationSeconds || 0) / 60)

  await prisma.activityEvent.create({
    data: {
      companyId,
      source: "quo",
      eventType: "call_completed",
      title: `${direction === "inbound" ? "Inbound" : "Outbound"} call (${durationMinutes}min)`,
      description: `${direction === "inbound" ? "Received call from" : "Called"} ${direction === "inbound" ? fromNumber : toNumber}`,
      importance: durationMinutes >= 15 ? "medium" : "low",
      occurredAt: new Date(),
      metadata: {
        direction,
        durationSeconds,
        fromNumber,
        toNumber,
        recordingUrl,
        hasTranscript: !!transcript,
      },
    },
  })

  // Update last activity date to track CSM engagement
  if (companyId !== "unknown") {
    await prisma.hubSpotCompany.update({
      where: { hubspotId: companyId },
      data: { lastActivityDate: new Date() },
    }).catch(() => {})
  }

  console.log(`[n8n Quo] Call logged for ${companyName || companyId}`)
}

async function handleCallMissed(
  companyId: string,
  companyName: string | undefined,
  payload: N8nQuoPayload
) {
  const { fromNumber } = payload

  await prisma.activityEvent.create({
    data: {
      companyId,
      source: "quo",
      eventType: "call_missed",
      title: "Missed call",
      description: `Missed call from ${fromNumber}`,
      importance: "medium",
      occurredAt: new Date(),
      metadata: { fromNumber },
    },
  })

  // Create task to call back
  if (companyId !== "unknown") {
    await prisma.task.create({
      data: {
        companyId,
        companyName: companyName || "Unknown",
        title: `📞 Return missed call: ${companyName || fromNumber}`,
        description: `Missed call from ${fromNumber}.\n\nAction: Call back to address customer needs.`,
        priority: "medium",
        status: "pending",
        dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
        metadata: { source: "n8n_quo_webhook", event: "call_missed", fromNumber },
      },
    })
  }

  console.log(`[n8n Quo] Missed call logged for ${companyName || companyId}`)
}

async function handleSmsReceived(
  companyId: string,
  companyName: string | undefined,
  payload: N8nQuoPayload
) {
  const { fromNumber, messageBody } = payload

  await prisma.activityEvent.create({
    data: {
      companyId,
      source: "quo",
      eventType: "sms_received",
      title: "SMS received",
      description: messageBody?.substring(0, 200) || "SMS message received",
      importance: "low",
      occurredAt: new Date(),
      metadata: { fromNumber, messageBody },
    },
  })

  console.log(`[n8n Quo] SMS logged for ${companyName || companyId}`)
}

async function handleVoicemail(
  companyId: string,
  companyName: string | undefined,
  payload: N8nQuoPayload
) {
  const { fromNumber, durationSeconds, recordingUrl, transcript } = payload

  await prisma.activityEvent.create({
    data: {
      companyId,
      source: "quo",
      eventType: "voicemail",
      title: "Voicemail received",
      description: transcript?.substring(0, 200) || `Voicemail from ${fromNumber}`,
      importance: "medium",
      occurredAt: new Date(),
      metadata: { fromNumber, durationSeconds, recordingUrl, transcript },
    },
  })

  // Create task to listen and respond
  if (companyId !== "unknown") {
    await prisma.task.create({
      data: {
        companyId,
        companyName: companyName || "Unknown",
        title: `🎤 Listen to voicemail: ${companyName || fromNumber}`,
        description: `Voicemail received from ${fromNumber}.\n${transcript ? `Preview: ${transcript.substring(0, 100)}...` : ""}\n\nAction: Listen and respond.`,
        priority: "medium",
        status: "pending",
        dueDate: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        metadata: { source: "n8n_quo_webhook", event: "voicemail", fromNumber, recordingUrl },
      },
    })
  }

  console.log(`[n8n Quo] Voicemail logged for ${companyName || companyId}`)
}
