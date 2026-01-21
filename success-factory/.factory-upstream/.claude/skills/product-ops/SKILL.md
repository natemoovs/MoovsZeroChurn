---
name: product-ops
description: Product operations assistant for the Moovs CEO. Provides visibility into the product pipeline, analyzes ticket health, prepares betting table briefings, tracks commitments, and surfaces strategic insights from the Notion tickets database. Use when you need to understand what's happening across product development.
---

# Moovs Product Operations Skill

This skill gives the CEO real-time visibility into product operations by analyzing the Moovs Tickets database in Notion and surfacing actionable insights.

## Why This Matters

From the MOOVING philosophy:

> "We need to radically change the way in which we sell, design, and build software. This means slowing down, committing to less, being more thoughtful about what we commit to, saying 'No' more, and having more process."

Product operations is the connective tissue that makes MOOVING work. Without visibility, you can't:
- Know what's ready for the betting table
- Understand if cycles are on track
- Identify blocked work before it becomes a crisis
- Make informed decisions about what to commit to next

## When to Use This Skill

Use this skill when you need to:
- **Prepare for the betting table** - What's shaped and ready to bet on?
- **Check pipeline health** - How many items at each stage? What's stuck?
- **Track commitments** - Are we on track with DPV, Roberts Hawaii, Carey, Cornell?
- **Understand workload** - Who's overloaded? What's unassigned?
- **Strategic analysis** - Bugs vs features ratio? Customer impact distribution?
- **Weekly check-in** - Get a quick pulse on product development

## Available Reports

When invoking this skill, specify what type of insight you need:

### 1. Pipeline Health Report
```
/product-ops pipeline
```
Shows distribution of tickets across stages:
- Backlog → Problem Validation → Product Design → Ready for Dev → In Development → QA → Done
- Identifies bottlenecks and stuck items
- Highlights items that have been in a stage too long

### 2. Betting Table Prep
```
/product-ops betting
```
Prepares you for the betting table meeting:
- Items that are shaped and ready to bet on (Stage: Ready for dev)
- High-priority items still being shaped
- Items blocked that need unblocking before betting
- Recommended bets based on priority and customer impact

### 3. Commitment Tracker
```
/product-ops commitments
```
Tracks progress on customer commitments:
- Items with due dates approaching
- Items assigned to specific customers/enterprises
- Risk assessment: what's at risk of slipping?

### 4. Team Workload
```
/product-ops workload
```
Analyzes team capacity and assignment:
- Items per assignee
- Unassigned high-priority items
- Team distribution across types (bugs vs features)

### 5. Strategic Insights
```
/product-ops insights
```
High-level product health metrics:
- Bug vs Feature vs Request distribution
- Priority distribution (are we drowning in high-priority items?)
- Customer impact score analysis
- Items created vs completed over time
- Aging analysis (what's been sitting too long?)

### 6. Executive Summary
```
/product-ops summary
```
Quick pulse for busy CEOs:
- 3-5 key things to know right now
- Top risks
- Top opportunities
- Recommended actions

## How It Works

1. **Fetches data from Notion** - Queries the Moovs Tickets database (ID: `13b8aeaa-3759-80f8-8d7c-dd2f627d2578`)
2. **Analyzes against MOOVING principles** - Applies the Mooving methodology lens
3. **Surfaces insights** - Presents findings with recommendations

## Database Schema Reference

The skill reads from Moovs Tickets with these key properties:

| Property | Type | Purpose |
|----------|------|---------|
| Name | title | Ticket name |
| ID | unique_id | DOOM-prefixed identifier |
| Status | status | Not doing anymore, Accepted, Ingestion, In progress, Archived, Done |
| Stage | multi_select | Not started → Problem Validation → Product Design → UI Design → Ready for dev → Eng Design → In Development → QA → Code Review → Deployed/Done → Blocked → Backlog |
| Type | multi_select | Bug, Feature, Request, Insight, Issue, etc. |
| Priority | select | Low, Medium, High |
| Priority Score | number | Calculated priority (0-10) |
| Customer Impact Score | number | Impact assessment (0-10) |
| Level of Effort Score | number | Effort estimate (0-10) |
| Assigned To | people | Who owns this |
| Team | multi_select | Pocketflows, Prod, Eng, Ensemble, Layer, Leadership, Support |
| Due Date | date | Commitment deadline |
| Tags | multi_select | Enterprise, Shuttle, etc. |
| Description | rich_text | Full details |
| Summary | rich_text | Brief summary |

## Process

When the user invokes this skill:

1. Ask which report they need (or infer from context)
2. Query the Moovs Tickets database using the Notion MCP tools
3. Analyze the data according to the report type
4. Present findings with:
   - Key metrics
   - Notable items (linked to Notion)
   - Risks and concerns
   - Recommended actions

## Starting the Process

When invoked, ask:

> "What would you like to know about product operations today?
>
> - **Pipeline** - Where are things stuck?
> - **Betting** - What's ready for the next cycle?
> - **Commitments** - Are we on track?
> - **Workload** - Who's overloaded?
> - **Insights** - Strategic health check
> - **Summary** - Quick executive pulse
>
> Or describe what you're trying to understand and I'll dig in."

## Analysis Templates

For detailed analysis frameworks, see [ANALYSIS_GUIDE.md](ANALYSIS_GUIDE.md).

## Integration with Other Skills

Product ops connects to the full MOOVING workflow:

```
[Customer Request]
    ↓
/problem → Creates problem.md, creates ticket in Notion
    ↓
/product-ops → Tracks ticket, surfaces for betting table
    ↓
/shaping → Shapes the problem into a bounded pitch
    ↓
/product-ops → Confirms ready for betting, tracks through cycle
    ↓
[Betting Table] → Commits to cycle
    ↓
/product-ops → Monitors progress, surfaces risks
    ↓
[Shipped]
```

## Philosophy: Visibility Enables Discipline

The point of product ops isn't to add bureaucracy. It's to give you the confidence to:
- **Say no** - Because you can see you're at capacity
- **Say not yet** - Because you can see what needs to happen first
- **Say yes** - Because you can see it's shaped and ready
- **Hold the line** - Because you can see the circuit breaker is real

Without visibility, you're flying blind. With it, you can lead.

## Codebase Research

**When analyzing tickets, search the Moovs codebase for context:**

| Repo | Path | What to Look For |
|------|------|------------------|
| **server** | `/Users/amirghorbani/Dev/server` | Backend logic, data models, APIs |
| **dooms-operator** | `/Users/amirghorbani/Dev/dooms-operator` | Operator UI, existing features |
| **dooms-customer** | `/Users/amirghorbani/Dev/dooms-customer` | Customer portal |
| **dooms-native-driver** | `/Users/amirghorbani/Dev/dooms-native-driver` | Driver app |

When preparing reports:
- Cross-reference ticket descriptions with actual codebase state
- Identify if features mentioned in tickets already exist (partially or fully)
- Provide context on technical complexity when surfacing risks
- Note relevant code areas when recommending priorities
