---
name: pipeline-health
description: Sales pipeline health assistant for Moovs leadership. Queries HubSpot deal data via Metabase to generate actionable pipeline reports for sales meetings. Covers SMB, Mid-market, Enterprise, and Add-on pipelines.
---

# Moovs Pipeline Health Skill

This skill provides real-time visibility into sales pipeline health by querying HubSpot deal data from Snowflake via Metabase MCP. Built for sales leadership meetings.

## Why This Matters

Pipeline health meetings are only as good as the data driving them. This skill transforms raw HubSpot data into actionable sales intelligence:

- **Know your numbers** - Pipeline value, deal counts, and velocity by stage
- **Spot stuck deals** - Surface deals aging past threshold before they die
- **Track performance** - Recent wins, conversion rates, and rep productivity
- **Make decisions** - What to push, what to close lost, where to focus

## Your Pipelines

| Pipeline       | Focus                         | Sales Motion           | Typical Deal |
| -------------- | ----------------------------- | ---------------------- | ------------ |
| **Enterprise** | Large operators, $1M+ revenue | High-touch, long cycle | ~$1,800      |
| **Mid-market** | Growing operators, $250K-$1M  | Sales-assisted         | ~$160        |
| **SMB**        | Smaller operators, <$250K     | PLG / Self-serve       | ~$150        |
| **Add-on**     | Upsells to existing customers | Expansion              | ~$125        |

## Available Reports

### 1. Full Pipeline Review

```
/pipeline-health review
```

Complete pipeline analysis for leadership meetings:

- Pipeline snapshot by stage (value, count, velocity)
- Recent performance (wins/losses last 30 days)
- Stuck deals needing action
- Rep-level breakdown

### 2. Pipeline Snapshot

```
/pipeline-health snapshot
```

Quick pulse on active pipeline:

- Active deals by pipeline and stage
- Total pipeline value
- Average days in each stage
- Bottleneck identification

### 3. Stuck Deals

```
/pipeline-health stuck [pipeline]
```

Deals aging past threshold that need attention:

- SMB: 30+ days
- Mid-market: 45+ days
- Enterprise: 60+ days
- Add-on: 30+ days

Shows deal name, owner, stage, days in pipeline, and recommended action.

### 4. Recent Performance

```
/pipeline-health wins [days]
```

Conversion performance (default: last 30 days):

- Deals won by pipeline
- Total closed value
- Average deal size
- Win rate trends

### 5. Rep Scorecard

```
/pipeline-health reps [pipeline]
```

Individual rep performance:

- Active pipeline per rep
- Stuck deals by rep
- Recent wins by rep
- Activity and velocity

### 6. Single Pipeline Deep Dive

```
/pipeline-health [pipeline-name]
```

Focus on one pipeline (smb, midmarket, enterprise, addon):

- Stage-by-stage breakdown
- Top 10 deals by value
- Stuck deals for this pipeline
- Recent activity

## Data Source

**Table:** `MOOVS.HUBSPOT_ALL_DEALS`
**Database:** Snowflake (Metabase ID: 2)

### Key Columns

| Column                  | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `HS_D_DEAL_ID`          | HubSpot deal ID                                |
| `HS_D_DEAL_NAME`        | Deal name                                      |
| `HS_D_PIPELINE_SEGMENT` | Pipeline (SMB, Mid-market, Enterprise, Add-on) |
| `HS_D_STAGE_NAME`       | Current stage                                  |
| `HS_D_CLOSED_AMOUNT`    | Deal value                                     |
| `HS_D_CREATE_DATE`      | Date deal created                              |
| `HS_D_CLOSE_DATE`       | Date deal closed (won/lost)                    |
| `HS_D_OWNER_NAME`       | Deal owner (rep)                               |
| `HS_D_MOOVS_PLAN`       | Target Moovs plan                              |
| `HS_D_SOURCE`           | Lead source                                    |

### Pipeline Stages

**SMB Pipeline:**

- Lead → PQL → Opportunity → Paid Account / Fully Onboarded → Closed Lost

**Mid-market Pipeline:**

- Interest → Discovery → Demo → Negotiation → Closed Won → Closed Lost

**Enterprise Pipeline:**

- Interest → Discovery → Demo → Negotiation → Closed Won → Closed Lost

**Add-on Pipeline:**

- Lead → Discovery Call → Demo → Prospecting → Contract sent → Onboarding → Fully Onboarded / Paid Account → Closed Lost

## Process

When the user invokes this skill:

1. **Identify report type** - Full review, snapshot, stuck deals, etc.
2. **Query Metabase** - Execute SQL against HUBSPOT_ALL_DEALS
3. **Analyze for sales** - Surface actionable insights, not just data
4. **Present findings** - Format for sales meeting consumption

## Starting the Process

When invoked, ask:

> "What pipeline insights do you need today?
>
> - **Review** - Full pipeline health for your sales meeting
> - **Snapshot** - Quick pulse on active pipeline
> - **Stuck** - Deals aging that need attention
> - **Wins** - Recent performance and conversions
> - **Reps** - Rep-level scorecard
> - **[Pipeline name]** - Deep dive on one pipeline (smb, midmarket, enterprise, addon)
>
> Or tell me what you're preparing for and I'll pull the right data."

## SQL Query Templates

For detailed query templates, see [QUERIES.md](QUERIES.md).

## Report Format

All reports should be **sales-focused** and **action-oriented**:

### DO:

- Lead with the number/insight, not the methodology
- Highlight deals that need action TODAY
- Show trends (up/down from prior period)
- Name specific reps and specific deals
- End with recommended actions

### DON'T:

- Dump raw SQL results
- Show data without interpretation
- Bury the lead in methodology
- Present without recommendations

## Example Output: Pipeline Review

```
# Pipeline Health - January 22, 2026

## The Headlines
- **$95K in Enterprise pipeline** - 5 deals in negotiation
- **522 SMB leads** sitting without action (avg 84 days)
- **44 wins last 30 days** totaling $25K

## Needs Attention NOW

### Stuck Deals (Action Required)
| Deal | Pipeline | Days | Owner | Recommendation |
|------|----------|------|-------|----------------|
| VIPRide4U - Passenger App | Add-on | 749 | Amir | Close lost or re-engage |
| Jax party bus - Websites | Add-on | 742 | Omri | Check onboarding status |

### Hot Enterprise Deals
| Deal | Stage | Value | Next Step |
|------|-------|-------|-----------|
| Carey Transportation | Negotiation | $12K | Contract review this week |

## By Pipeline

### Enterprise ($95K pipeline)
- 27 in Discovery
- 12 in Demo
- 5 in Negotiation ← Focus here

### SMB (567 active)
- 522 Leads (84 days avg) ← Need nurture sequence
- 27 PQL
- 18 Opportunity

## Rep Performance
| Rep | Active Deals | Stuck | Won (30d) |
|-----|--------------|-------|-----------|
| Santiago | 45 | 3 | 8 |
| Peter | 67 | 12 | 5 |

## Recommended Actions
1. **Enterprise:** Push Carey to close this week
2. **SMB:** Launch automated nurture for 522 stale leads
3. **Add-on:** Clean up 75 zombie deals (close lost)
```

## Integration with Other Skills

Pipeline health connects to customer research and product ops:

```
/pipeline-health stuck
    ↓
Found stale Enterprise deal: "Carey Transportation"
    ↓
/customer-research profile <operator_id>
    ↓
Understand their usage, billing, support history
    ↓
Informed sales conversation
```

## Philosophy: Sales Discipline

Pipeline health isn't about reporting - it's about discipline:

- **Deals don't age gracefully** - Surface them early
- **Reps need visibility** - Show them their own data
- **Leaders need truth** - No vanity metrics
- **Meetings need focus** - Come with actions, not just numbers

The best sales teams inspect their pipeline weekly. This skill makes that inspection fast and actionable.
