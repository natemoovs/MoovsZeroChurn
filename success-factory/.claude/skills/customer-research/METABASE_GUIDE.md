# Metabase Reservation Analysis Guide

This guide provides the framework for retrieving and analyzing operator reservation data from Metabase.

---

## Overview

Metabase connects to the Moovs Snowflake data warehouse and provides access to reservation/trip data. The key model for customer research is:

- **Card ID:** 642
- **Name:** MODEL - Moovs Operator Reservations
- **Database:** Snowflake (ID: 2)

### Key Identifier

- **OPERATOR_ID** = Moovs operator_id (same as Lago external_customer_id)

---

## Step 1: Query Reservations by Operator

### Tool

```
mcp__metabase__execute_query
```

### Basic Query - All Reservations for an Operator

```sql
SELECT *
FROM "MOZART"."MODEL - Moovs Operator Reservations"
WHERE OPERATOR_ID = '<operator_id>'
ORDER BY PICKUP_DATE_TIME DESC
LIMIT 100
```

### Parameters

```json
{
  "database_id": 2,
  "query": "<SQL query>"
}
```

---

## Step 2: Common Analysis Queries

### Recent Reservations (Last 30 Days)

```sql
SELECT
  CONFIRMATION_NUMBER,
  PICKUP_DATE_TIME,
  STATUS_SLUG,
  TRIP_TYPE,
  TOTAL_AMOUNT,
  AMOUNT_PAID,
  BOOKING_CONTACT_FULL_NAME,
  PICKUP_ADDRESS,
  DROPOFF_ADDRESS
FROM "MOZART"."MODEL - Moovs Operator Reservations"
WHERE OPERATOR_ID = '<operator_id>'
  AND PICKUP_DATE_TIME >= DATEADD(day, -30, CURRENT_DATE())
ORDER BY PICKUP_DATE_TIME DESC
```

### Reservation Volume Summary

```sql
SELECT
  COUNT(*) as total_reservations,
  COUNT(CASE WHEN STATUS_SLUG = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN STATUS_SLUG = 'cancelled' THEN 1 END) as cancelled,
  COUNT(CASE WHEN STATUS_SLUG = 'pending' THEN 1 END) as pending,
  SUM(TOTAL_AMOUNT) as total_revenue,
  SUM(AMOUNT_PAID) as total_collected,
  AVG(TOTAL_AMOUNT) as avg_trip_value
FROM "MOZART"."MODEL - Moovs Operator Reservations"
WHERE OPERATOR_ID = '<operator_id>'
  AND PICKUP_DATE_TIME >= DATEADD(month, -12, CURRENT_DATE())
```

### Monthly Trend Analysis

```sql
SELECT
  DATE_TRUNC('month', PICKUP_DATE_TIME) as month,
  COUNT(*) as reservation_count,
  SUM(TOTAL_AMOUNT) as revenue,
  AVG(TOTAL_AMOUNT) as avg_trip_value,
  COUNT(CASE WHEN STATUS_SLUG = 'cancelled' THEN 1 END) as cancellations
FROM "MOZART"."MODEL - Moovs Operator Reservations"
WHERE OPERATOR_ID = '<operator_id>'
  AND PICKUP_DATE_TIME >= DATEADD(month, -12, CURRENT_DATE())
GROUP BY DATE_TRUNC('month', PICKUP_DATE_TIME)
ORDER BY month DESC
```

### Trip Type Breakdown

```sql
SELECT
  TRIP_TYPE,
  ORDER_TYPE,
  COUNT(*) as count,
  SUM(TOTAL_AMOUNT) as revenue,
  AVG(TOTAL_AMOUNT) as avg_value
FROM "MOZART"."MODEL - Moovs Operator Reservations"
WHERE OPERATOR_ID = '<operator_id>'
  AND PICKUP_DATE_TIME >= DATEADD(month, -6, CURRENT_DATE())
GROUP BY TRIP_TYPE, ORDER_TYPE
ORDER BY count DESC
```

### Payment Collection Analysis

```sql
SELECT
  COUNT(*) as total_trips,
  SUM(TOTAL_AMOUNT) as total_billed,
  SUM(AMOUNT_PAID) as total_collected,
  SUM(AMOUNT_DUE) as outstanding_balance,
  ROUND(SUM(AMOUNT_PAID) / NULLIF(SUM(TOTAL_AMOUNT), 0) * 100, 2) as collection_rate_pct
FROM "MOZART"."MODEL - Moovs Operator Reservations"
WHERE OPERATOR_ID = '<operator_id>'
  AND STATUS_SLUG = 'completed'
  AND PICKUP_DATE_TIME >= DATEADD(month, -12, CURRENT_DATE())
```

### Top Customers (Companies) for Operator

```sql
SELECT
  COMPANY_NAME,
  COUNT(*) as trip_count,
  SUM(TOTAL_AMOUNT) as total_revenue,
  AVG(TOTAL_AMOUNT) as avg_trip_value,
  MAX(PICKUP_DATE_TIME) as last_booking
FROM "MOZART"."MODEL - Moovs Operator Reservations"
WHERE OPERATOR_ID = '<operator_id>'
  AND COMPANY_NAME IS NOT NULL
  AND PICKUP_DATE_TIME >= DATEADD(month, -12, CURRENT_DATE())
GROUP BY COMPANY_NAME
ORDER BY total_revenue DESC
LIMIT 10
```

### Driver Performance Summary

```sql
SELECT
  DRIVER_FULL_NAME,
  COUNT(*) as trip_count,
  AVG(AVG_RATING) as avg_rating,
  SUM(TOTAL_DRIVER_EARNINGS_AMT) as total_earnings,
  COUNT(CASE WHEN DRIVER_APP_USED THEN 1 END) as app_usage_count
FROM "MOZART"."MODEL - Moovs Operator Reservations"
WHERE OPERATOR_ID = '<operator_id>'
  AND DRIVER_FULL_NAME IS NOT NULL
  AND PICKUP_DATE_TIME >= DATEADD(month, -6, CURRENT_DATE())
GROUP BY DRIVER_FULL_NAME
ORDER BY trip_count DESC
LIMIT 10
```

### Affiliate/Farm Activity

```sql
SELECT
  FARMEE_OPERATOR_NAME,
  COUNT(*) as farmed_trips,
  SUM(AFFILIATE_PAYABLE) as total_affiliate_payable,
  AVG(AFFILIATE_PAYABLE) as avg_affiliate_rate
FROM "MOZART"."MODEL - Moovs Operator Reservations"
WHERE OPERATOR_ID = '<operator_id>'
  AND FARMEE_OPERATOR_NAME IS NOT NULL
  AND PICKUP_DATE_TIME >= DATEADD(month, -6, CURRENT_DATE())
GROUP BY FARMEE_OPERATOR_NAME
ORDER BY farmed_trips DESC
```

---

## Step 3: Key Metrics to Calculate

### Reservation Metrics

| Metric                 | Description                                 |
| ---------------------- | ------------------------------------------- |
| **Total Reservations** | Count of all reservations                   |
| **Completed Trips**    | Reservations with STATUS_SLUG = 'completed' |
| **Cancellation Rate**  | Cancelled / Total                           |
| **Total Revenue**      | Sum of TOTAL_AMOUNT for completed trips     |
| **Average Trip Value** | Avg of TOTAL_AMOUNT                         |
| **Collection Rate**    | AMOUNT_PAID / TOTAL_AMOUNT                  |

### Engagement Metrics

| Metric             | Description                      |
| ------------------ | -------------------------------- |
| **Monthly Active** | Has reservations in last 30 days |
| **Trip Frequency** | Avg reservations per month       |
| **Growth Trend**   | Month-over-month change          |
| **Last Activity**  | Most recent PICKUP_DATE_TIME     |

### Operational Metrics

| Metric                  | Description                          |
| ----------------------- | ------------------------------------ |
| **Driver App Adoption** | % of trips using driver app          |
| **Avg Trip Duration**   | TOTAL_TRIP_TIME_MINUTES              |
| **Avg Distance**        | DISTANCE_MILES                       |
| **Farm-out Rate**       | % of trips with FARMEE_OPERATOR_NAME |

---

## Step 4: Output Format

### Reservation Summary Report

```markdown
## Reservation Summary for [Operator Name]

**Report Period:** [date range]
**Operator ID:** [operator_id]

---

### Volume Overview

| Metric                 | Value            |
| ---------------------- | ---------------- |
| **Total Reservations** | {count}          |
| **Completed Trips**    | {count} ({pct}%) |
| **Cancelled**          | {count} ({pct}%) |
| **Pending**            | {count}          |

---

### Revenue Summary

| Metric              | Value          |
| ------------------- | -------------- |
| **Total Revenue**   | ${total}       |
| **Total Collected** | ${collected}   |
| **Outstanding**     | ${outstanding} |
| **Collection Rate** | {pct}%         |
| **Avg Trip Value**  | ${avg}         |

---

### Monthly Trend (Last 6 Months)

| Month   | Trips   | Revenue | Avg Value | Cancellations |
| ------- | ------- | ------- | --------- | ------------- |
| {month} | {count} | ${rev}  | ${avg}    | {cancel}      |
| ...     | ...     | ...     | ...       | ...           |

---

### Trip Type Breakdown

| Type   | Count   | Revenue | Avg Value |
| ------ | ------- | ------- | --------- |
| {type} | {count} | ${rev}  | ${avg}    |
| ...    | ...     | ...     | ...       |

---

### Recent Activity (Last 5 Trips)

| Confirmation | Date   | Status   | Amount | Customer |
| ------------ | ------ | -------- | ------ | -------- |
| {conf#}      | {date} | {status} | ${amt} | {name}   |
| ...          | ...    | ...      | ...    | ...      |

---

### Engagement Signals

| Indicator         | Value   | Assessment |
| ----------------- | ------- | ---------- |
| Last Booking      | {date}  | {status}   |
| Monthly Avg Trips | {count} | {trend}    |
| Growth (MoM)      | {pct}%  | {status}   |
| Driver App Usage  | {pct}%  | {status}   |
```

---

## Available Fields Reference

### Core Fields

| Field               | Type | Description                                 |
| ------------------- | ---- | ------------------------------------------- |
| OPERATOR_ID         | Text | Moovs operator ID (filter key)              |
| TRIP_ID             | Text | Unique trip identifier                      |
| CONFIRMATION_NUMBER | Text | Customer-facing confirmation                |
| ORDER_NUMBER        | Text | Internal order number                       |
| STATUS_SLUG         | Text | Trip status (pending, completed, cancelled) |

### Dates & Times

| Field            | Type     | Description                    |
| ---------------- | -------- | ------------------------------ |
| CREATED_AT       | DateTime | When reservation was created   |
| PICKUP_DATE_TIME | DateTime | Scheduled pickup time          |
| PICKUP_DATE      | Date     | Pickup date only               |
| PICKUP_TIME      | Time     | Pickup time only               |
| CANCELLED        | DateTime | When cancelled (if applicable) |

### Financial

| Field                  | Type   | Description         |
| ---------------------- | ------ | ------------------- |
| TOTAL_AMOUNT           | Float  | Total trip cost     |
| AMOUNT_PAID            | Number | Amount collected    |
| AMOUNT_DUE             | Float  | Outstanding balance |
| BASE_RATE              | Number | Base fare           |
| TAX_AMOUNT             | Number | Tax charged         |
| DRIVER_GRATUITY_AMOUNT | Number | Tip amount          |
| DISCOUNT_AMOUNT        | Number | Discount applied    |

### Trip Details

| Field                   | Type   | Description               |
| ----------------------- | ------ | ------------------------- |
| TRIP_TYPE               | Text   | Type of trip              |
| ORDER_TYPE              | Text   | Order type classification |
| PICKUP_ADDRESS          | Text   | Pickup location           |
| DROPOFF_ADDRESS         | Text   | Destination               |
| DISTANCE_MILES          | Float  | Trip distance             |
| TOTAL_TRIP_TIME_MINUTES | Number | Duration                  |
| TOTAL_GROUP_SIZE        | Number | Passenger count           |
| NUM_STOPS               | Number | Number of stops           |

### People

| Field                       | Type | Description       |
| --------------------------- | ---- | ----------------- |
| BOOKING_CONTACT_FULL_NAME   | Text | Who booked        |
| BOOKING_CONTACT_EMAIL       | Text | Booker email      |
| PASSENGER_CONTACT_FULL_NAME | Text | Passenger name    |
| DRIVER_FULL_NAME            | Text | Assigned driver   |
| COMPANY_NAME                | Text | Corporate account |

### Operational

| Field                | Type    | Description         |
| -------------------- | ------- | ------------------- |
| VEHICLE_NAME         | Text    | Vehicle used        |
| DRIVER_APP_USED      | Boolean | Driver app adoption |
| AVG_RATING           | Number  | Trip rating         |
| FARMEE_OPERATOR_NAME | Text    | Farm-out partner    |
| AFFILIATE_PAYABLE    | Number  | Farm-out cost       |

---

## Edge Cases

### No Reservations Found

If query returns empty, the operator either:

- Is a new customer with no trips yet
- Has a different operator_id format
- May be using a test/staging environment

### Large Operators

For operators with thousands of reservations:

- Always use date filters to limit results
- Use aggregation queries for summaries
- Consider sampling for detailed analysis

### Currency

All amounts are in USD. If multi-currency is suspected, check the operator's billing settings in Lago.

---

## Integration with Customer Research

Combine Metabase reservation data with other sources:

```
Lago (Billing)
  - Subscription status & plan
  - Invoice history & payment health

HubSpot (CRM)
  - Company & contact info
  - Deal history & notes

Metabase (Usage) <-- This guide
  - Actual reservation volume
  - Revenue & collection
  - Engagement trends
  - Operational metrics

Notion (Support)
  - Open tickets
  - Feature requests
```

### Correlation Analysis

Compare billing health (Lago) with actual usage (Metabase):

- High MRR but declining reservations = churn risk
- Growing reservations but payment issues = collection focus
- Stable billing + stable usage = healthy customer
