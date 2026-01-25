# Stripe Payment Analysis Guide

This guide provides the framework for retrieving and analyzing operator Stripe payment data from Metabase.

---

## Overview

Metabase connects to the Moovs Snowflake data warehouse and provides access to Stripe charge data. The key model for payment analysis is:

- **Card ID:** 855
- **Name:** Moovs Platform Charges - Model
- **Database:** Snowflake (ID: 2)
- **Table:** MOZART_NEW.MOOVS_PLATFORM_CHARGES

### Key Identifiers

- **STRIPE_ACCOUNT_ID** = Operator's Stripe Connect account
- **OPERATOR_NAME** = Operator name (direct field)
- To filter by **OPERATOR_ID**, join with `POSTGRES_SWOOP.OPERATOR` table

---

## Step 1: Query Charges

### Tool

```
mcp__metabase__execute_query
```

### Parameters

```json
{
  "database_id": 2,
  "query": "<SQL query>"
}
```

### Option A: Query by STRIPE_ACCOUNT_ID (Preferred)

If you have the operator's Stripe Connect account ID (e.g., `acct_1PPvqLQrDs7oucqB`), query directly:

```sql
SELECT
  STRIPE_CHARGE_ID,
  CREATED_DATE,
  TOTAL_DOLLARS_CHARGED,
  TOTAL_DOLLARS_REFUNDED,
  STATUS,
  OUTCOME_SELLER_MESSAGE,
  OUTCOME_RISK_LEVEL,
  BILLING_DETAIL_NAME,
  DISPUTE_STATUS,
  DISPUTED_AMOUNT,
  DISPUTE_REASON
FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
WHERE STRIPE_ACCOUNT_ID = '<stripe_account_id>'
ORDER BY CREATED_DATE DESC
LIMIT 100
```

**Why this is preferred:** Direct queries are faster and don't depend on the OPERATOR table having a matching STRIPE_ACCOUNT record.

### Option B: Query by OPERATOR_ID (via JOIN)

If you only have the operator_id, join with the operator table:

```sql
SELECT
  c.STRIPE_CHARGE_ID,
  c.CREATED_DATE,
  c.TOTAL_DOLLARS_CHARGED,
  c.TOTAL_DOLLARS_REFUNDED,
  c.STATUS,
  c.OUTCOME_SELLER_MESSAGE,
  c.OUTCOME_RISK_LEVEL,
  c.BILLING_DETAIL_NAME,
  c.DISPUTE_STATUS,
  c.DISPUTED_AMOUNT,
  c.DISPUTE_REASON
FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES c
JOIN POSTGRES_SWOOP.OPERATOR o ON c.STRIPE_ACCOUNT_ID = o.STRIPE_ACCOUNT
WHERE o.OPERATOR_ID = '<operator_id>'
ORDER BY c.CREATED_DATE DESC
LIMIT 100
```

**Note:** This requires the operator to have a `STRIPE_ACCOUNT` value in the OPERATOR table. If the JOIN returns no data, try looking up the Stripe account ID from Lago or HubSpot and use Option A.

---

## Step 2: Common Analysis Queries

All queries below use direct `STRIPE_ACCOUNT_ID` filtering (preferred). Replace `<stripe_account_id>` with the operator's Stripe Connect account (e.g., `acct_1PPvqLQrDs7oucqB`).

### Payment Summary (All Time)

```sql
SELECT
  COUNT(*) as total_charges,
  COUNT(CASE WHEN STATUS = 'succeeded' THEN 1 END) as successful,
  COUNT(CASE WHEN STATUS = 'failed' THEN 1 END) as failed,
  SUM(TOTAL_DOLLARS_CHARGED) as total_charged,
  SUM(TOTAL_DOLLARS_REFUNDED) as total_refunded,
  SUM(TOTAL_DOLLARS_CHARGED) - SUM(TOTAL_DOLLARS_REFUNDED) as net_revenue,
  ROUND(COUNT(CASE WHEN STATUS = 'succeeded' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate_pct
FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
WHERE STRIPE_ACCOUNT_ID = '<stripe_account_id>'
```

### Failed Payments Analysis

```sql
SELECT
  CREATED_DATE,
  TOTAL_DOLLARS_CHARGED,
  BILLING_DETAIL_NAME,
  OUTCOME_REASON,
  OUTCOME_SELLER_MESSAGE,
  OUTCOME_RISK_LEVEL
FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
WHERE STRIPE_ACCOUNT_ID = '<stripe_account_id>'
  AND STATUS = 'failed'
  AND CREATED_DATE >= DATEADD(month, -6, CURRENT_DATE())
ORDER BY CREATED_DATE DESC
```

### Dispute Analysis

```sql
SELECT
  STRIPE_CHARGE_ID,
  CREATED_DATE,
  DISPUTE_DATE,
  TOTAL_DOLLARS_CHARGED,
  DISPUTED_AMOUNT,
  DISPUTE_STATUS,
  DISPUTE_REASON,
  BILLING_DETAIL_NAME
FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
WHERE STRIPE_ACCOUNT_ID = '<stripe_account_id>'
  AND DISPUTE_ID IS NOT NULL
ORDER BY DISPUTE_DATE DESC
```

### Monthly Payment Trend

```sql
SELECT
  DATE_TRUNC('month', CREATED_DATE) as month,
  COUNT(*) as total_charges,
  COUNT(CASE WHEN STATUS = 'succeeded' THEN 1 END) as successful,
  COUNT(CASE WHEN STATUS = 'failed' THEN 1 END) as failed,
  SUM(TOTAL_DOLLARS_CHARGED) as total_charged,
  SUM(TOTAL_DOLLARS_REFUNDED) as refunded,
  ROUND(COUNT(CASE WHEN STATUS = 'succeeded' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate
FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
WHERE STRIPE_ACCOUNT_ID = '<stripe_account_id>'
GROUP BY DATE_TRUNC('month', CREATED_DATE)
ORDER BY month DESC
LIMIT 12
```

### Risk Score Analysis

```sql
SELECT
  OUTCOME_RISK_LEVEL,
  COUNT(*) as charge_count,
  AVG(OUTCOME_RISK_SCORE) as avg_risk_score,
  SUM(TOTAL_DOLLARS_CHARGED) as total_volume
FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
WHERE STRIPE_ACCOUNT_ID = '<stripe_account_id>'
GROUP BY OUTCOME_RISK_LEVEL
ORDER BY charge_count DESC
```

### Refund Analysis

```sql
SELECT
  STRIPE_CHARGE_ID,
  CREATED_DATE,
  TOTAL_DOLLARS_CHARGED,
  TOTAL_DOLLARS_REFUNDED,
  BILLING_DETAIL_NAME,
  ROUND(TOTAL_DOLLARS_REFUNDED * 100.0 / NULLIF(TOTAL_DOLLARS_CHARGED, 0), 2) as refund_pct
FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
WHERE STRIPE_ACCOUNT_ID = '<stripe_account_id>'
  AND TOTAL_DOLLARS_REFUNDED > 0
ORDER BY TOTAL_DOLLARS_REFUNDED DESC
LIMIT 20
```

---

## Step 3: Key Metrics to Calculate

### Payment Health Metrics

| Metric             | Calculation                | Healthy Range |
| ------------------ | -------------------------- | ------------- |
| **Success Rate**   | Succeeded / Total Charges  | > 95%         |
| **Refund Rate**    | Refunded $ / Charged $     | < 3%          |
| **Dispute Rate**   | Disputed charges / Total   | < 0.5%        |
| **Avg Risk Score** | Mean of OUTCOME_RISK_SCORE | < 20          |

### Volume Metrics

| Metric              | Description                       |
| ------------------- | --------------------------------- |
| **Total Charges**   | Count of all charge attempts      |
| **Total Volume**    | Sum of TOTAL_DOLLARS_CHARGED      |
| **Net Revenue**     | Charged - Refunded                |
| **Avg Transaction** | Total Volume / Successful Charges |

### Risk Indicators

| Indicator             | Concern Level |
| --------------------- | ------------- |
| Success rate < 90%    | High          |
| Multiple disputes     | High          |
| Elevated risk scores  | Medium        |
| High refund rate      | Medium        |
| Failed payment streak | High          |

---

## Step 4: Output Format

### Payment Health Report

```markdown
## Payment Health Report for [Operator Name]

**Report Period:** [date range]
**Operator ID:** [operator_id]

---

### Payment Summary

| Metric            | Value            |
| ----------------- | ---------------- |
| **Total Charges** | {count}          |
| **Successful**    | {count} ({pct}%) |
| **Failed**        | {count} ({pct}%) |
| **Success Rate**  | {pct}%           |

---

### Financial Summary

| Metric              | Value     |
| ------------------- | --------- |
| **Total Charged**   | ${amount} |
| **Total Refunded**  | ${amount} |
| **Net Revenue**     | ${amount} |
| **Refund Rate**     | {pct}%    |
| **Avg Transaction** | ${amount} |

---

### Risk Assessment

| Indicator         | Value     | Status   |
| ----------------- | --------- | -------- |
| Avg Risk Score    | {score}   | {status} |
| High Risk Charges | {count}   | {status} |
| Disputes          | {count}   | {status} |
| Dispute Amount    | ${amount} | {status} |

---

### Monthly Trend (Last 6 Months)

| Month   | Charges | Success Rate | Volume | Refunds |
| ------- | ------- | ------------ | ------ | ------- |
| {month} | {count} | {pct}%       | ${vol} | ${ref}  |
| ...     | ...     | ...          | ...    | ...     |

---

### Recent Failed Payments

| Date   | Amount | Customer | Reason   |
| ------ | ------ | -------- | -------- |
| {date} | ${amt} | {name}   | {reason} |
| ...    | ...    | ...      | ...      |

---

### Active Disputes

| Date   | Amount | Status   | Reason   |
| ------ | ------ | -------- | -------- |
| {date} | ${amt} | {status} | {reason} |
| ...    | ...    | ...      | ...      |

---

### Payment Health Score: [X/100] - [Good/At Risk/Critical]

**Risk Factors:**

- {List any concerns}

**Recommendations:**

1. {Action item}
2. {Action item}
```

---

## Available Fields Reference

### Core Fields

| Field             | Type | Description                       |
| ----------------- | ---- | --------------------------------- |
| STRIPE_CHARGE_ID  | Text | Unique charge identifier          |
| STRIPE_ACCOUNT_ID | Text | Operator's Stripe Connect account |
| OPERATOR_NAME     | Text | Operator name                     |
| STATUS            | Text | succeeded / failed                |
| CREATED_DATE      | Date | Charge date                       |
| CREATED_TIME      | Time | Charge time                       |

### Financial Fields

| Field                  | Type   | Description     |
| ---------------------- | ------ | --------------- |
| TOTAL_DOLLARS_CHARGED  | Number | Amount charged  |
| TOTAL_DOLLARS_REFUNDED | Number | Amount refunded |
| BILLING_DETAIL_NAME    | Text   | Cardholder name |
| CARD_ID                | Text   | Card identifier |

### Outcome Fields

| Field                  | Type   | Description                 |
| ---------------------- | ------ | --------------------------- |
| OUTCOME_NETWORK_STATUS | Text   | Network response            |
| OUTCOME_REASON         | Text   | Decline reason (if failed)  |
| OUTCOME_SELLER_MESSAGE | Text   | Human-readable outcome      |
| OUTCOME_RISK_LEVEL     | Text   | normal / elevated / highest |
| OUTCOME_RISK_SCORE     | Number | Risk score (0-100)          |

### Dispute Fields

| Field           | Type   | Description        |
| --------------- | ------ | ------------------ |
| DISPUTE_ID      | Text   | Dispute identifier |
| DISPUTE_STATUS  | Text   | Dispute status     |
| DISPUTED_AMOUNT | Number | Disputed amount    |
| DISPUTE_REASON  | Text   | Reason for dispute |
| DISPUTE_DATE    | Date   | When disputed      |

---

## Operator Mapping

### Finding the Stripe Account ID

If you only have an OPERATOR_ID, look up their Stripe account:

```sql
SELECT OPERATOR_ID, NAME, STRIPE_ACCOUNT
FROM POSTGRES_SWOOP.OPERATOR
WHERE OPERATOR_ID = '<operator_id>'
```

The `STRIPE_ACCOUNT` value (e.g., `acct_1PPvqLQrDs7oucqB`) can then be used directly in queries.

### Alternative Sources for Stripe Account ID

- **Lago:** The `external_id` in Lago customer records often contains the operator_id, and billing metadata may reference Stripe
- **HubSpot:** Company records may have Stripe account in custom properties

### Join Pattern (When Stripe Account Unknown)

```sql
FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES c
JOIN POSTGRES_SWOOP.OPERATOR o
  ON c.STRIPE_ACCOUNT_ID = o.STRIPE_ACCOUNT
WHERE o.OPERATOR_ID = '<operator_id>'
```

**Note:** If this JOIN returns no results, the operator may not have a `STRIPE_ACCOUNT` value set. Look up the Stripe account from another source and query directly.

---

## Integration with Customer Research

Combine Stripe payment data with other sources:

```
Lago (Billing)
  - Subscription invoices
  - Platform fees

Stripe via Metabase (Payments) <-- This guide
  - Credit card charges
  - Failed payments
  - Disputes & refunds
  - Risk scores

Metabase Reservations
  - Trip volume
  - Collection rate

HubSpot (CRM)
  - Customer context
```

### Correlation Analysis

- **High failed payments + declining reservations** = Customer churn risk
- **Disputes + support tickets** = Service quality issue
- **High risk scores + new customer** = Fraud monitoring needed
- **Low success rate** = May need payment method update

---

## Fallback: Raw Stripe Tables

If `MOZART_NEW.MOOVS_PLATFORM_CHARGES` returns no data for an operator, use the raw Stripe tables directly. These tables contain all Stripe data synced to Snowflake.

### Raw Tables Available

| Table                  | Description                     |
| ---------------------- | ------------------------------- |
| `STRIPE_MOOVS.CHARGE`  | All charge records (~1.5M rows) |
| `STRIPE_MOOVS.DISPUTE` | Dispute records                 |
| `STRIPE_MOOVS.REFUND`  | Refund records                  |

### Key Identifier

- **CONNECTED_ACCOUNT_ID** = Operator's Stripe Connect account (equivalent to STRIPE_ACCOUNT_ID)

### Payment Summary (Raw Tables)

```sql
SELECT
    COUNT(*) as total_charges,
    SUM(CASE WHEN STATUS = 'succeeded' THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN STATUS = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(AMOUNT) / 100.0 as total_charged_dollars,
    SUM(AMOUNT_REFUNDED) / 100.0 as total_refunded_dollars,
    ROUND(SUM(CASE WHEN STATUS = 'succeeded' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate_pct
FROM STRIPE_MOOVS.CHARGE
WHERE CONNECTED_ACCOUNT_ID = '<stripe_account_id>'
```

### Monthly Trend (Raw Tables)

```sql
SELECT
    DATE_TRUNC('month', CREATED) as month,
    COUNT(*) as total_charges,
    SUM(CASE WHEN STATUS = 'succeeded' THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN STATUS = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(AMOUNT) / 100.0 as total_charged_dollars,
    SUM(AMOUNT_REFUNDED) / 100.0 as total_refunded_dollars
FROM STRIPE_MOOVS.CHARGE
WHERE CONNECTED_ACCOUNT_ID = '<stripe_account_id>'
GROUP BY DATE_TRUNC('month', CREATED)
ORDER BY month DESC
LIMIT 12
```

### Dispute Check (Raw Tables)

```sql
SELECT
    d.ID as dispute_id,
    d.AMOUNT / 100.0 as disputed_dollars,
    d.STATUS as dispute_status,
    d.REASON as dispute_reason,
    d.CREATED as dispute_date,
    c.AMOUNT / 100.0 as original_charge_dollars
FROM STRIPE_MOOVS.DISPUTE d
JOIN STRIPE_MOOVS.CHARGE c ON d.CHARGE_ID = c.ID
WHERE c.CONNECTED_ACCOUNT_ID = '<stripe_account_id>'
ORDER BY d.CREATED DESC
```

### Key Differences from Model

| Aspect         | Model (Card 855)        | Raw Tables                         |
| -------------- | ----------------------- | ---------------------------------- |
| Amount field   | `TOTAL_DOLLARS_CHARGED` | `AMOUNT` (in cents, divide by 100) |
| Account filter | `STRIPE_ACCOUNT_ID`     | `CONNECTED_ACCOUNT_ID`             |
| Date field     | `CREATED_DATE`          | `CREATED` (timestamp)              |
| Data freshness | ETL pipeline dependent  | Near real-time Stripe sync         |

### When to Use Raw Tables

1. Model returns no data for the operator
2. Need most recent charges (before ETL catches up)
3. Need fields not included in the model
4. Debugging data discrepancies
