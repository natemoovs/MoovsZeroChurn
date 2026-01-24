import { Inngest } from "inngest"

// Create the Inngest client
export const inngest = new Inngest({
  id: "success-factory",
  name: "Success Factory",
})

// Event types for type safety
export type Events = {
  // Health score events
  "health/recalculate": {
    data: {
      companyId: string
    }
  }
  "health/batch-recalculate": {
    data: Record<string, never>
  }
  "health/dropped": {
    data: {
      companyId: string
      companyName: string
      previousScore: number
      currentScore: number
      ownerEmail?: string
    }
  }

  // Task events
  "task/created": {
    data: {
      taskId: string
      companyId: string
      title: string
      priority: string
      assigneeEmail?: string
    }
  }
  "task/overdue": {
    data: {
      taskId: string
      companyId: string
      title: string
      dueDate: string
      assigneeEmail?: string
    }
  }

  // Notion sync events
  "notion/sync": {
    data: Record<string, never>
  }

  // Alert events
  "alert/send-digest": {
    data: {
      userEmail: string
    }
  }
  "alert/churn-risk": {
    data: {
      companyId: string
      companyName: string
      riskScore: number
      reasons: string[]
      ownerEmail?: string
    }
  }

  // Scheduled events (cron)
  "cron/daily-health-check": {
    data: Record<string, never>
  }
  "cron/hourly-notion-sync": {
    data: Record<string, never>
  }
  "cron/weekly-digest": {
    data: Record<string, never>
  }
}
