/**
 * Unified AI Client
 *
 * Main entry point for all AI operations. Combines:
 * - Smart model routing
 * - Response caching
 * - Automatic fallbacks
 * - Cost tracking
 */

import OpenAI from "openai"
import { MODELS, getModelId, ModelConfig, estimateCost } from "./models"
import {
  selectModel,
  selectModelId,
  TaskType,
  RoutingContext,
} from "./model-router"
import { getCached, setCache, isCacheable } from "./cache"
import { executeWithFallback, shouldFallback } from "./fallback"
import { createMetricTracker } from "./metrics"

// Vercel AI Gateway configuration
const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1"

// Rate limit configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 16000

// Token limits for different use cases
export const TOKEN_LIMITS = {
  small: 800,
  medium: 1500,
  standard: 2000,
  large: 4096,
  toolUse: 8192,
}

// Singleton client instance
let _client: OpenAI | null = null

function getGatewayClient(): OpenAI {
  if (!_client) {
    const key = process.env.VERCEL_AI_GATEWAY_API_KEY
    if (!key) {
      throw new Error("VERCEL_AI_GATEWAY_API_KEY is not configured")
    }
    _client = new OpenAI({
      apiKey: key,
      baseURL: AI_GATEWAY_BASE_URL,
    })
  }
  return _client
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getRetryDelay(attempt: number): number {
  const baseDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
  const jitter = Math.random() * 0.1 * baseDelay
  return Math.min(baseDelay + jitter, MAX_RETRY_DELAY_MS)
}

// Types for backward compatibility
export interface ToolUseBlock {
  type: "tool_use"
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultBlockParam {
  type: "tool_result"
  tool_use_id: string
  content: string
  is_error?: boolean
}

export type TextBlock = { type: "text"; text: string }
export type ContentBlock = TextBlock | ToolUseBlock

export interface AIMessage {
  id: string
  type: "message"
  role: "assistant"
  content: ContentBlock[]
  model: string
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface AITool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export type MessageParam = {
  role: "user" | "assistant"
  content: string | ContentBlock[] | ToolResultBlockParam[]
}

export interface AIRequestParams {
  taskType: TaskType
  context?: RoutingContext
  maxTokens?: number
  system?: string
  messages: MessageParam[]
  tools?: AITool[]
  skipCache?: boolean
}

/**
 * Create a message with smart routing, caching, and fallbacks
 */
export async function createMessage(
  params: AIRequestParams
): Promise<AIMessage> {
  const {
    taskType,
    context = {},
    maxTokens = TOKEN_LIMITS.standard,
    system,
    messages,
    tools,
    skipCache = false,
  } = params

  // Select optimal model
  const modelKey = Object.keys(MODELS).find(
    (k) => MODELS[k].id === selectModelId(taskType, context)
  ) || "gemini-flash"
  const selectedModel = selectModel(taskType, context)

  // Check cache first
  if (!skipCache && isCacheable(taskType)) {
    const cacheInput = { system, messages, taskType }
    const cached = getCached<AIMessage>(taskType, cacheInput, selectedModel.id)
    if (cached) {
      // Track cached hit
      const tracker = createMetricTracker(taskType, modelKey)
      tracker.complete({
        inputTokens: 0,
        outputTokens: 0,
        cached: true,
        success: true,
      })
      return cached
    }
  }

  // Start tracking
  const tracker = createMetricTracker(taskType, modelKey)

  // Convert messages to OpenAI format
  const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    []

  if (system) {
    openAIMessages.push({ role: "system", content: system })
  }

  for (const msg of messages) {
    let content: string
    if (typeof msg.content === "string") {
      content = msg.content
    } else {
      content = msg.content
        .filter((c): c is TextBlock => c.type === "text")
        .map((c) => c.text)
        .join("")
    }
    openAIMessages.push({ role: msg.role, content })
  }

  // Convert tools to OpenAI format
  const openAITools = tools?.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }))

  // Execute with fallback support
  const executor = async (model: ModelConfig) => {
    const client = getGatewayClient()

    let lastError: unknown
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model: model.id,
          messages: openAIMessages,
          tools: openAITools,
          max_tokens: maxTokens,
        })

        const choice = response.choices[0]
        const result: AIMessage = {
          id: response.id,
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: choice?.message?.content || "" }],
          model: model.id,
          stop_reason:
            choice?.finish_reason === "stop"
              ? "end_turn"
              : choice?.finish_reason === "tool_calls"
                ? "tool_use"
                : choice?.finish_reason === "length"
                  ? "max_tokens"
                  : null,
          usage: {
            input_tokens: response.usage?.prompt_tokens || 0,
            output_tokens: response.usage?.completion_tokens || 0,
          },
        }

        return result
      } catch (error) {
        lastError = error

        if (!shouldFallback(error) && attempt >= MAX_RETRIES) {
          throw error
        }

        if (attempt < MAX_RETRIES) {
          const delay = getRetryDelay(attempt)
          console.warn(`[AI] Retrying in ${delay}ms...`, error)
          await sleep(delay)
        }
      }
    }

    throw lastError
  }

  try {
    const { result, modelUsed, fallbacksUsed } = await executeWithFallback(
      modelKey,
      executor
    )

    // Track metrics
    const finalModelKey =
      Object.keys(MODELS).find((k) => MODELS[k].id === modelUsed.id) || modelKey
    tracker.complete({
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
      cached: false,
      fallbackUsed: fallbacksUsed > 0,
      finalModelKey,
      success: true,
    })

    // Cache the result
    if (!skipCache && isCacheable(taskType)) {
      const cacheInput = { system, messages, taskType }
      setCache(taskType, cacheInput, modelUsed.id, result)
    }

    return result
  } catch (error) {
    tracker.complete({
      inputTokens: 0,
      outputTokens: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    throw error
  }
}

/**
 * Simple text completion (convenience wrapper)
 */
export async function complete(
  taskType: TaskType,
  prompt: string,
  options: {
    system?: string
    context?: RoutingContext
    maxTokens?: number
  } = {}
): Promise<string> {
  const result = await createMessage({
    taskType,
    context: options.context,
    maxTokens: options.maxTokens,
    system: options.system,
    messages: [{ role: "user", content: prompt }],
  })

  const textBlock = result.content.find((b) => b.type === "text")
  return textBlock?.type === "text" ? textBlock.text : ""
}

/**
 * Extract text from message
 */
export function extractText(message: AIMessage): string {
  const textBlock = message.content.find((block) => block.type === "text")
  return textBlock && textBlock.type === "text" ? textBlock.text : ""
}

/**
 * Handle API errors
 */
export function getErrorResponse(error: unknown): {
  message: string
  status: number
} {
  if (error instanceof OpenAI.APIError) {
    switch (error.status) {
      case 401:
        return {
          message: "Invalid API key. Please check your VERCEL_AI_GATEWAY_API_KEY.",
          status: 500,
        }
      case 429:
        return {
          message: "Rate limit exceeded. Please wait a moment and try again.",
          status: 429,
        }
      case 500:
      case 503:
        return {
          message: "AI service is temporarily unavailable. Please try again.",
          status: 503,
        }
      default:
        return { message: `API error: ${error.message}`, status: error.status }
    }
  }

  if (error instanceof Error) {
    return { message: error.message, status: 500 }
  }

  return { message: "An unexpected error occurred", status: 500 }
}

// Re-export for convenience
export type { TaskType, RoutingContext } from "./model-router"
export { MODELS, getModelId, estimateCost } from "./models"
export { getCacheStats, invalidateCache } from "./cache"
export {
  getAggregateStats,
  getStatsByModel,
  getStatsByTask,
  getCostBreakdown,
} from "./metrics"
