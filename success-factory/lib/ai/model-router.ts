/**
 * Smart Model Router
 *
 * Selects the optimal AI model based on task type and context.
 * Balances cost vs quality based on task importance.
 */

import { MODELS, ModelConfig, ModelTier, getModel, getModelId } from "./models"

// Task types that map to specific model requirements
export type TaskType =
  // FAST tier tasks - simple, high volume
  | "data-lookup"
  | "json-formatting"
  | "simple-classification"
  | "input-validation"
  | "payment-recovery-email"
  // BALANCED tier tasks - standard operations
  | "health-explain"
  | "meeting-prep"
  | "task-summary"
  | "outreach-draft"
  | "chat"
  | "general"
  // QUALITY tier tasks - important decisions
  | "churn-prediction"
  | "renewal-risk"
  | "save-playbook"
  | "qbr-prep"
  | "research-report"
  | "win-back"
  // PREMIUM tier tasks - critical, customer-facing
  | "executive-summary"
  | "high-value-account"

// Task to model tier mapping
const TASK_TIER_MAP: Record<TaskType, ModelTier> = {
  // Fast tier
  "data-lookup": "fast",
  "json-formatting": "fast",
  "simple-classification": "fast",
  "input-validation": "fast",
  "payment-recovery-email": "fast",

  // Balanced tier
  "health-explain": "balanced",
  "meeting-prep": "balanced",
  "task-summary": "balanced",
  "outreach-draft": "balanced",
  chat: "balanced",
  general: "balanced",

  // Quality tier
  "churn-prediction": "quality",
  "renewal-risk": "quality",
  "save-playbook": "quality",
  "qbr-prep": "quality",
  "research-report": "quality",
  "win-back": "quality",

  // Premium tier
  "executive-summary": "premium",
  "high-value-account": "premium",
}

// Preferred model per task (can override tier default)
const TASK_MODEL_OVERRIDE: Partial<Record<TaskType, string>> = {
  // Use Gemini Flash for simple tasks (cheapest)
  "data-lookup": "gemini-flash",
  "json-formatting": "gemini-flash",
  "payment-recovery-email": "gemini-flash",

  // Use Claude for nuanced tasks
  chat: "claude-haiku",
  "health-explain": "claude-haiku",
  "churn-prediction": "claude-sonnet",
  "save-playbook": "claude-sonnet",
}

// Context for dynamic model selection
export interface RoutingContext {
  mrr?: number // Monthly recurring revenue
  healthScore?: "green" | "yellow" | "red"
  urgency?: "low" | "medium" | "high" | "critical"
  isCustomerFacing?: boolean
  accountTier?: "smb" | "mid-market" | "enterprise"
}

// MRR thresholds for model escalation
const MRR_THRESHOLDS = {
  enterprise: 10000, // $10k+ MRR gets premium treatment
  midMarket: 3000, // $3k+ MRR gets quality treatment
}

/**
 * Select the optimal model for a task
 */
export function selectModel(
  taskType: TaskType,
  context: RoutingContext = {}
): ModelConfig {
  // Get base tier for task
  const baseTier = TASK_TIER_MAP[taskType] || "balanced"

  // Check for explicit model override
  const overrideKey = TASK_MODEL_OVERRIDE[taskType]
  if (overrideKey && !shouldEscalate(context, baseTier)) {
    return getModel(overrideKey)
  }

  // Determine final tier based on context
  const finalTier = escalateTier(baseTier, context)

  // Get preferred model for tier
  return getPreferredModelForTier(finalTier, taskType)
}

/**
 * Get model ID for API calls
 */
export function selectModelId(
  taskType: TaskType,
  context: RoutingContext = {}
): string {
  return selectModel(taskType, context).id
}

/**
 * Check if context warrants model escalation
 */
function shouldEscalate(context: RoutingContext, baseTier: ModelTier): boolean {
  // High MRR accounts get better models
  if (context.mrr && context.mrr >= MRR_THRESHOLDS.midMarket) {
    return true
  }

  // Critical health + urgency gets better models
  if (context.healthScore === "red" && context.urgency === "critical") {
    return true
  }

  // Customer-facing content gets better models
  if (context.isCustomerFacing && baseTier === "fast") {
    return true
  }

  // Enterprise accounts always escalate
  if (context.accountTier === "enterprise") {
    return true
  }

  return false
}

/**
 * Escalate tier based on context
 */
function escalateTier(baseTier: ModelTier, context: RoutingContext): ModelTier {
  if (!shouldEscalate(context, baseTier)) {
    return baseTier
  }

  // Enterprise or very high MRR → premium
  if (
    context.accountTier === "enterprise" ||
    (context.mrr && context.mrr >= MRR_THRESHOLDS.enterprise)
  ) {
    return baseTier === "premium" ? "premium" : "quality"
  }

  // Mid-market or moderate MRR → one tier up
  if (
    context.accountTier === "mid-market" ||
    (context.mrr && context.mrr >= MRR_THRESHOLDS.midMarket)
  ) {
    const tierOrder: ModelTier[] = ["fast", "balanced", "quality", "premium"]
    const currentIndex = tierOrder.indexOf(baseTier)
    return tierOrder[Math.min(currentIndex + 1, tierOrder.length - 1)]
  }

  // Customer-facing fast tasks → balanced
  if (context.isCustomerFacing && baseTier === "fast") {
    return "balanced"
  }

  return baseTier
}

/**
 * Get preferred model for a tier
 */
function getPreferredModelForTier(
  tier: ModelTier,
  _taskType: TaskType
): ModelConfig {
  // Tier preferences (prioritize Gemini for cost, Claude for quality)
  const tierPreferences: Record<ModelTier, string[]> = {
    fast: ["gemini-flash", "gpt-4o-mini"],
    balanced: ["claude-haiku", "gemini-pro"],
    quality: ["claude-sonnet", "gpt-4o"],
    premium: ["claude-opus", "claude-sonnet"],
  }

  const preferences = tierPreferences[tier]
  for (const modelKey of preferences) {
    if (MODELS[modelKey]) {
      return MODELS[modelKey]
    }
  }

  // Fallback
  return MODELS["gemini-flash"]
}

/**
 * Get routing recommendation with explanation
 */
export function explainRouting(
  taskType: TaskType,
  context: RoutingContext = {}
): {
  model: ModelConfig
  reason: string
  estimatedCostPer1000Calls: number
} {
  const model = selectModel(taskType, context)
  const baseTier = TASK_TIER_MAP[taskType]
  const wasEscalated = model.tier !== baseTier

  let reason = `Task "${taskType}" uses ${model.tier} tier (${model.id})`
  if (wasEscalated) {
    reason += ` - escalated from ${baseTier} due to context`
    if (context.mrr) reason += ` (MRR: $${context.mrr})`
    if (context.healthScore) reason += ` (health: ${context.healthScore})`
  }

  // Estimate cost assuming ~1000 input + 500 output tokens per call
  const estimatedCostPer1000Calls =
    (1000 * model.costPer1MInput + 500 * model.costPer1MOutput) / 1000

  return { model, reason, estimatedCostPer1000Calls }
}
