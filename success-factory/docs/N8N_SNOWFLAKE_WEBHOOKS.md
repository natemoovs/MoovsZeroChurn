# N8N Snowflake Webhooks Guide

> Last updated: January 27, 2026
> Status: Ready for Implementation

This document contains all the N8N webhook configurations and prompts needed to replace direct Snowflake connections with N8N middleware.

---

## Overview

The Success Factory application now uses N8N webhooks as middleware for all Snowflake database operations. This approach:

- Keeps Snowflake credentials secure (stored only in N8N)
- Provides an audit trail of all database operations
- Allows for rate limiting and caching at the N8N layer
- Makes it easier to modify queries without code deployments

---

## Configuration

### Environment Variables

```bash
# N8N Webhook Base URL
N8N_WEBHOOK_BASE_URL=https://moovs.app.n8n.cloud/webhook

# Optional: Secret for authenticating requests
N8N_WEBHOOK_SECRET=your-secret-here
```

### N8N Snowflake Credentials

In N8N, create a Snowflake credential with:

- Account: `your-account`
- Username: `your-username`
- Password: `your-password`
- Database: `MOZART_NEW`
- Warehouse: `COMPUTE_WH`

---

## Webhook Endpoints

All webhooks use the base path: `https://moovs.app.n8n.cloud/webhook/snowflake/`

| Endpoint                         | Method   | Description                 |
| -------------------------------- | -------- | --------------------------- |
| `search-operators`               | GET/POST | Search operators by name/ID |
| `expanded-search`                | GET/POST | Multi-source search         |
| `get-operator-by-id`             | GET      | Get single operator details |
| `get-operator-core-info`         | GET      | Get operator core info      |
| `get-operator-settings`          | GET      | Get operator settings       |
| `get-operator-charges`           | GET      | Get platform charges        |
| `get-monthly-charges-summary`    | GET      | Monthly charge aggregation  |
| `get-reservations-overview`      | GET      | Reservation data by month   |
| `get-customer-charges`           | GET      | Customer charges            |
| `get-customer-summary`           | GET      | Customer summary stats      |
| `get-operator-bank-accounts`     | GET      | Bank accounts               |
| `get-operator-bank-transactions` | GET      | Bank transactions           |
| `get-risk-overview`              | GET      | Risk metrics                |
| `get-operator-risk-details`      | GET      | Payout/payment limits       |
| `get-operator-disputes`          | GET      | Disputed charges            |
| `get-operator-disputes-summary`  | GET      | Disputes aggregated         |
| `get-failed-invoices`            | GET      | Failed payments             |
| `update-operator-risk`           | PATCH    | Update risk settings        |
| `get-operator-members`           | GET      | Team members                |
| `get-operator-user-permissions`  | GET      | User permissions            |
| `add-operator-member`            | POST     | Add team member             |
| `update-member-role`             | PATCH    | Update member role          |
| `remove-member`                  | DELETE   | Remove member               |
| `get-operator-drivers`           | GET      | Driver list                 |
| `get-driver-performance`         | GET      | Driver KPIs                 |
| `get-operator-driver-app-users`  | GET      | Driver app usage            |
| `get-operator-vehicles`          | GET      | Vehicle list                |
| `get-vehicle-utilization`        | GET      | Vehicle utilization         |
| `get-operator-trips`             | GET      | Recent trips                |
| `get-operator-quotes`            | GET      | Quotes/reservations         |
| `get-operator-quotes-summary`    | GET      | Quote metrics               |
| `get-operator-request-analytics` | GET      | Request analytics           |
| `get-operator-contacts`          | GET      | Platform contacts           |
| `get-operator-email-log`         | GET      | Email history               |
| `get-operator-promo-codes`       | GET      | Promo codes                 |
| `get-operator-price-zones`       | GET      | Price zones                 |
| `get-operator-rules`             | GET      | Business rules              |
| `get-operator-feedback`          | GET      | Customer feedback           |
| `get-operator-subscription-log`  | GET      | Subscription history        |
| `add-subscription-log-entry`     | POST     | Add subscription log        |
| `remove-subscription-log-entry`  | DELETE   | Remove subscription log     |
| `update-operator-plan`           | PATCH    | Update operator plan        |
| `get-top-operators-by-revenue`   | GET      | Leaderboard data            |
| `get-inactive-accounts`          | GET      | Inactive operators          |

---

## N8N Workflow Prompts

Copy-paste these prompts into N8N AI to create each workflow.

---

### 1. Search Operators

```
Create a workflow that:

1. Triggers on webhook: POST/GET to /snowflake/search-operators

2. Expects parameters:
   - searchTerm (string, required): The search query
   - limit (number, optional, default 50): Max results to return

3. Validates the x-webhook-secret header matches environment variable N8N_WEBHOOK_SECRET

4. Execute Snowflake query:
   SELECT
     LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
     P_COMPANY_NAME as company_name,
     HS_C_PROPERTY_NAME as hubspot_company_name,
     LAGO_EXTERNAL_CUSTOMER_ID as lago_external_id,
     STRIPE_CONNECT_ACCOUNT_ID as stripe_account_id,
     LAGO_PLAN_NAME as plan,
     CALCULATED_MRR as mrr,
     R_TOTAL_RESERVATIONS_COUNT as total_reservations,
     R_LAST_30_DAYS_RESERVATIONS_COUNT as last_30_days_reservations,
     DA_DAYS_SINCE_LAST_ASSIGNMENT as days_since_last_assignment,
     DA_ENGAGEMENT_STATUS as engagement_status,
     P_VEHICLES_TOTAL as vehicles_total,
     P_TOTAL_MEMBERS as members_count,
     P_DRIVERS_COUNT as drivers_count,
     P_SETUP_SCORE as setup_score
   FROM MOOVS.CSM_MOOVS
   WHERE
     LOWER(P_COMPANY_NAME) LIKE LOWER('%{{searchTerm}}%')
     OR LOWER(HS_C_PROPERTY_NAME) LIKE LOWER('%{{searchTerm}}%')
     OR LAGO_EXTERNAL_CUSTOMER_ID = '{{searchTerm}}'
     OR STRIPE_CONNECT_ACCOUNT_ID = '{{searchTerm}}'
   ORDER BY CALCULATED_MRR DESC NULLS LAST
   LIMIT {{limit}}

5. Return JSON array of results with lowercase column names

Use Webhook Trigger, IF node for secret validation, Snowflake node, and Respond to Webhook node.
```

---

### 2. Expanded Search

```
Create a workflow that:

1. Triggers on webhook: POST/GET to /snowflake/expanded-search

2. Expects parameters:
   - searchTerm (string, required)
   - limit (number, optional, default 50)

3. Validates x-webhook-secret header

4. Execute Snowflake query that searches across multiple sources with UNION ALL:
   - Operators by name/ID (from MOOVS.CSM_MOOVS)
   - Trips by trip_id/request_id (from SWOOP.TRIP, SWOOP.REQUEST)
   - Quotes by order_number (from SWOOP.REQUEST)
   - Customers by email/phone (from SWOOP.CONTACT)
   - Charges by charge_id (from MOOVS.PLATFORM_CHARGES)

   Each result should include:
   - operator_id, company_name, stripe_account_id, mrr
   - match_type: 'operator' | 'trip' | 'quote' | 'customer' | 'charge'
   - match_field: which field matched
   - match_value: the matched value
   - additional_info: context like status or amount

5. Return results ordered by MRR descending, limited to {{limit}}

Use Webhook Trigger, Snowflake node with the UNION ALL query, and Respond to Webhook node.
```

---

### 3. Get Operator By ID

```
Create a workflow that:

1. Triggers on webhook: GET to /snowflake/get-operator-by-id

2. Expects parameters:
   - operatorId (string, required)

3. Validates x-webhook-secret header

4. Execute Snowflake query:
   SELECT
     LAGO_EXTERNAL_CUSTOMER_ID as operator_id,
     P_COMPANY_NAME as company_name,
     HS_C_PROPERTY_NAME as hubspot_company_name,
     LAGO_EXTERNAL_CUSTOMER_ID as lago_external_id,
     STRIPE_CONNECT_ACCOUNT_ID as stripe_account_id,
     LAGO_PLAN_NAME as plan,
     CALCULATED_MRR as mrr,
     R_TOTAL_RESERVATIONS_COUNT as total_reservations,
     R_LAST_30_DAYS_RESERVATIONS_COUNT as last_30_days_reservations,
     DA_DAYS_SINCE_LAST_ASSIGNMENT as days_since_last_assignment,
     DA_ENGAGEMENT_STATUS as engagement_status,
     P_VEHICLES_TOTAL as vehicles_total,
     P_TOTAL_MEMBERS as members_count,
     P_DRIVERS_COUNT as drivers_count,
     P_SETUP_SCORE as setup_score
   FROM MOOVS.CSM_MOOVS
   WHERE LAGO_EXTERNAL_CUSTOMER_ID = '{{operatorId}}'
   LIMIT 1

5. Return single object (first row) or null if not found

Use Webhook Trigger, Snowflake node, and Respond to Webhook node.
```

---

### 4. Get Operator Platform Charges

```
Create a workflow that:

1. Triggers on webhook: GET to /snowflake/get-operator-charges

2. Expects parameters:
   - operatorId (string, required)
   - limit (number, optional, default 100)

3. Validates x-webhook-secret header

4. Execute Snowflake query:
   SELECT
     CHARGE_ID as charge_id,
     OPERATOR_ID as operator_id,
     OPERATOR_NAME as operator_name,
     CREATED_DATE as created_date,
     STATUS as status,
     TOTAL_DOLLARS_CHARGED as total_dollars_charged,
     COALESCE(FEE_AMOUNT, 0) as fee_amount,
     COALESCE(NET_AMOUNT, 0) as net_amount,
     DESCRIPTION as description,
     CUSTOMER_EMAIL as customer_email,
     CUSTOMER_ID as customer_id,
     TOTAL_DOLLARS_REFUNDED as total_dollars_refunded,
     BILLING_DETAIL_NAME as billing_detail_name,
     OUTCOME_NETWORK_STATUS as outcome_network_status,
     OUTCOME_REASON as outcome_reason,
     OUTCOME_SELLER_MESSAGE as outcome_seller_message,
     OUTCOME_RISK_LEVEL as outcome_risk_level,
     OUTCOME_RISK_SCORE as outcome_risk_score,
     CARD_ID as card_id,
     CALCULATED_STATEMENT_DESCRIPTOR as calculated_statement_descriptor,
     DISPUTE_ID as dispute_id,
     DISPUTE_STATUS as dispute_status,
     DISPUTED_AMOUNT as disputed_amount,
     DISPUTE_REASON as dispute_reason,
     DISPUTE_DATE as dispute_date
   FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
   WHERE OPERATOR_ID = '{{operatorId}}'
   ORDER BY CREATED_DATE DESC
   LIMIT {{limit}}

5. Return JSON array of charges

Use Webhook Trigger, Snowflake node, and Respond to Webhook node.
```

---

### 5. Get Monthly Charges Summary

```
Create a workflow that:

1. Triggers on webhook: GET to /snowflake/get-monthly-charges-summary

2. Expects parameters:
   - operatorId (string, required)

3. Validates x-webhook-secret header

4. Execute Snowflake query:
   SELECT
     TO_VARCHAR(DATE_TRUNC('month', CREATED_DATE), 'YYYY-MM') as charge_month,
     STATUS as status,
     SUM(TOTAL_DOLLARS_CHARGED) as total_charges,
     COUNT(*) as charge_count
   FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
   WHERE OPERATOR_ID = '{{operatorId}}'
   GROUP BY DATE_TRUNC('month', CREATED_DATE), STATUS
   ORDER BY charge_month DESC, STATUS
   LIMIT 24

5. Return JSON array of monthly summaries

Use Webhook Trigger, Snowflake node, and Respond to Webhook node.
```

---

### 6. Get Risk Overview

```
Create a workflow that:

1. Triggers on webhook: GET to /snowflake/get-risk-overview

2. Expects parameters:
   - operatorId (string, required)

3. Validates x-webhook-secret header

4. Execute Snowflake query:
   SELECT
     OPERATOR_ID as operator_id,
     AVG(RISK_SCORE) as risk_score,
     COUNT(CASE WHEN STATUS = 'failed' THEN 1 END) as failed_payments_count,
     COUNT(CASE WHEN IS_DISPUTED = TRUE THEN 1 END) as dispute_count,
     AVG(TOTAL_DOLLARS_CHARGED) as avg_transaction_amount,
     MAX(CASE WHEN STATUS = 'failed' THEN CREATED_DATE END) as last_failed_payment_date
   FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
   WHERE OPERATOR_ID = '{{operatorId}}'
   GROUP BY OPERATOR_ID

5. Return single object or null

Use Webhook Trigger, Snowflake node, and Respond to Webhook node.
```

---

### 7. Get Operator Members

```
Create a workflow that:

1. Triggers on webhook: GET to /snowflake/get-operator-members

2. Expects parameters:
   - operatorId (string, required)

3. Validates x-webhook-secret header

4. Execute Snowflake query:
   SELECT
     user_id,
     first_name,
     last_name,
     email,
     role_slug,
     created_at,
     last_login_at
   FROM POSTGRES_SWOOP.USER
   WHERE operator_id = '{{operatorId}}'
     AND removed_at IS NULL
   ORDER BY last_name, first_name
   LIMIT 100

5. Return JSON array of members

Use Webhook Trigger, Snowflake node, and Respond to Webhook node.
```

---

### 8. Get Operator Drivers

```
Create a workflow that:

1. Triggers on webhook: GET to /snowflake/get-operator-drivers

2. Expects parameters:
   - operatorId (string, required)

3. Validates x-webhook-secret header

4. Execute Snowflake query:
   SELECT
     d.driver_id,
     d.first_name,
     d.last_name,
     d.email,
     d.phone,
     d.created_at,
     CASE
       WHEN d.removed_at IS NOT NULL THEN 'removed'
       WHEN d.deactivated_at IS NOT NULL THEN 'inactive'
       ELSE 'active'
     END as status
   FROM POSTGRES_SWOOP.DRIVER d
   WHERE d.operator_id = '{{operatorId}}'
   ORDER BY d.created_at DESC
   LIMIT 100

5. Return JSON array of drivers

Use Webhook Trigger, Snowflake node, and Respond to Webhook node.
```

---

### 9. Get Driver Performance

```
Create a workflow that:

1. Triggers on webhook: GET to /snowflake/get-driver-performance

2. Expects parameters:
   - operatorId (string, required)

3. Validates x-webhook-secret header

4. Execute Snowflake query:
   WITH driver_stats AS (
     SELECT
       d.driver_id,
       d.first_name,
       d.last_name,
       d.email,
       CASE
         WHEN d.removed_at IS NOT NULL THEN 'removed'
         WHEN d.deactivated_at IS NOT NULL THEN 'inactive'
         ELSE 'active'
       END as status,
       COUNT(t.trip_id) as total_trips,
       COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_trips,
       COUNT(CASE WHEN t.created_at >= DATEADD('day', -30, CURRENT_DATE) THEN 1 END) as trips_last_30_days,
       SUM(r.total_amount) as total_revenue,
       MAX(t.completed_at) as last_trip_date
     FROM POSTGRES_SWOOP.DRIVER d
     LEFT JOIN SWOOP.TRIP t ON d.driver_id = t.driver_id
     LEFT JOIN SWOOP.REQUEST r ON t.request_id = r.request_id AND r.operator_id = d.operator_id
     WHERE d.operator_id = '{{operatorId}}'
     GROUP BY d.driver_id, d.first_name, d.last_name, d.email, d.removed_at, d.deactivated_at
   )
   SELECT
     driver_id,
     first_name,
     last_name,
     email,
     status,
     total_trips,
     completed_trips,
     trips_last_30_days,
     total_revenue,
     last_trip_date,
     CASE WHEN total_trips > 0 THEN ROUND((completed_trips::FLOAT / total_trips) * 100, 1) ELSE NULL END as completion_rate
   FROM driver_stats
   ORDER BY total_trips DESC, last_trip_date DESC
   LIMIT 100

5. Return JSON array of driver performance data

Use Webhook Trigger, Snowflake node, and Respond to Webhook node.
```

---

### 10. Get Operator Vehicles

```
Create a workflow that:

1. Triggers on webhook: GET to /snowflake/get-operator-vehicles

2. Expects parameters:
   - operatorId (string, required)

3. Validates x-webhook-secret header

4. Execute Snowflake query:
   SELECT
     vehicle_id,
     name as vehicle_name,
     vehicle_type,
     license_plate,
     exterior_color as color,
     capacity,
     created_at
   FROM SWOOP.VEHICLE
   WHERE operator_id = '{{operatorId}}'
     AND removed_at IS NULL
   ORDER BY created_at DESC
   LIMIT 100

5. Return JSON array of vehicles

Use Webhook Trigger, Snowflake node, and Respond to Webhook node.
```

---

### 11. Get Operator Disputes

```
Create a workflow that:

1. Triggers on webhook: GET to /snowflake/get-operator-disputes

2. Expects parameters:
   - stripeAccountId (string, required)

3. Validates x-webhook-secret header

4. Execute Snowflake query:
   SELECT
     DISPUTE_ID as dispute_id,
     CHARGE_ID as charge_id,
     STRIPE_ACCOUNT_ID as stripe_account_id,
     DISPUTE_STATUS as dispute_status,
     DISPUTE_REASON as dispute_reason,
     DISPUTED_AMOUNT as disputed_amount,
     DISPUTE_DATE as dispute_date,
     CREATED_DATE as created_date,
     OUTCOME_RISK_LEVEL as outcome_risk_level,
     OUTCOME_RISK_SCORE as outcome_risk_score,
     CUSTOMER_ID as customer_id,
     BILLING_DETAIL_NAME as billing_detail_name
   FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
   WHERE STRIPE_ACCOUNT_ID = '{{stripeAccountId}}'
     AND DISPUTE_ID IS NOT NULL
   ORDER BY DISPUTE_DATE DESC NULLS LAST, CREATED_DATE DESC
   LIMIT 200

5. Return JSON array of disputes

Use Webhook Trigger, Snowflake node, and Respond to Webhook node.
```

---

### 12. Get Operator Quotes

```
Create a workflow that:

1. Triggers on webhook: GET to /snowflake/get-operator-quotes

2. Expects parameters:
   - operatorId (string, required)
   - limit (number, optional, default 100)

3. Validates x-webhook-secret header

4. Execute Snowflake query:
   SELECT
     r.REQUEST_ID as request_id,
     r.ORDER_NUMBER as order_number,
     r.STAGE as stage,
     r.ORDER_TYPE as order_type,
     (COALESCE(rt.PRICE, 0) + COALESCE(rt.DRIVER_GRATUITY, 0) + COALESCE(rt.TAX_AMT, 0) + COALESCE(rt.TOLLS_AMT, 0) + COALESCE(rt.BASE_RATE_AMT, 0) - COALESCE(rt.PROMO_DISCOUNT_AMT, 0)) / 100 as total_amount,
     r.CREATED_AT as created_at,
     t.PICKUP_DATE_TIME as pickup_date,
     CONCAT(c.FIRST_NAME, ' ', c.LAST_NAME) as customer_name,
     c.EMAIL as customer_email,
     ps.ADDRESS as pickup_address,
     ds.ADDRESS as dropoff_address,
     v.VEHICLE_TYPE as vehicle_type
   FROM SWOOP.REQUEST r
   LEFT JOIN SWOOP.TRIP t ON r.REQUEST_ID = t.REQUEST_ID
   LEFT JOIN SWOOP.ROUTE rt ON t.TRIP_ID = rt.TRIP_ID
   LEFT JOIN SWOOP.CONTACT c ON r.BOOKER_ID = c.CONTACT_ID
   LEFT JOIN SWOOP.STOP ps ON r.PICKUP_STOP_ID = ps.STOP_ID
   LEFT JOIN SWOOP.STOP ds ON r.DROPOFF_STOP_ID = ds.STOP_ID
   LEFT JOIN SWOOP.VEHICLE v ON t.VEHICLE_ID = v.VEHICLE_ID
   WHERE r.OPERATOR_ID = '{{operatorId}}'
     AND r.REMOVED_AT IS NULL
     AND (LOWER(r.STAGE) LIKE '%quote%' OR LOWER(r.STAGE) LIKE '%reservation%')
   ORDER BY r.CREATED_AT DESC
   LIMIT {{limit}}

5. Return JSON array of quotes

Use Webhook Trigger, Snowflake node, and Respond to Webhook node.
```

---

### 13. Update Operator Risk (WRITE)

```
Create a workflow that:

1. Triggers on webhook: PATCH to /snowflake/update-operator-risk

2. Expects body:
   - operatorId (string, required)
   - field (string, required): 'instant_payout_limit_cents' | 'daily_payment_limit_cents' | 'risk_score'
   - value (number, required)

3. Validates x-webhook-secret header

4. Based on the field, execute one of these Snowflake UPDATE queries:

   For instant_payout_limit_cents:
   UPDATE POSTGRES_SWOOP.OPERATOR
   SET INSTANT_PAYOUT_LIMIT_CENTS = {{value}},
       UPDATED_AT = CURRENT_TIMESTAMP()
   WHERE OPERATOR_ID = '{{operatorId}}'

   For daily_payment_limit_cents:
   UPDATE POSTGRES_SWOOP.OPERATOR
   SET DAILY_PAYMENT_LIMIT_CENTS = {{value}},
       UPDATED_AT = CURRENT_TIMESTAMP()
   WHERE OPERATOR_ID = '{{operatorId}}'

   For risk_score:
   UPDATE POSTGRES_SWOOP.OPERATOR
   SET RISK_SCORE = {{value}},
       UPDATED_AT = CURRENT_TIMESTAMP()
   WHERE OPERATOR_ID = '{{operatorId}}'

5. Return { success: true, operatorId, field, newValue }

Use Webhook Trigger, Switch node for field routing, Snowflake node, and Respond to Webhook node.
```

---

### 14. Add Operator Member (WRITE)

```
Create a workflow that:

1. Triggers on webhook: POST to /snowflake/add-operator-member

2. Expects body:
   - operatorId (string, required)
   - email (string, required)
   - firstName (string, optional)
   - lastName (string, optional)
   - roleSlug (string, optional, default 'member')

3. Validates x-webhook-secret header

4. Generate a UUID for the new user

5. Execute Snowflake INSERT:
   INSERT INTO POSTGRES_SWOOP.USER (
     USER_ID,
     OPERATOR_ID,
     EMAIL,
     FIRST_NAME,
     LAST_NAME,
     ROLE_SLUG,
     CREATED_AT,
     UPDATED_AT
   ) VALUES (
     '{{generatedUUID}}',
     '{{operatorId}}',
     '{{email}}',
     '{{firstName}}',
     '{{lastName}}',
     '{{roleSlug}}',
     CURRENT_TIMESTAMP(),
     CURRENT_TIMESTAMP()
   )

6. Return { success: true, userId: generatedUUID }

Use Webhook Trigger, Code node for UUID generation, Snowflake node, and Respond to Webhook node.
```

---

### 15. Update Member Role (WRITE)

```
Create a workflow that:

1. Triggers on webhook: PATCH to /snowflake/update-member-role

2. Expects body:
   - userId (string, required)
   - operatorId (string, required)
   - roleSlug (string, required)

3. Validates x-webhook-secret header

4. Execute Snowflake UPDATE:
   UPDATE POSTGRES_SWOOP.USER
   SET ROLE_SLUG = '{{roleSlug}}',
       UPDATED_AT = CURRENT_TIMESTAMP()
   WHERE USER_ID = '{{userId}}'
     AND OPERATOR_ID = '{{operatorId}}'
     AND REMOVED_AT IS NULL

5. Return { success: true }

Use Webhook Trigger, Snowflake node, and Respond to Webhook node.
```

---

### 16. Remove Member (WRITE)

```
Create a workflow that:

1. Triggers on webhook: DELETE to /snowflake/remove-member

2. Expects body:
   - userId (string, required)
   - operatorId (string, required)

3. Validates x-webhook-secret header

4. Execute Snowflake UPDATE (soft delete):
   UPDATE POSTGRES_SWOOP.USER
   SET REMOVED_AT = CURRENT_TIMESTAMP(),
       UPDATED_AT = CURRENT_TIMESTAMP()
   WHERE USER_ID = '{{userId}}'
     AND OPERATOR_ID = '{{operatorId}}'
     AND REMOVED_AT IS NULL

5. Return { success: true }

Use Webhook Trigger, Snowflake node, and Respond to Webhook node.
```

---

### 17. Get Top Operators By Revenue

```
Create a workflow that:

1. Triggers on webhook: GET to /snowflake/get-top-operators-by-revenue

2. Expects parameters:
   - limit (number, optional, default 10)
   - period (string, optional, default 'month'): 'week' | 'month' | 'year'

3. Validates x-webhook-secret header

4. Build period filter based on parameter:
   - week: DATE_TRUNC('week', CREATED_DATE) = DATE_TRUNC('week', CURRENT_DATE)
   - month: DATE_TRUNC('month', CREATED_DATE) = DATE_TRUNC('month', CURRENT_DATE)
   - year: DATE_TRUNC('year', CREATED_DATE) = DATE_TRUNC('year', CURRENT_DATE)

5. Execute Snowflake query:
   SELECT
     OPERATOR_ID as operator_id,
     OPERATOR_NAME as operator_name,
     SUM(TOTAL_DOLLARS_CHARGED) AS total_charged,
     COUNT(*) AS total_trips
   FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
   WHERE {{periodFilter}}
   GROUP BY OPERATOR_ID, OPERATOR_NAME
   ORDER BY total_charged DESC
   LIMIT {{limit}}

6. Return JSON array of top operators

Use Webhook Trigger, Code node for filter building, Snowflake node, and Respond to Webhook node.
```

---

### 18. Subscription Sync (Existing - Already Built)

The subscription sync webhook is already implemented at `/webhook/subscription-sync`.

It handles:

- `action: 'create'` - Create new subscription
- `action: 'change'` - Change subscription plan
- `action: 'cancel'` - Cancel subscription

See the existing N8N_INTEGRATION_PLAN.md for details.

---

## Response Format

All webhooks should return consistent JSON responses:

### Success (Array Results)

```json
{
  "success": true,
  "data": [...],
  "executionTime": 123
}
```

### Success (Single Object)

```json
{
  "success": true,
  "data": {...},
  "executionTime": 123
}
```

### Error

```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## Security Considerations

1. **Always validate the `x-webhook-secret` header** before executing any query
2. **Use parameterized queries** - N8N's Snowflake node handles this automatically
3. **Limit query results** - Always include LIMIT clauses to prevent runaway queries
4. **Log all write operations** - For audit purposes
5. **Rate limit requests** - Consider adding N8N's rate limiting for high-volume endpoints

---

## Testing

To test a webhook endpoint:

```bash
curl -X GET \
  'https://moovs.app.n8n.cloud/webhook/snowflake/get-operator-by-id?operatorId=YOUR_OPERATOR_ID' \
  -H 'x-webhook-secret: YOUR_SECRET'
```

```bash
curl -X POST \
  'https://moovs.app.n8n.cloud/webhook/snowflake/search-operators' \
  -H 'Content-Type: application/json' \
  -H 'x-webhook-secret: YOUR_SECRET' \
  -d '{"searchTerm": "acme", "limit": 10}'
```

---

## Remaining Webhooks to Create

The following webhooks use similar patterns to those documented above:

| Webhook                          | SQL Pattern                                                |
| -------------------------------- | ---------------------------------------------------------- |
| `get-operator-core-info`         | SELECT from POSTGRES_SWOOP.OPERATOR                        |
| `get-operator-settings`          | SELECT \* from POSTGRES_SWOOP.OPERATOR_SETTINGS            |
| `get-reservations-overview`      | GROUP BY month from MOZART_NEW.RESERVATIONS                |
| `get-customer-charges`           | SELECT from MOOVS_PLATFORM_CHARGES WHERE CUSTOMER_ID       |
| `get-customer-summary`           | Aggregate from MOOVS_PLATFORM_CHARGES                      |
| `get-operator-bank-accounts`     | SELECT from SWOOP.STRIPE_FINANCIAL_CONNECTIONS_ACCOUNT     |
| `get-operator-bank-transactions` | SELECT from SWOOP.STRIPE_FINANCIAL_CONNECTIONS_TRANSACTION |
| `get-operator-risk-details`      | SELECT limits from POSTGRES_SWOOP.OPERATOR                 |
| `get-operator-disputes-summary`  | Multiple aggregation queries for charts                    |
| `get-failed-invoices`            | SELECT WHERE STATUS = 'failed'                             |
| `get-operator-user-permissions`  | JOIN USER_ACCESS_PERMISSION with ACCESS_PERMISSION         |
| `get-operator-driver-app-users`  | JOIN DRIVER with DRIVERAPP_USERS                           |
| `get-vehicle-utilization`        | Aggregate trips per vehicle                                |
| `get-operator-trips`             | Complex JOIN across TRIP, REQUEST, STOP, DRIVER            |
| `get-operator-quotes-summary`    | Aggregation for conversion metrics                         |
| `get-operator-request-analytics` | GROUP BY month from SWOOP.REQUEST                          |
| `get-operator-contacts`          | SELECT from SWOOP.CONTACT                                  |
| `get-operator-email-log`         | SELECT from POSTGRES_SWOOP.EMAIL_LOG                       |
| `get-operator-promo-codes`       | SELECT from SWOOP.PROMO_CODE                               |
| `get-operator-price-zones`       | SELECT from SWOOP.PRICE_ZONE                               |
| `get-operator-rules`             | SELECT from SWOOP.RULE                                     |
| `get-operator-feedback`          | JOIN CUSTOMER_FEEDBACK with USER                           |
| `get-operator-subscription-log`  | SELECT from POSTGRES_SWOOP.SUBSCRIPTION_LOG                |
| `add-subscription-log-entry`     | INSERT into SUBSCRIPTION_LOG                               |
| `remove-subscription-log-entry`  | UPDATE REMOVED_AT in SUBSCRIPTION_LOG                      |
| `update-operator-plan`           | UPDATE PLAN in POSTGRES_SWOOP.OPERATOR                     |
| `get-inactive-accounts`          | SELECT WHERE days since last activity > threshold          |

Refer to the original `snowflake.ts` SQL queries for exact column names and JOINs.

---

## Quick Start

1. Set up Snowflake credentials in N8N
2. Create the webhooks one by one using the prompts above
3. Test each webhook with curl
4. Set `N8N_WEBHOOK_BASE_URL` and `N8N_WEBHOOK_SECRET` in your app's environment
5. Deploy the updated Success Factory code

The application will automatically route all Snowflake operations through N8N!
