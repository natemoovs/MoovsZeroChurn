# Codebase Audit & Remediation Plan

**Audit Date:** January 24, 2026
**Repository:** MoovsZeroChurn/success-factory

---

## Executive Summary

This document outlines findings from a comprehensive audit covering security vulnerabilities, performance inefficiencies, and mobile formatting issues. The audit identified **3 critical security issues**, **6 high-severity issues**, and numerous medium/low priority items requiring attention.

---

## Table of Contents

1. [Security Issues](#1-security-issues)
2. [Efficiency Issues](#2-efficiency-issues)
3. [Mobile Formatting Issues](#3-mobile-formatting-issues)
4. [Implementation Phases](#4-implementation-phases)
5. [Progress Tracking](#5-progress-tracking)

---

## 1. Security Issues

### 1.1 CRITICAL: Missing Authentication on API Routes

**Status:** [x] Partial - 17 routes protected (6 initial + 11 additional), ~70 remaining

**Problem:** 89 of 91 API routes have no authentication checks. Anyone can access customer data, financial information, and perform CRUD operations.

**Affected Files:**
- `app/api/customer/[id]/route.ts` - Exposes financial data, Stripe IDs
- `app/api/customer/search/route.ts` - Allows customer enumeration
- `app/api/campaigns/route.ts` - No auth on campaign data
- `app/api/tasks/route.ts` - CRUD without auth
- `app/api/tasks/[id]/route.ts` - Delete without auth
- `app/api/nps/route.ts` - Exposes survey responses
- `app/api/companies/route.ts` - Full company list exposed
- `app/api/cohorts/route.ts` - Business intelligence data
- `app/api/dashboard/route.ts` - Dashboard metrics
- `app/api/engagement/route.ts` - Engagement data
- *(85+ more routes)*

**Solution:**
```typescript
// Create middleware: lib/auth/api-middleware.ts
import { getCurrentUser } from "@/lib/auth/server"
import { NextResponse } from "next/server"

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return user
}

// Usage in each route:
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  // ... rest of handler
}
```

**Effort:** Medium (2-3 hours to implement middleware + apply to all routes)

---

### 1.2 CRITICAL: SQL Injection Risk in Metabase Queries

**Status:** [x] COMPLETED

**Problem:** String interpolation used in SQL queries with database-sourced values.

**Affected Files:**
- `app/api/customer/[id]/route.ts:68-79` - operatorId interpolation
- `app/api/customer/[id]/route.ts:99-110` - operatorId interpolation
- `app/api/customer/[id]/route.ts:161-173` - stripeAccountId interpolation

**Current Code:**
```typescript
// VULNERABLE - Line 78
const reservationSql = `
  ...WHERE OPERATOR_ID = '${company.operatorId}'
`
```

**Solution:**
```typescript
// Use parameterized queries or validate/escape values
const sanitizedOperatorId = company.operatorId?.replace(/[^a-zA-Z0-9-_]/g, '')
if (!sanitizedOperatorId) throw new Error("Invalid operator ID")

// Or use Metabase's native parameterization if available
```

**Effort:** Low (1 hour)

---

### 1.3 CRITICAL: Missing Slack Signature Verification

**Status:** [x] COMPLETED

**Problem:** `SLACK_SIGNING_SECRET` is defined but never used to verify requests.

**Affected File:** `app/api/slack/commands/route.ts`

**Current Code:**
```typescript
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET // Never used!

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  // No verification - anyone can call this endpoint
```

**Solution:**
```typescript
import crypto from 'crypto'

function verifySlackSignature(request: NextRequest, body: string): boolean {
  const signature = request.headers.get('x-slack-signature')
  const timestamp = request.headers.get('x-slack-request-timestamp')

  if (!signature || !timestamp || !SLACK_SIGNING_SECRET) return false

  // Check timestamp is within 5 minutes
  const time = Math.floor(Date.now() / 1000)
  if (Math.abs(time - parseInt(timestamp)) > 300) return false

  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', SLACK_SIGNING_SECRET)
    .update(sigBasestring)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  )
}
```

**Effort:** Low (30 minutes)

---

### 1.4 HIGH: Weak Password Authentication

**Status:** [ ] Not Started

**Problem:** Password stored in cookie, no rate limiting, no hashing.

**Affected File:** `app/api/login/route.ts:14`

**Issues:**
1. Cookie stores the actual password value
2. No rate limiting on attempts
3. No account lockout

**Solution:**
```typescript
// 1. Use session token instead of password in cookie
import { randomBytes } from 'crypto'

const sessionToken = randomBytes(32).toString('hex')
// Store session in database or Redis, set token in cookie

// 2. Add rate limiting
import { Ratelimit } from "@upstash/ratelimit"
const ratelimit = new Ratelimit({
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 attempts per minute
})
```

**Effort:** Medium (2 hours)

---

### 1.5 HIGH: Sensitive Data in Logs

**Status:** [ ] Not Started

**Problem:** Customer data, financial info, and errors logged to console.

**Affected Files:**
- `app/api/customer/[id]/route.ts:94,143,153,192,304`
- `app/api/slack/commands/route.ts:44,81`
- `app/api/sync/hubspot/route.ts:84-85` - Logs sample row data

**Solution:**
```typescript
// Create sanitized logger: lib/logger.ts
export function logError(context: string, error: unknown) {
  const sanitized = {
    context,
    message: error instanceof Error ? error.message : 'Unknown error',
    // Never log: customer IDs, financial data, API keys
  }
  console.error(JSON.stringify(sanitized))
}
```

**Effort:** Low (1 hour)

---

### 1.6 HIGH: No Rate Limiting

**Status:** [ ] Not Started

**Problem:** Zero rate limiting on any endpoint. Vulnerable to brute force and enumeration.

**Critical Endpoints:**
- `/api/login` - Password brute force
- `/api/customer/search` - Customer enumeration
- `/api/slack/commands` - Abuse potential

**Solution:**
```typescript
// Install: npm install @upstash/ratelimit @upstash/redis
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
})

// In API route:
const ip = request.ip ?? "127.0.0.1"
const { success } = await ratelimit.limit(ip)
if (!success) {
  return NextResponse.json({ error: "Rate limited" }, { status: 429 })
}
```

**Effort:** Medium (2-3 hours)

---

### 1.7 MEDIUM: Insecure CRON_SECRET Logic

**Status:** [x] COMPLETED

**Problem:** If `CRON_SECRET` is not set, authentication is bypassed entirely.

**Affected Files:**
- `app/api/alerts/digest/route.ts:23-28`
- `app/api/sync/hubspot/route.ts:519-524`
- `app/api/agents/health-monitor/route.ts`
- `app/api/agents/payment-recovery/route.ts`
- `app/api/agents/renewal-risk/route.ts`
- `app/api/agents/win-back/route.ts`
- `app/api/health-history/snapshot/route.ts`

**Current Code:**
```typescript
// FLAWED - allows bypass if CRON_SECRET not set
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

**Solution:**
```typescript
// CORRECT - deny if secret not configured OR doesn't match
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

**Effort:** Low (30 minutes)

---

### 1.8 MEDIUM: Missing Input Validation

**Status:** [x] COMPLETED

**Problem:** User-controlled parameters used directly in queries.

**Affected Files:**
- `app/api/companies/route.ts:14-17` - `sortBy` used in orderBy
- `app/api/nps/route.ts:14-16` - `days` parameter unbounded

**Solution:**
```typescript
// Whitelist allowed sort fields
const ALLOWED_SORT_FIELDS = ['name', 'mrr', 'healthScore', 'createdAt']
const sortBy = ALLOWED_SORT_FIELDS.includes(rawSortBy) ? rawSortBy : 'name'

// Validate numeric parameters
const days = Math.min(Math.max(parseInt(rawDays) || 90, 1), 365)
```

**Effort:** Low (1 hour)

---

## 2. Efficiency Issues

### 2.1 CRITICAL: Unbounded Database Queries

**Status:** [ ] Not Started

**Problem:** Multiple endpoints fetch ALL records without pagination.

**Affected Files:**
- `app/api/dashboard/route.ts:130` - All companies for dashboard
- `app/api/engagement/route.ts:209` - All companies for engagement
- `app/api/cohorts/route.ts:27-38` - All companies for cohorts
- `app/api/leaderboard/route.ts:19-61` - All tasks + companies

**Solution:**
```typescript
// Add cursor-based pagination
const pageSize = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
const cursor = searchParams.get("cursor")

const companies = await prisma.hubSpotCompany.findMany({
  take: pageSize + 1, // Fetch one extra to check if more exist
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { id: 'asc' },
})

const hasMore = companies.length > pageSize
const nextCursor = hasMore ? companies[pageSize - 1].id : null
```

**Effort:** Medium (3-4 hours)

---

### 2.2 HIGH: N+1 Query Pattern

**Status:** [ ] Not Started

**Problem:** Client-side lookups in loops creating O(n*m) complexity.

**Affected File:** `app/api/leaderboard/route.ts:62-71`

**Current Code:**
```typescript
// O(n) loop with O(m) lookup inside = O(n*m)
const leaderboardData = tasks.map((task) => {
  const company = companies.find((c) => c.hubspotId === task.companyId) // O(m) each time
})
```

**Solution:**
```typescript
// Create lookup map first - O(m)
const companyMap = new Map(companies.map(c => [c.hubspotId, c]))

// Then O(1) lookups - total O(n+m)
const leaderboardData = tasks.map((task) => {
  const company = companyMap.get(task.companyId)
})
```

**Effort:** Low (30 minutes)

---

### 2.3 HIGH: Missing React Performance Optimizations

**Status:** [ ] Not Started

**Problem:** List items rerender unnecessarily, no virtualization.

**Affected Files:**
- `app/(dashboard)/accounts/page.tsx:165` - AccountCard not memoized
- `app/(dashboard)/predictions/page.tsx:274` - 100+ items without virtualization
- `app/(dashboard)/tasks/page.tsx:521` - TaskRow not memoized

**Solution:**
```typescript
// Memoize list items
const AccountCard = React.memo(function AccountCard({ company }: Props) {
  // ... component
})

// Add virtualization for long lists
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72,
})
```

**Effort:** Medium (2-3 hours)

---

### 2.4 MEDIUM: Overfetching Data

**Status:** [ ] Not Started

**Problem:** Queries select all fields when only a few are needed.

**Affected Files:**
- `app/api/expansion/detect/route.ts:156` - Fetches 30+ fields, needs 5
- `app/api/predictions/route.ts:78-90` - Full company objects

**Solution:**
```typescript
// Add explicit select
const companies = await prisma.hubSpotCompany.findMany({
  select: {
    hubspotId: true,
    name: true,
    mrr: true,
    healthScore: true,
    // Only fields actually used
  }
})
```

**Effort:** Low (1 hour)

---

### 2.5 MEDIUM: Missing Database Indexes

**Status:** [ ] Not Started

**Problem:** Common query patterns lack composite indexes.

**Affected File:** `prisma/schema.prisma`

**Recommended Indexes:**
```prisma
model HubSpotCompany {
  // ... fields

  @@index([healthScore, mrr])           // Dashboard filtering
  @@index([customerSegment, mrr])       // Segment analysis
  @@index([createdAt, healthScore])     // Cohort queries
}

model Task {
  @@index([status, dueDate])            // Task list filtering
  @@index([companyId, status])          // Company task lookup
}
```

**Effort:** Low (30 minutes + migration)

---

## 3. Mobile Formatting Issues

### 3.1 CRITICAL: AI Chat Not Mobile Responsive

**Status:** [ ] Not Started

**Problem:** Fixed dimensions exceed mobile screen width.

**Affected File:** `components/ai-chat.tsx:196`

**Current Code:**
```typescript
className="... w-[420px] h-[600px] ..."
```

**Solution:**
```typescript
className="... w-full sm:w-[420px] h-[80vh] sm:h-[600px] max-h-[calc(100vh-120px)] ..."

// Also fix positioning for mobile:
// Current: "fixed bottom-6 right-6"
// Change to: "fixed bottom-0 right-0 sm:bottom-6 sm:right-6"

// Make full-screen on mobile:
className={cn(
  "fixed z-50",
  "bottom-0 right-0 sm:bottom-6 sm:right-6",
  "w-full h-full sm:w-[420px] sm:h-[600px] sm:rounded-2xl",
  // ...
)}
```

**Effort:** Low (1 hour)

---

### 3.2 CRITICAL: Keyboard-Only Task Shortcuts

**Status:** [ ] Not Started

**Problem:** Task management relies on keyboard shortcuts (j/k/x/c/enter) with no touch alternatives.

**Affected File:** `app/(dashboard)/tasks/page.tsx:108-151`

**Solution:**
```typescript
// Add swipe gestures or touch buttons
// Option 1: Add action buttons visible on mobile
<div className="flex sm:hidden gap-2">
  <Button size="sm" onClick={() => handleComplete(task.id)}>
    <Check className="h-4 w-4" />
  </Button>
  <Button size="sm" variant="ghost" onClick={() => handleDelete(task.id)}>
    <Trash className="h-4 w-4" />
  </Button>
</div>

// Option 2: Use react-swipeable for swipe actions
import { useSwipeable } from 'react-swipeable'
```

**Effort:** Medium (2 hours)

---

### 3.3 HIGH: Cohort Table Horizontal Scroll

**Status:** [ ] Not Started

**Problem:** Table has minimum width that forces scrolling on mobile.

**Affected File:** `app/(dashboard)/cohorts/page.tsx:381`

**Solution:**
```typescript
// Option 1: Card layout on mobile
<div className="hidden sm:block">
  <Table>...</Table>
</div>
<div className="sm:hidden space-y-4">
  {cohorts.map(cohort => (
    <CohortCard key={cohort.cohort} data={cohort} />
  ))}
</div>

// Option 2: Responsive table with priority columns
<Table>
  <TableHeader>
    <TableHead>Cohort</TableHead>
    <TableHead>Retention</TableHead>
    <TableHead className="hidden sm:table-cell">Companies</TableHead>
    <TableHead className="hidden md:table-cell">MRR</TableHead>
  </TableHeader>
</Table>
```

**Effort:** Medium (1-2 hours)

---

### 3.4 MEDIUM: Small Touch Targets

**Status:** [ ] Not Started

**Problem:** Interactive elements smaller than 44px minimum.

**Affected Files:**
- `components/ai-chat.tsx:204` - Close button ~17px
- `components/sidebar.tsx` - Menu items may be small

**Solution:**
```typescript
// Ensure all interactive elements are at least 44x44px
<Button
  size="icon"
  className="h-11 w-11 min-h-[44px] min-w-[44px]"
>
  <X className="h-5 w-5" />
</Button>
```

**Effort:** Low (1 hour)

---

### 3.5 MEDIUM: AI Chat Functionality Broken

**Status:** [ ] Not Started

**Problem:** Chat feature doesn't actually work (noted by user).

**Affected File:** `components/ai-chat.tsx`

**Investigation Needed:**
- [ ] Check API endpoint `/api/ai/chat` exists and functions
- [ ] Verify Anthropic API key is configured
- [ ] Check for client-side errors in message handling
- [ ] Test streaming response handling

**Effort:** TBD (requires investigation)

---

### 3.6 LOW: Keyboard Hints on Touch Devices

**Status:** [ ] Not Started

**Problem:** Shows keyboard shortcuts (⌘⇧A) on touch-only devices.

**Affected File:** `components/ai-chat.tsx:310`

**Solution:**
```typescript
// Detect touch device and hide shortcuts
const isTouchDevice = 'ontouchstart' in window

{!isTouchDevice && (
  <span className="text-xs text-muted-foreground">⌘⇧A</span>
)}
```

**Effort:** Low (15 minutes)

---

## 4. Implementation Phases

### Phase 1: Critical Security (Week 1)
- [x] 1.1 Add authentication middleware to API routes (PARTIAL - 17 routes protected)
- [x] 1.2 Fix SQL injection in Metabase queries (DONE)
- [x] 1.3 Implement Slack signature verification (DONE)
- [x] 1.7 Fix CRON_SECRET logic (DONE - 8 routes fixed)
- [x] 1.8 Add input validation (DONE - sortBy whitelist, days bounds)

### Phase 2: High Security + Critical Performance (Week 2)
- [ ] 1.4 Improve password authentication
- [ ] 1.5 Sanitize logging
- [ ] 1.6 Add rate limiting
- [ ] 2.1 Add pagination to unbounded queries

### Phase 3: Performance Optimization (Week 3)
- [ ] 2.2 Fix N+1 query patterns
- [ ] 2.3 Add React.memo and virtualization
- [ ] 2.4 Optimize data fetching with selects
- [ ] 2.5 Add database indexes

### Phase 4: Mobile Experience (Week 4)
- [ ] 3.1 Make AI chat responsive
- [ ] 3.2 Add touch alternatives for task shortcuts
- [ ] 3.3 Fix cohort table for mobile
- [ ] 3.4 Increase touch target sizes
- [ ] 3.5 Fix AI chat functionality
- [ ] 3.6 Hide keyboard hints on touch devices

### Phase 5: Cleanup (Week 5)
- [ ] 1.8 Add input validation
- [ ] Code review of all changes
- [ ] Update documentation
- [ ] Security re-audit

---

## 5. Progress Tracking

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security | 3/3 | 0/3 | 2/2 | 0/0 | 5/8 |
| Efficiency | 0/1 | 0/2 | 0/2 | 0/0 | 0/5 |
| Mobile | 0/2 | 0/1 | 0/2 | 0/1 | 0/6 |
| **Total** | **3/6** | **0/6** | **2/6** | **0/1** | **5/19** |

### Completed Fixes (January 24, 2026)

1. **CRON_SECRET bypass** - Fixed in 8 API routes (agents/*, alerts/*, health-history, sync/hubspot)
2. **Slack signature verification** - Added HMAC-SHA256 verification with timing-safe comparison
3. **SQL injection in Metabase** - Added sanitizeIdForSql() helper for operatorId and stripeAccountId
4. **Authentication middleware** - Created reusable middleware, protected 17 critical routes:
   - Initial 6: customer/[id], customer/search, companies, tasks, dashboard, nps
   - Additional 11: activity, benchmarks, campaigns, churn, cohorts, engagement, expansion, forecasting, leaderboard, playbooks, roi
5. **Input validation** - Added sortBy whitelist for companies route, days bounds checking for nps route

### Files Modified
- `lib/auth/api-middleware.ts` (new)
- `app/api/customer/[id]/route.ts`
- `app/api/customer/search/route.ts`
- `app/api/companies/route.ts` (auth + input validation)
- `app/api/tasks/route.ts`
- `app/api/dashboard/route.ts`
- `app/api/nps/route.ts` (auth + input validation)
- `app/api/slack/commands/route.ts`
- `app/api/agents/*.ts` (5 files)
- `app/api/alerts/*.ts` (2 files)
- `app/api/health-history/snapshot/route.ts`
- `app/api/sync/hubspot/route.ts`
- `app/api/activity/route.ts` (auth added)
- `app/api/benchmarks/route.ts` (auth added)
- `app/api/campaigns/route.ts` (auth added)
- `app/api/churn/route.ts` (auth added)
- `app/api/cohorts/route.ts` (auth added)
- `app/api/engagement/route.ts` (auth added)
- `app/api/expansion/route.ts` (auth added)
- `app/api/forecasting/route.ts` (auth added)
- `app/api/leaderboard/route.ts` (auth added)
- `app/api/playbooks/route.ts` (auth added)
- `app/api/roi/route.ts` (auth added)

---

## Notes

- All time estimates assume familiarity with the codebase
- Security fixes should be deployed incrementally, not all at once
- Consider feature flags for major changes
- Test thoroughly in staging before production deployment
- Remaining API routes still need authentication (~70 routes)

---

*Last Updated: January 24, 2026*
