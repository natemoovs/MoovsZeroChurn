---
name: customer-research
description: Customer research assistant for understanding Moovs operators. Retrieves billing data from Lago, CRM data from HubSpot, and synthesizes a complete customer profile. Use when you need to understand an operator's health, usage, billing status, or prepare for customer conversations.
---

# Moovs Customer Research Skill

This skill provides a comprehensive view of any Moovs operator by pulling data from multiple sources and synthesizing it into actionable insights.

## Why This Matters

From the MOOVING philosophy:

> "We need to be more thoughtful about what we commit to."

You can't be thoughtful about commitments without understanding your customers. Customer research isn't just for sales—it's the foundation of good product decisions:

- **Problem discovery:** Is this a real problem for real customers?
- **Prioritization:** Which customers are affected and how much do they matter?
- **Commitment tracking:** Are we honoring what we promised?
- **Churn prevention:** Who's at risk and why?

## When to Use This Skill

Use this skill when you need to:

- **Prepare for a customer call** - Get a complete profile before the conversation
- **Understand billing health** - Check payment status, plan, and invoice history
- **Assess customer value** - Understand MRR, lifetime value, and engagement
- **Investigate an issue** - Pull all context about a specific operator
- **Make a commitment decision** - Should we prioritize this customer's request?
- **Identify churn risk** - Who's showing warning signs?

## Available Reports

When invoking this skill, specify what type of insight you need:

### 1. Full Customer Profile

```
/customer-research profile <operator_id>
```

Complete 360-degree view of an operator:

- Company info and contacts
- Billing status and plan details
- Invoice history and payment health
- Support ticket history
- Feature usage (if available)

### 2. Billing Overview

```
/customer-research billing <operator_id>
```

Focused billing and subscription analysis:

- Current plan and pricing
- Billing cycle (monthly/annual)
- Payment history and health
- Outstanding invoices
- Next bill date

### 3. Customer Health Score

```
/customer-research health <operator_id>
```

Risk assessment:

- Payment health
- Engagement signals
- Support ticket trends
- Churn risk indicators

### 4. Reservations/Usage

```
/customer-research reservations <operator_id>
```

Reservation and usage analysis:

- Trip volume and trends
- Revenue by trip type
- Collection rate
- Recent activity
- Engagement signals

### 5. Customer Lookup

```
/customer-research lookup <search_term>
```

Find a customer by name, email, Stripe account ID, or partial ID.

**Supported search types:**

- **Stripe Account ID:** `acct_1RrBZ3Jj4HjJ3ss6`
- **Company Name:** `Kanoa Transportation` or partial `kanoa`
- **Email:** `info@company.com` or domain `@company.com`
- **Operator ID:** `727c899e-f3d6-11ef-b401-0f804c13069e`

## Data Sources

This skill integrates with:

### 1. Lago (Billing)

- Customer billing profile
- Subscription/plan details
- Invoice history
- Payment status

**Tool:** `mcp__lago__get_customer`, `mcp__lago__list_invoices`

### 2. HubSpot (CRM)

- Company information
- Contact details
- Deal history
- Notes and activities

**Tool:** `mcp__hubspot__hubspot-search-objects`, `mcp__hubspot__hubspot-list-associations`

### 3. Metabase (Usage/Reservations)

- Reservation volume and trends
- Revenue and collection metrics
- Trip type breakdown
- Driver and vehicle usage
- Customer engagement signals

**Tool:** `mcp__metabase__execute_query`
**Card Reference:** 642 (MODEL - Moovs Operator Reservations)
**Database:** Snowflake (ID: 2)

### 4. Metabase (Stripe Payments)

- Credit card charge history
- Failed payments and decline reasons
- Disputes and refunds
- Risk scores and fraud indicators

**Tool:** `mcp__metabase__execute_query`
**Card Reference:** 855 (Moovs Platform Charges - Model)
**Join:** POSTGRES_SWOOP.OPERATOR on STRIPE_ACCOUNT to filter by OPERATOR_ID

### 5. Metabase (Customer Lookup - CSM)

- Master customer view combining all data sources
- Lookup by Stripe account ID, company name, or email
- Returns operator_id for use in other queries
- Includes MRR, plan, billing status, and usage metrics

**Tool:** `mcp__metabase__execute_query`
**Card Reference:** 1469 (CSM_MOOVS)
**Table:** MOOVS.CSM_MOOVS
**Database:** Snowflake (ID: 2)

### 6. Notion (Support/Product)

- Support tickets
- Feature requests
- Product commitments

**Tool:** `mcp__notion__API-query-data-source`

## How It Works

1. **Input:** User provides operator_id or search criteria
2. **Fetch:** Pull data from Lago, HubSpot, and Notion
3. **Synthesize:** Combine into unified customer view
4. **Analyze:** Calculate health scores and surface insights
5. **Output:** Formatted report with recommendations

## Process

When the user invokes this skill:

1. **Identify the customer**
   - If operator_id provided, use directly
   - If search term, look up in HubSpot/Lago first

2. **Fetch data in parallel**
   - Lago: Customer + Invoices
   - HubSpot: Company + Contacts + Deals
   - Metabase: Reservations (query by OPERATOR_ID)
   - Notion: Related tickets (optional)

3. **Synthesize and analyze**
   - Combine data sources
   - Calculate health metrics
   - Identify patterns and risks

4. **Present findings**
   - Formatted report
   - Key insights highlighted
   - Recommended actions

## Starting the Process

When invoked, ask:

> "Which customer would you like to research?
>
> Please provide:
>
> - **Operator ID** (e.g., `727c899e-f3d6-11ef-b401-0f804c13069e`)
> - **Stripe Account ID** (e.g., `acct_1RrBZ3Jj4HjJ3ss6`)
> - **Company name** (I'll look it up)
> - **Email address** (I'll find them)
>
> What type of research do you need?
>
> - **Profile** - Full 360-degree view
> - **Billing** - Payment and subscription focus
> - **Reservations** - Trip volume and usage analysis
> - **Health** - Risk assessment
> - **Lookup** - Just find them"

## Report Templates

For detailed output formats and analysis frameworks, see:

- [BILLING_GUIDE.md](BILLING_GUIDE.md) - Lago billing analysis
- [METABASE_GUIDE.md](METABASE_GUIDE.md) - Reservation/usage analysis
- [STRIPE_GUIDE.md](STRIPE_GUIDE.md) - Stripe payment/dispute analysis
- [LOOKUP_GUIDE.md](LOOKUP_GUIDE.md) - Customer lookup by Stripe ID, name, or email
- [RESEARCH_GUIDE.md](RESEARCH_GUIDE.md) - Full research frameworks

## Integration with Other Skills

Customer research connects to the full MOOVING workflow:

```
[Customer Request/Issue]
    |
    v
/customer-research --> Understand who's asking and their context
    |
    v
/problem --> Capture the problem with customer context
    |
    v
/product-ops --> Track in pipeline, note customer impact
    |
    v
/shaping --> Shape with customer constraints in mind
    |
    v
[Betting Table] --> Decide with full customer visibility
```

## Philosophy: Know Your Customers

Every commitment, every feature, every bug fix affects real operators running real businesses. Customer research ensures you:

- **Don't over-promise** to customers who aren't strategic
- **Don't under-deliver** to customers who are critical
- **Understand context** before making product decisions
- **See patterns** across your customer base

The best product decisions come from deep customer understanding. This skill makes that understanding accessible in seconds.
