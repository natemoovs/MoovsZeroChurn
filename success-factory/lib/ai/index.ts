/**
 * AI Module
 *
 * Unified AI client with smart routing, caching, fallbacks, and metrics.
 * Import from "@/lib/ai" for all AI operations.
 */

// Main client
export {
  createMessage,
  complete,
  extractText,
  getErrorResponse,
  TOKEN_LIMITS,
  // Types
  type AIMessage,
  type AITool,
  type AIRequestParams,
  type MessageParam,
  type ContentBlock,
  type TextBlock,
  type ToolUseBlock,
  type ToolResultBlockParam,
  type TaskType,
  type RoutingContext,
} from "./client"

// Model configuration
export {
  MODELS,
  getModel,
  getModelId,
  estimateCost,
  getCheapestInTier,
  type ModelConfig,
  type ModelTier,
} from "./models"

// Model routing
export {
  selectModel,
  selectModelId,
  explainRouting,
} from "./model-router"

// Caching
export {
  getCached,
  setCache,
  invalidateCache,
  getCacheStats,
  isCacheable,
  getTTL,
} from "./cache"

// Fallbacks
export {
  executeWithFallback,
  shouldFallback,
  getFallbackChain,
  getNextFallback,
  createFallbackSelector,
} from "./fallback"

// Metrics
export {
  trackAICall,
  createMetricTracker,
  getAggregateStats,
  getStatsByModel,
  getStatsByTask,
  getRecentMetrics,
  getCostBreakdown,
  resetMetrics,
} from "./metrics"

// Backward compatibility aliases
export type AnthropicMessage = import("./client").AIMessage
export type AnthropicTool = import("./client").AITool

// Legacy interface for old createMessage signature
export interface AnthropicMessageParams {
  model: string
  max_tokens: number
  system?: string
  messages: import("./client").MessageParam[]
  tools?: import("./client").AITool[]
}

/**
 * Legacy client wrapper for backward compatibility
 * @deprecated Use createMessage() directly instead
 */
export class AnthropicClient {
  messages = {
    create: async (params: AnthropicMessageParams): Promise<import("./client").AIMessage> => {
      const { createMessage: newCreateMessage } = await import("./client")
      return newCreateMessage({
        taskType: "general",
        maxTokens: params.max_tokens,
        system: params.system,
        messages: params.messages,
        tools: params.tools,
      })
    },
  }
}

/**
 * @deprecated Use createMessage() directly
 */
export function getAnthropicClient(_apiKey?: string): AnthropicClient {
  return new AnthropicClient()
}

/**
 * Legacy createMessage wrapper that accepts (client, params) signature
 * @deprecated Use the new createMessage({ taskType, ... }) directly
 */
export async function createMessageLegacy(
  _client: AnthropicClient,
  params: AnthropicMessageParams
): Promise<import("./client").AIMessage> {
  const { createMessage: newCreateMessage } = await import("./client")
  return newCreateMessage({
    taskType: "general",
    maxTokens: params.max_tokens,
    system: params.system,
    messages: params.messages,
    tools: params.tools,
  })
}

/**
 * Legacy createMessageWithTools wrapper
 * @deprecated Use createMessage() with tools directly
 */
export async function createMessageWithTools(
  _client: AnthropicClient,
  params: AnthropicMessageParams & { tools: import("./client").AITool[] }
): Promise<import("./client").AIMessage> {
  return createMessageLegacy(_client, params)
}

/**
 * @deprecated Use complete() or createMessage() directly
 */
export const AI_MODEL = "claude-haiku" // Legacy constant
