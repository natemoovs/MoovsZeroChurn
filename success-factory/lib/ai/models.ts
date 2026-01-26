/**
 * AI Model Configuration
 *
 * Defines available models and their characteristics for smart routing.
 * Uses Vercel AI Gateway model identifiers.
 */

// Model tiers based on cost and capability
export type ModelTier = "fast" | "balanced" | "quality" | "premium"

export interface ModelConfig {
  id: string
  provider: string
  tier: ModelTier
  costPer1MInput: number // USD per 1M input tokens
  costPer1MOutput: number // USD per 1M output tokens
  maxTokens: number
  supportsTools: boolean
  supportsStreaming: boolean
}

// Available models through Vercel AI Gateway
export const MODELS: Record<string, ModelConfig> = {
  // FAST tier - Cheapest, good for simple tasks
  "gemini-flash": {
    id: "google/gemini-2.0-flash-001",
    provider: "google",
    tier: "fast",
    costPer1MInput: 0.1,
    costPer1MOutput: 0.4,
    maxTokens: 8192,
    supportsTools: true,
    supportsStreaming: true,
  },
  "gpt-4o-mini": {
    id: "openai/gpt-4o-mini",
    provider: "openai",
    tier: "fast",
    costPer1MInput: 0.15,
    costPer1MOutput: 0.6,
    maxTokens: 16384,
    supportsTools: true,
    supportsStreaming: true,
  },

  // BALANCED tier - Good quality, reasonable cost
  "claude-haiku": {
    id: "anthropic/claude-3-5-haiku-20241022",
    provider: "anthropic",
    tier: "balanced",
    costPer1MInput: 0.25,
    costPer1MOutput: 1.25,
    maxTokens: 8192,
    supportsTools: true,
    supportsStreaming: true,
  },
  "gemini-pro": {
    id: "google/gemini-2.0-pro-exp-02-05",
    provider: "google",
    tier: "balanced",
    costPer1MInput: 1.25,
    costPer1MOutput: 5.0,
    maxTokens: 8192,
    supportsTools: true,
    supportsStreaming: true,
  },

  // QUALITY tier - High quality for important tasks
  "claude-sonnet": {
    id: "anthropic/claude-sonnet-4-20250514",
    provider: "anthropic",
    tier: "quality",
    costPer1MInput: 3.0,
    costPer1MOutput: 15.0,
    maxTokens: 8192,
    supportsTools: true,
    supportsStreaming: true,
  },
  "gpt-4o": {
    id: "openai/gpt-4o",
    provider: "openai",
    tier: "quality",
    costPer1MInput: 2.5,
    costPer1MOutput: 10.0,
    maxTokens: 16384,
    supportsTools: true,
    supportsStreaming: true,
  },

  // PREMIUM tier - Best quality, use sparingly
  "claude-opus": {
    id: "anthropic/claude-opus-4-20250514",
    provider: "anthropic",
    tier: "premium",
    costPer1MInput: 15.0,
    costPer1MOutput: 75.0,
    maxTokens: 8192,
    supportsTools: true,
    supportsStreaming: true,
  },
}

// Default model per tier
export const DEFAULT_BY_TIER: Record<ModelTier, string> = {
  fast: "gemini-flash",
  balanced: "claude-haiku",
  quality: "claude-sonnet",
  premium: "claude-opus",
}

// Get model config by key
export function getModel(key: string): ModelConfig {
  const model = MODELS[key]
  if (!model) {
    console.warn(`[AI] Unknown model key: ${key}, falling back to gemini-flash`)
    return MODELS["gemini-flash"]
  }
  return model
}

// Get model ID for API calls
export function getModelId(key: string): string {
  return getModel(key).id
}

// Get cheapest model in a tier
export function getCheapestInTier(tier: ModelTier): ModelConfig {
  const modelsInTier = Object.values(MODELS).filter((m) => m.tier === tier)
  return modelsInTier.reduce((cheapest, current) =>
    current.costPer1MOutput < cheapest.costPer1MOutput ? current : cheapest
  )
}

// Estimate cost for a request
export function estimateCost(
  modelKey: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModel(modelKey)
  return (
    (inputTokens * model.costPer1MInput + outputTokens * model.costPer1MOutput) /
    1_000_000
  )
}
