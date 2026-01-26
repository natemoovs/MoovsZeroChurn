/**
 * AI Client - Uses Vercel AI Gateway via Clawdbot
 *
 * This module provides an Anthropic-compatible interface that routes
 * all requests through Vercel AI Gateway. Existing code continues to
 * work unchanged while using the unified gateway.
 */

import OpenAI from "openai"

// Vercel AI Gateway configuration
// See: https://vercel.com/docs/ai-gateway/openai-compat
const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1"

// Model mapping: Anthropic model names to Vercel AI Gateway format
const MODEL_MAP: Record<string, string> = {
  "claude-haiku-4-5-20251001": "anthropic/claude-3-5-haiku-20241022",
  "claude-3-5-haiku-20241022": "anthropic/claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20241022": "anthropic/claude-3-5-sonnet-20241022",
  "claude-sonnet-4-20250514": "anthropic/claude-sonnet-4-20250514",
  "claude-opus-4-0-20250514": "anthropic/claude-opus-4-0-20250514",
}

// Default model
export const AI_MODEL = "claude-haiku-4-5-20251001"
const DEFAULT_GATEWAY_MODEL = "anthropic/claude-3-5-haiku-20241022"

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getRetryDelay(attempt: number): number {
  const baseDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
  const jitter = Math.random() * 0.1 * baseDelay
  return Math.min(baseDelay + jitter, MAX_RETRY_DELAY_MS)
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
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

// Internal OpenAI client for Vercel AI Gateway
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

function mapModel(anthropicModel: string): string {
  return MODEL_MAP[anthropicModel] || DEFAULT_GATEWAY_MODEL
}

// Tool use block type (Anthropic.ToolUseBlock compatible)
export interface ToolUseBlock {
  type: "tool_use"
  id: string
  name: string
  input: Record<string, unknown>
}

// Tool result block type (Anthropic.ToolResultBlockParam compatible)
export interface ToolResultBlockParam {
  type: "tool_result"
  tool_use_id: string
  content: string
  is_error?: boolean
}

// Content block types (Anthropic.ContentBlock compatible)
export type TextBlock = { type: "text"; text: string }
export type ContentBlock = TextBlock | ToolUseBlock

// Anthropic-compatible types for backward compatibility
export interface AnthropicMessage {
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

export interface AnthropicTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

// Message parameter type (Anthropic.MessageParam compatible)
export type MessageParam = {
  role: "user" | "assistant"
  content: string | ContentBlock[] | ToolResultBlockParam[]
}

export interface AnthropicMessageParams {
  model: string
  max_tokens: number
  system?: string
  messages: MessageParam[]
  tools?: AnthropicTool[]
}

// Anthropic-compatible client wrapper
export class AnthropicClient {
  messages = {
    create: async (params: AnthropicMessageParams): Promise<AnthropicMessage> => {
      const client = getGatewayClient()
      const gatewayModel = mapModel(params.model)

      // Convert messages to OpenAI format
      const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

      if (params.system) {
        openAIMessages.push({ role: "system", content: params.system })
      }

      for (const msg of params.messages) {
        let content: string
        if (typeof msg.content === "string") {
          content = msg.content
        } else {
          // Extract text from content blocks, filtering out non-text blocks
          content = msg.content
            .filter((c): c is TextBlock => c.type === "text")
            .map((c) => c.text)
            .join("")
        }
        openAIMessages.push({ role: msg.role, content })
      }

      // Convert tools to OpenAI format
      const tools = params.tools?.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      }))

      let lastError: unknown

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await client.chat.completions.create({
            model: gatewayModel,
            messages: openAIMessages,
            tools,
            max_tokens: params.max_tokens,
          })

          // Convert response to Anthropic format
          const choice = response.choices[0]
          return {
            id: response.id,
            type: "message",
            role: "assistant",
            content: [{ type: "text", text: choice?.message?.content || "" }],
            model: params.model,
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
        } catch (error) {
          lastError = error

          if (!isRetryableError(error)) {
            throw error
          }

          if (attempt >= MAX_RETRIES) {
            console.error(`[AI] Max retries (${MAX_RETRIES}) exceeded`, error)
            throw error
          }

          const delay = getRetryDelay(attempt)
          console.warn(
            `[AI] Retryable error on attempt ${attempt + 1}, retrying in ${delay}ms`,
            error instanceof OpenAI.APIError ? `Status: ${error.status}` : error
          )
          await sleep(delay)
        }
      }

      throw lastError
    },
  }
}

/**
 * Get a configured AI client (Anthropic-compatible interface via Vercel AI Gateway)
 * @param _apiKey - Deprecated, ignored. Uses VERCEL_AI_GATEWAY_API_KEY from env.
 */
export function getAnthropicClient(_apiKey?: string): AnthropicClient {
  return new AnthropicClient()
}

/**
 * Create a message with automatic retries and rate limit handling
 */
export async function createMessage(
  client: AnthropicClient,
  params: AnthropicMessageParams
): Promise<AnthropicMessage> {
  return client.messages.create(params)
}

/**
 * Create a message with tools, with automatic retries
 */
export async function createMessageWithTools(
  client: AnthropicClient,
  params: AnthropicMessageParams & { tools: AnthropicTool[] }
): Promise<AnthropicMessage> {
  return createMessage(client, params)
}

/**
 * Extract text content from a message response
 */
export function extractText(message: AnthropicMessage): string {
  const textBlock = message.content.find((block) => block.type === "text")
  return textBlock && textBlock.type === "text" ? textBlock.text : ""
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
