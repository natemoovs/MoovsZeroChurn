import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Server-Sent Events endpoint for real-time dashboard updates
 * GET /api/events/stream
 *
 * Streams:
 * - Health score changes
 * - New tasks
 * - Portfolio stats updates
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  // Check if client supports SSE
  const accept = request.headers.get("accept")
  if (!accept?.includes("text/event-stream")) {
    return new Response("SSE not supported", { status: 400 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      // Send initial connection event
      send("connected", { timestamp: new Date().toISOString() })

      // Poll for updates every 10 seconds
      // In production, you'd use a pub/sub system like Redis or Pusher
      let lastCheck = new Date()
      const interval = setInterval(async () => {
        try {
          // Check for new health changes
          const healthChanges = await prisma.healthChangeLog.findMany({
            where: {
              changedAt: { gt: lastCheck },
            },
            include: {
              company: {
                select: { name: true, hubspotId: true },
              },
            },
            orderBy: { changedAt: "desc" },
            take: 10,
          })

          for (const change of healthChanges) {
            send("health_change", {
              companyId: change.companyId,
              companyName: change.company.name,
              hubspotId: change.company.hubspotId,
              previousScore: change.previousScore,
              newScore: change.newScore,
              changedAt: change.changedAt,
            })
          }

          // Check for new tasks
          const newTasks = await prisma.task.findMany({
            where: {
              createdAt: { gt: lastCheck },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          })

          for (const task of newTasks) {
            send("new_task", {
              id: task.id,
              title: task.title,
              companyName: task.companyName,
              priority: task.priority,
              status: task.status,
              createdAt: task.createdAt,
            })
          }

          // Send portfolio stats every minute
          if (Date.now() % 60000 < 10000) {
            const stats = await getPortfolioStats()
            send("portfolio_stats", stats)
          }

          lastCheck = new Date()
        } catch (error) {
          console.error("[SSE] Error:", error)
        }
      }, 10000) // Check every 10 seconds

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        send("heartbeat", { timestamp: new Date().toISOString() })
      }, 30000)

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        clearInterval(heartbeat)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

async function getPortfolioStats() {
  const companies = await prisma.hubSpotCompany.findMany({
    select: {
      healthScore: true,
      mrr: true,
      subscriptionStatus: true,
    },
  })

  const tasks = await prisma.task.findMany({
    where: {
      status: { notIn: ["completed", "cancelled"] },
    },
    select: {
      status: true,
      dueDate: true,
    },
  })

  const now = new Date()
  const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now).length

  // Helper to check if company is churned
  const isChurned = (c: { subscriptionStatus: string | null }) =>
    c.subscriptionStatus?.toLowerCase().includes("churn")

  // Exclude churned from active portfolio counts
  const activeCompanies = companies.filter((c) => !isChurned(c))

  return {
    totalAccounts: activeCompanies.length,
    healthyAccounts: activeCompanies.filter((c) => c.healthScore === "green").length,
    warningAccounts: activeCompanies.filter((c) => c.healthScore === "yellow").length,
    atRiskAccounts: activeCompanies.filter((c) => c.healthScore === "red").length,
    churnedAccounts: companies.filter((c) => isChurned(c)).length,
    totalMrr: activeCompanies.reduce((sum, c) => sum + (c.mrr || 0), 0),
    pendingTasks: tasks.filter((t) => t.status === "pending").length,
    inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
    overdueTasks,
    timestamp: new Date().toISOString(),
  }
}
