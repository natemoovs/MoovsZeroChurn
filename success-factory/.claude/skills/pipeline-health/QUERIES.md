# Pipeline Health SQL Queries

Reference queries for the pipeline-health skill. All queries run against Metabase database ID 2 (Snowflake).

## Core Table

```sql
MOOVS.HUBSPOT_ALL_DEALS
```

## 1. Pipeline Snapshot

Active pipeline by stage (excluding closed deals).

```sql
SELECT
    HS_D_PIPELINE_SEGMENT as PIPELINE,
    HS_D_STAGE_NAME as STAGE,
    COUNT(*) as DEALS,
    ROUND(SUM(HS_D_CLOSED_AMOUNT), 0) as PIPELINE_VALUE,
    ROUND(AVG(DATEDIFF('day', HS_D_CREATE_DATE, CURRENT_DATE)), 0) as AVG_DAYS,
    MIN(HS_D_CREATE_DATE) as OLDEST_DEAL
FROM MOOVS.HUBSPOT_ALL_DEALS
WHERE HS_D_STAGE_NAME NOT ILIKE '%closed%'
  AND HS_D_STAGE_NAME NOT ILIKE '%paid%'
  AND HS_D_STAGE_NAME NOT ILIKE '%onboarded%'
GROUP BY HS_D_PIPELINE_SEGMENT, HS_D_STAGE_NAME
ORDER BY HS_D_PIPELINE_SEGMENT, DEALS DESC
```

## 2. Recent Wins

Closed won deals in the last N days.

```sql
-- Last 30 days (adjust date range as needed)
SELECT
    HS_D_PIPELINE_SEGMENT as PIPELINE,
    COUNT(*) as DEALS_WON,
    ROUND(SUM(HS_D_CLOSED_AMOUNT), 0) as TOTAL_VALUE,
    ROUND(AVG(HS_D_CLOSED_AMOUNT), 0) as AVG_DEAL_SIZE
FROM MOOVS.HUBSPOT_ALL_DEALS
WHERE (HS_D_STAGE_NAME ILIKE '%paid%'
    OR HS_D_STAGE_NAME ILIKE '%won%'
    OR HS_D_STAGE_NAME ILIKE '%onboarded%')
  AND HS_D_CLOSE_DATE >= CURRENT_DATE - 30
GROUP BY HS_D_PIPELINE_SEGMENT
ORDER BY TOTAL_VALUE DESC
```

## 3. Recent Losses

Closed lost deals in the last N days.

```sql
SELECT
    HS_D_PIPELINE_SEGMENT as PIPELINE,
    COUNT(*) as DEALS_LOST,
    ROUND(SUM(HS_D_CLOSED_AMOUNT), 0) as LOST_VALUE
FROM MOOVS.HUBSPOT_ALL_DEALS
WHERE HS_D_STAGE_NAME ILIKE '%closed lost%'
  AND HS_D_CLOSE_DATE >= CURRENT_DATE - 30
GROUP BY HS_D_PIPELINE_SEGMENT
ORDER BY DEALS_LOST DESC
```

## 4. Stuck Deals - All Pipelines

Deals aging past threshold that need action.

```sql
SELECT
    HS_D_PIPELINE_SEGMENT as PIPELINE,
    HS_D_DEAL_NAME as DEAL_NAME,
    HS_D_STAGE_NAME as STAGE,
    HS_D_OWNER_NAME as OWNER,
    HS_D_CLOSED_AMOUNT as VALUE,
    HS_D_CREATE_DATE as CREATED,
    DATEDIFF('day', HS_D_CREATE_DATE, CURRENT_DATE) as DAYS_IN_PIPELINE
FROM MOOVS.HUBSPOT_ALL_DEALS
WHERE HS_D_STAGE_NAME NOT ILIKE '%closed%'
  AND HS_D_STAGE_NAME NOT ILIKE '%paid%'
  AND HS_D_STAGE_NAME NOT ILIKE '%onboarded%'
  AND (
    (HS_D_PIPELINE_SEGMENT = 'SMB pipeline' AND DATEDIFF('day', HS_D_CREATE_DATE, CURRENT_DATE) > 30)
    OR (HS_D_PIPELINE_SEGMENT = 'Mid-market pipeline' AND DATEDIFF('day', HS_D_CREATE_DATE, CURRENT_DATE) > 45)
    OR (HS_D_PIPELINE_SEGMENT = 'Enterprise pipeline' AND DATEDIFF('day', HS_D_CREATE_DATE, CURRENT_DATE) > 60)
    OR (HS_D_PIPELINE_SEGMENT = 'Add-on pipeline' AND DATEDIFF('day', HS_D_CREATE_DATE, CURRENT_DATE) > 30)
  )
ORDER BY HS_D_PIPELINE_SEGMENT, DAYS_IN_PIPELINE DESC
LIMIT 50
```

## 5. Stuck Deals - Single Pipeline

Filter stuck deals for a specific pipeline.

```sql
-- Replace 'Enterprise pipeline' with target pipeline
SELECT
    HS_D_DEAL_NAME as DEAL_NAME,
    HS_D_STAGE_NAME as STAGE,
    HS_D_OWNER_NAME as OWNER,
    HS_D_CLOSED_AMOUNT as VALUE,
    DATEDIFF('day', HS_D_CREATE_DATE, CURRENT_DATE) as DAYS_IN_PIPELINE
FROM MOOVS.HUBSPOT_ALL_DEALS
WHERE HS_D_PIPELINE_SEGMENT = 'Enterprise pipeline'
  AND HS_D_STAGE_NAME NOT ILIKE '%closed%'
  AND HS_D_STAGE_NAME NOT ILIKE '%paid%'
  AND HS_D_STAGE_NAME NOT ILIKE '%won%'
  AND DATEDIFF('day', HS_D_CREATE_DATE, CURRENT_DATE) > 60
ORDER BY DAYS_IN_PIPELINE DESC
LIMIT 25
```

## 6. Rep Scorecard

Pipeline and performance by deal owner.

```sql
SELECT
    HS_D_OWNER_NAME as REP,
    HS_D_PIPELINE_SEGMENT as PIPELINE,
    COUNT(*) as ACTIVE_DEALS,
    ROUND(SUM(HS_D_CLOSED_AMOUNT), 0) as PIPELINE_VALUE,
    SUM(CASE WHEN DATEDIFF('day', HS_D_CREATE_DATE, CURRENT_DATE) > 45 THEN 1 ELSE 0 END) as STUCK_DEALS,
    ROUND(AVG(DATEDIFF('day', HS_D_CREATE_DATE, CURRENT_DATE)), 0) as AVG_DAYS
FROM MOOVS.HUBSPOT_ALL_DEALS
WHERE HS_D_STAGE_NAME NOT ILIKE '%closed%'
  AND HS_D_STAGE_NAME NOT ILIKE '%paid%'
  AND HS_D_STAGE_NAME NOT ILIKE '%onboarded%'
GROUP BY HS_D_OWNER_NAME, HS_D_PIPELINE_SEGMENT
ORDER BY HS_D_PIPELINE_SEGMENT, PIPELINE_VALUE DESC
```

## 7. Rep Recent Wins

Wins by rep in the last N days.

```sql
SELECT
    HS_D_OWNER_NAME as REP,
    HS_D_PIPELINE_SEGMENT as PIPELINE,
    COUNT(*) as WINS,
    ROUND(SUM(HS_D_CLOSED_AMOUNT), 0) as WON_VALUE
FROM MOOVS.HUBSPOT_ALL_DEALS
WHERE (HS_D_STAGE_NAME ILIKE '%paid%'
    OR HS_D_STAGE_NAME ILIKE '%won%'
    OR HS_D_STAGE_NAME ILIKE '%onboarded%')
  AND HS_D_CLOSE_DATE >= CURRENT_DATE - 30
GROUP BY HS_D_OWNER_NAME, HS_D_PIPELINE_SEGMENT
ORDER BY WON_VALUE DESC
```

## 8. Top Deals by Value

Highest value active deals.

```sql
SELECT
    HS_D_PIPELINE_SEGMENT as PIPELINE,
    HS_D_DEAL_NAME as DEAL_NAME,
    HS_D_STAGE_NAME as STAGE,
    HS_D_OWNER_NAME as OWNER,
    HS_D_CLOSED_AMOUNT as VALUE,
    DATEDIFF('day', HS_D_CREATE_DATE, CURRENT_DATE) as DAYS_IN_PIPELINE
FROM MOOVS.HUBSPOT_ALL_DEALS
WHERE HS_D_STAGE_NAME NOT ILIKE '%closed%'
  AND HS_D_STAGE_NAME NOT ILIKE '%paid%'
  AND HS_D_STAGE_NAME NOT ILIKE '%onboarded%'
  AND HS_D_CLOSED_AMOUNT > 0
ORDER BY HS_D_CLOSED_AMOUNT DESC
LIMIT 20
```

## 9. Pipeline Deep Dive - Single Pipeline

Complete view of one pipeline.

```sql
-- Replace 'Enterprise pipeline' with target
SELECT
    HS_D_STAGE_NAME as STAGE,
    COUNT(*) as DEALS,
    ROUND(SUM(HS_D_CLOSED_AMOUNT), 0) as VALUE,
    ROUND(AVG(DATEDIFF('day', HS_D_CREATE_DATE, CURRENT_DATE)), 0) as AVG_DAYS
FROM MOOVS.HUBSPOT_ALL_DEALS
WHERE HS_D_PIPELINE_SEGMENT = 'Enterprise pipeline'
GROUP BY HS_D_STAGE_NAME
ORDER BY
    CASE HS_D_STAGE_NAME
        WHEN 'Interest' THEN 1
        WHEN 'Discovery' THEN 2
        WHEN 'Demo' THEN 3
        WHEN 'Negotiation' THEN 4
        WHEN 'Negotiation ' THEN 4
        WHEN 'Closed Won' THEN 5
        WHEN 'Closed Lost' THEN 6
        ELSE 7
    END
```

## 10. New Deals This Week

Recently created deals.

```sql
SELECT
    HS_D_PIPELINE_SEGMENT as PIPELINE,
    HS_D_DEAL_NAME as DEAL_NAME,
    HS_D_STAGE_NAME as STAGE,
    HS_D_OWNER_NAME as OWNER,
    HS_D_CLOSED_AMOUNT as VALUE,
    HS_D_SOURCE as SOURCE,
    HS_D_CREATE_DATE as CREATED
FROM MOOVS.HUBSPOT_ALL_DEALS
WHERE HS_D_CREATE_DATE >= CURRENT_DATE - 7
ORDER BY HS_D_CREATE_DATE DESC
LIMIT 30
```

## 11. Pipeline Velocity (Days to Close)

Average time to close won deals.

```sql
SELECT
    HS_D_PIPELINE_SEGMENT as PIPELINE,
    COUNT(*) as DEALS_CLOSED,
    ROUND(AVG(DATEDIFF('day', HS_D_CREATE_DATE, HS_D_CLOSE_DATE)), 0) as AVG_DAYS_TO_CLOSE
FROM MOOVS.HUBSPOT_ALL_DEALS
WHERE (HS_D_STAGE_NAME ILIKE '%paid%'
    OR HS_D_STAGE_NAME ILIKE '%won%'
    OR HS_D_STAGE_NAME ILIKE '%onboarded%')
  AND HS_D_CLOSE_DATE >= CURRENT_DATE - 90
  AND HS_D_CLOSE_DATE IS NOT NULL
  AND HS_D_CREATE_DATE IS NOT NULL
GROUP BY HS_D_PIPELINE_SEGMENT
ORDER BY AVG_DAYS_TO_CLOSE
```

## 12. Lead Source Performance

Conversion by lead source.

```sql
SELECT
    HS_D_SOURCE as SOURCE,
    HS_D_PIPELINE_SEGMENT as PIPELINE,
    COUNT(*) as TOTAL_DEALS,
    SUM(CASE WHEN HS_D_STAGE_NAME ILIKE '%paid%'
              OR HS_D_STAGE_NAME ILIKE '%won%'
              OR HS_D_STAGE_NAME ILIKE '%onboarded%' THEN 1 ELSE 0 END) as WON,
    ROUND(SUM(CASE WHEN HS_D_STAGE_NAME ILIKE '%paid%'
              OR HS_D_STAGE_NAME ILIKE '%won%'
              OR HS_D_STAGE_NAME ILIKE '%onboarded%' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as WIN_RATE
FROM MOOVS.HUBSPOT_ALL_DEALS
WHERE HS_D_SOURCE IS NOT NULL
GROUP BY HS_D_SOURCE, HS_D_PIPELINE_SEGMENT
HAVING COUNT(*) >= 5
ORDER BY WIN_RATE DESC
```

## Pipeline Name Mapping

When filtering by pipeline, use these exact values:

| Shorthand | Full Pipeline Name |
|-----------|-------------------|
| smb | `SMB pipeline` |
| midmarket | `Mid-market pipeline` |
| enterprise | `Enterprise pipeline` |
| addon | `Add-on pipeline` |

## Stage Name Reference

**Closed/Won Stages (exclude from active pipeline):**
- `%closed%` - Any closed stage
- `%paid%` - Paid Account
- `%onboarded%` - Fully Onboarded
- `%won%` - Closed Won

**Active Stages (include in pipeline):**
- Everything else not matching above patterns
