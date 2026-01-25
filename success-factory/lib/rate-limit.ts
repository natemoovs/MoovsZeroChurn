/**
 * In-Memory Rate Limiter
 *
 * Simple sliding window rate limiter for API routes.
 * Uses in-memory storage (cleared on restart).
 *
 * For production, consider using Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store
const store = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 60000) // Clean every minute

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window size in seconds */
  windowSec: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSec * 1000
  const key = `${identifier}`

  let entry = store.get(key)

  // If no entry or window expired, create new one
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    }
    store.set(key, entry)
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: entry.resetAt,
    }
  }

  // Increment count
  entry.count++

  // Check if over limit
  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetAt,
    }
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.resetAt,
  }
}

/**
 * Create a rate limiter with preset configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  return {
    check: (identifier: string) => checkRateLimit(identifier, config),
    config,
  }
}

// Preset rate limiters for common use cases
export const rateLimiters = {
  /** Login attempts: 5 per minute */
  login: createRateLimiter({ limit: 5, windowSec: 60 }),

  /** API requests: 100 per minute */
  api: createRateLimiter({ limit: 100, windowSec: 60 }),

  /** Search endpoints: 30 per minute */
  search: createRateLimiter({ limit: 30, windowSec: 60 }),

  /** Strict: 10 per minute (for sensitive operations) */
  strict: createRateLimiter({ limit: 10, windowSec: 60 }),
}

/**
 * Get client IP from request
 */
export function getClientIp(request: Request): string {
  // Check common headers for proxied requests
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback
  return '127.0.0.1'
}
