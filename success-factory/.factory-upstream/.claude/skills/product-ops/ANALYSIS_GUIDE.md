# Product Operations Analysis Guide

This guide provides frameworks for analyzing Moovs product operations data. Each section corresponds to a report type and includes the queries to run, metrics to calculate, and insights to surface.

## Database Reference

**Moovs Tickets Database ID:** `13b8aeaa-3759-80f8-8d7c-dd2f627d2578`

Use the `mcp__notion__API-query-data-source` tool with filters to fetch relevant data.

---

## 1. Pipeline Health Analysis

### Purpose
Understand where work is flowing and where it's stuck.

### Query Strategy
Fetch all tickets, then group by Stage:

```
Stages (in order):
1. Backlog
2. Not started
3. Problem Validation
4. Product Design / Work
5. UI Design
6. Ready for dev
7. Eng Design
8. In Development
9. QA
10. Code Review
11. Deployed / Done
12. Blocked
```

### Metrics to Calculate

| Metric | Formula | Healthy Range |
|--------|---------|---------------|
| **Backlog Size** | Count where Stage = Backlog | < 50 |
| **In-Flight** | Count where Stage in [Ready for dev, In Development, QA, Code Review] | 5-15 |
| **Blocked Rate** | Blocked / Total In-Flight | < 10% |
| **WIP per Engineer** | In Development / # Engineers | 1-2 |
| **Validation Queue** | Problem Validation + Product Design | Context dependent |

### Red Flags to Surface

1. **Blocked items > 3 days** - Something is wrong
2. **WIP > 3 per person** - Context switching will kill velocity
3. **Backlog > 100** - Need to say no more or archive old items
4. **Ready for dev > 10** - Shaped work sitting idle
5. **QA items > 5** - Bottleneck, need to prioritize reviews

### Output Format

```markdown
## Pipeline Health Report - [Date]

### Summary
- **Total Active Tickets:** X
- **Flow Efficiency:** X% (items moving vs stuck)
- **Primary Bottleneck:** [Stage with highest count]

### Stage Distribution
| Stage | Count | Avg Days in Stage |
|-------|-------|-------------------|
| ... | ... | ... |

### Blocked Items (Immediate Attention)
1. [DOOM-XXX] Title - Blocked for X days
   - Reason: [if known]
   - Assigned: [person]

### Recommendations
1. ...
2. ...
```

---

## 2. Betting Table Prep Analysis

### Purpose
Prepare the CEO and leadership for the betting table meeting by identifying what's ready to bet on and what's not.

### Query Strategy

1. **Ready to Bet:** Stage = "Ready for dev" AND Status != "Done"
2. **Almost Ready:** Stage = "Product Design / Work" or "UI Design"
3. **High Priority Not Started:** Priority = High AND Stage in [Backlog, Not started, Problem Validation]
4. **Blocked Bets:** Stage = "Blocked"

### Metrics to Calculate

| Metric | Purpose |
|--------|---------|
| **Bet-Ready Count** | How many items can we actually bet on? |
| **Appetite Distribution** | How many small batch vs big batch? |
| **Priority Mix** | Are we betting on the right things? |
| **Customer Commitment Items** | Items tagged with specific customers |

### Decision Framework

For each bet-ready item, assess:

1. **Appetite Fit** - Is this a 3-day or 3-week project?
2. **Priority Score** - What's the calculated priority?
3. **Customer Impact** - Who benefits and how much?
4. **Dependencies** - Is this blocked on anything else?
5. **Strategic Alignment** - Does this move the needle on company goals?

### Output Format

```markdown
## Betting Table Prep - [Date]

### Ready to Bet (X items)

#### Big Batch Candidates (3-week projects)
| ID | Name | Priority | Customer Impact | Notes |
|----|------|----------|-----------------|-------|
| DOOM-XXX | ... | High | 8/10 | Enterprise commitment |

#### Small Batch Candidates (3-5 day projects)
| ID | Name | Priority | Customer Impact | Notes |
|----|------|----------|-----------------|-------|
| DOOM-XXX | ... | Medium | 5/10 | Quick win |

### Not Yet Ready (but should be discussed)
- [DOOM-XXX] High priority, stuck in Problem Validation
- [DOOM-XXX] Enterprise commitment, needs shaping

### Blocked (need unblocking before betting)
- [DOOM-XXX] Blocked on: [reason]

### Recommended Bets for Next Cycle
Based on priority, customer impact, and strategic alignment:
1. [DOOM-XXX] - [Rationale]
2. [DOOM-XXX] - [Rationale]
3. [DOOM-XXX] - [Rationale]

### Items to Explicitly NOT Bet On (and why)
1. [DOOM-XXX] - Not shaped enough
2. [DOOM-XXX] - Low impact, can wait
```

---

## 3. Commitment Tracker Analysis

### Purpose
Ensure we're honoring commitments to customers, especially enterprise clients.

### Query Strategy

1. **Has Due Date:** Due Date is not empty
2. **Enterprise Tagged:** Tags contains "Enterprise" or Type contains "Enterprise"
3. **Customer-Specific:** Look for customer names in Tags or Description
4. **Overdue:** Due Date < Today AND Status != Done

### Key Customers to Track
- DPV
- Roberts Hawaii
- Carey Transportation
- Cornell University
- Any item tagged "Enterprise"

### Risk Assessment Framework

| Risk Level | Criteria |
|------------|----------|
| **Critical** | Due in < 7 days, not in development |
| **High** | Due in < 14 days, still in design |
| **Medium** | Due in < 30 days, in backlog |
| **Low** | Due in 30+ days, on track |

### Output Format

```markdown
## Commitment Tracker - [Date]

### Critical Risk (Action Required)
| ID | Name | Customer | Due Date | Current Stage | Gap |
|----|------|----------|----------|---------------|-----|
| DOOM-XXX | ... | DPV | Jan 15 | Problem Validation | Needs immediate shaping |

### High Risk
...

### On Track
| ID | Name | Customer | Due Date | Current Stage |
|----|------|----------|----------|---------------|
| DOOM-XXX | ... | Roberts | Feb 1 | In Development |

### Overdue Items
| ID | Name | Customer | Due Date | Days Overdue | Status |
|----|------|----------|----------|--------------|--------|
| DOOM-XXX | ... | Cornell | Dec 15 | 21 | Stuck in QA |

### Recommended Actions
1. [DOOM-XXX] - Escalate to Chris immediately
2. [DOOM-XXX] - Communicate delay to customer
3. [DOOM-XXX] - Re-scope to hit deadline
```

---

## 4. Team Workload Analysis

### Purpose
Understand capacity and prevent burnout or imbalanced workloads.

### Query Strategy

1. Group all "In progress" tickets by Assigned To
2. Count tickets per person by Type (Bug vs Feature)
3. Identify unassigned high-priority items

### Healthy Workload Benchmarks

| Role | Max Concurrent Items | Notes |
|------|---------------------|-------|
| Engineer | 2-3 | More = context switching |
| Product | 5-8 | Shaping can be parallel |
| Support | 10+ | Triage is different |

### Output Format

```markdown
## Team Workload - [Date]

### Current Assignments

| Person | In Progress | In Dev | In Design | Bugs | Features |
|--------|-------------|--------|-----------|------|----------|
| Chris | 3 | 2 | 1 | 1 | 2 |
| [Name] | ... | ... | ... | ... | ... |

### Capacity Alerts
- **Chris:** 3 items in development (at capacity)
- **[Name]:** 5 items assigned (overloaded)

### Unassigned High Priority
| ID | Name | Priority | Stage | Days Unassigned |
|----|------|----------|-------|-----------------|
| DOOM-XXX | ... | High | Ready for dev | 5 |

### Team Distribution by Type
- Bugs: X items (Y%)
- Features: X items (Y%)
- Requests: X items (Y%)

### Recommendations
1. Reassign [DOOM-XXX] to [Person] who has capacity
2. [Person] is overloaded - need to re-prioritize
```

---

## 5. Strategic Insights Analysis

### Purpose
High-level health check on product development patterns.

### Metrics to Calculate

#### Type Distribution
```
Total Tickets: X
- Bugs: X (Y%)
- Features: X (Y%)
- Requests: X (Y%)
- Issues: X (Y%)
```

**Healthy Benchmark:** Bugs should be < 30% of active work

#### Priority Distribution
```
- High: X (Y%)
- Medium: X (Y%)
- Low: X (Y%)
```

**Red Flag:** If > 50% is "High priority," nothing is actually high priority

#### Customer Impact Analysis
```
Average Customer Impact Score: X/10
Items with Impact > 7: X
Items with Impact < 3: X (consider deprioritizing)
```

#### Aging Analysis
```
Items older than 30 days (not done): X
Items older than 90 days (not done): X
Oldest item: [DOOM-XXX] - X days old
```

#### Velocity (if tracking completed_at)
```
Completed last 7 days: X
Completed last 30 days: X
Average days to complete: X
```

### Output Format

```markdown
## Strategic Insights - [Date]

### Product Health Score: [Good/Warning/Critical]

### Key Metrics
| Metric | Value | Status |
|--------|-------|--------|
| Bug Ratio | 25% | Good |
| High Priority Ratio | 60% | Warning |
| Avg Customer Impact | 6.2/10 | Good |
| Blocked Items | 3 | Warning |

### Concerning Patterns
1. **Priority Inflation:** 60% of items are "High" - need recalibration
2. **Aging Backlog:** 15 items older than 90 days - archive or commit
3. **Bug Accumulation:** 5 new bugs in last week, only 2 fixed

### Positive Patterns
1. High customer impact items are getting priority
2. Velocity is consistent at ~8 items/week
3. Blocked rate is low at 5%

### Strategic Recommendations
1. Run priority recalibration - too many "High" items
2. Archive items older than 90 days that aren't enterprise commitments
3. Dedicate 1 day of cool-down to bug bash
```

---

## 6. Executive Summary Analysis

### Purpose
Give the CEO a 2-minute pulse on product operations.

### Formula
Combine the top insights from each other report:

1. **One Sentence State:** "Product is [healthy/strained/at risk]"
2. **Top 3 Numbers:** Pick the most important metrics
3. **Top Risk:** The one thing that could blow up
4. **Top Opportunity:** The one thing that could be a quick win
5. **Recommended Action:** One thing to do today

### Output Format

```markdown
## Product Ops Summary - [Date]

### Status: [Healthy / Needs Attention / At Risk]

### Key Numbers
- **In Flight:** 12 items across 3 engineers
- **Ready to Bet:** 5 items shaped and waiting
- **Blocked:** 2 items (both < 2 days, manageable)

### Top Risk
[DOOM-XXX] Enterprise feature for DPV is due Jan 15 but still in Problem Validation.
**Action:** Shape this TODAY or communicate delay.

### Top Opportunity
[DOOM-XXX] Quick fix for billing bug affecting 12 operators.
2-hour fix that removes a major support burden.

### This Week's Focus
1. Shape DPV commitment before Friday betting table
2. Close out 2 items stuck in QA
3. Archive 10 stale backlog items
```

---

## Query Patterns for Notion

### Fetch All Active Tickets
```
Filter: Status NOT in [Done, Archived, Not doing anymore]
```

### Fetch by Stage
```
Filter: Stage contains [specific stage]
```

### Fetch High Priority
```
Filter: Priority = High OR Priority Score > 7
```

### Fetch Overdue
```
Filter: Due Date < today AND Status NOT in [Done, Archived]
```

### Fetch by Customer Tag
```
Filter: Tags contains "Enterprise" OR Tags contains "[CustomerName]"
```

---

## Interpretation Guidelines

### When Numbers Look Bad

Don't panic. Ask:
1. Is this a real problem or a data quality issue?
2. Is this temporary (end of cycle crunch) or systemic?
3. What's the root cause?
4. What's the minimal intervention that fixes it?

### When Numbers Look Good

Stay skeptical. Ask:
1. Is the data accurate and up to date?
2. Are we measuring the right things?
3. What's hiding beneath the good numbers?

### Always Remember

The goal isn't perfect metrics. The goal is:
- **Visibility** - See what's happening
- **Predictability** - Know what's coming
- **Discipline** - Hold the line on process
- **Quality** - Ship good work, not just more work
