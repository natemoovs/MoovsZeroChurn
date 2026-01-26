/**
 * Webhook Event Handlers
 *
 * Inngest functions that process real-time webhook events from Stripe and HubSpot.
 * These enable instant response to critical customer events.
 */

import { inngest } from "./client"
import { prisma } from "@/lib/db"

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

/**
 * Handle Stripe payment failure - create urgent task immediately
 */
export const handlePaymentFailed = inngest.createFunction(
  {
    id: "stripe-payment-failed",
    name: "Handle Payment Failure",
    retries: 3,
  },
  { event: "stripe/payment.failed" },
  async ({ event, step }) => {
    const { customerId, amount, failureMessage, attemptCount } = event.data

    // Step 1: Find the company by Stripe customer ID
    const company = await step.run("find-company", async () => {
      return prisma.hubSpotCompany.findFirst({
        where: { stripeAccountId: customerId },
        select: {
          id: true,
          name: true,
          mrr: true,
          ownerId: true,
          ownerEmail: true,
        },
      })
    })

    if (!company) {
      console.log(`[Payment Failed] No company found for Stripe ID: ${customerId}`)
      return { status: "skipped", reason: "company_not_found" }
    }

    // Step 2: Determine priority based on amount and attempt count
    const priority =
      amount >= 1000 || attemptCount >= 3
        ? "urgent"
        : amount >= 500 || attemptCount >= 2
          ? "high"
          : "medium"

    // Step 3: Create task for CSM
    const task = await step.run("create-task", async () => {
      return prisma.task.create({
        data: {
          companyId: company.id,
          companyName: company.name,
          title: `Payment Failed: $${amount.toLocaleString()}`,
          description: `Payment attempt #${attemptCount} failed for ${company.name}.\n\nAmount: $${amount.toLocaleString()}\nReason: ${failureMessage || "Unknown"}\n\nAction Required: Contact customer to resolve payment issue.`,
          priority,
          status: "pending",
          dueDate: new Date(Date.now() + (priority === "urgent" ? 4 : 24) * 60 * 60 * 1000),
          metadata: {
            source: "stripe_webhook",
            stripeCustomerId: customerId,
            amount,
            attemptCount,
            failureMessage,
          },
        },
      })
    })

    // Step 4: Update company payment health
    await step.run("update-payment-health", async () => {
      const paymentHealth =
        attemptCount >= 3 ? "critical" : attemptCount >= 2 ? "at_risk" : "good"

      return prisma.hubSpotCompany.update({
        where: { id: company.id },
        data: {
          paymentHealth,
          failedPaymentCount: { increment: 1 },
        },
      })
    })

    // Step 5: Log activity
    await step.run("log-activity", async () => {
      return prisma.activityEvent.create({
        data: {
          companyId: company.id,
          source: "stripe",
          eventType: "payment_failed",
          title: `Payment failed: $${amount}`,
          description: failureMessage || "Payment attempt failed",
          importance: priority === "urgent" ? "critical" : "high",
          metadata: { amount, attemptCount },
          occurredAt: new Date(),
        },
      })
    })

    // Step 6: Send Slack notification for urgent failures
    if (priority === "urgent" && company.ownerEmail) {
      await step.run("notify-slack", async () => {
        return fetch(`${appUrl}/api/alerts/slack`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "payment_failed",
            companyName: company.name,
            amount,
            attemptCount,
            ownerEmail: company.ownerEmail,
          }),
        })
      })
    }

    return {
      status: "processed",
      taskId: task.id,
      priority,
      company: company.name,
    }
  }
)

/**
 * Handle payment success - clear payment issues, celebrate wins
 */
export const handlePaymentSucceeded = inngest.createFunction(
  {
    id: "stripe-payment-succeeded",
    name: "Handle Payment Success",
  },
  { event: "stripe/payment.succeeded" },
  async ({ event, step }) => {
    const { customerId, amount } = event.data

    const company = await step.run("find-company", async () => {
      return prisma.hubSpotCompany.findFirst({
        where: { stripeAccountId: customerId },
      })
    })

    if (!company) {
      return { status: "skipped", reason: "company_not_found" }
    }

    // Update payment health to good
    await step.run("update-payment-health", async () => {
      return prisma.hubSpotCompany.update({
        where: { id: company.id },
        data: {
          paymentHealth: "good",
          paymentSuccessRate: 100, // Reset on success
        },
      })
    })

    // Complete any pending payment-related tasks
    await step.run("complete-payment-tasks", async () => {
      return prisma.task.updateMany({
        where: {
          companyId: company.id,
          metadata: { path: ["source"], equals: "stripe_webhook" },
          status: { in: ["pending", "in_progress"] },
        },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      })
    })

    // Log positive activity
    await step.run("log-activity", async () => {
      return prisma.activityEvent.create({
        data: {
          companyId: company.id,
          source: "stripe",
          eventType: "payment_succeeded",
          title: `Payment received: $${amount}`,
          importance: "low",
          metadata: { amount },
          occurredAt: new Date(),
        },
      })
    })

    return { status: "processed", company: company.name }
  }
)

/**
 * Handle subscription changes - detect churn risk or expansion
 */
export const handleSubscriptionUpdated = inngest.createFunction(
  {
    id: "stripe-subscription-updated",
    name: "Handle Subscription Update",
  },
  { event: "stripe/subscription.updated" },
  async ({ event, step }) => {
    const { customerId, status, previousStatus, mrr } = event.data

    const company = await step.run("find-company", async () => {
      return prisma.hubSpotCompany.findFirst({
        where: { stripeAccountId: customerId },
        select: {
          id: true,
          name: true,
          mrr: true,
          subscriptionStatus: true,
          ownerEmail: true,
        },
      })
    })

    if (!company) {
      return { status: "skipped", reason: "company_not_found" }
    }

    const actions: string[] = []

    // Detect downgrade (MRR decrease)
    if (mrr && company.mrr && mrr < company.mrr) {
      const decrease = company.mrr - mrr
      actions.push("downgrade_detected")

      await step.run("create-downgrade-task", async () => {
        return prisma.task.create({
          data: {
            companyId: company.id,
            companyName: company.name,
            title: `Downgrade Alert: -$${decrease}/mo`,
            description: `${company.name} downgraded their subscription.\n\nPrevious MRR: $${company.mrr}\nNew MRR: $${mrr}\nDecrease: $${decrease}\n\nReach out to understand why and discuss options.`,
            priority: decrease >= 500 ? "high" : "medium",
            status: "pending",
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            metadata: { source: "stripe_webhook" },
          },
        })
      })
    }

    // Detect upgrade (MRR increase)
    if (mrr && company.mrr && mrr > company.mrr) {
      const increase = mrr - company.mrr
      actions.push("upgrade_detected")

      await step.run("log-expansion", async () => {
        return prisma.activityEvent.create({
          data: {
            companyId: company.id,
            source: "stripe",
            eventType: "subscription_upgraded",
            title: `Expansion: +$${increase}/mo`,
            importance: "high",
            metadata: { previousMrr: company.mrr, newMrr: mrr, increase },
            occurredAt: new Date(),
          },
        })
      })
    }

    // Detect status change to past_due or unpaid
    if (status === "past_due" || status === "unpaid") {
      actions.push("payment_issue")

      await step.run("create-payment-task", async () => {
        return prisma.task.create({
          data: {
            companyId: company.id,
            companyName: company.name,
            title: `Subscription ${status}: Immediate attention needed`,
            description: `${company.name}'s subscription is now ${status}.\n\nThis requires immediate attention to prevent service interruption.`,
            priority: "urgent",
            status: "pending",
            dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
            metadata: { source: "stripe_webhook" },
          },
        })
      })
    }

    // Update company record
    await step.run("update-company", async () => {
      return prisma.hubSpotCompany.update({
        where: { id: company.id },
        data: {
          subscriptionStatus: status,
          mrr: mrr || company.mrr,
        },
      })
    })

    return {
      status: "processed",
      company: company.name,
      actions,
      mrrChange: mrr ? mrr - (company.mrr || 0) : 0,
    }
  }
)

/**
 * Handle subscription cancellation - immediate churn response
 */
export const handleSubscriptionCanceled = inngest.createFunction(
  {
    id: "stripe-subscription-canceled",
    name: "Handle Subscription Cancellation",
  },
  { event: "stripe/subscription.canceled" },
  async ({ event, step }) => {
    const { customerId, reason } = event.data

    const company = await step.run("find-company", async () => {
      return prisma.hubSpotCompany.findFirst({
        where: { stripeAccountId: customerId },
        select: {
          id: true,
          name: true,
          mrr: true,
          ownerEmail: true,
        },
      })
    })

    if (!company) {
      return { status: "skipped", reason: "company_not_found" }
    }

    // Create urgent win-back task
    await step.run("create-winback-task", async () => {
      return prisma.task.create({
        data: {
          companyId: company.id,
          companyName: company.name,
          title: `CHURNED: ${company.name} ($${company.mrr || 0}/mo)`,
          description: `${company.name} has canceled their subscription.\n\nLost MRR: $${company.mrr || 0}/mo\nCancellation Reason: ${reason || "Not provided"}\n\nImmediate action: Reach out within 24 hours for potential win-back.`,
          priority: "urgent",
          status: "pending",
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          metadata: { source: "stripe_webhook" },
        },
      })
    })

    // Update company status
    await step.run("update-company", async () => {
      return prisma.hubSpotCompany.update({
        where: { id: company.id },
        data: {
          subscriptionStatus: "canceled",
          healthScore: "churned",
        },
      })
    })

    // Log churn event
    await step.run("log-churn", async () => {
      return prisma.activityEvent.create({
        data: {
          companyId: company.id,
          source: "stripe",
          eventType: "subscription_canceled",
          title: `Customer Churned`,
          description: `Lost $${company.mrr || 0}/mo. Reason: ${reason || "Unknown"}`,
          importance: "critical",
          metadata: { mrr: company.mrr, reason },
          occurredAt: new Date(),
        },
      })
    })

    // Send immediate Slack alert
    if (company.ownerEmail) {
      await step.run("notify-slack", async () => {
        return fetch(`${appUrl}/api/alerts/slack`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "churn",
            companyName: company.name,
            mrr: company.mrr,
            reason,
            ownerEmail: company.ownerEmail,
          }),
        })
      })
    }

    return {
      status: "processed",
      company: company.name,
      lostMrr: company.mrr,
    }
  }
)

/**
 * Handle dispute creation - critical alert
 */
export const handleDisputeCreated = inngest.createFunction(
  {
    id: "stripe-dispute-created",
    name: "Handle Dispute Created",
  },
  { event: "stripe/dispute.created" },
  async ({ event, step }) => {
    const { customerId, amount, reason } = event.data

    const company = await step.run("find-company", async () => {
      return prisma.hubSpotCompany.findFirst({
        where: { stripeAccountId: customerId },
      })
    })

    if (!company) {
      return { status: "skipped", reason: "company_not_found" }
    }

    // Create urgent task
    await step.run("create-dispute-task", async () => {
      return prisma.task.create({
        data: {
          companyId: company.id,
          companyName: company.name,
          title: `DISPUTE: $${amount} - Immediate Response Required`,
          description: `A payment dispute has been filed.\n\nAmount: $${amount}\nReason: ${reason}\n\nYou have limited time to respond. Gather evidence and submit response via Stripe Dashboard.`,
          priority: "urgent",
          status: "pending",
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          metadata: { source: "stripe_webhook" },
        },
      })
    })

    // Update payment health
    await step.run("update-payment-health", async () => {
      return prisma.hubSpotCompany.update({
        where: { id: company.id },
        data: {
          paymentHealth: "critical",
          disputeCount: { increment: 1 },
        },
      })
    })

    return { status: "processed", company: company.name, amount }
  }
)

// Export all webhook handlers
export const webhookFunctions = [
  handlePaymentFailed,
  handlePaymentSucceeded,
  handleSubscriptionUpdated,
  handleSubscriptionCanceled,
  handleDisputeCreated,
]
