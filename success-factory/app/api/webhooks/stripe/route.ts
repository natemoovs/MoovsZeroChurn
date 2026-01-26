/**
 * Stripe Webhook Handler
 *
 * Receives Stripe events and forwards them to Inngest for processing.
 * This enables real-time response to payment events instead of daily crons.
 *
 * Setup: Add webhook URL in Stripe Dashboard → Webhooks
 * URL: https://your-app.vercel.app/api/webhooks/stripe
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { inngest } from "@/lib/inngest/client"

// Lazy initialization to avoid build-time errors when env vars aren't set
let stripeClient: Stripe | null = null
function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_PLATFORM_SECRET_KEY || "", {
      apiVersion: "2025-12-15.clover",
    })
  }
  return stripeClient
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured")
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  console.log(`[Stripe Webhook] Received: ${event.type}`)

  try {
    switch (event.type) {
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await inngest.send({
          name: "stripe/payment.failed",
          data: {
            customerId: invoice.customer as string,
            invoiceId: invoice.id,
            amount: invoice.amount_due / 100,
            currency: invoice.currency,
            failureMessage: invoice.last_finalization_error?.message,
            attemptCount: invoice.attempt_count || 1,
          },
        })
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        await inngest.send({
          name: "stripe/payment.succeeded",
          data: {
            customerId: invoice.customer as string,
            invoiceId: invoice.id,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
          },
        })
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const previousAttributes = event.data
          .previous_attributes as Partial<Stripe.Subscription>

        // Calculate MRR from subscription items
        let mrr = 0
        for (const item of subscription.items.data) {
          const price = item.price
          if (price.recurring) {
            const amount = price.unit_amount || 0
            const interval = price.recurring.interval
            const intervalCount = price.recurring.interval_count
            // Normalize to monthly
            if (interval === "year") {
              mrr += (amount / 100 / 12) * intervalCount
            } else if (interval === "month") {
              mrr += (amount / 100) * intervalCount
            }
          }
        }

        await inngest.send({
          name: "stripe/subscription.updated",
          data: {
            customerId: subscription.customer as string,
            subscriptionId: subscription.id,
            status: subscription.status,
            previousStatus: previousAttributes?.status,
            mrr: Math.round(mrr),
          },
        })
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await inngest.send({
          name: "stripe/subscription.canceled",
          data: {
            customerId: subscription.customer as string,
            subscriptionId: subscription.id,
            canceledAt: new Date(
              (subscription.canceled_at || Date.now() / 1000) * 1000
            ).toISOString(),
            reason: subscription.cancellation_details?.reason || undefined,
          },
        })
        break
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute
        const charge = dispute.charge as string
        // Get customer from charge
        const chargeObj = await getStripe().charges.retrieve(charge)
        await inngest.send({
          name: "stripe/dispute.created",
          data: {
            customerId: chargeObj.customer as string,
            chargeId: charge,
            amount: dispute.amount / 100,
            reason: dispute.reason,
          },
        })
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error)
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    webhook: "stripe",
    configured: !!webhookSecret,
    events: [
      "invoice.payment_failed",
      "invoice.payment_succeeded",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "charge.dispute.created",
    ],
  })
}
