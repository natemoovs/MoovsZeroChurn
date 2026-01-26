/**
 * Clawdbot AI Client
 *
 * Uses Vercel AI Gateway for unified model access.
 * Provides the same capabilities as direct Anthropic SDK but with:
 * - Model flexibility (switch between Claude, GPT-4, etc.)
 * - Unified billing through Vercel
 * - Built-in retry and error handling
 */

import OpenAI from "openai"

// Vercel AI Gateway configuration
// See: https://vercel.com/docs/ai-gateway/openai-compat
const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1"

// Default model - Claude 3.5 Haiku via Vercel AI Gateway
// Format: provider/model (e.g., "anthropic/claude-3-5-haiku-20241022")
export const DEFAULT_MODEL = "anthropic/claude-3-5-haiku-20241022"

// Available models through Vercel AI Gateway
export const MODELS = {
  // Claude models (fast, cost-effective)
  "claude-haiku": "anthropic/claude-3-5-haiku-20241022",
  "claude-sonnet": "anthropic/claude-sonnet-4-20250514",
  "claude-opus": "anthropic/claude-opus-4-0-20250514",

  // GPT models (alternative)
  "gpt-4o": "openai/gpt-4o",
  "gpt-4o-mini": "openai/gpt-4o-mini",
} as const

export type ModelKey = keyof typeof MODELS

// Rate limit configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 16000

// Token limits for different use cases
export const TOKEN_LIMITS = {
  small: 800, // Quick responses, win-back messages
  medium: 1500, // Playbooks, payment recovery
  standard: 2000, // Reports, QBR prep
  large: 4096, // Skill generation
  toolUse: 8192, // Tool use with iterations
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getRetryDelay(attempt: number): number {
  const baseDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
  const jitter = Math.random() * 0.1 * baseDelay
  return Math.min(baseDelay + jitter, MAX_RETRY_DELAY_MS)
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    // Retry on rate limit (429), server errors (5xx)
    return error.status === 429 || (error.status >= 500 && error.status < 600)
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("socket")
    )
  }
  return false
}

/**
 * Get a configured Clawdbot AI client (uses Vercel AI Gateway)
 */
export function getClawdbotClient(apiKey?: string): OpenAI {
  const key = apiKey || process.env.VERCEL_AI_GATEWAY_API_KEY
  if (!key) {
    throw new Error("VERCEL_AI_GATEWAY_API_KEY is not configured")
  }
  return new OpenAI({
    apiKey: key,
    baseURL: AI_GATEWAY_BASE_URL,
  })
}

/**
 * Tool definition compatible with OpenAI function calling
 */
export interface ClawdbotTool {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/**
 * Convert Anthropic-style tools to OpenAI function format
 */
export function convertToOpenAITools(
  anthropicTools: Array<{
    name: string
    description?: string
    input_schema: Record<string, unknown>
  }>
): ClawdbotTool[] {
  return anthropicTools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: tool.input_schema,
    },
  }))
}

/**
 * Message format for chat
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: "function"
    function: {
      name: string
      arguments: string
    }
  }>
}

/**
 * Create a chat completion with automatic retries
 */
export async function createChatCompletion(
  client: OpenAI,
  params: {
    model?: string
    messages: ChatMessage[]
    tools?: ClawdbotTool[]
    max_tokens?: number
    stream?: boolean
  }
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const model = params.model || DEFAULT_MODEL
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: params.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools: params.tools,
        max_tokens: params.max_tokens || TOKEN_LIMITS.toolUse,
        stream: false,
      })
      return response
    } catch (error) {
      lastError = error

      if (!isRetryableError(error)) {
        throw error
      }

      if (attempt >= MAX_RETRIES) {
        console.error(`[Clawdbot] Max retries (${MAX_RETRIES}) exceeded`, error)
        throw error
      }

      const delay = getRetryDelay(attempt)
      console.warn(
        `[Clawdbot] Retryable error on attempt ${attempt + 1}, retrying in ${delay}ms`,
        error instanceof OpenAI.APIError ? `Status: ${error.status}` : error
      )
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Create a streaming chat completion
 */
export async function createStreamingChatCompletion(
  client: OpenAI,
  params: {
    model?: string
    messages: ChatMessage[]
    tools?: ClawdbotTool[]
    max_tokens?: number
  }
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  const model = params.model || DEFAULT_MODEL

  const stream = await client.chat.completions.create({
    model,
    messages: params.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: params.tools,
    max_tokens: params.max_tokens || TOKEN_LIMITS.toolUse,
    stream: true,
  })

  return stream
}

/**
 * Extract text content from a completion response
 */
export function extractText(
  response: OpenAI.Chat.Completions.ChatCompletion
): string {
  const message = response.choices[0]?.message
  return message?.content || ""
}

/**
 * Extract tool calls from a completion response
 */
export function extractToolCalls(
  response: OpenAI.Chat.Completions.ChatCompletion
): Array<{
  id: string
  name: string
  arguments: Record<string, unknown>
}> {
  const message = response.choices[0]?.message
  if (!message?.tool_calls) return []

  return message.tool_calls.map((tc) => {
    // Handle both standard and custom tool call types
    const funcInfo = "function" in tc ? tc.function : null
    return {
      id: tc.id,
      name: funcInfo?.name || "",
      arguments: JSON.parse(funcInfo?.arguments || "{}"),
    }
  })
}

/**
 * Check if response requires tool execution
 */
export function requiresToolExecution(
  response: OpenAI.Chat.Completions.ChatCompletion
): boolean {
  return response.choices[0]?.finish_reason === "tool_calls"
}

/**
 * Handle API errors and return appropriate HTTP response info
 */
export function getErrorResponse(error: unknown): { message: string; status: number } {
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
          message: "AI service is temporarily unavailable. Please try again in a few moments.",
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
