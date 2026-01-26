# Operator Hub Migration Plan - Moovs Matrix to Native Tool

## Overview
This document tracks the migration from the Retool "Moovs Matrix" app to a native Next.js implementation in Success Factory.

## Retool Feature Analysis

### Data Sources / Tables Used
From the Retool export, these Snowflake tables are referenced:

**Core Operator Data:**
- `MOOVS.CSM_MOOVS` - Main operator overview (MRR, trips, engagement)
- `MOZART.CSM_COMBINED_NEW` - Combined CSM view
- `SWOOP.OPERATOR` - Operator details
- `SWOOP.OPERATOR_SETTINGS` - Operator configuration
- `SWOOP.OPERATOR_LIMIT` - Operator limits

**Platform Data (POSTGRES_SWOOP):**
- `POSTGRES_SWOOP.USER` - Platform members/users
- `POSTGRES_SWOOP.DRIVER` - Drivers
- `POSTGRES_SWOOP.OPERATOR_SETTINGS` - Settings
- `POSTGRES_SWOOP.SUBSCRIPTION_LOG` - Subscription history

**Financial/Payment Data:**
- `MOZART_NEW.MOOVS_PLATFORM_CHARGES` - Stripe charges
- `MOZART_NEW.ALL_SUBSCRIPTIONS` - Lago subscriptions
- `FACT.LAGO_FEES` - Lago fees
- `FACT.MOOVS_RISK_OVERVIEW` - Risk metrics

**Reservations/Activity:**
- `FACT.MOOVS_OPERATOR_RESERVATIONS` - Reservation data

**Additional Features:**
- `SWOOP.PROMO_CODE` - Promo codes
- `SWOOP.PRICE_ZONE` - Pricing zones
- `SWOOP.RULE` - Business rules
- `SWOOP.CONTACT` - Contacts
- `SWOOP.VEHICLE` - Vehicles
- `SWOOP.STRIPE_FINANCIAL_CONNECTIONS_ACCOUNT` - Bank accounts
- `SWOOP.STRIPE_FINANCIAL_CONNECTIONS_TRANSACTION` - Bank transactions
- `MOZART_NEW.DRIVERAPP_USERS` - Driver app users

---

## External Links in Retool

| Link | Description | Status |
|------|-------------|--------|
| `https://customer.moovs.app/{name_slug}/new/info` | Customer Portal | ✅ Done |
| `https://dashboard.stripe.com/connect/accounts/{stripeId}/activity` | Stripe Dashboard | ✅ Done |
| `https://analytics.june.so/a/829/objects/2321/object/{operatorId}` | June Analytics | ✅ Done |
| `https://swoop.metabaseapp.com/public/dashboard/...?operator_id={operatorId}` | Metabase Dashboard | ✅ Done |
| HubSpot Company/Deal | HubSpot Record | ⚠️ Needs fix |

---

## Current Implementation Status

### ✅ Completed Features

| Feature | Location | Notes |
|---------|----------|-------|
| Operator Search | `/matrix` | Search by name, ID |
| Operator Detail Page | `/matrix/[operatorId]` | Tab-based UI |
| Overview Tab | Overview section | Key metrics, health, signals |
| Payments Tab | PaymentsTab component | Charges from Snowflake |
| Risk Tab | RiskTab component | Risk metrics |
| Activity Tab | ActivityTab component | Monthly trips |
| Tickets Tab | TicketsTab component | Notion integration |
| Emails Tab | EmailsTab component | HubSpot activity |
| Features Tab | FeaturesTab component | Members/Drivers/Vehicles |
| Quick Links | OverviewTab | External dashboards |
| Quick Actions | OverviewTab | Basic actions |
| Email Health Alert | OverviewTab | Sendgrid status |

### ✅ Fixed Issues

1. **operatorId now returned from accounts API** ✅
   - File: `/api/integrations/accounts/[id]/route.ts`
   - Added `operatorId` and `stripeAccountId` to response

2. **Copy Operator ID / Stripe ID working** ✅
   - Now properly displays and copies IDs

3. **HubSpot link label fixed** ✅
   - Changed from "Open HubSpot Deal" to "View in HubSpot" (links to company)

### ❌ Missing / Broken Features

#### Missing Features from Retool

| Feature | Priority | Description | Status |
|---------|----------|-------------|--------|
| **Promo Codes** | High | View/search promo codes | ✅ Done |
| **Price Zones** | High | View pricing zones | ✅ Done |
| **Business Rules** | High | View configured rules | ✅ Done |
| **Contacts** | Medium | Platform contacts (not HubSpot) |
| **Bank Account Info** | Medium | Stripe Financial Connections |
| **Sendgrid Email Search** | Medium | Search email logs |
| **Subscription History** | Medium | Lago subscription changes |
| **Operator Settings View** | Medium | View/edit settings |
| **Matrix History** | Low | Change history view |
| **Add Member** | Low | CRUD: Create member |
| **Update Member Role** | Low | CRUD: Edit member |
| **Update Risk Details** | Low | CRUD: Edit risk |
| **Update Postgres Plan** | Low | CRUD: Edit plan |
| **Add HubSpot Note** | Low | Create note via API |

#### Quick Actions Comparison

| Retool Action | Native Status | Notes |
|--------------|---------------|-------|
| Open Customer Portal | ✅ Done | Uses domain |
| Open HubSpot Deal | ⚠️ Verify | Link format |
| Add HubSpot Note | ⚠️ Link only | No API integration |
| Update Postgres Plan | ❌ Missing | Need modal/form |
| Add Member | ❌ Missing | INSERT query needed |
| Update Risk Details | ❌ Missing | Form needed |
| Copy Request Payment Link | ❌ Missing | Generate Stripe link |
| View Moovs Chat Logs | ✅ Done | Intercom link |
| Search Email Logs | ⚠️ Tab link | No search UI |
| View Matrix History | ⚠️ Tab link | No history view |
| Update Member Role | ❌ Missing | UPDATE query |
| Sendgrid Missing Alert | ✅ Done | Email health banner |
| Copy Operator ID | ⚠️ Broken | Needs API fix |
| Copy Stripe ID | ⚠️ Broken | Needs API fix |

---

## SQL Queries to Implement

### 1. Promo Codes
```sql
SELECT * FROM swoop.promo_code
WHERE operator_id = {{ operatorId }}
LIMIT 100
```

### 2. Price Zones
```sql
SELECT * FROM swoop.price_zone
WHERE operator_id = {{ operatorId }}
LIMIT 100
```

### 3. Business Rules
```sql
SELECT * FROM swoop.rule
WHERE operator_id = {{ operatorId }}
LIMIT 100
```

### 4. Platform Contacts
```sql
SELECT * FROM swoop.contact
WHERE operator_id = {{ operatorId }}
```

### 5. Bank Account Info
```sql
SELECT * FROM swoop.stripe_financial_connections_account
WHERE operator_id = {{ operatorId }}
```

### 6. Subscription Log
```sql
SELECT * FROM postgres_swoop.subscription_log
WHERE operator_id = {{ operatorId }}
```

### 7. Add Member (INSERT)
```sql
INSERT INTO swoop.user (
  first_name, last_name, email, email_normalize,
  mobile_phone, operator_id, invite_pending,
  phone_country_code, phone_country_dial_code, ...
) VALUES (...)
```

---

## Implementation Plan

### Phase 1: Fix Critical Bugs (Today)
- [ ] Update `/api/integrations/accounts/[id]` to return `operatorId` and `stripeAccountId`
- [ ] Verify HubSpot link format
- [ ] Test Copy buttons work

### Phase 2: Add Missing Platform Data (Next)
- [ ] Add Promo Codes query and tab/section
- [ ] Add Price Zones query and display
- [ ] Add Business Rules display
- [ ] Add Platform Contacts (distinct from HubSpot contacts)
- [ ] Add Bank Account Info section

### Phase 3: Add CRUD Operations (Later)
- [ ] Add Member modal/form
- [ ] Update Member Role modal
- [ ] Update Risk Details form
- [ ] Add HubSpot Note via API (not just link)

### Phase 4: Polish & History
- [ ] Matrix History view (change log)
- [ ] Subscription history timeline
- [ ] Enhanced email search

---

## File Structure

```
app/
├── (dashboard)/
│   └── matrix/
│       ├── page.tsx                 # Search page
│       └── [operatorId]/
│           └── page.tsx             # Detail page with tabs
├── api/
│   └── operator-hub/
│       └── [operatorId]/
│           ├── charges/route.ts     # ✅ Platform charges
│           ├── risk/route.ts        # ✅ Risk data
│           ├── reservations/route.ts # ✅ Trip data
│           ├── members/route.ts     # ✅ Members/Drivers/Vehicles
│           ├── tickets/route.ts     # ✅ Notion tickets
│           ├── emails/route.ts      # ✅ HubSpot activity
│           ├── email-logs/route.ts  # ✅ Platform email logs
│           ├── promo-codes/route.ts # ❌ TODO
│           ├── zones/route.ts       # ❌ TODO
│           └── rules/route.ts       # ❌ TODO
lib/
└── integrations/
    └── snowflake.ts                 # Snowflake queries via Metabase
```

---

## Notes

- Retool uses `{{ operatorId.value }}` which is the LAGO_EXTERNAL_CUSTOMER_ID
- This maps to `operator_id` in POSTGRES_SWOOP tables
- The URL param is HubSpot company ID, need to look up the operatorId from synced data
- Stats on page header come from HubSpot sync, platform data comes from Snowflake

---

Last Updated: 2026-01-26
