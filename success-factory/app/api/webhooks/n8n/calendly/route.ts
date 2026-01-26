/**
 * n8n Calendly Webhook Receiver
 *
 * Receives Calendly meeting events forwarded from n8n.
 * Tracks engagement through meeting activity.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

function validateWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-webhook-secret")
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET
  if (!expectedSecret) return process.env.NODE_ENV === "development"
  return secret === expectedSecret
}

type CalendlyEventType = "meeting_scheduled" | "meeting_canceled" | "meeting_no_show" | "meeting_rescheduled"

interface N8nCalendlyPayload {
  event: CalendlyEventType
  eventId: string
  inviteeEmail: string
  inviteeName?: string
  meetingType?: string
  scheduledAt?: string
  durationMinutes?: number
  hostName?: string
  cancelReason?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  if (!validateWebhookSecret(request)) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 })
  }

  let payload: N8nCalendlyPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { event, eventId, inviteeEmail } = payload

  if (!event || !eventId || !inviteeEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  console.log(`[n8n Calendly] Received: ${event} for ${inviteeEmail}`)

  try {
    // Find company by email domain
    const domain = inviteeEmail.split("@")[1]
    const company = await prisma.hubSpotCompany.findFirst({
      where: { domain: { contains: domain, mode: "insensitive" } },
    })

    if (!company) {
      console.log(`[n8n Calendly] No company found for domain ${domain}`)
      return NextResponse.json({
        success: true,
        matched: false,
        message: "No matching company found",
      })
    }

    switch (event) {
      case "meeting_scheduled":
        await handleMeetingScheduled(company, payload)
        break

      case "meeting_canceled":
        await handleMeetingCanceled(company, payload)
        break

      case "meeting_no_show":
        await handleMeetingNoShow(company, payload)
        break

      case "meeting_rescheduled":
        await handleMeetingRescheduled(company, payload)
        break

      default:
        console.log(`[n8n Calendly] Unhandled event: ${event}`)
    }

    return NextResponse.json({
      success: true,
      matched: true,
      companyId: company.hubspotId,
      companyName: company.name,
    })
  } catch (error) {
    console.error("[n8n Calendly] Error:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    webhook: "n8n/calendly",
    events: ["meeting_scheduled", "meeting_canceled", "meeting_no_show", "meeting_rescheduled"],
  })
}

async function handleMeetingScheduled(
  company: { hubspotId: string; name: string },
  payload: N8nCalendlyPayload
) {
  const { inviteeEmail, inviteeName, meetingType, scheduledAt, durationMinutes, hostName } = payload

  // Log activity
  await prisma.activityEvent.create({
    data: {
      companyId: company.hubspotId,
      source: "calendly",
      eventType: "meeting_scheduled",
      title: `Meeting scheduled: ${meetingType || "Meeting"}`,
      description: `${inviteeName || inviteeEmail} scheduled a ${durationMinutes || 30}min meeting${hostName ? ` with ${hostName}` : ""}${scheduledAt ? ` for ${new Date(scheduledAt).toLocaleDateString()}` : ""}`,
      importance: "medium",
      occurredAt: new Date(),
      metadata: { inviteeEmail, inviteeName, meetingType, scheduledAt, durationMinutes, hostName },
    },
  })

  // Update last activity date to track CSM engagement
  await prisma.hubSpotCompany.update({
    where: { id: company.hubspotId },
    data: { lastActivityDate: new Date() },
  }).catch(() => {})

  console.log(`[n8n Calendly] Meeting scheduled for ${company.name}`)
}

async function handleMeetingCanceled(
  company: { hubspotId: string; name: string },
  payload: N8nCalendlyPayload
) {
  const { inviteeEmail, inviteeName, meetingType, cancelReason } = payload

  // Log activity
  await prisma.activityEvent.create({
    data: {
      companyId: company.hubspotId,
      source: "calendly",
      eventType: "meeting_canceled",
      title: `Meeting canceled: ${meetingType || "Meeting"}`,
      description: `${inviteeName || inviteeEmail} canceled${cancelReason ? `: ${cancelReason}` : ""}`,
      importance: "medium",
      occurredAt: new Date(),
      metadata: { inviteeEmail, inviteeName, meetingType, cancelReason },
    },
  })

  // Check for multiple cancellations (risk signal)
  const recentCancellations = await prisma.activityEvent.count({
    where: {
      companyId: company.hubspotId,
      eventType: "meeting_canceled",
      occurredAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  })

  if (recentCancellations >= 2) {
    await prisma.task.create({
      data: {
        companyId: company.hubspotId,
        companyName: company.name,
        title: `⚠️ Multiple meeting cancellations: ${company.name}`,
        description: `${recentCancellations} meetings canceled in the last 30 days.\n\nAction: Reach out to re-engage and understand blockers.`,
        priority: "medium",
        status: "pending",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        metadata: { source: "n8n_calendly_webhook", event: "multiple_cancellations" },
      },
    })
  }

  console.log(`[n8n Calendly] Meeting canceled for ${company.name}`)
}

async function handleMeetingNoShow(
  company: { hubspotId: string; name: string },
  payload: N8nCalendlyPayload
) {
  const { inviteeEmail, inviteeName, meetingType, scheduledAt } = payload

  // Log activity - no-shows are important risk signals
  await prisma.activityEvent.create({
    data: {
      companyId: company.hubspotId,
      source: "calendly",
      eventType: "meeting_no_show",
      title: `Meeting no-show: ${meetingType || "Meeting"}`,
      description: `${inviteeName || inviteeEmail} did not attend scheduled meeting${scheduledAt ? ` on ${new Date(scheduledAt).toLocaleDateString()}` : ""}`,
      importance: "high",
      occurredAt: new Date(),
      metadata: { inviteeEmail, inviteeName, meetingType, scheduledAt },
    },
  })

  // Check for multiple no-shows (serious risk signal)
  const recentNoShows = await prisma.activityEvent.count({
    where: {
      companyId: company.hubspotId,
      eventType: "meeting_no_show",
      occurredAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }, // 60 days
    },
  })

  // Create task for no-shows - they need follow up
  await prisma.task.create({
    data: {
      companyId: company.hubspotId,
      companyName: company.name,
      title: recentNoShows >= 2
        ? `🚨 Repeated no-shows: ${company.name}`
        : `📞 Follow up on no-show: ${company.name}`,
      description: recentNoShows >= 2
        ? `${recentNoShows} meeting no-shows in the last 60 days.\nContact: ${inviteeEmail}\n\nThis is a significant disengagement signal. Consider escalation.`
        : `${inviteeName || inviteeEmail} missed their scheduled meeting.\n\nAction: Reach out to reschedule and confirm engagement.`,
      priority: recentNoShows >= 2 ? "high" : "medium",
      status: "pending",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      metadata: { source: "n8n_calendly_webhook", event: "meeting_no_show", noShowCount: recentNoShows },
    },
  })

  console.log(`[n8n Calendly] Meeting no-show for ${company.name}`)
}

async function handleMeetingRescheduled(
  company: { hubspotId: string; name: string },
  payload: N8nCalendlyPayload
) {
  const { inviteeEmail, inviteeName, meetingType, scheduledAt } = payload

  // Log activity
  await prisma.activityEvent.create({
    data: {
      companyId: company.hubspotId,
      source: "calendly",
      eventType: "meeting_rescheduled",
      title: `Meeting rescheduled: ${meetingType || "Meeting"}`,
      description: `${inviteeName || inviteeEmail} rescheduled${scheduledAt ? ` to ${new Date(scheduledAt).toLocaleDateString()}` : ""}`,
      importance: "low",
      occurredAt: new Date(),
      metadata: { inviteeEmail, inviteeName, meetingType, scheduledAt },
    },
  })

  console.log(`[n8n Calendly] Meeting rescheduled for ${company.name}`)
}
