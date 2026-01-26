/**
 * AI Response Cache
 *
 * Caches AI responses to reduce costs and latency.
 * Uses in-memory cache with TTL (can be upgraded to Redis/Vercel KV).
 */

import { createHash } from "crypto"

// Cache configuration per task type
export interface CacheConfig {
  ttlSeconds: number
  enabled: boolean
}

// Task-specific cache settings
const CACHE_SETTINGS: Record<string, CacheConfig> = {
  // Long TTL - rarely changes
  "health-explain": { ttlSeconds: 3600, enabled: true }, // 1 hour
  "portfolio-summary": { ttlSeconds: 1800, enabled: true }, // 30 min

  // Medium TTL - changes daily
  "meeting-prep": { ttlSeconds: 7200, enabled: true }, // 2 hours
  "qbr-prep": { ttlSeconds: 14400, enabled: true }, // 4 hours

  // Short TTL - semi-dynamic
  "outreach-suggestions": { ttlSeconds: 900, enabled: true }, // 15 min
  "task-summary": { ttlSeconds: 600, enabled: true }, // 10 min

  // No cache - always fresh
  "churn-prediction": { ttlSeconds: 0, enabled: false },
  chat: { ttlSeconds: 0, enabled: false },
  "save-playbook": { ttlSeconds: 0, enabled: false },
  general: { ttlSeconds: 0, enabled: false },
}

// In-memory cache store
interface CacheEntry<T> {
  value: T
  expiresAt: number
  taskType: string
  modelId: string
}

const cache = new Map<string, CacheEntry<unknown>>()

// Cache stats for monitoring
let cacheHits = 0
let cacheMisses = 0

/**
 * Generate cache key from task type and input
 */
export function generateCacheKey(
  taskType: string,
  input: Record<string, unknown>,
  modelId: string
): string {
  // Extract relevant fields for caching (exclude timestamps, etc.)
  const relevantInput = extractCacheableFields(taskType, input)
  const inputHash = createHash("sha256")
    .update(JSON.stringify(relevantInput))
    .digest("hex")
    .slice(0, 16)

  return `ai:${taskType}:${modelId}:${inputHash}`
}

/**
 * Extract fields relevant for caching (exclude volatile data)
 */
function extractCacheableFields(
  taskType: string,
  input: Record<string, unknown>
): Record<string, unknown> {
  // Fields to always exclude (volatile)
  const excludeFields = ["timestamp", "requestId", "sessionId", "nonce"]

  // Task-specific cacheable fields
  const taskCacheFields: Record<string, string[]> = {
    "health-explain": ["companyId", "healthScore", "riskSignals"],
    "meeting-prep": ["companyId", "meetingType"],
    "qbr-prep": ["companyId"],
    "outreach-suggestions": ["csmEmail", "segment"],
    "portfolio-summary": ["segment", "healthFilter"],
  }

  const specificFields = taskCacheFields[taskType]
  if (specificFields) {
    const filtered: Record<string, unknown> = {}
    for (const field of specificFields) {
      if (input[field] !== undefined) {
        filtered[field] = input[field]
      }
    }
    return filtered
  }

  // Default: include all except excluded fields
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (!excludeFields.includes(key)) {
      filtered[key] = value
    }
  }
  return filtered
}

/**
 * Get cached response if available
 */
export function getCached<T>(
  taskType: string,
  input: Record<string, unknown>,
  modelId: string
): T | null {
  const config = CACHE_SETTINGS[taskType]
  if (!config?.enabled) {
    return null
  }

  const key = generateCacheKey(taskType, input, modelId)
  const entry = cache.get(key) as CacheEntry<T> | undefined

  if (!entry) {
    cacheMisses++
    return null
  }

  // Check expiration
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    cacheMisses++
    return null
  }

  cacheHits++
  console.log(`[AI Cache] HIT for ${taskType} (key: ${key.slice(0, 20)}...)`)
  return entry.value
}

/**
 * Store response in cache
 */
export function setCache<T>(
  taskType: string,
  input: Record<string, unknown>,
  modelId: string,
  value: T
): void {
  const config = CACHE_SETTINGS[taskType]
  if (!config?.enabled || config.ttlSeconds === 0) {
    return
  }

  const key = generateCacheKey(taskType, input, modelId)
  const entry: CacheEntry<T> = {
    value,
    expiresAt: Date.now() + config.ttlSeconds * 1000,
    taskType,
    modelId,
  }

  cache.set(key, entry)
  console.log(
    `[AI Cache] SET for ${taskType} (TTL: ${config.ttlSeconds}s, key: ${key.slice(0, 20)}...)`
  )
}

/**
 * Invalidate cache for a specific entity
 */
export function invalidateCache(
  taskType?: string,
  companyId?: string
): number {
  let deleted = 0

  for (const [key, entry] of cache.entries()) {
    const shouldDelete =
      (!taskType || entry.taskType === taskType) &&
      (!companyId || key.includes(companyId))

    if (shouldDelete) {
      cache.delete(key)
      deleted++
    }
  }

  if (deleted > 0) {
    console.log(
      `[AI Cache] Invalidated ${deleted} entries (task: ${taskType || "all"}, company: ${companyId || "all"})`
    )
  }

  return deleted
}

/**
 * Clear expired entries (run periodically)
 */
export function clearExpired(): number {
  const now = Date.now()
  let cleared = 0

  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key)
      cleared++
    }
  }

  return cleared
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  entries: number
  hits: number
  misses: number
  hitRate: number
  byTaskType: Record<string, number>
} {
  const byTaskType: Record<string, number> = {}
  for (const entry of cache.values()) {
    byTaskType[entry.taskType] = (byTaskType[entry.taskType] || 0) + 1
  }

  const total = cacheHits + cacheMisses
  return {
    entries: cache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? cacheHits / total : 0,
    byTaskType,
  }
}

/**
 * Check if task type is cacheable
 */
export function isCacheable(taskType: string): boolean {
  const config = CACHE_SETTINGS[taskType]
  return config?.enabled ?? false
}

/**
 * Get TTL for task type
 */
export function getTTL(taskType: string): number {
  return CACHE_SETTINGS[taskType]?.ttlSeconds ?? 0
}

// Periodic cleanup (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const cleared = clearExpired()
      if (cleared > 0) {
        console.log(`[AI Cache] Cleared ${cleared} expired entries`)
      }
    },
    5 * 60 * 1000
  )
}
