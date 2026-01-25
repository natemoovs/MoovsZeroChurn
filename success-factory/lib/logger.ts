/**
 * Sanitized Logger
 *
 * Provides safe logging that strips sensitive data.
 * Never logs: customer IDs, financial data, API keys, tokens, passwords
 */

// Patterns that indicate sensitive data
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /bearer/i,
  /authorization/i,
  /stripe/i,
  /hubspot/i,
  /notion/i,
  /slack/i,
  /acct_[a-zA-Z0-9]+/i, // Stripe account IDs
  /sk_[a-zA-Z0-9]+/i, // Stripe secret keys
  /pk_[a-zA-Z0-9]+/i, // Stripe public keys
]

// Fields to always redact
const REDACT_FIELDS = new Set([
  "password",
  "apiKey",
  "api_key",
  "token",
  "secret",
  "authorization",
  "stripeAccountId",
  "operatorId",
  "hubspotId",
  "email",
  "primaryContactEmail",
  "ownerEmail",
])

function isSensitive(key: string): boolean {
  if (REDACT_FIELDS.has(key)) return true
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value

  if (typeof value === "string") {
    // Check if string looks like sensitive data
    if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(value))) {
      return "[REDACTED]"
    }
    // Truncate long strings
    if (value.length > 100) {
      return value.slice(0, 100) + "...[truncated]"
    }
    return value
  }

  if (Array.isArray(value)) {
    // Truncate long arrays
    if (value.length > 10) {
      return [...value.slice(0, 10).map(sanitizeValue), `...(${value.length - 10} more)`]
    }
    return value.map(sanitizeValue)
  }

  if (typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>)
  }

  return value
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitive(key)) {
      result[key] = "[REDACTED]"
    } else {
      result[key] = sanitizeValue(value)
    }
  }

  return result
}

interface LogContext {
  [key: string]: unknown
}

/**
 * Log an error with sanitized context
 */
export function logError(context: string, error: unknown, data?: LogContext): void {
  const sanitized = {
    context,
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack?.split("\n").slice(0, 3).join("\n") : undefined,
    ...(data ? { data: sanitizeObject(data) } : {}),
  }
  console.error(JSON.stringify(sanitized))
}

/**
 * Log a warning with sanitized context
 */
export function logWarn(context: string, message: string, data?: LogContext): void {
  const sanitized = {
    context,
    timestamp: new Date().toISOString(),
    message,
    ...(data ? { data: sanitizeObject(data) } : {}),
  }
  console.warn(JSON.stringify(sanitized))
}

/**
 * Log info with sanitized context
 */
export function logInfo(context: string, message: string, data?: LogContext): void {
  const sanitized = {
    context,
    timestamp: new Date().toISOString(),
    message,
    ...(data ? { data: sanitizeObject(data) } : {}),
  }
  console.log(JSON.stringify(sanitized))
}

/**
 * Create a scoped logger for a specific context
 */
export function createLogger(context: string) {
  return {
    error: (error: unknown, data?: LogContext) => logError(context, error, data),
    warn: (message: string, data?: LogContext) => logWarn(context, message, data),
    info: (message: string, data?: LogContext) => logInfo(context, message, data),
  }
}
