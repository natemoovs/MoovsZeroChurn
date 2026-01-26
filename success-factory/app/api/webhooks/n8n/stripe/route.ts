/**
 * n8n Stripe Webhook Receiver
 *
 * Receives Stripe events forwarded from n8n workflows.
 * This allows n8n to enrich/transform Stripe data before sending to Success Factory.
 *
 * Events handled:
 * - payment_failed: Create at-risk alert + task
 * - payment_succeeded: Clear payment risk flags
 * - subscription_updated: Update MRR, detect downgrades
 * - subscription_canceled: Mark as churned
 * - dispute_created: Critical alert
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Validate webhook secret from n8n
function validateWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-webhook-secret")
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET

  if (!expectedSecret) {
    console.warn("[n8n Webhook] N8N_WEBHOOK_SECRET not configured")
    return process.env.NODE_ENV === "development" // Allow in dev
  }

  return secret === expectedSecret
}

// Event types from n8n
type StripeEventType =
  | "payment_failed"
  | "payment_succeeded"
  | "subscription_updated"
  | "subscription_canceled"
  | "dispute_created"

interface N8nStripePayload {
  event: StripeEventType
  customerId: string
  customerEmail?: string
  customerName?: string
  companyId?: string // HubSpot company ID if n8n can match it
  amount?: number
  currency?: string
  mrr?: number
  previousMrr?: number
  failureMessage?: string
  attemptCount?: number
  cancelReason?: string
  disputeReason?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  // Validate secret
  if (!validateWebhookSecret(request)) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 })
  }

  let payload: N8nStripePayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { event, customerId, customerEmail, customerName, companyId } = payload

  if (!event || !customerId) {
    return NextResponse.json(
      { error: "Missing required fields: event, customerId" },
      { status: 400 }
    )
  }

  console.log(`[n8n Stripe] Received: ${event} for customer ${customerId}`)

  try {
    // Try to find the company by Stripe customer ID or email
    let company = companyId
      ? await prisma.hubSpotCompany.findFirst({
          where: { hubspotId: companyId },
        })
      : null

    // If no companyId provided, try to match by email domain or name
    if (!company && customerEmail) {
      const domain = customerEmail.split("@")[1]
      company = await prisma.hubSpotCompany.findFirst({
        where: {
          OR: [
            { domain: { contains: domain, mode: "insensitive" } },
            { name: { contains: customerName || "", mode: "insensitive" } },
          ],
        },
      })
    }

    if (!company) {
      console.log(`[n8n Stripe] No matching company found for ${customerId}`)
      return NextResponse.json({
        success: true,
        matched: false,
        message: "Event received but no matching company found",
      })
    }

    // Process based on event type
    switch (event) {
      case "payment_failed":
        await handlePaymentFailed(company, payload)
        break

      case "payment_succeeded":
        await handlePaymentSucceeded(company, payload)
        break

      case "subscription_updated":
        await handleSubscriptionUpdated(company, payload)
        break

      case "subscription_canceled":
        await handleSubscriptionCanceled(company, payload)
        break

      case "dispute_created":
        await handleDisputeCreated(company, payload)
        break

      default:
        console.log(`[n8n Stripe] Unhandled event type: ${event}`)
    }

    return NextResponse.json({
      success: true,
      matched: true,
      companyId: company.hubspotId,
      companyName: company.name,
    })
  } catch (error) {
    console.error("[n8n Stripe] Error processing webhook:", error)
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    webhook: "n8n/stripe",
    events: [
      "payment_failed",
      "payment_succeeded",
      "subscription_updated",
      "subscription_canceled",
      "dispute_created",
    ],
  })
}

// === Event Handlers ===

async function handlePaymentFailed(
  company: { id: string; hubspotId: string; name: string },
  payload: N8nStripePayload
) {
  const { amount, failureMessage, attemptCount } = payload

  // Update company payment health
  await prisma.hubSpotCompany.update({
    where: { id: company.id },
    data: {
      paymentHealth: "failed",
    },
  })

  // Log activity
  await prisma.activityEvent.create({
    data: {
      companyId: company.hubspotId,
      source: "stripe",
      eventType: "payment_failed",
      title: "Payment Failed",
      description: `Payment of $${amount || 0} failed${failureMessage ? `: ${failureMessage}` : ""}`,
      importance: attemptCount && attemptCount >= 3 ? "critical" : "high",
      occurredAt: new Date(),
      metadata: {
        amount,
        failureMessage,
        attemptCount,
        stripeCustomerId: payload.customerId,
      },
    },
  })

  // Create urgent task
  await prisma.task.create({
    data: {
      companyId: company.hubspotId,
      companyName: company.name,
      title: `🚨 Payment failed: ${company.name}`,
      description: `Payment of $${amount || 0} failed.\n${failureMessage ? `Reason: ${failureMessage}\n` : ""}Attempt #${attemptCount || 1}\n\nAction needed: Contact customer to update payment method.`,
      priority: attemptCount && attemptCount >= 3 ? "urgent" : "high",
      status: "pending",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
      metadata: {
        source: "n8n_stripe_webhook",
        event: "payment_failed",
        stripeCustomerId: payload.customerId,
      },
    },
  })

  console.log(`[n8n Stripe] Created payment failed task for ${company.name}`)
}

async function handlePaymentSucceeded(
  company: { id: string; hubspotId: string; name: string },
  payload: N8nStripePayload
) {
  const { amount } = payload

  // Update company payment health
  await prisma.hubSpotCompany.update({
    where: { id: company.id },
    data: {
      paymentHealth: "good",
    },
  })

  // Log activity
  await prisma.activityEvent.create({
    data: {
      companyId: company.hubspotId,
      source: "stripe",
      eventType: "payment_succeeded",
      title: "Payment Succeeded",
      description: `Payment of $${amount || 0} processed successfully`,
      importance: "low",
      occurredAt: new Date(),
      metadata: {
        amount,
        stripeCustomerId: payload.customerId,
      },
    },
  })

  // Close any pending payment-related tasks
  await prisma.task.updateMany({
    where: {
      companyId: company.hubspotId,
      status: "pending",
      metadata: {
        path: ["event"],
        equals: "payment_failed",
      },
    },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  })

  console.log(`[n8n Stripe] Payment succeeded for ${company.name}`)
}

async function handleSubscriptionUpdated(
  company: { id: string; hubspotId: string; name: string },
  payload: N8nStripePayload
) {
  const { mrr, previousMrr } = payload
  const mrrChange = (mrr || 0) - (previousMrr || 0)
  const isDowngrade = mrrChange < 0

  // Update company MRR
  if (mrr !== undefined) {
    await prisma.hubSpotCompany.update({
      where: { id: company.id },
      data: { mrr },
    })
  }

  // Log activity
  await prisma.activityEvent.create({
    data: {
      companyId: company.hubspotId,
      source: "stripe",
      eventType: isDowngrade ? "subscription_downgrade" : "subscription_updated",
      title: isDowngrade ? "Subscription Downgraded" : "Subscription Updated",
      description: isDowngrade
        ? `MRR decreased by $${Math.abs(mrrChange)} (from $${previousMrr} to $${mrr})`
        : `MRR updated to $${mrr}${previousMrr ? ` (from $${previousMrr})` : ""}`,
      importance: isDowngrade ? "high" : "medium",
      occurredAt: new Date(),
      metadata: {
        mrr,
        previousMrr,
        mrrChange,
        stripeCustomerId: payload.customerId,
      },
    },
  })

  // Create task for downgrades
  if (isDowngrade && Math.abs(mrrChange) > 50) {
    await prisma.task.create({
      data: {
        companyId: company.hubspotId,
        companyName: company.name,
        title: `⚠️ Subscription downgraded: ${company.name}`,
        description: `MRR decreased by $${Math.abs(mrrChange)} (from $${previousMrr} to $${mrr}).\n\nAction needed: Reach out to understand reason and explore recovery options.`,
        priority: "high",
        status: "pending",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Due in 2 days
        metadata: {
          source: "n8n_stripe_webhook",
          event: "subscription_downgrade",
          mrrChange,
        },
      },
    })
  }

  console.log(
    `[n8n Stripe] Subscription updated for ${company.name}: MRR ${isDowngrade ? "decreased" : "changed"} to $${mrr}`
  )
}

async function handleSubscriptionCanceled(
  company: { id: string; hubspotId: string; name: string },
  payload: N8nStripePayload
) {
  const { cancelReason, mrr } = payload

  // Update company status
  await prisma.hubSpotCompany.update({
    where: { id: company.id },
    data: {
      subscriptionStatus: "churned",
      mrr: 0,
    },
  })

  // Update journey to churned
  const existingJourney = await prisma.customerJourney.findUnique({
    where: { companyId: company.hubspotId },
  })

  if (existingJourney) {
    await prisma.customerJourney.update({
      where: { companyId: company.hubspotId },
      data: {
        stage: "churned",
        previousStage: existingJourney.stage,
        stageChangedAt: new Date(),
        metadata: {
          reason: cancelReason || "Subscription canceled via Stripe",
          changedBy: "n8n_stripe_webhook",
        },
      },
    })

    await prisma.journeyStageHistory.create({
      data: {
        journeyId: existingJourney.id,
        fromStage: existingJourney.stage,
        toStage: "churned",
        changedBy: "n8n_stripe_webhook",
        reason: cancelReason || "Subscription canceled",
      },
    })
  }

  // Log activity
  await prisma.activityEvent.create({
    data: {
      companyId: company.hubspotId,
      source: "stripe",
      eventType: "subscription_canceled",
      title: "Subscription Canceled",
      description: `Subscription canceled${cancelReason ? `: ${cancelReason}` : ""}. Lost MRR: $${mrr || 0}`,
      importance: "critical",
      occurredAt: new Date(),
      metadata: {
        cancelReason,
        lostMrr: mrr,
        stripeCustomerId: payload.customerId,
      },
    },
  })

  // Create churn documentation task
  await prisma.task.create({
    data: {
      companyId: company.hubspotId,
      companyName: company.name,
      title: `📋 Document churn: ${company.name}`,
      description: `Subscription canceled.\n${cancelReason ? `Reason: ${cancelReason}\n` : ""}Lost MRR: $${mrr || 0}\n\nAction needed: Document churn reason and add to win-back sequence.`,
      priority: "high",
      status: "pending",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      metadata: {
        source: "n8n_stripe_webhook",
        event: "subscription_canceled",
        lostMrr: mrr,
      },
    },
  })

  console.log(`[n8n Stripe] Subscription canceled for ${company.name} - marked as churned`)
}

async function handleDisputeCreated(
  company: { id: string; hubspotId: string; name: string },
  payload: N8nStripePayload
) {
  const { amount, disputeReason } = payload

  // Update payment health
  await prisma.hubSpotCompany.update({
    where: { id: company.id },
    data: { paymentHealth: "disputed" },
  })

  // Log activity
  await prisma.activityEvent.create({
    data: {
      companyId: company.hubspotId,
      source: "stripe",
      eventType: "dispute_created",
      title: "Payment Dispute Filed",
      description: `Customer disputed $${amount || 0}${disputeReason ? ` - Reason: ${disputeReason}` : ""}`,
      importance: "critical",
      occurredAt: new Date(),
      metadata: {
        amount,
        disputeReason,
        stripeCustomerId: payload.customerId,
      },
    },
  })

  // Create urgent task
  await prisma.task.create({
    data: {
      companyId: company.hubspotId,
      companyName: company.name,
      title: `🚨 DISPUTE: ${company.name}`,
      description: `Payment dispute filed for $${amount || 0}.\n${disputeReason ? `Reason: ${disputeReason}\n` : ""}\nURGENT: Respond within 7 days to contest.`,
      priority: "urgent",
      status: "pending",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
      metadata: {
        source: "n8n_stripe_webhook",
        event: "dispute_created",
        amount,
      },
    },
  })

  console.log(`[n8n Stripe] Dispute created for ${company.name}`)
}
