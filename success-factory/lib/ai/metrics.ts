/**
 * AI Metrics & Cost Tracking
 *
 * Tracks token usage, costs, and performance metrics.
 */

import { MODELS, estimateCost } from "./models"

// Metrics storage (in-memory, can upgrade to analytics service)
interface AICallMetric {
  timestamp: number
  taskType: string
  modelId: string
  modelKey: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  cached: boolean
  fallbackUsed: boolean
  estimatedCost: number
  success: boolean
  error?: string
}

const metrics: AICallMetric[] = []
const MAX_METRICS_STORED = 10000 // Keep last 10k calls

// Aggregated stats
let totalCalls = 0
let totalInputTokens = 0
let totalOutputTokens = 0
let totalCost = 0
let totalLatencyMs = 0
let cacheHits = 0
let fallbacksUsed = 0
let errors = 0

/**
 * Track an AI call
 */
export function trackAICall(metric: Omit<AICallMetric, "timestamp">): void {
  const fullMetric: AICallMetric = {
    ...metric,
    timestamp: Date.now(),
  }

  // Update aggregates
  totalCalls++
  totalInputTokens += metric.inputTokens
  totalOutputTokens += metric.outputTokens
  totalCost += metric.estimatedCost
  totalLatencyMs += metric.latencyMs
  if (metric.cached) cacheHits++
  if (metric.fallbackUsed) fallbacksUsed++
  if (!metric.success) errors++

  // Store metric
  metrics.push(fullMetric)
  if (metrics.length > MAX_METRICS_STORED) {
    metrics.shift() // Remove oldest
  }

  // Log for visibility
  const costStr = metric.estimatedCost.toFixed(6)
  const cacheStr = metric.cached ? " [CACHED]" : ""
  const fallbackStr = metric.fallbackUsed ? " [FALLBACK]" : ""
  console.log(
    `[AI Metrics] ${metric.taskType} | ${metric.modelKey} | ` +
      `${metric.inputTokens}+${metric.outputTokens} tokens | ` +
      `$${costStr} | ${metric.latencyMs}ms${cacheStr}${fallbackStr}`
  )
}

/**
 * Create a metric tracker for a request
 */
export function createMetricTracker(taskType: string, modelKey: string) {
  const startTime = Date.now()

  return {
    complete(result: {
      inputTokens: number
      outputTokens: number
      cached?: boolean
      fallbackUsed?: boolean
      finalModelKey?: string
      success?: boolean
      error?: string
    }): void {
      const finalModelKey = result.finalModelKey || modelKey
      const model = MODELS[finalModelKey]
      const cost = estimateCost(
        finalModelKey,
        result.inputTokens,
        result.outputTokens
      )

      trackAICall({
        taskType,
        modelId: model?.id || "unknown",
        modelKey: finalModelKey,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: Date.now() - startTime,
        cached: result.cached || false,
        fallbackUsed: result.fallbackUsed || false,
        estimatedCost: cost,
        success: result.success !== false,
        error: result.error,
      })
    },
  }
}

/**
 * Get aggregated statistics
 */
export function getAggregateStats(): {
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  avgLatencyMs: number
  cacheHitRate: number
  fallbackRate: number
  errorRate: number
} {
  return {
    totalCalls,
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    avgLatencyMs: totalCalls > 0 ? totalLatencyMs / totalCalls : 0,
    cacheHitRate: totalCalls > 0 ? cacheHits / totalCalls : 0,
    fallbackRate: totalCalls > 0 ? fallbacksUsed / totalCalls : 0,
    errorRate: totalCalls > 0 ? errors / totalCalls : 0,
  }
}

/**
 * Get stats by model
 */
export function getStatsByModel(): Record<
  string,
  {
    calls: number
    tokens: number
    cost: number
    avgLatency: number
  }
> {
  const byModel: Record<
    string,
    { calls: number; tokens: number; cost: number; latency: number }
  > = {}

  for (const m of metrics) {
    if (!byModel[m.modelKey]) {
      byModel[m.modelKey] = { calls: 0, tokens: 0, cost: 0, latency: 0 }
    }
    byModel[m.modelKey].calls++
    byModel[m.modelKey].tokens += m.inputTokens + m.outputTokens
    byModel[m.modelKey].cost += m.estimatedCost
    byModel[m.modelKey].latency += m.latencyMs
  }

  const result: Record<
    string,
    { calls: number; tokens: number; cost: number; avgLatency: number }
  > = {}
  for (const [key, data] of Object.entries(byModel)) {
    result[key] = {
      calls: data.calls,
      tokens: data.tokens,
      cost: data.cost,
      avgLatency: data.calls > 0 ? data.latency / data.calls : 0,
    }
  }

  return result
}

/**
 * Get stats by task type
 */
export function getStatsByTask(): Record<
  string,
  {
    calls: number
    tokens: number
    cost: number
    avgLatency: number
    cacheHitRate: number
  }
> {
  const byTask: Record<
    string,
    {
      calls: number
      tokens: number
      cost: number
      latency: number
      cacheHits: number
    }
  > = {}

  for (const m of metrics) {
    if (!byTask[m.taskType]) {
      byTask[m.taskType] = {
        calls: 0,
        tokens: 0,
        cost: 0,
        latency: 0,
        cacheHits: 0,
      }
    }
    byTask[m.taskType].calls++
    byTask[m.taskType].tokens += m.inputTokens + m.outputTokens
    byTask[m.taskType].cost += m.estimatedCost
    byTask[m.taskType].latency += m.latencyMs
    if (m.cached) byTask[m.taskType].cacheHits++
  }

  const result: Record<
    string,
    {
      calls: number
      tokens: number
      cost: number
      avgLatency: number
      cacheHitRate: number
    }
  > = {}
  for (const [key, data] of Object.entries(byTask)) {
    result[key] = {
      calls: data.calls,
      tokens: data.tokens,
      cost: data.cost,
      avgLatency: data.calls > 0 ? data.latency / data.calls : 0,
      cacheHitRate: data.calls > 0 ? data.cacheHits / data.calls : 0,
    }
  }

  return result
}

/**
 * Get recent metrics
 */
export function getRecentMetrics(limit = 100): AICallMetric[] {
  return metrics.slice(-limit)
}

/**
 * Get cost breakdown for time period
 */
export function getCostBreakdown(
  sinceMs: number = 24 * 60 * 60 * 1000
): {
  total: number
  byModel: Record<string, number>
  byTask: Record<string, number>
  savedByCaching: number
} {
  const cutoff = Date.now() - sinceMs
  const recent = metrics.filter((m) => m.timestamp >= cutoff)

  const byModel: Record<string, number> = {}
  const byTask: Record<string, number> = {}
  let total = 0
  let savedByCaching = 0

  for (const m of recent) {
    total += m.estimatedCost
    byModel[m.modelKey] = (byModel[m.modelKey] || 0) + m.estimatedCost
    byTask[m.taskType] = (byTask[m.taskType] || 0) + m.estimatedCost

    // Estimate savings from caching
    if (m.cached) {
      savedByCaching += m.estimatedCost // Would have cost this much
    }
  }

  return { total, byModel, byTask, savedByCaching }
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
  metrics.length = 0
  totalCalls = 0
  totalInputTokens = 0
  totalOutputTokens = 0
  totalCost = 0
  totalLatencyMs = 0
  cacheHits = 0
  fallbacksUsed = 0
  errors = 0
}
