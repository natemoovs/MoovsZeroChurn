---
name: tickets
description: Query and filter tickets from the Moovs Notion database. Use when you need to find specific tickets, filter by status/stage/priority/assignee, or get ticket details. Lightweight alternative to /product-ops for quick ticket lookups.
---

# Moovs Tickets Skill

A focused skill for querying the Moovs Tickets database in Notion. Use this when you need to quickly find, filter, or analyze tickets without the full product-ops reporting overhead.

## When to Use This Skill

Use this skill when you need to:
- **Find a specific ticket** by ID, name, or keyword
- **Filter tickets** by status, stage, priority, type, or assignee
- **List tickets** for a customer or tag
- **Quick lookups** without full analysis

For comprehensive reports and analysis, use `/product-ops` instead.

## Database Reference

**Moovs Tickets Database ID:** `13b8aeaa-3759-80f8-8d7c-dd2f627d2578`

**Tool:** `mcp__notion__API-query-data-source`

## Available Filters

### By Status
```
/tickets status:accepted
/tickets status:in-progress
/tickets status:done
```

**Status Options:**
- `Not doing anymore`
- `Accepted`
- `Ingestion`
- `In progress`
- `Archived`
- `Done`

### By Stage
```
/tickets stage:ready-for-dev
/tickets stage:in-development
/tickets stage:blocked
```

**Stage Options:**
- `Not started`
- `Backlog`
- `Problem Validation`
- `Product Design / Work`
- `UI Design`
- `Ready for dev`
- `Eng Design`
- `In Development`
- `QA`
- `Code Review`
- `Deployed / Done`
- `Blocked`

### By Priority
```
/tickets priority:high
/tickets priority:medium
/tickets priority:low
```

### By Type
```
/tickets type:bug
/tickets type:feature
/tickets type:request
```

**Type Options:**
- `Bug`
- `Feature`
- `Request`
- `Insight`
- `Issue`

### By Assignee
```
/tickets assignee:chris
/tickets unassigned
```

### By Tag/Customer
```
/tickets tag:enterprise
/tickets tag:dpv
/tickets customer:roberts-hawaii
```

### By ID
```
/tickets DOOM-123
/tickets id:123
```

### Combined Filters
```
/tickets stage:in-development priority:high
/tickets type:bug status:in-progress
/tickets tag:enterprise stage:blocked
```

## Quick Commands

| Command | Description |
|---------|-------------|
| `/tickets` | List recent tickets (last 20) |
| `/tickets DOOM-XXX` | Get specific ticket by ID |
| `/tickets blocked` | All blocked tickets |
| `/tickets overdue` | Tickets past due date |
| `/tickets unassigned high` | Unassigned high-priority tickets |
| `/tickets search <term>` | Search ticket names/descriptions |

## Process

When the user invokes this skill:

1. **Parse the request** - Identify filters (status, stage, priority, type, assignee, tags)
2. **Build the Notion query** - Construct filter object for API call
3. **Execute query** - Use `mcp__notion__API-query-data-source`
4. **Format results** - Display as clean table with key fields
5. **Offer actions** - Suggest next steps (view details, filter further, etc.)

## Output Format

### Ticket List
```markdown
## Tickets: [Filter Description]

Found {X} tickets.

| ID | Name | Stage | Priority | Assignee | Due |
|----|------|-------|----------|----------|-----|
| DOOM-123 | Fix login bug | In Development | High | Chris | Jan 20 |
| DOOM-124 | Add export | Ready for dev | Medium | - | - |
| ... | ... | ... | ... | ... | ... |

**Quick Actions:**
- View details: `/tickets DOOM-XXX`
- Filter further: `/tickets stage:in-development priority:high`
```

### Single Ticket Detail
```markdown
## DOOM-123: Fix login bug

| Field | Value |
|-------|-------|
| **Status** | In progress |
| **Stage** | In Development |
| **Type** | Bug |
| **Priority** | High |
| **Assigned To** | Chris |
| **Due Date** | Jan 20, 2025 |
| **Tags** | Enterprise, DPV |
| **Priority Score** | 8/10 |
| **Customer Impact** | 7/10 |
| **Effort** | 3/10 |

### Summary
{ticket summary}

### Description
{full description}

**Notion Link:** [Open in Notion]({url})
```

## Query Reference

See [QUERY_GUIDE.md](QUERY_GUIDE.md) for detailed filter syntax and examples.

## Database Schema

| Property | Type | Description |
|----------|------|-------------|
| Name | title | Ticket title |
| ID | unique_id | DOOM-prefixed identifier |
| Status | status | Workflow status |
| Stage | multi_select | Pipeline stage |
| Type | multi_select | Bug, Feature, Request, etc. |
| Priority | select | Low, Medium, High |
| Priority Score | number | 0-10 calculated priority |
| Customer Impact Score | number | 0-10 impact rating |
| Level of Effort Score | number | 0-10 effort estimate |
| Assigned To | people | Owner(s) |
| Team | multi_select | Pocketflows, Prod, Eng, etc. |
| Due Date | date | Commitment deadline |
| Tags | multi_select | Enterprise, customer names, etc. |
| Description | rich_text | Full details |
| Summary | rich_text | Brief summary |

## Integration

This skill provides the data layer that other skills can use:

- `/product-ops` - Uses tickets for reports and analysis
- `/customer-research` - Pulls customer-related tickets
- `/shaping` - References existing tickets during shaping
