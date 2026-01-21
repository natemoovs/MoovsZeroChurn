# Customer Lookup Guide

This guide provides the framework for finding and identifying Moovs operators using various identifiers like Stripe account ID, company name, or email address.

---

## Overview

Metabase Card 1469 (CSM_MOOVS) is the primary lookup table for customer research. It combines data from multiple sources into a single comprehensive view:

- **Card ID:** 1469
- **Name:** CSM_MOOVS
- **Table:** MOOVS.CSM_MOOVS
- **Database:** Snowflake (ID: 2)

### Why Use This Table

The CSM_MOOVS table is the **master customer view** that consolidates:
- Lago billing data (subscriptions, MRR, plans)
- Postgres operator data (Stripe accounts, company info)
- HubSpot CRM data (contacts, deals)
- Reservation metrics (volume, revenue)

This makes it ideal for lookups because you can search by any identifier and retrieve the `LAGO_EXTERNAL_CUSTOMER_ID` (operator_id) needed for detailed queries in other systems.

---

## Key Lookup Fields

| Field | Description | Example |
|-------|-------------|---------|
| `P_STRIPE_ACCOUNT_ID` | Operator's Stripe Connect account | `acct_1RrBZ3Jj4HjJ3ss6` |
| `P_COMPANY_NAME` | Business/company name | `Kanoa Transportation` |
| `P_GENERAL_EMAIL` | Primary contact email | `info@kanoatransportation.com` |
| `LAGO_EXTERNAL_CUSTOMER_ID` | **Operator ID** (primary key) | `727c899e-f3d6-11ef-b401-0f804c13069e` |

### Output Fields

Once you find a customer, retrieve these core fields:

| Field | Description |
|-------|-------------|
| `LAGO_EXTERNAL_CUSTOMER_ID` | Operator ID for use in other queries |
| `P_COMPANY_NAME` | Company name |
| `P_GENERAL_EMAIL` | Contact email |
| `P_STRIPE_ACCOUNT_ID` | Stripe account ID |
| `LAGO_PLAN_NAME` | Current subscription plan |
| `CALCULATED_MRR` | Monthly recurring revenue |
| `LAGO_CUSTOMER_STATUS` | Billing status |
| `HS_COMPANY_ID` | HubSpot company ID |

---

## Lookup Queries

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

---

## Lookup by Stripe Account ID

Use when you have a Stripe Connect account ID (starts with `acct_`).

```sql
SELECT
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  P_STRIPE_ACCOUNT_ID as stripe_account,
  LAGO_PLAN_NAME as plan,
  CALCULATED_MRR as mrr,
  LAGO_CUSTOMER_STATUS as status
FROM MOOVS.CSM_MOOVS
WHERE P_STRIPE_ACCOUNT_ID = '<stripe_account_id>'
```

**Example:**
```sql
SELECT
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  P_STRIPE_ACCOUNT_ID as stripe_account,
  LAGO_PLAN_NAME as plan,
  CALCULATED_MRR as mrr
FROM MOOVS.CSM_MOOVS
WHERE P_STRIPE_ACCOUNT_ID = 'acct_1RrBZ3Jj4HjJ3ss6'
```

---

## Lookup by Company Name

Use when you have a partial or full company name.

### Exact Match
```sql
SELECT
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  P_STRIPE_ACCOUNT_ID as stripe_account,
  LAGO_PLAN_NAME as plan,
  CALCULATED_MRR as mrr
FROM MOOVS.CSM_MOOVS
WHERE LOWER(P_COMPANY_NAME) = LOWER('<company_name>')
```

### Partial Match (Fuzzy Search)
```sql
SELECT
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  P_STRIPE_ACCOUNT_ID as stripe_account,
  LAGO_PLAN_NAME as plan,
  CALCULATED_MRR as mrr
FROM MOOVS.CSM_MOOVS
WHERE LOWER(P_COMPANY_NAME) LIKE LOWER('%<search_term>%')
ORDER BY CALCULATED_MRR DESC
LIMIT 10
```

**Example:**
```sql
SELECT
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  LAGO_PLAN_NAME as plan,
  CALCULATED_MRR as mrr
FROM MOOVS.CSM_MOOVS
WHERE LOWER(P_COMPANY_NAME) LIKE LOWER('%kanoa%')
```

---

## Lookup by Email

Use when you have a contact email address.

```sql
SELECT
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  P_STRIPE_ACCOUNT_ID as stripe_account,
  LAGO_PLAN_NAME as plan,
  CALCULATED_MRR as mrr
FROM MOOVS.CSM_MOOVS
WHERE LOWER(P_GENERAL_EMAIL) = LOWER('<email>')
```

### Partial Email Match (Domain Search)
```sql
SELECT
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  LAGO_PLAN_NAME as plan,
  CALCULATED_MRR as mrr
FROM MOOVS.CSM_MOOVS
WHERE LOWER(P_GENERAL_EMAIL) LIKE LOWER('%@<domain>%')
ORDER BY CALCULATED_MRR DESC
LIMIT 10
```

---

## Multi-Field Search

When you're unsure what field the search term belongs to:

```sql
SELECT
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  P_STRIPE_ACCOUNT_ID as stripe_account,
  LAGO_PLAN_NAME as plan,
  CALCULATED_MRR as mrr
FROM MOOVS.CSM_MOOVS
WHERE
  LOWER(P_COMPANY_NAME) LIKE LOWER('%<search_term>%')
  OR LOWER(P_GENERAL_EMAIL) LIKE LOWER('%<search_term>%')
  OR P_STRIPE_ACCOUNT_ID LIKE '%<search_term>%'
ORDER BY CALCULATED_MRR DESC
LIMIT 10
```

---

## Full Customer Details Query

Once you've identified the customer, get complete details:

```sql
SELECT
  -- Identity
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  P_STRIPE_ACCOUNT_ID as stripe_account,
  PHONE_NUMBER,

  -- Billing
  LAGO_PLAN_NAME as plan,
  LAGO_PLAN_INTERVAL as billing_cycle,
  CALCULATED_MRR as mrr,
  LAGO_STATUS as billing_status,

  -- Usage/Reservations
  R_TOTAL_RESERVATIONS_COUNT as total_reservations,
  R_LAST_30_DAYS_RESERVATIONS_COUNT as reservations_30d,
  R_T12M_TOTAL_AMOUNT as revenue_12m,
  R_LAST_TRIP_CREATED_AT as last_trip,

  -- Engagement
  DA_ENGAGEMENT_STATUS as engagement_status,
  DA_DAYS_SINCE_LAST_ASSIGNMENT as days_since_active,

  -- Operator Setup
  P_VEHICLES_TOTAL as vehicles,
  P_DRIVERS_COUNT as drivers,
  P_SETUP_SCORE as setup_score,

  -- CRM (HubSpot)
  HS_C_ID as hubspot_company_id,
  HS_D_STAGE_NAME as deal_stage,
  HS_D_OWNER_NAME as account_owner,
  HS_C_PROPERTY_CUSTOMER_SEGMENT as segment,

  -- Dates
  LAGO_CREATED_AT as billing_since,
  P_CREATED_DATE as operator_created
FROM MOOVS.CSM_MOOVS
WHERE LAGO_EXTERNAL_CUSTOMER_ID = '<operator_id>'
```

---

## List Active Customers

Get a list of active customers for validation or sampling:

```sql
SELECT
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  P_STRIPE_ACCOUNT_ID as stripe_account,
  LAGO_PLAN_NAME as plan,
  CALCULATED_MRR as mrr
FROM MOOVS.CSM_MOOVS
WHERE LAGO_CUSTOMER_STATUS = 'active'
ORDER BY CALCULATED_MRR DESC
LIMIT 20
```

---

## Output Format

### Lookup Results

```markdown
## Customer Lookup Results for: "{search_term}"

Found {X} potential matches:

| # | Company Name | Operator ID | Email | Plan | MRR |
|---|--------------|-------------|-------|------|-----|
| 1 | {name} | {id} | {email} | {plan} | ${mrr} |
| 2 | {name} | {id} | {email} | {plan} | ${mrr} |
| 3 | {name} | {id} | {email} | {plan} | ${mrr} |

**Best Match:** {company name} (operator_id: {id})

Would you like me to pull the full profile for any of these?
```

### No Results Found

If the query returns 0 rows:

```markdown
## Customer Lookup: No Results Found

Search term: "{search_term}"

Possible reasons:
- **Churned customer**: Account may no longer be active
- **Different identifier**: Try searching by company name or email instead
- **Data sync delay**: Recent accounts may not be in the CSM view yet
- **Typo**: Verify the search term is correct

**Suggestions:**
1. Try a partial company name search
2. Check if the Stripe account ID format is correct (should start with `acct_`)
3. Search by email domain instead of exact email
```

---

## Workflow Integration

Once you find the operator_id, use it for detailed queries:

1. **Billing (Lago):** `mcp__lago__get_customer` with `external_customer_id`
2. **Invoices (Lago):** `mcp__lago__list_invoices` filtered by customer
3. **Reservations (Metabase):** Query MOZART model with `OPERATOR_ID`
4. **Stripe Payments (Metabase):** Query via JOIN with `OPERATOR_ID`
5. **HubSpot:** Search by company name or use `HS_COMPANY_ID` if available

---

## Available Fields in CSM_MOOVS

### Identity Fields
| Field | Description |
|-------|-------------|
| LAGO_EXTERNAL_CUSTOMER_ID | Primary operator ID |
| P_COMPANY_NAME | Company name |
| P_GENERAL_EMAIL | Primary email |
| P_STRIPE_ACCOUNT_ID | Stripe Connect account |
| PHONE_NUMBER | Contact phone |

### Billing Fields (Lago)
| Field | Description |
|-------|-------------|
| LAGO_STATUS | Subscription status |
| LAGO_PLAN_NAME | Subscription plan name |
| LAGO_PLAN_INTERVAL | monthly/yearly |
| LAGO_PLAN_CODE | Plan identifier |
| CALCULATED_MRR | Monthly recurring revenue |
| LAGO_CREATED_AT | Billing account created |
| LAGO_SUBSCRIPTION_AT | Subscription started |
| LAGO_LIFETIME_DAYS | Days as customer |

### Usage/Reservation Fields
| Field | Description |
|-------|-------------|
| R_TOTAL_RESERVATIONS_COUNT | Total reservations |
| R_LAST_30_DAYS_RESERVATIONS_COUNT | Last 30 days reservations |
| R_T12M_TOTAL_AMOUNT | Last 12 months revenue |
| R_LAST_TRIP_CREATED_AT | Most recent trip |

### Engagement Fields
| Field | Description |
|-------|-------------|
| DA_ENGAGEMENT_STATUS | Engagement classification |
| DA_DAYS_SINCE_LAST_ASSIGNMENT | Days since last driver assignment |
| DA_LAST_ASSIGNED_DRIVER_AT | Last driver assignment date |

### Operator Setup Fields
| Field | Description |
|-------|-------------|
| P_VEHICLES_TOTAL | Number of vehicles |
| P_DRIVERS_COUNT | Number of drivers |
| P_TOTAL_MEMBERS | Team members |
| P_SETUP_SCORE | Onboarding completion |

### CRM Fields (HubSpot)
| Field | Description |
|-------|-------------|
| HS_C_ID | HubSpot company ID |
| HS_D_DEAL_ID | HubSpot deal ID |
| HS_D_STAGE_NAME | Current deal stage |
| HS_D_OWNER_NAME | Account owner |
| HS_C_PROPERTY_CUSTOMER_SEGMENT | Customer segment |
| HS_C_PROPERTY_MOOVS_FLEET_SIZE | Fleet size |
| HS_D_CHURN_STATUS | Churn status |

---

## Edge Cases

### Stripe Account Not Found
If a Stripe account ID returns no results:
- The customer may have churned and been removed from the active view
- The Stripe account may belong to a different environment (test vs prod)
- Try searching by company name or email instead

### Multiple Matches
If multiple customers match:
- Sort by MRR to prioritize higher-value customers
- Check billing status to filter active vs churned
- Use additional fields (email, stripe account) to narrow down

### Case Sensitivity
- Company names and emails are stored as-is
- Always use `LOWER()` for case-insensitive matching
- Stripe account IDs are case-sensitive (use exact match)
