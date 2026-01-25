/**
 * CSM Playbook Triggers
 *
 * Automated playbook triggers based on ICP knowledge.
 * These define conditions that should trigger specific CSM actions.
 */

import { CustomerSegment } from "./icp"
import { ServiceType } from "./service-types"

export type PlaybookTriggerType =
  | "health_critical"
  | "health_declined"
  | "usage_dropped"
  | "payment_failed"
  | "renewal_approaching"
  | "expansion_ready"
  | "onboarding_stalled"
  | "segment_graduation"
  | "churn_risk"
  | "support_escalation"

export interface PlaybookTrigger {
  type: PlaybookTriggerType
  name: string
  description: string
  priority: "critical" | "high" | "medium" | "low"
  conditions: PlaybookCondition[]
  actions: PlaybookAction[]
  applicableSegments: CustomerSegment[]
  applicableServiceTypes: ServiceType[]
}

export interface PlaybookCondition {
  field: string
  operator: "equals" | "lt" | "gt" | "lte" | "gte" | "contains" | "changed_to"
  value: string | number | boolean
  timeframe?: string // e.g., "7d", "30d"
}

export interface PlaybookAction {
  type: "alert" | "task" | "email" | "slack" | "escalate"
  description: string
  assignTo?: "owner" | "csm_lead" | "support"
  template?: string
}

// Playbook triggers derived from ICP pain points and buying triggers
export const PLAYBOOK_TRIGGERS: PlaybookTrigger[] = [
  // === HEALTH-BASED TRIGGERS ===
  {
    type: "health_critical",
    name: "Critical Health Alert",
    description: "Health score dropped to red or below 30",
    priority: "critical",
    conditions: [
      { field: "healthScore", operator: "equals", value: "red" },
      { field: "numericHealthScore", operator: "lt", value: 30 },
    ],
    actions: [
      { type: "alert", description: "Immediate CSM notification" },
      { type: "task", description: "Schedule urgent customer call within 24h", assignTo: "owner" },
      {
        type: "escalate",
        description: "Notify CSM lead if Enterprise account",
        assignTo: "csm_lead",
      },
    ],
    applicableSegments: ["smb", "mid_market", "enterprise"],
    applicableServiceTypes: ["black_car", "shuttle"],
  },

  {
    type: "health_declined",
    name: "Health Score Decline",
    description: "Health score dropped from green to yellow",
    priority: "high",
    conditions: [{ field: "healthScore", operator: "changed_to", value: "yellow" }],
    actions: [
      { type: "alert", description: "CSM notification of health decline" },
      {
        type: "task",
        description: "Review account and schedule check-in within 7 days",
        assignTo: "owner",
      },
    ],
    applicableSegments: ["smb", "mid_market", "enterprise"],
    applicableServiceTypes: ["black_car", "shuttle"],
  },

  // === USAGE-BASED TRIGGERS ===
  {
    type: "usage_dropped",
    name: "Usage Decline Alert",
    description: "Trip volume dropped 30%+ from previous period",
    priority: "high",
    conditions: [
      { field: "tripsLast30Days", operator: "lt", value: 0.7, timeframe: "vs_previous_30d" },
    ],
    actions: [
      { type: "alert", description: "Usage decline detected" },
      {
        type: "task",
        description: "Investigate usage drop - business change or issue?",
        assignTo: "owner",
      },
      {
        type: "email",
        description: "Send check-in email asking about business changes",
        template: "usage_checkin",
      },
    ],
    applicableSegments: ["smb", "mid_market", "enterprise"],
    applicableServiceTypes: ["black_car", "shuttle"],
  },

  {
    type: "onboarding_stalled",
    name: "Onboarding Stalled",
    description: "New customer with no trips after 14 days",
    priority: "high",
    conditions: [
      { field: "daysSinceCreated", operator: "gte", value: 14 },
      { field: "totalTrips", operator: "equals", value: 0 },
    ],
    actions: [
      { type: "alert", description: "Onboarding appears stalled" },
      { type: "task", description: "Call customer to assist with setup", assignTo: "owner" },
      {
        type: "email",
        description: "Send activation email with quick start guide",
        template: "activation",
      },
    ],
    applicableSegments: ["free", "smb", "mid_market"],
    applicableServiceTypes: ["black_car", "shuttle"],
  },

  // === PAYMENT TRIGGERS ===
  {
    type: "payment_failed",
    name: "Payment Failed",
    description: "Payment failure detected",
    priority: "high",
    conditions: [{ field: "paymentHealth", operator: "equals", value: "critical" }],
    actions: [
      { type: "alert", description: "Payment failure alert" },
      { type: "task", description: "Contact customer about payment issue", assignTo: "owner" },
      { type: "email", description: "Send payment update request", template: "payment_update" },
    ],
    applicableSegments: ["smb", "mid_market", "enterprise"],
    applicableServiceTypes: ["black_car", "shuttle"],
  },

  // === RENEWAL/CONTRACT TRIGGERS ===
  {
    type: "renewal_approaching",
    name: "Renewal Approaching (90 days)",
    description: "Contract renewal within 90 days",
    priority: "medium",
    conditions: [
      { field: "daysToRenewal", operator: "lte", value: 90 },
      { field: "daysToRenewal", operator: "gt", value: 0 },
    ],
    actions: [
      {
        type: "task",
        description: "Prepare renewal discussion and value summary",
        assignTo: "owner",
      },
      {
        type: "task",
        description: "Identify expansion opportunities before renewal",
        assignTo: "owner",
      },
    ],
    applicableSegments: ["mid_market", "enterprise"],
    applicableServiceTypes: ["black_car", "shuttle"],
  },

  // === EXPANSION TRIGGERS ===
  {
    type: "expansion_ready",
    name: "Expansion Ready",
    description: "Customer showing expansion signals",
    priority: "medium",
    conditions: [
      { field: "healthScore", operator: "equals", value: "green" },
      { field: "tripGrowthRate", operator: "gt", value: 0.15 }, // 15%+ growth
    ],
    actions: [
      { type: "alert", description: "Expansion opportunity detected" },
      { type: "task", description: "Schedule expansion conversation", assignTo: "owner" },
    ],
    applicableSegments: ["smb", "mid_market"],
    applicableServiceTypes: ["black_car", "shuttle"],
  },

  {
    type: "segment_graduation",
    name: "Segment Graduation Ready",
    description: "Customer ready to graduate to next segment tier",
    priority: "medium",
    conditions: [
      { field: "mrrApproachingThreshold", operator: "equals", value: true },
      { field: "healthScore", operator: "equals", value: "green" },
    ],
    actions: [
      { type: "alert", description: "Customer approaching segment graduation" },
      { type: "task", description: "Discuss upgraded plan and features", assignTo: "owner" },
    ],
    applicableSegments: ["free", "smb", "mid_market"],
    applicableServiceTypes: ["black_car", "shuttle"],
  },

  // === CHURN RISK TRIGGERS ===
  {
    type: "churn_risk",
    name: "High Churn Risk",
    description: "Multiple churn risk signals detected",
    priority: "critical",
    conditions: [{ field: "riskSignalCount", operator: "gte", value: 3 }],
    actions: [
      { type: "alert", description: "High churn risk - multiple signals" },
      { type: "task", description: "Create immediate intervention plan", assignTo: "owner" },
      { type: "escalate", description: "Escalate to CSM lead for review", assignTo: "csm_lead" },
    ],
    applicableSegments: ["smb", "mid_market", "enterprise"],
    applicableServiceTypes: ["black_car", "shuttle"],
  },

  // === SEGMENT-SPECIFIC TRIGGERS ===

  // SMB-specific (from ICP pain points)
  {
    type: "onboarding_stalled",
    name: "SMB Free Plan No Usage (44.7% start free)",
    description: "Free plan customer with no engagement",
    priority: "medium",
    conditions: [
      { field: "segment", operator: "equals", value: "free" },
      { field: "daysSinceLastLogin", operator: "gte", value: 14 },
      { field: "totalTrips", operator: "lt", value: 3 },
    ],
    actions: [
      {
        type: "email",
        description: "Send activation campaign - quick wins focus",
        template: "smb_activation",
      },
      { type: "task", description: "Offer 1:1 onboarding call", assignTo: "support" },
    ],
    applicableSegments: ["free"],
    applicableServiceTypes: ["black_car"],
  },

  // Mid-Market specific (from ICP buying triggers)
  {
    type: "expansion_ready",
    name: "Mid-Market Outgrowing Current Plan",
    description: "Mid-Market operator hitting limits",
    priority: "high",
    conditions: [
      { field: "segment", operator: "equals", value: "mid_market" },
      { field: "monthlyTrips", operator: "gt", value: 200 },
      { field: "currentPlan", operator: "equals", value: "standard" },
    ],
    actions: [
      { type: "alert", description: "Mid-Market customer may be outgrowing Standard plan" },
      { type: "task", description: "Discuss Pro plan benefits for scaling", assignTo: "owner" },
    ],
    applicableSegments: ["mid_market"],
    applicableServiceTypes: ["black_car"],
  },

  // Enterprise specific
  {
    type: "support_escalation",
    name: "Enterprise Support Escalation",
    description: "Enterprise customer with multiple open tickets",
    priority: "critical",
    conditions: [
      { field: "segment", operator: "equals", value: "enterprise" },
      { field: "openTicketCount", operator: "gte", value: 3 },
    ],
    actions: [
      { type: "escalate", description: "Immediate escalation to CSM lead", assignTo: "csm_lead" },
      { type: "task", description: "Schedule executive sponsor call", assignTo: "owner" },
    ],
    applicableSegments: ["enterprise"],
    applicableServiceTypes: ["black_car", "shuttle"],
  },

  // Shuttle-specific
  {
    type: "renewal_approaching",
    name: "Shuttle Program Renewal",
    description: "Shuttle contract approaching renewal",
    priority: "high",
    conditions: [
      { field: "serviceType", operator: "equals", value: "shuttle" },
      { field: "daysToRenewal", operator: "lte", value: 120 }, // Shuttle has longer cycles
    ],
    actions: [
      { type: "task", description: "Prepare program performance report", assignTo: "owner" },
      { type: "task", description: "Schedule QBR with program stakeholders", assignTo: "owner" },
      { type: "task", description: "Identify expansion routes for proposal", assignTo: "owner" },
    ],
    applicableSegments: ["mid_market", "enterprise"],
    applicableServiceTypes: ["shuttle"],
  },
]

/**
 * Evaluate which playbooks should be triggered for a customer
 */
export function evaluatePlaybookTriggers(customerData: {
  segment: CustomerSegment
  serviceType: ServiceType
  healthScore: string | null
  numericHealthScore: number | null
  totalTrips: number | null
  tripsLast30Days: number | null
  daysSinceLastLogin: number | null
  paymentHealth: string | null
  riskSignalCount: number
  daysToRenewal: number | null
  openTicketCount: number
  currentPlan: string | null
  mrr: number | null
}): PlaybookTrigger[] {
  const triggeredPlaybooks: PlaybookTrigger[] = []

  for (const playbook of PLAYBOOK_TRIGGERS) {
    // Check segment applicability
    if (!playbook.applicableSegments.includes(customerData.segment)) {
      continue
    }

    // Check service type applicability
    if (!playbook.applicableServiceTypes.includes(customerData.serviceType)) {
      continue
    }

    // Evaluate conditions (simplified - in production would be more sophisticated)
    let triggered = false

    switch (playbook.type) {
      case "health_critical":
        triggered =
          customerData.healthScore === "red" ||
          (customerData.numericHealthScore !== null && customerData.numericHealthScore < 30)
        break

      case "health_declined":
        // Would need historical data to detect change
        triggered =
          customerData.healthScore === "yellow" &&
          customerData.numericHealthScore !== null &&
          customerData.numericHealthScore < 50
        break

      case "usage_dropped":
        triggered =
          customerData.tripsLast30Days !== null &&
          customerData.totalTrips !== null &&
          customerData.totalTrips > 20 &&
          customerData.tripsLast30Days === 0
        break

      case "onboarding_stalled":
        triggered =
          customerData.totalTrips !== null &&
          customerData.totalTrips < 3 &&
          customerData.daysSinceLastLogin !== null &&
          customerData.daysSinceLastLogin > 14
        break

      case "payment_failed":
        triggered = customerData.paymentHealth === "critical"
        break

      case "renewal_approaching":
        triggered =
          customerData.daysToRenewal !== null &&
          customerData.daysToRenewal <= 90 &&
          customerData.daysToRenewal > 0
        break

      case "churn_risk":
        triggered = customerData.riskSignalCount >= 3
        break

      case "support_escalation":
        triggered = customerData.segment === "enterprise" && customerData.openTicketCount >= 3
        break

      case "expansion_ready":
        triggered =
          customerData.healthScore === "green" &&
          customerData.tripsLast30Days !== null &&
          customerData.tripsLast30Days > 50
        break

      case "segment_graduation":
        // Check if MRR is approaching segment threshold
        if (customerData.mrr) {
          if (customerData.segment === "free" && customerData.mrr > 3000) triggered = true
          if (customerData.segment === "smb" && customerData.mrr > 18000) triggered = true
          if (customerData.segment === "mid_market" && customerData.mrr > 70000) triggered = true
        }
        break
    }

    if (triggered) {
      triggeredPlaybooks.push(playbook)
    }
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  triggeredPlaybooks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return triggeredPlaybooks
}

/**
 * Get playbook actions for a customer
 */
export function getPlaybookActions(triggers: PlaybookTrigger[]): {
  criticalActions: string[]
  tasks: string[]
  automatedActions: string[]
} {
  const criticalActions: string[] = []
  const tasks: string[] = []
  const automatedActions: string[] = []

  for (const trigger of triggers) {
    for (const action of trigger.actions) {
      const actionText = `[${trigger.name}] ${action.description}`

      if (action.type === "escalate" || trigger.priority === "critical") {
        criticalActions.push(actionText)
      } else if (action.type === "task") {
        tasks.push(actionText)
      } else {
        automatedActions.push(actionText)
      }
    }
  }

  return {
    criticalActions: [...new Set(criticalActions)],
    tasks: [...new Set(tasks)],
    automatedActions: [...new Set(automatedActions)],
  }
}
