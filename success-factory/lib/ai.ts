/**
 * AI Client - Unified interface for all AI operations
 *
 * This module re-exports from the new modular AI system in /lib/ai/
 * which provides:
 * - Smart model routing (Gemini Flash for cheap, Claude Sonnet for quality)
 * - Response caching
 * - Automatic fallbacks
 * - Cost tracking
 *
 * For new code, import from "@/lib/ai" for the full API.
 * Legacy AnthropicClient is maintained for backward compatibility.
 */

// Re-export everything from the new modular system
export {
  // Main client functions (new API)
  createMessage as createMessageNew,
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

  // Model configuration
  MODELS,
  getModel,
  getModelId,
  estimateCost,

  // Model routing
  selectModel,
  selectModelId,
  explainRouting,

  // Caching
  getCached,
  setCache,
  invalidateCache,
  getCacheStats,

  // Fallbacks
  executeWithFallback,
  getFallbackChain,

  // Metrics
  getAggregateStats,
  getStatsByModel,
  getStatsByTask,
  getCostBreakdown,

  // Backward compatibility
  AnthropicClient,
  getAnthropicClient,
  createMessageLegacy,
  createMessageWithTools,
  AI_MODEL,
  type AnthropicMessage,
  type AnthropicTool,
  type AnthropicMessageParams,
} from "./ai/index"

// Backward-compatible createMessage that works with both old and new signatures
import type { AIRequestParams, AIMessage, AnthropicMessageParams } from "./ai/index"
import { AnthropicClient } from "./ai/index"

export async function createMessage(
  clientOrParams: AnthropicClient | AIRequestParams,
  params?: AnthropicMessageParams
): Promise<AIMessage> {
  // Check if using old signature: createMessage(client, params)
  if (clientOrParams instanceof AnthropicClient && params) {
    const { createMessage: newCreateMessage } = await import("./ai/client")
    return newCreateMessage({
      taskType: "general",
      maxTokens: params.max_tokens,
      system: params.system,
      messages: params.messages,
      tools: params.tools,
    })
  }

  // New signature: createMessage(params)
  const { createMessage: newCreateMessage } = await import("./ai/client")
  return newCreateMessage(clientOrParams as AIRequestParams)
}
