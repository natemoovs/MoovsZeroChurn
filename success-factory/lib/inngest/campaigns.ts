import { inngest } from "./client"
import { prisma } from "@/lib/db"

/**
 * Process campaign steps - runs every 15 minutes
 * Checks for enrollments with due steps and executes them
 */
export const processCampaignSteps = inngest.createFunction(
  { id: "process-campaign-steps", name: "Process Campaign Steps" },
  { cron: "*/15 * * * *" }, // Every 15 minutes
  async ({ step }) => {
    const processed = await step.run("process-due-steps", async () => {
      const now = new Date()

      // Find enrollments with due steps
      const dueEnrollments = await prisma.campaignEnrollment.findMany({
        where: {
          status: "active",
          nextStepDue: { lte: now },
        },
        include: {
          campaign: {
            include: {
              steps: { orderBy: { stepOrder: "asc" } },
            },
          },
          company: true,
        },
        take: 50, // Process in batches
      })

      const results: {
        success: number
        failed: number
        completed: number
      } = { success: 0, failed: 0, completed: 0 }

      for (const enrollment of dueEnrollments) {
        try {
          const currentStep = enrollment.campaign.steps.find(
            (s) => s.id === enrollment.currentStepId
          )

          if (!currentStep) {
            // No current step found, move to first step
            const firstStep = enrollment.campaign.steps[0]
            if (firstStep) {
              await prisma.campaignEnrollment.update({
                where: { id: enrollment.id },
                data: {
                  currentStepId: firstStep.id,
                  currentStepOrder: 1,
                  nextStepDue: calculateNextDue(firstStep.delayDays, firstStep.delayHours),
                },
              })
            }
            continue
          }

          // Execute the step based on type
          await executeStep(currentStep, enrollment, enrollment.company)

          // Find next step
          const nextStep = enrollment.campaign.steps.find(
            (s) => s.stepOrder === enrollment.currentStepOrder + 1
          )

          if (nextStep) {
            // Move to next step
            await prisma.campaignEnrollment.update({
              where: { id: enrollment.id },
              data: {
                currentStepId: nextStep.id,
                currentStepOrder: nextStep.stepOrder,
                nextStepDue: calculateNextDue(nextStep.delayDays, nextStep.delayHours),
              },
            })
          } else {
            // Campaign completed
            await prisma.campaignEnrollment.update({
              where: { id: enrollment.id },
              data: {
                status: "completed",
                completedAt: now,
                currentStepId: null,
                nextStepDue: null,
              },
            })
            results.completed++
          }

          results.success++
        } catch (error) {
          console.error(`[Campaign Step] Error processing enrollment ${enrollment.id}:`, error)
          results.failed++
        }
      }

      return results
    })

    return processed
  }
)

interface CampaignStep {
  id: string
  type: string
  name: string
  config: unknown
}

interface Company {
  id: string
  hubspotId: string
  name: string
  ownerEmail?: string | null
  ownerName?: string | null
  primaryContactEmail?: string | null
  primaryContactName?: string | null
}

interface Enrollment {
  id: string
  campaignId: string
  companyId: string
}

async function executeStep(step: CampaignStep, enrollment: Enrollment, company: Company) {
  const config = step.config as Record<string, unknown>

  switch (step.type) {
    case "task":
      // Create a task for the CSM
      await prisma.task.create({
        data: {
          companyId: company.hubspotId,
          companyName: company.name,
          title: (config.taskTitle as string) || `Campaign Task: ${step.name}`,
          description: config.taskDescription as string,
          priority: (config.priority as string) || "medium",
          status: "pending",
          ownerEmail: company.ownerEmail,
          dueDate: config.dueDays
            ? new Date(Date.now() + (config.dueDays as number) * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Default 3 days
          metadata: {
            fromCampaign: true,
            campaignId: enrollment.campaignId,
            stepName: step.name,
          },
        },
      })
      break

    case "email":
      // Log email intent (actual sending would integrate with SendGrid)
      await prisma.activityEvent.create({
        data: {
          companyId: company.hubspotId,
          source: "campaign",
          eventType: "campaign_email_sent",
          title: `Campaign Email: ${step.name}`,
          description: `Email scheduled to ${company.primaryContactEmail || "primary contact"}`,
          metadata: {
            campaignId: enrollment.campaignId,
            stepId: step.id,
            template: String(config.template || ""),
            subject: String(config.subject || ""),
          },
          importance: "normal",
          occurredAt: new Date(),
        },
      })
      // TODO: Integrate with SendGrid to actually send
      break

    case "webhook":
      // Call external webhook
      if (config.url) {
        try {
          await fetch(config.url as string, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "campaign_step",
              campaignId: enrollment.campaignId,
              companyId: company.hubspotId,
              companyName: company.name,
              stepName: step.name,
              timestamp: new Date().toISOString(),
            }),
          })
        } catch (error) {
          console.error(`[Campaign] Webhook failed for ${step.name}:`, error)
        }
      }
      break

    case "condition":
      // Evaluate condition and potentially exit enrollment
      // This would check health score, engagement, etc.
      const shouldContinue = await evaluateCondition(config, company)
      if (!shouldContinue) {
        await prisma.campaignEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "exited",
            exitedAt: new Date(),
            exitReason: `Condition not met: ${step.name}`,
          },
        })
      }
      break

    case "wait":
      // Wait step - no action needed, delay is handled by nextStepDue
      break

    default:
      console.warn(`[Campaign] Unknown step type: ${step.type}`)
  }

  // Log step execution
  await prisma.activityEvent.create({
    data: {
      companyId: company.hubspotId,
      source: "campaign",
      eventType: "campaign_step_executed",
      title: `Campaign Step: ${step.name}`,
      description: `Executed ${step.type} step`,
      metadata: {
        campaignId: enrollment.campaignId,
        stepId: step.id,
        stepType: step.type,
      },
      importance: "low",
      occurredAt: new Date(),
    },
  })
}

async function evaluateCondition(
  config: Record<string, unknown>,
  company: Company
): Promise<boolean> {
  const conditionType = config.conditionType as string

  // Fetch fresh company data
  const freshCompany = await prisma.hubSpotCompany.findUnique({
    where: { id: company.id },
  })

  if (!freshCompany) return false

  switch (conditionType) {
    case "health_is":
      return freshCompany.healthScore === config.healthScore
    case "health_not":
      return freshCompany.healthScore !== config.healthScore
    case "has_activity":
      // Check if there's been recent activity
      const recentActivity = await prisma.activityEvent.findFirst({
        where: {
          companyId: company.hubspotId,
          occurredAt: {
            gte: new Date(Date.now() - ((config.withinDays as number) || 7) * 24 * 60 * 60 * 1000),
          },
        },
      })
      return !!recentActivity
    default:
      return true
  }
}

function calculateNextDue(delayDays: number, delayHours: number): Date {
  return new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000 + delayHours * 60 * 60 * 1000)
}
