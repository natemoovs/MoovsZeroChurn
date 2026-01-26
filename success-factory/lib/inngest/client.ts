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
  "cron/health-snapshot": {
    data: Record<string, never>
  }

  // Stripe webhook events (real-time triggers)
  "stripe/payment.failed": {
    data: {
      customerId: string
      invoiceId: string
      amount: number
      currency: string
      failureMessage?: string
      attemptCount: number
    }
  }
  "stripe/payment.succeeded": {
    data: {
      customerId: string
      invoiceId: string
      amount: number
      currency: string
    }
  }
  "stripe/subscription.updated": {
    data: {
      customerId: string
      subscriptionId: string
      status: string
      previousStatus?: string
      mrr?: number
    }
  }
  "stripe/subscription.canceled": {
    data: {
      customerId: string
      subscriptionId: string
      canceledAt: string
      reason?: string
    }
  }
  "stripe/dispute.created": {
    data: {
      customerId: string
      chargeId: string
      amount: number
      reason: string
    }
  }

  // HubSpot webhook events
  "hubspot/deal.stage_changed": {
    data: {
      dealId: string
      companyId?: string
      previousStage: string
      newStage: string
      dealName: string
      amount?: number
    }
  }
  "hubspot/company.updated": {
    data: {
      companyId: string
      changedProperties: string[]
    }
  }

  // Expansion events
  "expansion/opportunity.detected": {
    data: {
      companyId: string
      companyName: string
      type: "upsell" | "cross_sell" | "upgrade"
      signals: string[]
      potentialValue: number
      confidence: number
    }
  }
  "expansion/opportunity.qualified": {
    data: {
      opportunityId: string
      companyId: string
      qualifiedBy: string
    }
  }

  // Email sequence events
  "email/sequence.enroll": {
    data: {
      companyId: string
      contactEmail: string
      sequenceId: string
      triggeredBy: string
    }
  }
  "email/sequence.step": {
    data: {
      enrollmentId: string
      stepNumber: number
      action: "send" | "skip" | "exit"
    }
  }

  // Revenue forecast events
  "forecast/generate": {
    data: {
      period: "weekly" | "monthly" | "quarterly"
    }
  }
}
