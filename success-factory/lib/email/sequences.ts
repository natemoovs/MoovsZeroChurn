/**
 * Email Sequence Automation
 *
 * Multi-touch email campaigns that trigger based on customer behavior.
 * Supports personalization, delays, and conditional logic.
 */

import { prisma } from "@/lib/db"
import { complete } from "@/lib/ai"
import { inngest } from "@/lib/inngest/client"

// Sequence templates
export const SEQUENCE_TEMPLATES = {
  // Onboarding sequence for new customers
  onboarding: {
    id: "onboarding",
    name: "New Customer Onboarding",
    trigger: "subscription_created",
    steps: [
      {
        day: 0,
        type: "email",
        subject: "Welcome to {product_name}! Let's get you started",
        templateKey: "welcome",
      },
      {
        day: 2,
        type: "email",
        subject: "Quick tip: Set up your first {feature}",
        templateKey: "setup_tip_1",
      },
      {
        day: 5,
        type: "condition",
        check: "setup_score >= 15",
        onTrue: "skip_to_step_5",
        onFalse: "continue",
      },
      {
        day: 5,
        type: "email",
        subject: "Need help getting started?",
        templateKey: "setup_help",
      },
      {
        day: 7,
        type: "email",
        subject: "You're doing great! Here's what's next",
        templateKey: "week_1_progress",
      },
      {
        day: 14,
        type: "task",
        title: "Onboarding check-in call",
        description: "Schedule a call to ensure successful adoption",
      },
    ],
  },

  // At-risk intervention sequence
  at_risk_intervention: {
    id: "at_risk_intervention",
    name: "At-Risk Account Intervention",
    trigger: "health_dropped_to_yellow",
    steps: [
      {
        day: 0,
        type: "email",
        subject: "We noticed some changes - how can we help?",
        templateKey: "health_check",
      },
      {
        day: 3,
        type: "task",
        title: "Call at-risk account",
        description: "Health score dropped - reach out to understand issues",
        priority: "high",
      },
      {
        day: 7,
        type: "condition",
        check: "health_score == green",
        onTrue: "exit",
        onFalse: "continue",
      },
      {
        day: 7,
        type: "email",
        subject: "Your success is our priority",
        templateKey: "escalation_offer",
      },
      {
        day: 14,
        type: "email",
        subject: "Let's schedule a call this week",
        templateKey: "meeting_request",
      },
    ],
  },

  // Renewal preparation sequence
  renewal_prep: {
    id: "renewal_prep",
    name: "Renewal Preparation",
    trigger: "renewal_in_60_days",
    steps: [
      {
        day: 0,
        type: "email",
        subject: "Your renewal is coming up - let's review your success",
        templateKey: "renewal_intro",
      },
      {
        day: 7,
        type: "task",
        title: "Schedule QBR before renewal",
        description: "Review value delivered and discuss renewal terms",
        priority: "high",
      },
      {
        day: 14,
        type: "email",
        subject: "Quick wins before your renewal",
        templateKey: "renewal_value",
      },
      {
        day: 30,
        type: "condition",
        check: "renewal_confirmed",
        onTrue: "exit",
        onFalse: "continue",
      },
      {
        day: 30,
        type: "email",
        subject: "Let's finalize your renewal",
        templateKey: "renewal_final",
      },
      {
        day: 45,
        type: "task",
        title: "URGENT: Renewal follow-up needed",
        description: "Renewal in 15 days - needs immediate attention",
        priority: "urgent",
      },
    ],
  },

  // Expansion opportunity sequence
  expansion: {
    id: "expansion",
    name: "Expansion Opportunity",
    trigger: "expansion_opportunity_detected",
    steps: [
      {
        day: 0,
        type: "email",
        subject: "You're getting great results - here's how to do more",
        templateKey: "expansion_intro",
      },
      {
        day: 5,
        type: "email",
        subject: "Case study: How {similar_company} grew with us",
        templateKey: "expansion_case_study",
      },
      {
        day: 10,
        type: "task",
        title: "Expansion discussion call",
        description: "Present upgrade options based on usage patterns",
        priority: "medium",
      },
    ],
  },

  // Win-back sequence for churned customers
  win_back: {
    id: "win_back",
    name: "Win-Back Campaign",
    trigger: "subscription_canceled",
    steps: [
      {
        day: 7,
        type: "email",
        subject: "We miss you - what could we have done better?",
        templateKey: "winback_survey",
      },
      {
        day: 30,
        type: "email",
        subject: "A lot has changed since you left",
        templateKey: "winback_updates",
      },
      {
        day: 60,
        type: "email",
        subject: "Special offer to come back",
        templateKey: "winback_offer",
      },
      {
        day: 90,
        type: "task",
        title: "Win-back call attempt",
        description: "Final attempt to re-engage churned customer",
        priority: "low",
      },
    ],
  },
}

export type SequenceId = keyof typeof SEQUENCE_TEMPLATES

interface EnrollmentParams {
  companyId: string
  sequenceId: SequenceId
  contactEmail: string
  contactName?: string
  triggeredBy: string
  metadata?: Record<string, unknown>
}

/**
 * Enroll a contact in an email sequence
 */
export async function enrollInSequence(params: EnrollmentParams): Promise<{
  success: boolean
  enrollmentId?: string
  error?: string
}> {
  const { companyId, sequenceId, contactEmail, contactName, triggeredBy, metadata } =
    params

  // Check if already enrolled in this sequence
  const existingEnrollment = await prisma.campaignEnrollment.findFirst({
    where: {
      companyId,
      campaign: {
        name: SEQUENCE_TEMPLATES[sequenceId]?.name,
      },
      status: { in: ["active", "paused"] },
    },
  })

  if (existingEnrollment) {
    return {
      success: false,
      error: "Already enrolled in this sequence",
    }
  }

  const sequence = SEQUENCE_TEMPLATES[sequenceId]
  if (!sequence) {
    return { success: false, error: "Invalid sequence ID" }
  }

  // Find or create campaign
  let campaign = await prisma.campaign.findFirst({
    where: { name: sequence.name },
    include: { steps: true },
  })

  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        name: sequence.name,
        description: `Automated ${sequence.name} sequence`,
        triggerType: sequence.trigger,
        status: "active",
        triggerConditions: { sequenceId },
        steps: {
          create: sequence.steps.map((step, index) => ({
            stepOrder: index + 1,
            type: step.type,
            name: step.type === "email" ? step.subject || `Step ${index + 1}` : step.title || `Step ${index + 1}`,
            delayDays: step.day || 0,
            config: step,
          })),
        },
      },
      include: { steps: true },
    })
  }

  // Create enrollment
  const enrollment = await prisma.campaignEnrollment.create({
    data: {
      companyId,
      campaignId: campaign.id,
      status: "active",
      currentStepOrder: 1,
      nextStepDue: new Date(), // Start immediately
      metadata: {
        contactEmail,
        contactName,
        triggeredBy,
        ...metadata,
      },
    },
  })

  // Send Inngest event to process first step
  await inngest.send({
    name: "email/sequence.enroll",
    data: {
      companyId,
      contactEmail,
      sequenceId,
      triggeredBy,
    },
  })

  console.log(
    `[Email Sequence] Enrolled ${contactEmail} in ${sequence.name} sequence`
  )

  return { success: true, enrollmentId: enrollment.id }
}

/**
 * Process the next step in a sequence enrollment
 */
export async function processSequenceStep(enrollmentId: string): Promise<{
  action: string
  nextStepAt?: Date
  completed?: boolean
}> {
  const enrollment = await prisma.campaignEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      campaign: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
      company: {
        select: {
          id: true,
          name: true,
          healthScore: true,
          setupScore: true,
          ownerEmail: true,
          ownerName: true,
        },
      },
    },
  })

  if (!enrollment || enrollment.status !== "active") {
    return { action: "skipped", completed: true }
  }

  // Get current step by order
  const campaignSteps = enrollment.campaign.steps
  const currentStepRecord = campaignSteps.find(
    (s) => s.stepOrder === enrollment.currentStepOrder
  )

  if (!currentStepRecord) {
    // Sequence completed
    await prisma.campaignEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "completed", completedAt: new Date() },
    })
    return { action: "completed", completed: true }
  }

  // Extract step config
  const stepConfig = currentStepRecord.config as Record<string, unknown> || {}
  const currentStep = {
    type: currentStepRecord.type,
    day: stepConfig.day as number || currentStepRecord.delayDays,
    subject: stepConfig.subject as string,
    templateKey: stepConfig.templateKey as string,
    title: stepConfig.title as string,
    description: stepConfig.description as string,
    priority: stepConfig.priority as string,
    check: stepConfig.check as string,
    onTrue: stepConfig.onTrue as string,
    onFalse: stepConfig.onFalse as string,
  }

  const metadata = enrollment.metadata as Record<string, unknown>
  const contactEmail = metadata?.contactEmail as string

  let action = "unknown"

  switch (currentStep.type) {
    case "email": {
      // Generate personalized email content
      const emailContent = await generateEmailContent({
        templateKey: currentStep.templateKey || "default",
        subject: currentStep.subject || "Update from your success team",
        companyName: enrollment.company.name,
        contactName: (metadata?.contactName as string) || "there",
        healthScore: enrollment.company.healthScore,
      })

      // Log email send intent (actual sending via SendGrid/Resend would go here)
      await prisma.activityEvent.create({
        data: {
          companyId: enrollment.companyId,
          source: "email_sequence",
          eventType: "email_sent",
          title: `Email sent: ${currentStep.subject}`,
          description: emailContent.preview,
          occurredAt: new Date(),
          metadata: {
            enrollmentId,
            step: enrollment.currentStepOrder,
            to: contactEmail,
            subject: emailContent.subject,
          },
        },
      })

      console.log(`[Email Sequence] Would send email to ${contactEmail}:`, {
        subject: emailContent.subject,
        preview: emailContent.preview.slice(0, 100),
      })

      action = "email_sent"
      break
    }

    case "task": {
      // Create task for CSM
      await prisma.task.create({
        data: {
          companyId: enrollment.companyId,
          companyName: enrollment.company.name,
          title: currentStep.title || "Sequence task",
          description: currentStep.description || "",
          priority: (currentStep.priority as "low" | "medium" | "high" | "urgent") || "medium",
          status: "pending",
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          metadata: { source: "email_sequence", enrollmentId, step: enrollment.currentStepOrder },
        },
      })

      action = "task_created"
      break
    }

    case "condition": {
      // Evaluate condition
      const conditionMet = evaluateCondition(
        currentStep.check || "",
        enrollment.company
      )

      if (conditionMet && currentStep.onTrue === "exit") {
        await prisma.campaignEnrollment.update({
          where: { id: enrollmentId },
          data: { status: "completed", completedAt: new Date() },
        })
        return { action: "condition_exit", completed: true }
      }

      if (conditionMet && currentStep.onTrue?.startsWith("skip_to_step_")) {
        const skipTo = parseInt(currentStep.onTrue.replace("skip_to_step_", ""))
        await prisma.campaignEnrollment.update({
          where: { id: enrollmentId },
          data: { currentStepOrder: skipTo - 1 }, // Will be incremented below
        })
      }

      action = `condition_${conditionMet ? "true" : "false"}`
      break
    }
  }

  // Move to next step
  const nextStepOrder = enrollment.currentStepOrder + 1
  const nextStepRecord = campaignSteps.find((s) => s.stepOrder === nextStepOrder)

  if (nextStepRecord) {
    const daysDiff = nextStepRecord.delayDays - currentStepRecord.delayDays
    const nextStepDue = new Date(Date.now() + daysDiff * 24 * 60 * 60 * 1000)

    await prisma.campaignEnrollment.update({
      where: { id: enrollmentId },
      data: {
        currentStepOrder: nextStepOrder,
        nextStepDue,
      },
    })

    return { action, nextStepAt: nextStepDue }
  } else {
    // Sequence completed
    await prisma.campaignEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "completed", completedAt: new Date() },
    })
    return { action, completed: true }
  }
}

/**
 * Generate personalized email content using AI
 */
async function generateEmailContent(params: {
  templateKey: string
  subject: string
  companyName: string
  contactName: string
  healthScore: string | null
}): Promise<{ subject: string; body: string; preview: string }> {
  const { templateKey, subject, companyName, contactName, healthScore } = params

  try {
    const prompt = `Generate a brief, friendly customer success email.

Template: ${templateKey}
Subject Line: ${subject.replace("{product_name}", "Moovs")}
Recipient: ${contactName} at ${companyName}
Account Health: ${healthScore || "Unknown"}

Write a 3-4 paragraph email that is:
- Personal and warm
- Action-oriented with a clear CTA
- Under 150 words

Return just the email body (no subject line).`

    const body = await complete("outreach-draft", prompt, { maxTokens: 300 })

    return {
      subject: subject.replace("{product_name}", "Moovs"),
      body,
      preview: body.slice(0, 150),
    }
  } catch (error) {
    console.error("[Email Sequence] AI content generation error:", error)
    return {
      subject: subject.replace("{product_name}", "Moovs"),
      body: `Hi ${contactName},\n\nI wanted to reach out to see how things are going with your account.\n\nBest regards,\nYour Success Team`,
      preview: "I wanted to reach out to see how things are going...",
    }
  }
}

/**
 * Evaluate a condition string against company data
 */
function evaluateCondition(
  condition: string,
  company: { healthScore: string | null; setupScore: number | null }
): boolean {
  // Simple condition parser
  if (condition.includes("health_score")) {
    if (condition.includes("green")) {
      return company.healthScore === "green"
    }
    if (condition.includes("yellow")) {
      return company.healthScore === "yellow"
    }
    if (condition.includes("red")) {
      return company.healthScore === "red"
    }
  }

  if (condition.includes("setup_score")) {
    const match = condition.match(/setup_score\s*(>=|>|<=|<|==)\s*(\d+)/)
    if (match) {
      const operator = match[1]
      const value = parseInt(match[2])
      const score = company.setupScore || 0

      switch (operator) {
        case ">=":
          return score >= value
        case ">":
          return score > value
        case "<=":
          return score <= value
        case "<":
          return score < value
        case "==":
          return score === value
      }
    }
  }

  return false
}

/**
 * Get sequence status for a company
 */
export async function getSequenceStatus(companyId: string) {
  const enrollments = await prisma.campaignEnrollment.findMany({
    where: { companyId },
    include: {
      campaign: { select: { name: true, triggerType: true } },
    },
    orderBy: { enrolledAt: "desc" },
  })

  return enrollments.map((e) => ({
    id: e.id,
    campaign: e.campaign.name,
    triggerType: e.campaign.triggerType,
    status: e.status,
    currentStep: e.currentStepOrder,
    nextStepAt: e.nextStepDue,
    enrolledAt: e.enrolledAt,
    completedAt: e.completedAt,
  }))
}
