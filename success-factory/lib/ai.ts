import Anthropic from "@anthropic-ai/sdk"

// Use Claude 3.5 Haiku for faster, cheaper responses
export const AI_MODEL = "claude-3-5-haiku-20241022"

// Rate limit configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000 // 1 second
const MAX_RETRY_DELAY_MS = 16000 // 16 seconds

// Token limits for different use cases
export const TOKEN_LIMITS = {
  small: 800,      // Quick responses, win-back messages
  medium: 1500,    // Playbooks, payment recovery
  standard: 2000,  // Reports, QBR prep
  large: 4096,     // Skill generation
  toolUse: 8192,   // Tool use with iterations
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getRetryDelay(attempt: number): number {
  const baseDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
  const jitter = Math.random() * 0.1 * baseDelay // 10% jitter
  return Math.min(baseDelay + jitter, MAX_RETRY_DELAY_MS)
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    // Retry on rate limit (429), server errors (5xx)
    return error.status === 429 || (error.status >= 500 && error.status < 600)
  }
  // Retry on network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes("network") ||
           message.includes("timeout") ||
           message.includes("econnreset") ||
           message.includes("socket")
  }
  return false
}

/**
 * Get a configured Anthropic client
 */
export function getAnthropicClient(apiKey?: string): Anthropic {
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is not configured")
  }
  return new Anthropic({ apiKey: key })
}

/**
 * Create a message with automatic retries and rate limit handling
 */
export async function createMessage(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create(params)
      return response
    } catch (error) {
      lastError = error

      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        throw error
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= MAX_RETRIES) {
        console.error(`[AI] Max retries (${MAX_RETRIES}) exceeded`, error)
        throw error
      }

      // Calculate delay and wait
      const delay = getRetryDelay(attempt)
      console.warn(`[AI] Retryable error on attempt ${attempt + 1}, retrying in ${delay}ms`,
        error instanceof Anthropic.APIError ? `Status: ${error.status}` : error
      )
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Create a message with tools, with automatic retries
 */
export async function createMessageWithTools(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming & { tools: Anthropic.Tool[] }
): Promise<Anthropic.Message> {
  return createMessage(client, params)
}

/**
 * Extract text content from a message response
 */
export function extractText(message: Anthropic.Message): string {
  const textBlock = message.content.find(block => block.type === "text")
  return textBlock && textBlock.type === "text" ? textBlock.text : ""
}

/**
 * Handle Anthropic API errors and return appropriate HTTP response info
 */
export function getErrorResponse(error: unknown): { message: string; status: number } {
  if (error instanceof Anthropic.APIError) {
    switch (error.status) {
      case 401:
        return { message: "Invalid API key. Please check your ANTHROPIC_API_KEY.", status: 500 }
      case 429:
        return { message: "Rate limit exceeded. Please wait a moment and try again.", status: 429 }
      case 500:
      case 503:
        return { message: "Claude is temporarily unavailable. Please try again in a few moments.", status: 503 }
      default:
        return { message: `API error: ${error.message}`, status: error.status }
    }
  }

  if (error instanceof Error) {
    return { message: error.message, status: 500 }
  }

  return { message: "An unexpected error occurred", status: 500 }
}
