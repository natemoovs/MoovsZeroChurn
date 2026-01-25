# Lago Billing Analysis Guide

This guide provides the framework for retrieving and analyzing customer billing data from Lago.

## Overview

Lago is Moovs' billing system. Every operator has a corresponding Lago customer record where:

- **Moovs operator_id** = **Lago external_customer_id**

This mapping is critical—always use the operator_id when querying Lago.

---

## Step 1: Fetch Customer Details

### Tool

```
mcp__lago__get_customer
```

### Parameters

```json
{
  "external_customer_id": "<operator_id>"
}
```

### Key Fields to Extract

| Field                       | Description                       |
| --------------------------- | --------------------------------- |
| `lago_id`                   | Lago's internal customer ID       |
| `external_id`               | Moovs operator_id (confirmation)  |
| `name`                      | Customer/company name             |
| `email`                     | Billing email                     |
| `legal_name`                | Legal entity name                 |
| `currency`                  | Billing currency (USD, etc.)      |
| `net_payment_term`          | Days until payment due            |
| `timezone`                  | Customer's timezone               |
| `tax_identification_number` | Tax ID if applicable              |
| `created_at`                | When customer was created in Lago |

---

## Step 2: Fetch Invoice History

### Tool

```
mcp__lago__list_invoices
```

### Parameters

```json
{
  "customer_external_id": "<operator_id>",
  "per_page": 100
}
```

### Optional Filters

- `status`: Filter by invoice status (`draft`, `finalized`, `voided`)
- `payment_status`: Filter by payment (`pending`, `succeeded`, `failed`)
- `invoice_type`: Filter by type (`subscription`, `one_off`, `credit`, `advance_charges`)
- `issuing_date_from` / `issuing_date_to`: Date range filters

### Key Fields to Extract

#### Invoice Level

| Field                | Description                         |
| -------------------- | ----------------------------------- |
| `lago_id`            | Invoice ID                          |
| `sequential_id`      | Invoice number (MOOV-001, etc.)     |
| `invoice_type`       | `subscription`, `one_off`, `credit` |
| `status`             | `draft`, `finalized`, `voided`      |
| `payment_status`     | `pending`, `succeeded`, `failed`    |
| `total_amount_cents` | Total in cents                      |
| `currency`           | Currency code                       |
| `issuing_date`       | When invoice was issued             |
| `payment_due_date`   | When payment is due                 |
| `from_date`          | Billing period start                |
| `to_date`            | Billing period end                  |

#### Subscription Details (from subscription invoices)

| Field Path                        | Description                                   |
| --------------------------------- | --------------------------------------------- |
| `subscriptions[].plan.name`       | Plan name (e.g., "Pro Plan")                  |
| `subscriptions[].plan.code`       | Plan code (e.g., "pro_monthly")               |
| `subscriptions[].plan.interval`   | `monthly`, `yearly`, `weekly`, `quarterly`    |
| `subscriptions[].subscription_at` | When subscription started                     |
| `subscriptions[].started_at`      | Subscription start date                       |
| `subscriptions[].status`          | `active`, `pending`, `canceled`, `terminated` |
| `subscriptions[].billing_time`    | `calendar` or `anniversary`                   |

---

## Step 3: Calculate Metrics

### Billing Metrics

| Metric                        | Calculation                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| **Total Invoiced (All Time)** | Sum of `total_amount_cents` for all finalized invoices        |
| **Total Paid**                | Sum where `payment_status` = `succeeded`                      |
| **Outstanding Balance**       | Sum where `payment_status` = `pending` or `failed`            |
| **Average Invoice Amount**    | Total / Count of finalized invoices                           |
| **MRR**                       | Latest subscription invoice amount (for monthly) or annual/12 |

### Payment Health Metrics

| Metric                   | Calculation                                       | Healthy Range      |
| ------------------------ | ------------------------------------------------- | ------------------ |
| **Payment Success Rate** | Paid / Total Finalized                            | > 95%              |
| **Days to Pay (Avg)**    | Avg of (payment_date - issuing_date)              | < net_payment_term |
| **Overdue Invoices**     | Count where payment_due_date < today AND not paid | 0                  |
| **Failed Payments**      | Count where payment_status = `failed`             | 0                  |

### Subscription Metrics

| Metric                 | Source                                       |
| ---------------------- | -------------------------------------------- |
| **Current Plan**       | Most recent subscription invoice `plan.name` |
| **Billing Cycle**      | `plan.interval` (monthly/yearly)             |
| **Subscription Start** | `subscriptions[].subscription_at`            |
| **Next Bill Date**     | Most recent invoice `to_date` + 1 day        |
| **Subscription Age**   | Today - subscription_at                      |

---

## Step 4: Output Format

### Billing Overview Report

```markdown
## Billing Overview for [Customer Name]

**Report Generated:** [timestamp]

---

### Customer Profile

| Field                | Value                       |
| -------------------- | --------------------------- |
| **Operator ID**      | {operator_id}               |
| **Lago Customer ID** | {lago_id}                   |
| **Legal Name**       | {legal_name}                |
| **Billing Email**    | {email}                     |
| **Currency**         | {currency}                  |
| **Payment Terms**    | Net {net_payment_term} days |
| **Customer Since**   | {created_at}                |

---

### Subscription Details

| Field                      | Value                          |
| -------------------------- | ------------------------------ |
| **Current Plan**           | {plan_name}                    |
| **Plan Code**              | {plan_code}                    |
| **Billing Cycle**          | {Monthly / Annual / Quarterly} |
| **Subscription Started**   | {subscription_start_date}      |
| **Current Billing Period** | {from_date} to {to_date}       |
| **Next Bill Date**         | {next_bill_date}               |
| **Subscription Status**    | {active / canceled / pending}  |

---

### Financial Summary

| Metric                        | Value             |
| ----------------------------- | ----------------- |
| **Total Invoiced (All Time)** | ${total_invoiced} |
| **Total Paid**                | ${total_paid}     |
| **Outstanding Balance**       | ${outstanding}    |
| **Current MRR**               | ${mrr}            |

---

### Invoice Status Breakdown

| Status  | Count | Amount    |
| ------- | ----- | --------- |
| Paid    | {x}   | ${amount} |
| Pending | {x}   | ${amount} |
| Failed  | {x}   | ${amount} |
| Draft   | {x}   | ${amount} |
| Voided  | {x}   | ${amount} |

---

### Recent Invoices (Last 5)

| Invoice # | Date   | Type   | Period        | Amount    | Status   |
| --------- | ------ | ------ | ------------- | --------- | -------- |
| {seq_id}  | {date} | {type} | {from} - {to} | ${amount} | {status} |
| ...       | ...    | ...    | ...           | ...       | ...      |

---

### Payment Health Assessment

**Overall Status:** {Good / At Risk / Delinquent}

| Indicator                  | Value   | Status         |
| -------------------------- | ------- | -------------- |
| Payment Success Rate       | {x}%    | {status_emoji} |
| Overdue Invoices           | {count} | {status_emoji} |
| Failed Payments (Last 90d) | {count} | {status_emoji} |
| Avg Days to Pay            | {days}  | {status_emoji} |

---

### Risk Flags

{List any concerns, e.g.:}

- 2 invoices overdue by more than 30 days
- Payment failed on last invoice (retry pending)
- No subscription found (one-off customer only)

---

### Recommendations

1. {Action item based on findings}
2. {Action item based on findings}
```

---

## Health Score Calculation

### Payment Health Score (0-100)

```
Base Score: 100

Deductions:
- Each overdue invoice: -10
- Each failed payment (last 90 days): -15
- Payment success rate < 95%: -10
- Payment success rate < 80%: -25 (additional)
- Avg days to pay > net_payment_term: -10
- No recent activity (90+ days): -20

Floor: 0
```

### Health Categories

| Score  | Status     | Description                          |
| ------ | ---------- | ------------------------------------ |
| 80-100 | Good       | Healthy customer, paying on time     |
| 60-79  | At Risk    | Some payment issues, monitor closely |
| 40-59  | Warning    | Significant payment problems         |
| 0-39   | Delinquent | Requires immediate attention         |

---

## Query Examples

### Get Customer + All Invoices

```python
# Pseudo-code for the workflow

# 1. Get customer details
customer = lago.get_customer(external_customer_id=operator_id)

# 2. Get all invoices
invoices = lago.list_invoices(customer_external_id=operator_id, per_page=100)

# 3. Extract subscription details from most recent subscription invoice
subscription_invoices = [i for i in invoices if i.invoice_type == "subscription"]
latest_sub = subscription_invoices[0] if subscription_invoices else None

if latest_sub:
    plan = latest_sub.subscriptions[0].plan
    plan_name = plan.name
    billing_cycle = plan.interval
    sub_start = latest_sub.subscriptions[0].subscription_at
    next_bill = latest_sub.to_date + 1 day
```

### Filter for Outstanding Invoices

```json
{
  "customer_external_id": "<operator_id>",
  "status": "finalized",
  "payment_status": "pending"
}
```

### Filter for Recent Invoices (Last 90 Days)

```json
{
  "customer_external_id": "<operator_id>",
  "issuing_date_from": "2024-10-01",
  "issuing_date_to": "2025-01-01"
}
```

---

## Edge Cases

### No Subscription Found

Some operators may only have one-off invoices (custom billing). In this case:

- Report "No active subscription"
- Calculate billing metrics from one-off invoices
- Note this is an unusual billing arrangement

### Multiple Subscriptions

If a customer has multiple active subscriptions, report on all of them separately.

### Voided/Credited Invoices

- Exclude voided invoices from financial totals
- Note any credits or refunds separately
- Credit invoices have negative amounts

### Currency Handling

- Always report amounts in the customer's currency
- Note if multi-currency invoices exist

---

## Integration Notes

### Connecting to Other Data Sources

After pulling Lago data, you may want to enrich with:

1. **HubSpot** - Company details, contacts, deal history
2. **Notion** - Support tickets, feature requests
3. **Server Database** - Actual usage metrics, trip counts

The operator_id is the key that connects all systems.

### Common Joins

```
Lago.external_customer_id = operator_id
HubSpot.properties.operator_id = operator_id  (custom property)
Notion.Tags contains operator_id OR customer name
```
