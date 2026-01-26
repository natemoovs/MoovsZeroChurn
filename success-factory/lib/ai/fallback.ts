/**
 * Model Fallback Chain
 *
 * Provides automatic fallback to alternative models when primary fails.
 * Ensures reliability by having backup options for each model.
 */

import { MODELS, ModelConfig, getModel } from "./models"

// Fallback chains - ordered by preference
const FALLBACK_CHAINS: Record<string, string[]> = {
  // Claude models fall back to each other, then GPT
  "claude-opus": ["claude-sonnet", "gpt-4o", "claude-haiku"],
  "claude-sonnet": ["gpt-4o", "claude-haiku", "gemini-pro"],
  "claude-haiku": ["gemini-flash", "gpt-4o-mini", "gemini-pro"],

  // OpenAI models fall back to Claude
  "gpt-4o": ["claude-sonnet", "gemini-pro", "claude-haiku"],
  "gpt-4o-mini": ["gemini-flash", "claude-haiku"],

  // Google models fall back to others
  "gemini-pro": ["claude-haiku", "gpt-4o", "gemini-flash"],
  "gemini-flash": ["gpt-4o-mini", "claude-haiku"],
}

// Error types that should trigger fallback
const FALLBACK_ERROR_CODES = [
  429, // Rate limited
  500, // Server error
  502, // Bad gateway
  503, // Service unavailable
  504, // Gateway timeout
]

const FALLBACK_ERROR_MESSAGES = [
  "overloaded",
  "capacity",
  "rate limit",
  "timeout",
  "unavailable",
  "connection",
  "network",
]

/**
 * Check if an error should trigger fallback
 */
export function shouldFallback(error: unknown): boolean {
  // Check HTTP status codes
  if (error && typeof error === "object") {
    const status = (error as { status?: number }).status
    if (status && FALLBACK_ERROR_CODES.includes(status)) {
      return true
    }
  }

  // Check error messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return FALLBACK_ERROR_MESSAGES.some((msg) => message.includes(msg))
  }

  return false
}

/**
 * Get fallback chain for a model
 */
export function getFallbackChain(modelKey: string): ModelConfig[] {
  const chain = FALLBACK_CHAINS[modelKey] || []
  return chain.map((key) => getModel(key)).filter(Boolean)
}

/**
 * Get next fallback model
 */
export function getNextFallback(
  currentModelKey: string,
  attemptedModels: string[]
): ModelConfig | null {
  const chain = FALLBACK_CHAINS[currentModelKey] || []

  for (const fallbackKey of chain) {
    if (!attemptedModels.includes(fallbackKey)) {
      return getModel(fallbackKey)
    }
  }

  return null
}

/**
 * Execute with automatic fallback
 */
export async function executeWithFallback<T>(
  primaryModelKey: string,
  executor: (model: ModelConfig) => Promise<T>,
  options: {
    maxAttempts?: number
    onFallback?: (from: string, to: string, error: unknown) => void
  } = {}
): Promise<{ result: T; modelUsed: ModelConfig; fallbacksUsed: number }> {
  const { maxAttempts = 3, onFallback } = options
  const attemptedModels: string[] = []
  let currentModel = getModel(primaryModelKey)
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await executor(currentModel)
      return {
        result,
        modelUsed: currentModel,
        fallbacksUsed: attempt,
      }
    } catch (error) {
      lastError = error
      attemptedModels.push(
        Object.keys(MODELS).find((k) => MODELS[k].id === currentModel.id) ||
          primaryModelKey
      )

      // Check if we should fallback
      if (!shouldFallback(error)) {
        throw error // Non-retryable error
      }

      // Try to get next fallback
      const nextModel = getNextFallback(primaryModelKey, attemptedModels)
      if (!nextModel) {
        console.error(
          `[AI Fallback] No more fallbacks available for ${primaryModelKey}`
        )
        throw error
      }

      // Log fallback
      const fromKey =
        Object.keys(MODELS).find((k) => MODELS[k].id === currentModel.id) ||
        "unknown"
      const toKey =
        Object.keys(MODELS).find((k) => MODELS[k].id === nextModel.id) ||
        "unknown"
      console.warn(`[AI Fallback] ${fromKey} → ${toKey}`, error)

      if (onFallback) {
        onFallback(fromKey, toKey, error)
      }

      currentModel = nextModel
    }
  }

  throw lastError
}

/**
 * Create a fallback-aware model selector
 */
export function createFallbackSelector(primaryModelKey: string) {
  let currentIndex = 0
  const chain = [primaryModelKey, ...(FALLBACK_CHAINS[primaryModelKey] || [])]

  return {
    current(): ModelConfig {
      return getModel(chain[currentIndex])
    },
    next(): ModelConfig | null {
      currentIndex++
      if (currentIndex >= chain.length) {
        return null
      }
      return getModel(chain[currentIndex])
    },
    reset(): void {
      currentIndex = 0
    },
    hasMore(): boolean {
      return currentIndex < chain.length - 1
    },
  }
}
