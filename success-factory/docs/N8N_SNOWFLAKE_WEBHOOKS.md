# N8N Snowflake Webhooks Guide

> Last updated: January 27, 2026
> Status: Ready for Implementation

This document contains the 9 consolidated N8N workflow configurations needed to replace direct Snowflake connections.

---

## Overview

Instead of 44 separate webhooks, we use **9 consolidated workflows** that handle multiple actions via an `action` parameter. This approach:

- Reduces N8N workflow management overhead
- Groups related operations logically
- Keeps Snowflake credentials secure (stored only in N8N)
- Provides an audit trail of all database operations

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

## The 9 Consolidated Workflows

| #   | Workflow        | Webhook Path                 | Actions                                                                                                      |
| --- | --------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Operator Search | `/snowflake/operator-search` | search, expanded                                                                                             |
| 2   | Operator Data   | `/snowflake/operator-data`   | details, core-info, settings, risk-details, risk-overview                                                    |
| 3   | Financial       | `/snowflake/financial`       | charges, monthly-summary, reservations, customer-charges, customer-summary, bank-accounts, bank-transactions |
| 4   | Risk            | `/snowflake/risk`            | disputes, disputes-summary, failed-invoices, update-risk                                                     |
| 5   | Team            | `/snowflake/team`            | members, permissions, add-member, update-role, remove-member                                                 |
| 6   | Fleet           | `/snowflake/fleet`           | drivers, driver-performance, driver-app-users, vehicles, vehicle-utilization                                 |
| 7   | Bookings        | `/snowflake/bookings`        | trips, quotes, quotes-summary, request-analytics                                                             |
| 8   | Platform        | `/snowflake/platform`        | contacts, email-log, promo-codes, price-zones, rules, feedback                                               |
| 9   | Subscriptions   | `/snowflake/subscriptions`   | log, add-log, remove-log, update-plan, top-operators, inactive-accounts                                      |

---

## N8N Workflow Prompts

Copy-paste these prompts into N8N AI to create each workflow.

---

### Workflow 1: Operator Search

```
Create a workflow that:

1. Triggers on webhook: POST to /snowflake/operator-search

2. Expects body:
   - action (string, required): 'search' | 'expanded'
   - searchTerm (string, required)
   - limit (number, optional, default 50)

3. Validates x-webhook-secret header against environment variable N8N_WEBHOOK_SECRET

4. Use Switch node to route based on action:

   Case 'search':
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
       LOWER(P_COMPANY_NAME) LIKE LOWER('%' || {{searchTerm}} || '%')
       OR LOWER(HS_C_PROPERTY_NAME) LIKE LOWER('%' || {{searchTerm}} || '%')
       OR LAGO_EXTERNAL_CUSTOMER_ID = {{searchTerm}}
       OR STRIPE_CONNECT_ACCOUNT_ID = {{searchTerm}}
     ORDER BY CALCULATED_MRR DESC NULLS LAST
     LIMIT {{limit}}

   Case 'expanded':
     Use UNION ALL to search across:
     - Operators by name/ID (MOOVS.CSM_MOOVS)
     - Trips by trip_id/request_id (SWOOP.TRIP, SWOOP.REQUEST)
     - Quotes by order_number (SWOOP.REQUEST)
     - Customers by email/phone (SWOOP.CONTACT)
     - Charges by charge_id (MOZART_NEW.MOOVS_PLATFORM_CHARGES)

     Return: operator_id, company_name, stripe_account_id, mrr, match_type, match_field, match_value

5. Return JSON array wrapped in { success: true, data: [...] }

Use Webhook Trigger, IF node for validation, Switch node, multiple Snowflake nodes, and Respond to Webhook.
```

---

### Workflow 2: Operator Data

```
Create a workflow that:

1. Triggers on webhook: POST to /snowflake/operator-data

2. Expects body:
   - action (string, required): 'details' | 'core-info' | 'settings' | 'risk-details' | 'risk-overview'
   - operatorId (string, required)

3. Validates x-webhook-secret header

4. Use Switch node to route based on action:

   Case 'details':
     SELECT operator details from MOOVS.CSM_MOOVS
     WHERE LAGO_EXTERNAL_CUSTOMER_ID = {{operatorId}}

   Case 'core-info':
     SELECT
       OPERATOR_ID as operator_id,
       NAME as name,
       NAME_SLUG as name_slug,
       EMAIL as email,
       PHONE as phone,
       GENERAL_EMAIL as general_email,
       TERMS_AND_CONDITIONS_URL as terms_and_conditions_url,
       WEBSITE_URL as website_url,
       COMPANY_LOGO_URL as company_logo_url
     FROM POSTGRES_SWOOP.OPERATOR
     WHERE OPERATOR_ID = {{operatorId}}

   Case 'settings':
     SELECT * FROM POSTGRES_SWOOP.OPERATOR_SETTINGS
     WHERE OPERATOR_ID = {{operatorId}}

   Case 'risk-details':
     SELECT
       OPERATOR_ID as operator_id,
       INSTANT_PAYOUT_LIMIT_CENTS as instant_payout_limit_cents,
       DAILY_PAYMENT_LIMIT_CENTS as daily_payment_limit_cents,
       RISK_SCORE as risk_score
     FROM POSTGRES_SWOOP.OPERATOR
     WHERE OPERATOR_ID = {{operatorId}}

   Case 'risk-overview':
     SELECT
       OPERATOR_ID as operator_id,
       AVG(OUTCOME_RISK_SCORE) as risk_score,
       COUNT(CASE WHEN STATUS = 'failed' THEN 1 END) as failed_payments_count,
       COUNT(CASE WHEN DISPUTE_ID IS NOT NULL THEN 1 END) as dispute_count,
       AVG(TOTAL_DOLLARS_CHARGED) as avg_transaction_amount,
       MAX(CASE WHEN STATUS = 'failed' THEN CREATED_DATE END) as last_failed_payment_date
     FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
     WHERE OPERATOR_ID = {{operatorId}}
     GROUP BY OPERATOR_ID

5. Return single object for all cases: { success: true, data: {...} }

Use Webhook Trigger, Switch node, Snowflake nodes, and Respond to Webhook.
```

---

### Workflow 3: Financial

```
Create a workflow that:

1. Triggers on webhook: POST to /snowflake/financial

2. Expects body:
   - action (string, required): 'charges' | 'monthly-summary' | 'reservations' | 'customer-charges' | 'customer-summary' | 'bank-accounts' | 'bank-transactions'
   - operatorId (string, required for most)
   - customerId (string, required for customer-* actions)
   - limit (number, optional)

3. Validates x-webhook-secret header

4. Use Switch node to route based on action:

   Case 'charges':
     SELECT charge details from MOZART_NEW.MOOVS_PLATFORM_CHARGES
     WHERE OPERATOR_ID = {{operatorId}}
     ORDER BY CREATED_DATE DESC LIMIT {{limit}}

   Case 'monthly-summary':
     SELECT
       TO_VARCHAR(DATE_TRUNC('month', CREATED_DATE), 'YYYY-MM') as charge_month,
       STATUS, SUM(TOTAL_DOLLARS_CHARGED) as total_charges, COUNT(*) as charge_count
     FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
     WHERE OPERATOR_ID = {{operatorId}}
     GROUP BY DATE_TRUNC('month', CREATED_DATE), STATUS
     ORDER BY charge_month DESC

   Case 'reservations':
     SELECT reservation overview grouped by month from MOZART_NEW.RESERVATIONS
     WHERE OPERATOR_ID = {{operatorId}}

   Case 'customer-charges':
     SELECT charge details from MOZART_NEW.MOOVS_PLATFORM_CHARGES
     WHERE OPERATOR_ID = {{operatorId}} AND CUSTOMER_ID = {{customerId}}

   Case 'customer-summary':
     Aggregate customer data (total charges, amount, refunds, disputes, date range)
     WHERE OPERATOR_ID = {{operatorId}} AND CUSTOMER_ID = {{customerId}}

   Case 'bank-accounts':
     SELECT from SWOOP.STRIPE_FINANCIAL_CONNECTIONS_ACCOUNT
     WHERE OPERATOR_ID = {{operatorId}}

   Case 'bank-transactions':
     SELECT from SWOOP.STRIPE_FINANCIAL_CONNECTIONS_TRANSACTION
     WHERE OPERATOR_ID = {{operatorId}}

5. Return { success: true, data: [...] } for array results

Use Webhook Trigger, Switch node, Snowflake nodes, and Respond to Webhook.
```

---

### Workflow 4: Risk

```
Create a workflow that:

1. Triggers on webhook: POST to /snowflake/risk

2. Expects body:
   - action (string, required): 'disputes' | 'disputes-summary' | 'failed-invoices' | 'update-risk'
   - stripeAccountId (string, for disputes actions)
   - operatorId (string, for update-risk)
   - field (string, for update-risk): 'instant_payout_limit_cents' | 'daily_payment_limit_cents' | 'risk_score'
   - value (number, for update-risk)
   - limit (number, optional)

3. Validates x-webhook-secret header

4. Use Switch node to route based on action:

   Case 'disputes':
     SELECT dispute records from MOZART_NEW.MOOVS_PLATFORM_CHARGES
     WHERE STRIPE_ACCOUNT_ID = {{stripeAccountId}} AND DISPUTE_ID IS NOT NULL
     ORDER BY DISPUTE_DATE DESC

   Case 'disputes-summary':
     Multiple aggregation queries:
     - Total disputes and amount
     - Disputes by status (GROUP BY DISPUTE_STATUS)
     - Disputes by reason (GROUP BY DISPUTE_REASON)
     - Disputes by risk level (GROUP BY OUTCOME_RISK_LEVEL)
     - Disputes over time (GROUP BY DATE_TRUNC('week', DISPUTE_DATE))

   Case 'failed-invoices':
     SELECT failed charges across all operators
     WHERE STATUS = 'failed'
     ORDER BY CREATED_DATE DESC LIMIT {{limit}}

   Case 'update-risk':
     Based on {{field}}, UPDATE POSTGRES_SWOOP.OPERATOR:
     - SET INSTANT_PAYOUT_LIMIT_CENTS = {{value}} (if field = 'instant_payout_limit_cents')
     - SET DAILY_PAYMENT_LIMIT_CENTS = {{value}} (if field = 'daily_payment_limit_cents')
     - SET RISK_SCORE = {{value}} (if field = 'risk_score')
     WHERE OPERATOR_ID = {{operatorId}}

5. Return appropriate response format

Use Webhook Trigger, Switch node, Snowflake nodes (read and write), and Respond to Webhook.
```

---

### Workflow 5: Team

```
Create a workflow that:

1. Triggers on webhook: POST to /snowflake/team

2. Expects body:
   - action (string, required): 'members' | 'permissions' | 'add-member' | 'update-role' | 'remove-member'
   - operatorId (string, required)
   - Additional params based on action:
     - add-member: email, firstName, lastName, roleSlug
     - update-role: userId, roleSlug
     - remove-member: userId

3. Validates x-webhook-secret header

4. Use Switch node to route based on action:

   Case 'members':
     SELECT user_id, first_name, last_name, email, role_slug, created_at, last_login_at
     FROM POSTGRES_SWOOP.USER
     WHERE OPERATOR_ID = {{operatorId}} AND REMOVED_AT IS NULL
     ORDER BY last_name, first_name LIMIT 100

   Case 'permissions':
     SELECT uap.USER_ID, uap.ACCESS_PERMISSION_ID as permission_id, ap.NAME as permission_name
     FROM SWOOP.USER_ACCESS_PERMISSION uap
     JOIN SWOOP.ACCESS_PERMISSION ap ON uap.ACCESS_PERMISSION_ID = ap.ACCESS_PERMISSION_ID
     JOIN POSTGRES_SWOOP.USER u ON uap.USER_ID = u.USER_ID
     WHERE u.OPERATOR_ID = {{operatorId}} AND u.REMOVED_AT IS NULL

   Case 'add-member':
     Generate UUID using Code node, then:
     INSERT INTO POSTGRES_SWOOP.USER (USER_ID, OPERATOR_ID, EMAIL, FIRST_NAME, LAST_NAME, ROLE_SLUG, CREATED_AT, UPDATED_AT)
     VALUES ({{generatedUUID}}, {{operatorId}}, {{email}}, {{firstName}}, {{lastName}}, {{roleSlug}}, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
     Return { success: true, userId: generatedUUID }

   Case 'update-role':
     UPDATE POSTGRES_SWOOP.USER
     SET ROLE_SLUG = {{roleSlug}}, UPDATED_AT = CURRENT_TIMESTAMP()
     WHERE USER_ID = {{userId}} AND OPERATOR_ID = {{operatorId}} AND REMOVED_AT IS NULL

   Case 'remove-member':
     UPDATE POSTGRES_SWOOP.USER
     SET REMOVED_AT = CURRENT_TIMESTAMP(), UPDATED_AT = CURRENT_TIMESTAMP()
     WHERE USER_ID = {{userId}} AND OPERATOR_ID = {{operatorId}} AND REMOVED_AT IS NULL

5. Return { success: true, data: [...] } or { success: true, userId: ... }

Use Webhook Trigger, Switch node, Code node (for UUID), Snowflake nodes, and Respond to Webhook.
```

---

### Workflow 6: Fleet

```
Create a workflow that:

1. Triggers on webhook: POST to /snowflake/fleet

2. Expects body:
   - action (string, required): 'drivers' | 'driver-performance' | 'driver-app-users' | 'vehicles' | 'vehicle-utilization'
   - operatorId (string, required)

3. Validates x-webhook-secret header

4. Use Switch node to route based on action:

   Case 'drivers':
     SELECT d.driver_id, d.first_name, d.last_name, d.email, d.phone, d.created_at,
       CASE WHEN d.removed_at IS NOT NULL THEN 'removed'
            WHEN d.deactivated_at IS NOT NULL THEN 'inactive'
            ELSE 'active' END as status
     FROM POSTGRES_SWOOP.DRIVER d
     WHERE d.OPERATOR_ID = {{operatorId}}
     ORDER BY d.created_at DESC LIMIT 100

   Case 'driver-performance':
     WITH driver_stats AS (
       SELECT d.driver_id, d.first_name, d.last_name, d.email,
         COUNT(t.trip_id) as total_trips,
         COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_trips,
         COUNT(CASE WHEN t.created_at >= DATEADD('day', -30, CURRENT_DATE) THEN 1 END) as trips_last_30_days,
         SUM(r.total_amount) as total_revenue,
         MAX(t.completed_at) as last_trip_date
       FROM POSTGRES_SWOOP.DRIVER d
       LEFT JOIN SWOOP.TRIP t ON d.driver_id = t.driver_id
       LEFT JOIN SWOOP.REQUEST r ON t.request_id = r.request_id
       WHERE d.operator_id = {{operatorId}}
       GROUP BY d.driver_id, d.first_name, d.last_name, d.email
     )
     SELECT *, ROUND((completed_trips::FLOAT / NULLIF(total_trips, 0)) * 100, 1) as completion_rate
     FROM driver_stats

   Case 'driver-app-users':
     SELECT d.driver_id, dau.app_user_id, dau.app_version, dau.device_type, dau.last_active_at, dau.push_enabled
     FROM POSTGRES_SWOOP.DRIVER d
     LEFT JOIN MOZART_NEW.DRIVERAPP_USERS dau ON d.driver_id = dau.driver_id
     WHERE d.operator_id = {{operatorId}}

   Case 'vehicles':
     SELECT vehicle_id, name as vehicle_name, vehicle_type, license_plate, exterior_color as color, capacity, created_at
     FROM SWOOP.VEHICLE
     WHERE OPERATOR_ID = {{operatorId}} AND REMOVED_AT IS NULL
     ORDER BY created_at DESC LIMIT 100

   Case 'vehicle-utilization':
     Aggregate trips per vehicle with utilization metrics

5. Return { success: true, data: [...] }

Use Webhook Trigger, Switch node, Snowflake nodes, and Respond to Webhook.
```

---

### Workflow 7: Bookings

```
Create a workflow that:

1. Triggers on webhook: POST to /snowflake/bookings

2. Expects body:
   - action (string, required): 'trips' | 'quotes' | 'quotes-summary' | 'request-analytics'
   - operatorId (string, required)
   - limit (number, optional)

3. Validates x-webhook-secret header

4. Use Switch node to route based on action:

   Case 'trips':
     SELECT t.trip_id, t.request_id, t.status, pickup/dropoff locations, scheduled/completed times,
       driver name, passenger name, total_amount
     FROM SWOOP.TRIP t
     JOIN SWOOP.REQUEST r ON t.request_id = r.request_id
     LEFT JOIN SWOOP.STOP ps ON r.pickup_stop_id = ps.stop_id
     LEFT JOIN SWOOP.STOP ds ON r.dropoff_stop_id = ds.stop_id
     WHERE r.operator_id = {{operatorId}}
     ORDER BY t.created_at DESC LIMIT {{limit}}

   Case 'quotes':
     SELECT r.request_id, r.order_number, r.stage, r.order_type, calculated total_amount,
       r.created_at, t.pickup_date_time, customer name/email, addresses, vehicle_type
     FROM SWOOP.REQUEST r
     LEFT JOIN SWOOP.TRIP t ON r.request_id = t.request_id
     LEFT JOIN SWOOP.CONTACT c ON r.booker_id = c.contact_id
     WHERE r.operator_id = {{operatorId}}
       AND r.removed_at IS NULL
       AND (LOWER(r.stage) LIKE '%quote%' OR LOWER(r.stage) LIKE '%reservation%')
     ORDER BY r.created_at DESC LIMIT {{limit}}

   Case 'quotes-summary':
     Calculate:
     - total_quotes, total_quotes_amount
     - total_reservations, total_reservations_amount
     - conversion_rate
     - quotes_by_month (GROUP BY month)

   Case 'request-analytics':
     SELECT
       TO_VARCHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
       COUNT(*) as total_requests,
       COUNT(CASE WHEN stage = 'completed' THEN 1 END) as completed_requests,
       COUNT(CASE WHEN stage = 'cancelled' THEN 1 END) as cancelled_requests,
       SUM(total_amount) as total_revenue
     FROM SWOOP.REQUEST
     WHERE operator_id = {{operatorId}}
     GROUP BY DATE_TRUNC('month', created_at)
     ORDER BY month DESC

5. Return { success: true, data: [...] }

Use Webhook Trigger, Switch node, Snowflake nodes, and Respond to Webhook.
```

---

### Workflow 8: Platform

```
Create a workflow that:

1. Triggers on webhook: POST to /snowflake/platform

2. Expects body:
   - action (string, required): 'contacts' | 'email-log' | 'promo-codes' | 'price-zones' | 'rules' | 'feedback'
   - operatorId (string, required)
   - limit (number, optional)

3. Validates x-webhook-secret header

4. Use Switch node to route based on action:

   Case 'contacts':
     SELECT contact_id, first_name, last_name, email, phone, company_name, notes, created_at
     FROM SWOOP.CONTACT
     WHERE OPERATOR_ID = {{operatorId}} AND REMOVED_AT IS NULL
     ORDER BY created_at DESC

   Case 'email-log':
     SELECT email_log_id, to_email, subject, template_name, sent_at, status
     FROM POSTGRES_SWOOP.EMAIL_LOG
     WHERE OPERATOR_ID = {{operatorId}}
     ORDER BY sent_at DESC LIMIT {{limit}}

   Case 'promo-codes':
     SELECT promo_code_id, code, description, discount_type, discount_value,
       valid_from, valid_until, usage_limit, times_used, is_active, created_at
     FROM SWOOP.PROMO_CODE
     WHERE OPERATOR_ID = {{operatorId}} AND REMOVED_AT IS NULL

   Case 'price-zones':
     SELECT zone_id, name, zone_type, base_fare, per_mile_rate, per_minute_rate, minimum_fare, created_at
     FROM SWOOP.PRICE_ZONE
     WHERE OPERATOR_ID = {{operatorId}} AND REMOVED_AT IS NULL

   Case 'rules':
     SELECT rule_id, name, rule_type, conditions, actions, is_active, priority, created_at
     FROM SWOOP.RULE
     WHERE OPERATOR_ID = {{operatorId}} AND REMOVED_AT IS NULL

   Case 'feedback':
     SELECT f.feedback_id, f.title, f.description, f.product_type, f.path, f.created_at,
       u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email
     FROM SWOOP.CUSTOMER_FEEDBACK f
     LEFT JOIN POSTGRES_SWOOP.USER u ON f.user_id = u.user_id
     WHERE f.OPERATOR_ID = {{operatorId}}
     ORDER BY f.created_at DESC

5. Return { success: true, data: [...] }

Use Webhook Trigger, Switch node, Snowflake nodes, and Respond to Webhook.
```

---

### Workflow 9: Subscriptions

```
Create a workflow that:

1. Triggers on webhook: POST to /snowflake/subscriptions

2. Expects body:
   - action (string, required): 'log' | 'add-log' | 'remove-log' | 'update-plan' | 'top-operators' | 'inactive-accounts'
   - operatorId (string, for log/add-log/remove-log/update-plan)
   - lagoPlanCode (string, for add-log)
   - startedAt (ISO date string, optional for add-log)
   - notes (string, optional)
   - plan (string, for update-plan)
   - limit (number, optional)
   - period ('week' | 'month' | 'year', for top-operators)
   - daysSinceLastActivity (number, for inactive-accounts)

3. Validates x-webhook-secret header

4. Use Switch node to route based on action:

   Case 'log':
     SELECT log_id, event_type, plan_name, previous_plan, amount, event_date, notes
     FROM POSTGRES_SWOOP.SUBSCRIPTION_LOG
     WHERE OPERATOR_ID = {{operatorId}} AND REMOVED_AT IS NULL
     ORDER BY event_date DESC

   Case 'add-log':
     Generate UUID, then:
     INSERT INTO POSTGRES_SWOOP.SUBSCRIPTION_LOG (SUBSCRIPTION_LOG_ID, OPERATOR_ID, LAGO_PLAN_CODE, STARTED_AT, NOTES, CREATED_AT)
     VALUES ({{generatedUUID}}, {{operatorId}}, {{lagoPlanCode}}, {{startedAt}}, {{notes}}, CURRENT_TIMESTAMP())
     Return { success: true, subscriptionLogId: generatedUUID }

   Case 'remove-log':
     UPDATE POSTGRES_SWOOP.SUBSCRIPTION_LOG
     SET REMOVED_AT = CURRENT_TIMESTAMP()
     WHERE OPERATOR_ID = {{operatorId}} AND (LAGO_PLAN_CODE = {{lagoPlanCode}} OR {{lagoPlanCode}} IS NULL)
       AND REMOVED_AT IS NULL

   Case 'update-plan':
     UPDATE POSTGRES_SWOOP.OPERATOR
     SET PLAN = {{plan}}, ACTIVE_FOR_ANALYTICS = {{activeForAnalytics}}, UPDATED_AT = CURRENT_TIMESTAMP()
     WHERE OPERATOR_ID = {{operatorId}}

   Case 'top-operators':
     Build period filter based on {{period}}:
     - week: DATE_TRUNC('week', CREATED_DATE) = DATE_TRUNC('week', CURRENT_DATE)
     - month: DATE_TRUNC('month', CREATED_DATE) = DATE_TRUNC('month', CURRENT_DATE)
     - year: DATE_TRUNC('year', CREATED_DATE) = DATE_TRUNC('year', CURRENT_DATE)

     SELECT OPERATOR_ID, OPERATOR_NAME, SUM(TOTAL_DOLLARS_CHARGED) as total_charged, COUNT(*) as total_trips
     FROM MOZART_NEW.MOOVS_PLATFORM_CHARGES
     WHERE {{periodFilter}}
     GROUP BY OPERATOR_ID, OPERATOR_NAME
     ORDER BY total_charged DESC LIMIT {{limit}}

   Case 'inactive-accounts':
     SELECT operator_id, company_name, last_activity_date, days_inactive, mrr
     FROM MOOVS.CSM_MOOVS
     WHERE DA_DAYS_SINCE_LAST_ASSIGNMENT > {{daysSinceLastActivity}}
     ORDER BY mrr DESC NULLS LAST LIMIT {{limit}}

5. Return appropriate response format

Use Webhook Trigger, Switch node, Code node (for UUID), Snowflake nodes, and Respond to Webhook.
```

---

## Response Format

All workflows should return consistent JSON responses:

### Success (Array Results)

```json
{
  "success": true,
  "data": [...]
}
```

### Success (Single Object)

```json
{
  "success": true,
  "data": {...}
}
```

### Success (Write Operation)

```json
{
  "success": true,
  "userId": "..." // or subscriptionLogId, etc.
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

---

## Testing

Test a workflow with curl:

```bash
curl -X POST \
  'https://moovs.app.n8n.cloud/webhook/snowflake/operator-search' \
  -H 'Content-Type: application/json' \
  -H 'x-webhook-secret: YOUR_SECRET' \
  -d '{"action": "search", "searchTerm": "acme", "limit": 10}'
```

```bash
curl -X POST \
  'https://moovs.app.n8n.cloud/webhook/snowflake/team' \
  -H 'Content-Type: application/json' \
  -H 'x-webhook-secret: YOUR_SECRET' \
  -d '{"action": "members", "operatorId": "YOUR_OPERATOR_ID"}'
```

---

## Quick Start

1. Set up Snowflake credentials in N8N
2. Create the 9 workflows using the prompts above
3. Test each workflow with curl
4. Set `N8N_WEBHOOK_BASE_URL` and `N8N_WEBHOOK_SECRET` in your app's environment
5. Deploy the updated Success Factory code

The application will automatically route all Snowflake operations through N8N!
