# Customer Research Analysis Guide

This guide provides frameworks for comprehensive customer research combining data from Lago (billing), HubSpot (CRM), and Notion (product/support).

---

## Data Source Reference

| Source | Purpose | Key Identifier |
|--------|---------|----------------|
| **Lago** | Billing, subscriptions, invoices | `external_customer_id` = operator_id |
| **HubSpot** | Company info, contacts, deals | Search by company name or custom operator_id property |
| **Metabase (CSM Lookup)** | Customer lookup, master view | `P_STRIPE_ACCOUNT_ID`, `P_COMPANY_NAME`, `P_GENERAL_EMAIL` (Card 1469) |
| **Metabase (Reservations)** | Reservations, trips, usage metrics | `OPERATOR_ID` = operator_id (Card 642) |
| **Metabase (Stripe)** | Credit card charges, failed payments, disputes | `OPERATOR_ID` via JOIN (Card 855) |
| **Notion** | Support tickets, feature requests | Tags or name mentions |

---

## 1. Full Customer Profile

### Purpose
Complete 360-degree view of an operator for calls, reviews, or strategic decisions.

### Data Fetching Strategy

**Step 1: Get Lago Billing Data**
```
Tools: mcp__lago__get_customer, mcp__lago__list_invoices
Input: operator_id
```

**Step 2: Get HubSpot CRM Data**
```
Tools: mcp__hubspot__hubspot-search-objects (companies),
       mcp__hubspot__hubspot-list-associations (contacts)
Input: Search by company name or operator_id property
```

**Step 3: Get Metabase Reservation Data**
```
Tool: mcp__metabase__execute_query
Database: 2 (Snowflake)
Query: SELECT from MODEL - Moovs Operator Reservations WHERE OPERATOR_ID = '<operator_id>'
```

See [METABASE_GUIDE.md](METABASE_GUIDE.md) for detailed query examples.

**Step 4: Get Stripe Payment Data**
```
Tool: mcp__metabase__execute_query
Database: 2 (Snowflake)
Query: SELECT from MOZART_NEW.MOOVS_PLATFORM_CHARGES c
       JOIN POSTGRES_SWOOP.OPERATOR o ON c.STRIPE_ACCOUNT_ID = o.STRIPE_ACCOUNT
       WHERE o.OPERATOR_ID = '<operator_id>'
```

See [STRIPE_GUIDE.md](STRIPE_GUIDE.md) for detailed query examples.

**Step 5: Get Notion Tickets (Optional)**
```
Tool: mcp__notion__API-query-data-source
Database: Moovs Tickets (13b8aeaa-3759-80f8-8d7c-dd2f627d2578)
Filter: Tags or description contains customer name/id
```

### Output Format

```markdown
# Customer Profile: [Company Name]

**Report Date:** [timestamp]
**Operator ID:** [operator_id]

---

## Company Overview

| Field | Value |
|-------|-------|
| **Company Name** | {name} |
| **Legal Name** | {legal_name} |
| **Industry** | Ground Transportation |
| **Location** | {city, state} |
| **Website** | {url} |
| **Customer Since** | {earliest date across systems} |

---

## Key Contacts

| Name | Role | Email | Phone | Primary |
|------|------|-------|-------|---------|
| {name} | {title} | {email} | {phone} | Yes/No |
| ... | ... | ... | ... | ... |

---

## Billing Summary

| Metric | Value |
|--------|-------|
| **Current Plan** | {plan_name} |
| **Billing Cycle** | {Monthly / Annual} |
| **MRR** | ${mrr} |
| **Total Lifetime Value** | ${ltv} |
| **Payment Health** | {Good / At Risk / Delinquent} |
| **Outstanding Balance** | ${balance} |
| **Next Bill Date** | {date} |

*See [Billing Details](#billing-details) for full invoice history.*

---

## Relationship Summary

| Metric | Value |
|--------|-------|
| **Account Age** | {months/years} |
| **Deal History** | {count} deals, ${total} value |
| **Last Contact** | {date} - {type of interaction} |
| **NPS/Satisfaction** | {if available} |

---

## Product Engagement

| Metric | Value |
|--------|-------|
| **Total Reservations (12mo)** | {count} |
| **Monthly Avg Trips** | {count} |
| **Total Trip Revenue** | ${amount} |
| **Last Trip Date** | {date} |
| **Open Support Tickets** | {count} |
| **Feature Requests** | {count} |
| **Enterprise Commitments** | {count} |

---

## Health Assessment

### Overall Health Score: [X/100] - [Good/At Risk/Critical]

| Dimension | Score | Notes |
|-----------|-------|-------|
| Payment Health | {x}/100 | {brief note} |
| Engagement | {x}/100 | {brief note} |
| Support Load | {x}/100 | {brief note} |
| Growth Potential | {x}/100 | {brief note} |

### Risk Factors
- {List any concerns}

### Opportunities
- {List any upsell/expansion opportunities}

---

## Recent Activity

### Last 30 Days
- {date}: {activity type} - {description}
- {date}: {activity type} - {description}
- ...

---

## Recommendations

1. **For this call/interaction:** {specific prep advice}
2. **For account health:** {what to address}
3. **For growth:** {opportunities to explore}

---

## Appendix

### Billing Details
{Full invoice table from BILLING_GUIDE.md}

### Support Ticket History
| Ticket | Title | Status | Priority | Created |
|--------|-------|--------|----------|---------|
| DOOM-XXX | ... | ... | ... | ... |

### Deal History
| Deal | Stage | Amount | Close Date |
|------|-------|--------|------------|
| ... | ... | ... | ... |
```

---

## 2. Customer Health Score

### Purpose
Quick risk assessment to identify churn risk or payment problems.

### Health Score Calculation

#### Overall Health Score (0-100)

Weighted average of four dimensions:

| Dimension | Weight | Score Range |
|-----------|--------|-------------|
| Payment Health | 40% | 0-100 |
| Engagement | 25% | 0-100 |
| Support Health | 20% | 0-100 |
| Growth Signals | 15% | 0-100 |

#### Payment Health (40%)
See [BILLING_GUIDE.md](BILLING_GUIDE.md) for Lago billing and [STRIPE_GUIDE.md](STRIPE_GUIDE.md) for credit card payment analysis.

```
Base: 100
- Each overdue Lago invoice: -10
- Stripe failed payment (last 90d): -15
- Stripe payment success rate < 95%: -10
- Avg days to pay > terms: -10
- No activity 90+ days: -20
- Active Stripe dispute: -20
- High risk score charges: -10
```

#### Engagement Score (25%)
```
Base: 100
- No reservations in 30 days: -20
- No reservations in 60 days: -30 (additional)
- Declining reservation trend (MoM): -15
- Collection rate < 80%: -10
+ Growing reservation trend: +10
+ High collection rate (>95%): +10
+ Driver app adoption >50%: +5
```

#### Support Health (20%)
```
Base: 100
- Open ticket > 7 days: -10 each
- Open ticket > 30 days: -20 each
- High priority unresolved: -15 each
- Negative feedback: -20
+ Tickets resolved quickly: +5
+ Positive feedback: +10
```

#### Growth Signals (15%)
```
Base: 50 (neutral)
+ Plan upgrade in last 6 months: +20
+ Increased usage: +15
+ Added users/seats: +10
+ Expressed expansion interest: +15
- Plan downgrade: -20
- Reduced usage: -15
- Cancellation mentioned: -30
```

### Health Categories

| Score | Status | Action |
|-------|--------|--------|
| 80-100 | Healthy | Maintain relationship, look for expansion |
| 60-79 | Monitor | Check in proactively, address any issues |
| 40-59 | At Risk | Urgent outreach, understand problems |
| 0-39 | Critical | Immediate intervention required |

### Output Format

```markdown
## Customer Health Report: [Company Name]

### Overall Score: [X/100] - [Status]

| Dimension | Score | Status | Key Factor |
|-----------|-------|--------|------------|
| Payment | {x}/100 | {emoji} | {main issue or positive} |
| Engagement | {x}/100 | {emoji} | {main issue or positive} |
| Support | {x}/100 | {emoji} | {main issue or positive} |
| Growth | {x}/100 | {emoji} | {main issue or positive} |

### Risk Factors (Immediate Attention)
1. {Most critical issue}
2. {Second issue}
3. {Third issue}

### Positive Signals
1. {Good thing}
2. {Good thing}

### Recommended Actions
| Priority | Action | Owner |
|----------|--------|-------|
| High | {action} | {who should do this} |
| Medium | {action} | {who} |
| Low | {action} | {who} |

### Trend
{Is health improving, declining, or stable compared to 30/60/90 days ago?}
```

---

## 3. Customer Lookup

### Purpose
Find a customer when you don't have the exact operator_id.

### Search Strategy

**Option 1: Search CSM_MOOVS (Recommended)**

The CSM_MOOVS table is the master lookup view. Use it to search by Stripe ID, company name, or email.

```
Tool: mcp__metabase__execute_query
Database: 2 (Snowflake)
Table: MOOVS.CSM_MOOVS
```

**By Stripe Account ID:**
```sql
SELECT
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  P_STRIPE_ACCOUNT_ID as stripe_account,
  LAGO_PLAN_NAME as plan,
  CALCULATED_MRR as mrr
FROM MOOVS.CSM_MOOVS
WHERE P_STRIPE_ACCOUNT_ID = '<stripe_account_id>'
```

**By Company Name (Fuzzy):**
```sql
SELECT
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  LAGO_PLAN_NAME as plan,
  CALCULATED_MRR as mrr
FROM MOOVS.CSM_MOOVS
WHERE LOWER(P_COMPANY_NAME) LIKE LOWER('%<search_term>%')
ORDER BY CALCULATED_MRR DESC
LIMIT 10
```

**By Email:**
```sql
SELECT
  LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
  P_COMPANY_NAME as company_name,
  P_GENERAL_EMAIL as email,
  LAGO_PLAN_NAME as plan,
  CALCULATED_MRR as mrr
FROM MOOVS.CSM_MOOVS
WHERE LOWER(P_GENERAL_EMAIL) = LOWER('<email>')
```

See [LOOKUP_GUIDE.md](LOOKUP_GUIDE.md) for complete query examples.

**Option 2: Search HubSpot Companies**
```
Tool: mcp__hubspot__hubspot-search-objects
objectType: companies
query: "{search term}"
properties: ["name", "domain", "operator_id", "city", "state"]
```

**Option 3: Search Lago Customers**
```
Tool: mcp__lago__list_customers
# Then filter results client-side by name match
```

**Option 4: Search Notion Tickets**
```
Tool: mcp__notion__API-query-data-source
Filter: Name or Tags contains search term
```

### Output Format

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

---

## 4. Comparative Analysis

### Purpose
Compare customers for prioritization or pattern analysis.

### Use Cases
- "Compare our top 5 customers by MRR"
- "Which enterprise customers are at risk?"
- "Show me customers with outstanding balances"

### Output Format

```markdown
## Customer Comparison: [Criteria]

| Customer | MRR | Health | Plan | Payment Status | Open Tickets |
|----------|-----|--------|------|----------------|--------------|
| {name} | ${x} | {score} | {plan} | {status} | {count} |
| {name} | ${x} | {score} | {plan} | {status} | {count} |
| ... | ... | ... | ... | ... | ... |

### Insights
1. {Pattern or insight}
2. {Pattern or insight}
3. {Pattern or insight}

### Recommended Actions
1. {Action for specific customer}
2. {Action for group}
```

---

## HubSpot Query Patterns

### Find Company by Name
```json
Tool: mcp__hubspot__hubspot-search-objects
{
  "objectType": "companies",
  "query": "Acme Transportation",
  "properties": ["name", "domain", "city", "state", "phone", "operator_id"],
  "limit": 10
}
```

### Get Contacts for a Company
```json
Tool: mcp__hubspot__hubspot-list-associations
{
  "objectType": "companies",
  "objectId": "{company_id}",
  "toObjectType": "contacts"
}

Then: mcp__hubspot__hubspot-batch-read-objects to get contact details
```

### Get Deals for a Company
```json
Tool: mcp__hubspot__hubspot-list-associations
{
  "objectType": "companies",
  "objectId": "{company_id}",
  "toObjectType": "deals"
}
```

### Search by Custom Property (operator_id)
```json
Tool: mcp__hubspot__hubspot-search-objects
{
  "objectType": "companies",
  "filterGroups": [
    {
      "filters": [
        {
          "propertyName": "operator_id",
          "operator": "EQ",
          "value": "12345"
        }
      ]
    }
  ],
  "properties": ["name", "domain", "operator_id"]
}
```

---

## Notion Query Patterns

### Find Tickets for a Customer
```json
Tool: mcp__notion__API-query-data-source
{
  "data_source_id": "13b8aeaa-3759-80f8-8d7c-dd2f627d2578",
  "filter": {
    "or": [
      {
        "property": "Tags",
        "multi_select": {
          "contains": "Customer Name"
        }
      },
      {
        "property": "Tags",
        "multi_select": {
          "contains": "Enterprise"
        }
      }
    ]
  }
}
```

### Find Enterprise Commitments
```json
{
  "filter": {
    "and": [
      {
        "property": "Tags",
        "multi_select": {
          "contains": "Enterprise"
        }
      },
      {
        "property": "Due Date",
        "date": {
          "is_not_empty": true
        }
      }
    ]
  }
}
```

---

## Best Practices

### Before a Customer Call
1. Run full profile report
2. Note any outstanding issues (billing, support)
3. Review recent interactions
4. Identify talking points (upsell, concerns to address)

### For Prioritization Decisions
1. Pull health scores for relevant customers
2. Compare MRR and strategic value
3. Consider support load and payment health
4. Factor in enterprise commitments

### For Churn Analysis
1. Run health reports on at-risk segment
2. Look for common patterns
3. Identify leading indicators
4. Prioritize intervention list

### Data Freshness
- Lago data: Real-time
- HubSpot data: Near real-time
- Metabase (Reservations): Near real-time (Snowflake sync)
- Metabase (Stripe): Near real-time (Snowflake sync)
- Notion data: Depends on team updates
- Always note when data was last updated if relevant
