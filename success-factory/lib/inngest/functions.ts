import { inngest } from "./client"
import { prisma } from "@/lib/db"
import { notion } from "@/lib/integrations"
import { sendEmail } from "@/lib/email/sendgrid"
import { buildDigestEmail } from "@/lib/email/templates"

// Hourly Notion sync - replaces the Vercel cron
export const notionSync = inngest.createFunction(
  { id: "notion-sync", name: "Sync tasks from Notion" },
  { cron: "0 * * * *" }, // Every hour
  async ({ step }) => {
    const CSM_DATABASE_ID = process.env.NOTION_CSM_DATABASE_ID
    const NOTION_API_KEY = process.env.NOTION_API_KEY

    if (!NOTION_API_KEY || !CSM_DATABASE_ID) {
      return { skipped: true, reason: "Notion not configured" }
    }

    // Fetch Notion users first
    const notionUsers = await step.run("fetch-notion-users", async () => {
      const userMap = new Map<string, { name: string; email?: string }>()
      const res = await fetch("https://api.notion.com/v1/users", {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
        },
      })
      const data = await res.json()
      if (data.results) {
        for (const user of data.results) {
          if (user.id && user.name) {
            userMap.set(user.id, { name: user.name, email: user.person?.email })
          }
        }
      }
      return Object.fromEntries(userMap)
    })

    // Query tasks from Notion
    const result = await step.run("query-notion-tasks", async () => {
      return notion.queryDatabase(CSM_DATABASE_ID!, {
        filter: {
          property: "Status",
          status: { does_not_equal: "Done" },
        },
        pageSize: 100,
      })
    })

    // Sync each task
    const stats = await step.run("sync-tasks", async () => {
      let created = 0
      let updated = 0
      let skipped = 0

      for (const page of result.results) {
        const props = page.properties
        const title = extractTitle(props["Task Name"] || props["Name"])

        if (!title) {
          skipped++
          continue
        }

        const company = extractRichText(props["Company"])
        const status = extractStatus(props["Status"])
        const priority = extractSelect(props["Priority"])
        const dueDate = extractDate(props["Due"] || props["Due Date"])
        const assigneeRaw = extractPerson(props["Assignee"])
        const notes = extractRichText(props["Notes"])

        const assignee = assigneeRaw
          ? {
              ...assigneeRaw,
              name: assigneeRaw.name || notionUsers[assigneeRaw.id]?.name,
              email: assigneeRaw.email || notionUsers[assigneeRaw.id]?.email,
            }
          : null

        const mappedStatus = mapNotionStatus(status)
        const mappedPriority = mapNotionPriority(priority)

        const existingTask = await prisma.task.findFirst({
          where: {
            metadata: {
              path: ["notionPageId"],
              equals: page.id,
            },
          },
        })

        if (existingTask) {
          await prisma.task.update({
            where: { id: existingTask.id },
            data: {
              title,
              description: notes || undefined,
              status: mappedStatus,
              priority: mappedPriority,
              dueDate: dueDate ? new Date(dueDate) : null,
              metadata: {
                notionPageId: page.id,
                notionUrl: page.url,
                notionAssigneeId: assignee?.id,
                notionAssigneeName: assignee?.name,
                syncedAt: new Date().toISOString(),
              },
            },
          })
          updated++
        } else {
          await prisma.task.create({
            data: {
              companyId: company || "unknown",
              companyName: company || "Unknown Company",
              title,
              description: notes,
              status: mappedStatus,
              priority: mappedPriority,
              dueDate: dueDate ? new Date(dueDate) : null,
              ownerEmail: assignee?.email,
              metadata: {
                notionPageId: page.id,
                notionUrl: page.url,
                notionAssigneeId: assignee?.id,
                notionAssigneeName: assignee?.name,
                syncedFromNotion: true,
                syncedAt: new Date().toISOString(),
              },
            },
          })
          created++
        }
      }

      return { created, updated, skipped, total: result.results.length }
    })

    return stats
  }
)

// Health score values for comparison (higher = healthier)
const HEALTH_VALUES: Record<string, number> = {
  green: 3,
  yellow: 2,
  red: 1,
  unknown: 0,
}

// Daily health check - find accounts with dropping health
export const dailyHealthCheck = inngest.createFunction(
  { id: "daily-health-check", name: "Daily health score check" },
  { cron: "0 8 * * *" }, // Every day at 8am
  async ({ step }) => {
    // Find accounts with health status changes
    const alerts = await step.run("check-health-drops", async () => {
      // Get snapshots from last 48 hours to compare
      const recentSnapshots = await prisma.healthScoreSnapshot.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Last 48 hours
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      })

      // Group by company, track latest and previous health status
      const companyHealth = new Map<string, { latest: string; previous: string; name: string }>()

      for (const snapshot of recentSnapshots) {
        const existing = companyHealth.get(snapshot.companyId)
        if (!existing) {
          companyHealth.set(snapshot.companyId, {
            latest: snapshot.healthScore,
            previous: snapshot.healthScore,
            name: snapshot.companyName,
          })
        } else {
          // This is an older snapshot, use as previous
          companyHealth.set(snapshot.companyId, {
            ...existing,
            previous: snapshot.healthScore,
          })
        }
      }

      // Find accounts that dropped (green->yellow, green->red, yellow->red)
      const droppedAccounts: Array<{
        companyId: string
        companyName: string
        previousHealth: string
        currentHealth: string
      }> = []

      for (const [companyId, health] of companyHealth) {
        const prevValue = HEALTH_VALUES[health.previous] || 0
        const currValue = HEALTH_VALUES[health.latest] || 0

        if (prevValue > currValue) {
          droppedAccounts.push({
            companyId,
            companyName: health.name,
            previousHealth: health.previous,
            currentHealth: health.latest,
          })
        }
      }

      return droppedAccounts
    })

    // Send events for each dropped account
    if (alerts.length > 0) {
      await step.run("send-health-alerts", async () => {
        for (const alert of alerts) {
          await inngest.send({
            name: "health/dropped",
            data: {
              companyId: alert.companyId,
              companyName: alert.companyName,
              previousScore: HEALTH_VALUES[alert.previousHealth] * 33, // Convert to ~100 scale
              currentScore: HEALTH_VALUES[alert.currentHealth] * 33,
            },
          })
        }
      })
    }

    return { alertsSent: alerts.length, checked: alerts.length }
  }
)

// Check for overdue tasks
export const overdueTaskCheck = inngest.createFunction(
  { id: "overdue-task-check", name: "Check for overdue tasks" },
  { cron: "0 9 * * *" }, // Every day at 9am
  async ({ step }) => {
    const overdueTasks = await step.run("find-overdue-tasks", async () => {
      return prisma.task.findMany({
        where: {
          dueDate: { lt: new Date() },
          status: { notIn: ["completed", "cancelled"] },
        },
        select: {
          id: true,
          title: true,
          companyId: true,
          companyName: true,
          dueDate: true,
          ownerEmail: true,
          metadata: true,
        },
      })
    })

    // Group by assignee for notification
    const byAssignee = new Map<string, typeof overdueTasks>()
    for (const task of overdueTasks) {
      const email = task.ownerEmail || "unassigned"
      const existing = byAssignee.get(email) || []
      existing.push(task)
      byAssignee.set(email, existing)
    }

    return {
      totalOverdue: overdueTasks.length,
      assignees: byAssignee.size,
    }
  }
)

// Handle health dropped event - send Slack notification and create task
export const handleHealthDropped = inngest.createFunction(
  { id: "handle-health-dropped", name: "Handle health score drop" },
  { event: "health/dropped" },
  async ({ event, step }) => {
    const { companyId, companyName, previousScore, currentScore } = event.data

    // Convert numeric scores back to health status
    const scoreToHealth = (score: number): "green" | "yellow" | "red" | "unknown" => {
      if (score >= 90) return "green"
      if (score >= 60) return "yellow"
      if (score > 0) return "red"
      return "unknown"
    }
    const previousHealth = scoreToHealth(previousScore)
    const currentHealth = scoreToHealth(currentScore)

    // Send Slack notification
    await step.run("notify-slack", async () => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      try {
        await fetch(`${appUrl}/api/alerts/slack`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "health_change",
            companyName,
            companyId,
            details: {
              healthScore: currentHealth,
              previousHealthScore: previousHealth,
              message: `Health score dropped from ${previousHealth} to ${currentHealth}. An investigation task has been created.`,
            },
          }),
        })
      } catch (error) {
        console.error("Failed to send Slack notification:", error)
        // Don't throw - we still want to create the task even if Slack fails
      }
    })

    // Create a task for the CSM to investigate
    await step.run("create-investigation-task", async () => {
      await prisma.task.create({
        data: {
          companyId,
          companyName,
          title: `Investigate health score drop: ${companyName}`,
          description: `Health score dropped from ${previousHealth} to ${currentHealth}. Please investigate and take action.`,
          priority: currentHealth === "red" ? "urgent" : "high",
          status: "pending",
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        },
      })
    })

    return { taskCreated: true, slackNotified: true }
  }
)

// Helper functions (same as in the API route)
function extractTitle(prop: unknown): string {
  if (!prop || typeof prop !== "object") return ""
  const p = prop as { type?: string; title?: Array<{ plain_text: string }> }
  if (p.type === "title" && p.title) {
    return p.title.map((t) => t.plain_text).join("")
  }
  return ""
}

function extractRichText(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null
  const p = prop as { type?: string; rich_text?: Array<{ plain_text: string }> }
  if (p.type === "rich_text" && p.rich_text) {
    const text = p.rich_text.map((t) => t.plain_text).join("")
    return text || null
  }
  return null
}

function extractSelect(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null
  const p = prop as { type?: string; select?: { name: string } | null }
  if (p.type === "select" && p.select) {
    return p.select.name
  }
  return null
}

function extractStatus(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null
  const p = prop as { type?: string; status?: { name: string } | null }
  if (p.type === "status" && p.status) {
    return p.status.name
  }
  return null
}

function extractDate(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null
  const p = prop as { type?: string; date?: { start: string } | null }
  if (p.type === "date" && p.date) {
    return p.date.start
  }
  return null
}

function extractPerson(prop: unknown): { id: string; name?: string; email?: string } | null {
  if (!prop || typeof prop !== "object") return null
  const p = prop as {
    type?: string
    people?: Array<{ id: string; name?: string; person?: { email: string } }>
  }
  if (p.type === "people" && p.people && p.people.length > 0) {
    const person = p.people[0]
    return {
      id: person.id,
      name: person.name,
      email: person.person?.email,
    }
  }
  return null
}

function mapNotionStatus(
  status: string | null
): "pending" | "in_progress" | "completed" | "cancelled" {
  if (!status) return "pending"
  const s = status.toLowerCase()
  if (s === "done" || s === "complete" || s === "completed") return "completed"
  if (s === "in progress" || s === "doing") return "in_progress"
  if (s === "cancelled" || s === "canceled") return "cancelled"
  return "pending"
}

function mapNotionPriority(priority: string | null): "low" | "medium" | "high" | "urgent" {
  if (!priority) return "medium"
  const p = priority.toLowerCase()
  if (p === "urgent" || p === "critical") return "urgent"
  if (p === "high") return "high"
  if (p === "low") return "low"
  return "medium"
}

// Weekly email digest - send summary to CSMs every Monday
export const weeklyEmailDigest = inngest.createFunction(
  { id: "weekly-email-digest", name: "Send weekly CSM digest" },
  { cron: "0 8 * * 1" }, // Every Monday at 8am
  async ({ step }) => {
    const recipients = process.env.DIGEST_EMAIL_RECIPIENTS?.split(",").map((e) => e.trim())

    if (!recipients || recipients.length === 0) {
      return { skipped: true, reason: "No digest recipients configured" }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Gather digest data
    const digestData = await step.run("gather-digest-data", async () => {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Get at-risk accounts (red health score)
      const atRiskAccounts = await prisma.hubSpotCompany.findMany({
        where: {
          healthScore: "red",
        },
        select: {
          hubspotId: true,
          name: true,
          healthScore: true,
          riskSignals: true,
        },
        take: 10,
      })

      // Get overdue tasks
      const overdueTasks = await prisma.task.findMany({
        where: {
          dueDate: { lt: now },
          status: { notIn: ["completed", "cancelled"] },
        },
        select: {
          title: true,
          companyName: true,
          dueDate: true,
        },
        take: 10,
        orderBy: { dueDate: "asc" },
      })

      // Get health score changes from last week
      const recentSnapshots = await prisma.healthScoreSnapshot.findMany({
        where: {
          createdAt: { gte: weekAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      })

      // Find accounts that dropped in health
      const companyChanges = new Map<string, { name: string; first: string; last: string }>()
      for (const snapshot of recentSnapshots) {
        const existing = companyChanges.get(snapshot.companyId)
        if (!existing) {
          companyChanges.set(snapshot.companyId, {
            name: snapshot.companyName,
            first: snapshot.healthScore,
            last: snapshot.healthScore,
          })
        } else {
          // Older snapshot becomes 'first'
          companyChanges.set(snapshot.companyId, {
            ...existing,
            first: snapshot.healthScore,
          })
        }
      }

      const healthChanges = Array.from(companyChanges.entries())
        .filter(([, data]) => data.first !== data.last)
        .map(([, data]) => ({
          companyName: data.name,
          previousHealth: data.first,
          currentHealth: data.last,
        }))
        .slice(0, 10)

      // Get upcoming renewals (next 30 days)
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const upcomingRenewals = await prisma.hubSpotCompany.findMany({
        where: {
          contractEndDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
        select: {
          name: true,
          contractEndDate: true,
          mrr: true,
        },
        take: 10,
        orderBy: { contractEndDate: "asc" },
      })

      return {
        atRiskAccounts: atRiskAccounts.map((a) => ({
          name: a.name,
          id: a.hubspotId,
          healthScore: a.healthScore || "unknown",
          riskSignals: a.riskSignals || [],
        })),
        overdueTasks: overdueTasks.map((t) => ({
          title: t.title,
          companyName: t.companyName,
          dueDate: t.dueDate?.toLocaleDateString() || "No date",
        })),
        healthChanges,
        upcomingRenewals: upcomingRenewals.map((r) => ({
          companyName: r.name,
          renewalDate: r.contractEndDate?.toLocaleDateString() || "No date",
          mrr: r.mrr || 0,
        })),
      }
    })

    // Send digest to each recipient
    const results = await step.run("send-digest-emails", async () => {
      const sent: string[] = []
      const failed: string[] = []

      const date = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      for (const email of recipients) {
        const firstName = email.split("@")[0].split(".")[0]
        const recipientName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

        const html = buildDigestEmail({
          recipientName,
          date,
          atRiskAccounts: digestData.atRiskAccounts,
          overdueTasks: digestData.overdueTasks,
          upcomingRenewals: digestData.upcomingRenewals,
          healthChanges: digestData.healthChanges,
          appUrl,
        })

        const success = await sendEmail({
          to: email,
          subject: `Weekly CSM Digest - ${date}`,
          html,
        })

        if (success) {
          sent.push(email)
        } else {
          failed.push(email)
        }
      }

      return { sent, failed }
    })

    return {
      recipientCount: recipients.length,
      sent: results.sent.length,
      failed: results.failed.length,
      digestData: {
        atRiskCount: digestData.atRiskAccounts.length,
        overdueCount: digestData.overdueTasks.length,
        healthChangesCount: digestData.healthChanges.length,
        renewalsCount: digestData.upcomingRenewals.length,
      },
    }
  }
)

// Export all functions
export const functions = [
  notionSync,
  dailyHealthCheck,
  overdueTaskCheck,
  handleHealthDropped,
  weeklyEmailDigest,
]
