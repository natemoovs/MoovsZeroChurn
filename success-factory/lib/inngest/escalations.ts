import { inngest } from "./client"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email/sendgrid"

/**
 * Smart Escalation System
 * Auto-escalates accounts that have been critical for too long
 */

// Check for accounts needing escalation - runs daily at 9am
export const checkEscalations = inngest.createFunction(
  { id: "check-escalations", name: "Check for accounts needing escalation" },
  { cron: "0 9 * * *" }, // Every day at 9am
  async ({ step }) => {
    // Configuration
    const DAYS_BEFORE_ESCALATION = 7 // Days at red before escalating
    const ESCALATION_EMAIL =
      process.env.ESCALATION_EMAIL || process.env.DIGEST_EMAIL_RECIPIENTS?.split(",")[0]

    if (!ESCALATION_EMAIL) {
      return { skipped: true, reason: "No escalation email configured" }
    }

    const escalationCandidates = await step.run("find-escalation-candidates", async () => {
      const cutoffDate = new Date(Date.now() - DAYS_BEFORE_ESCALATION * 24 * 60 * 60 * 1000)

      // Find accounts that have been red for X days
      const redAccounts = await prisma.hubSpotCompany.findMany({
        where: {
          healthScore: "red",
        },
        select: {
          id: true,
          hubspotId: true,
          name: true,
          mrr: true,
          healthScore: true,
          ownerEmail: true,
          ownerName: true,
          riskSignals: true,
          contractEndDate: true,
        },
      })

      // Check health history to see how long they've been red
      const candidates = []
      for (const account of redAccounts) {
        const healthHistory = await prisma.healthScoreSnapshot.findMany({
          where: {
            companyId: account.hubspotId,
            createdAt: { gte: cutoffDate },
          },
          orderBy: { createdAt: "asc" },
        })

        // If all snapshots in the period are red, needs escalation
        const allRed =
          healthHistory.length > 0 && healthHistory.every((h) => h.healthScore === "red")

        // Check if already escalated recently
        const recentEscalation = await prisma.alertLog.findFirst({
          where: {
            companyId: account.hubspotId,
            type: "escalation",
            createdAt: { gte: cutoffDate },
          },
        })

        if (allRed && !recentEscalation) {
          candidates.push({
            ...account,
            daysAtRed: DAYS_BEFORE_ESCALATION,
            mrrAtRisk: account.mrr,
          })
        }
      }

      return candidates
    })

    if (escalationCandidates.length === 0) {
      return { escalated: 0, message: "No accounts need escalation" }
    }

    // Send escalation notifications
    const results = await step.run("send-escalations", async () => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const escalated = []

      for (const account of escalationCandidates) {
        // Create escalation task
        await prisma.task.create({
          data: {
            companyId: account.hubspotId,
            companyName: account.name,
            title: `[ESCALATED] Critical: ${account.name} needs immediate attention`,
            description: `This account has been at critical health for ${account.daysAtRed}+ days.\n\nMRR at Risk: $${(account.mrrAtRisk || 0).toLocaleString()}/mo\n\nRisk Signals:\n${account.riskSignals?.map((s) => `- ${s}`).join("\n") || "- See account for details"}\n\nThis task was auto-escalated. Please review and take action immediately.`,
            priority: "urgent",
            status: "pending",
            ownerEmail: account.ownerEmail,
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
            metadata: {
              escalated: true,
              escalatedAt: new Date().toISOString(),
              daysAtRed: account.daysAtRed,
            },
          },
        })

        // Log escalation
        await prisma.alertLog.create({
          data: {
            type: "escalation",
            companyId: account.hubspotId,
            companyName: account.name,
            channel: "email",
            payload: {
              daysAtRed: account.daysAtRed,
              mrrAtRisk: account.mrrAtRisk,
              ownerEmail: account.ownerEmail,
            },
            success: true,
          },
        })

        // Send email notification
        const emailSent = await sendEmail({
          to: ESCALATION_EMAIL,
          subject: `🚨 ESCALATION: ${account.name} needs immediate attention`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ef4444;">🚨 Account Escalation</h2>
              <p><strong>${account.name}</strong> has been at critical health for <strong>${account.daysAtRed}+ days</strong> and requires immediate attention.</p>

              <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0;"><strong>MRR at Risk:</strong> $${(account.mrrAtRisk || 0).toLocaleString()}/month</p>
                <p style="margin: 8px 0 0;"><strong>Current Owner:</strong> ${account.ownerName || account.ownerEmail || "Unassigned"}</p>
                ${account.contractEndDate ? `<p style="margin: 8px 0 0;"><strong>Contract End:</strong> ${new Date(account.contractEndDate).toLocaleDateString()}</p>` : ""}
              </div>

              <h3>Risk Signals:</h3>
              <ul>
                ${account.riskSignals?.map((s) => `<li>${s}</li>`).join("") || "<li>See account for details</li>"}
              </ul>

              <a href="${appUrl}/accounts/${account.hubspotId}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
                View Account
              </a>
            </div>
          `,
        })

        escalated.push({
          companyId: account.hubspotId,
          companyName: account.name,
          emailSent,
        })
      }

      return escalated
    })

    return {
      escalated: results.length,
      accounts: results,
    }
  }
)

// Export for registration
export const escalationFunctions = [checkEscalations]
