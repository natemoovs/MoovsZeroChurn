# Operator Hub Migration Plan - Moovs Matrix to Native Tool

## Overview
This document tracks the migration from the Retool "Moovs Matrix" app to a native Next.js implementation in Success Factory.

---

## Environment Variables Required

```bash
# Snowflake Direct Connection (preferred)
SNOWFLAKE_ACCOUNT=xxx
SNOWFLAKE_USERNAME=xxx
SNOWFLAKE_PASSWORD=xxx
SNOWFLAKE_DATABASE=MOZART_NEW      # default
SNOWFLAKE_WAREHOUSE=COMPUTE_WH     # default

# Metabase Fallback (if Snowflake direct not configured)
METABASE_URL=https://swoop.metabaseapp.com
METABASE_API_KEY=xxx
SNOWFLAKE_DATABASE_ID=2            # default

# Stripe Integration (dual accounts)
STRIPE_PLATFORM_SECRET_KEY=rk_live_xxx      # Moovs platform (subscriptions)
STRIPE_CONNECTED_ACCOUNT_SECRET_KEY=rk_live_xxx  # Operator connected accounts

# HubSpot Integration
HUBSPOT_ACCESS_TOKEN=xxx

# Notion Integration (for tickets)
NOTION_API_KEY=xxx
NOTION_TICKETS_DB_ID=xxx
```

---

## Retool Feature Analysis

### Data Sources / Tables Used
From the Retool export, these Snowflake tables are referenced:

**Core Operator Data:**
- `MOOVS.CSM_MOOVS` - Main operator overview (MRR, trips, engagement) ✅
- `MOZART.CSM_COMBINED_NEW` - Combined CSM view
- `SWOOP.OPERATOR` - Operator details
- `SWOOP.OPERATOR_SETTINGS` - Operator configuration ✅
- `SWOOP.OPERATOR_LIMIT` - Operator limits

**Platform Data (POSTGRES_SWOOP):**
- `POSTGRES_SWOOP.USER` - Platform members/users ✅
- `POSTGRES_SWOOP.DRIVER` - Drivers ✅
- `POSTGRES_SWOOP.OPERATOR_SETTINGS` - Settings ✅
- `POSTGRES_SWOOP.SUBSCRIPTION_LOG` - Subscription history ✅

**Financial/Payment Data:**
- `MOZART_NEW.MOOVS_PLATFORM_CHARGES` - Stripe charges ✅
- `MOZART_NEW.ALL_SUBSCRIPTIONS` - Lago subscriptions
- `FACT.LAGO_FEES` - Lago fees
- `FACT.MOOVS_RISK_OVERVIEW` - Risk metrics ✅

**Reservations/Activity:**
- `FACT.MOOVS_OPERATOR_RESERVATIONS` - Reservation data ✅

**Additional Features:**
- `SWOOP.PROMO_CODE` - Promo codes ✅
- `SWOOP.PRICE_ZONE` - Pricing zones ✅
- `SWOOP.RULE` - Business rules ✅
- `SWOOP.CONTACT` - Contacts ✅
- `SWOOP.VEHICLE` - Vehicles ✅
- `SWOOP.STRIPE_FINANCIAL_CONNECTIONS_ACCOUNT` - Bank accounts ✅
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
| HubSpot Company/Deal | HubSpot Record | ✅ Done |

---

## Current Implementation Status

### ✅ Completed Features

| Feature | Location | Notes |
|---------|----------|-------|
| Operator Search | `/matrix` | Search-as-you-type with 300ms debounce |
| Operator Detail Page | `/matrix/[operatorId]` | Tab-based UI |
| Overview Tab | Overview section | Key metrics, health, signals |
| Payments Tab | PaymentsTab component | Charges from Snowflake |
| Risk Tab | RiskTab component | Risk metrics |
| Activity Tab | ActivityTab component | Monthly trips |
| Tickets Tab | TicketsTab component | Notion integration |
| Emails Tab | EmailsTab component | HubSpot activity |
| Features Tab | FeaturesTab component | Members/Drivers/Vehicles + Platform Data |
| Quick Links | OverviewTab | External dashboards |
| Quick Actions | OverviewTab | All actions working |
| Email Health Alert | OverviewTab | Sendgrid status |
| Direct Snowflake | `lib/integrations/snowflake.ts` | With Metabase fallback |
| Stripe Dual Keys | `lib/integrations/stripe.ts` | Platform + Connected accounts |

### ✅ Completed Infrastructure

1. **Direct Snowflake Connection** ✅
   - File: `lib/integrations/snowflake.ts`
   - Uses `snowflake-sdk` with dynamic import for Turbopack compatibility
   - Falls back to Metabase if direct connection fails
   - Added `serverExternalPackages` config in `next.config.ts`

2. **Stripe Dual Account Support** ✅
   - File: `lib/integrations/stripe.ts`
   - `STRIPE_PLATFORM_SECRET_KEY` for subscriptions/billing
   - `STRIPE_CONNECTED_ACCOUNT_SECRET_KEY` for operator accounts
   - Functions: `getConnectedAccount`, `getConnectedAccountBalance`, `getConnectedAccountPayouts`, `getConnectedAccountCharges`

3. **Search-as-you-type** ✅
   - File: `/app/(dashboard)/matrix/page.tsx`
   - 300ms debounce on search input
   - Loading indicator in search box
   - No button required

4. **operatorId/stripeAccountId in API** ✅
   - File: `/api/integrations/accounts/[id]/route.ts`
   - Returns platform identifiers from synced data

### ✅ Platform Data Features (FeaturesTab)

| Sub-Tab | Data Source | Status |
|---------|-------------|--------|
| Members | `POSTGRES_SWOOP.USER` | ✅ Done |
| Drivers | `POSTGRES_SWOOP.DRIVER` | ✅ Done |
| Vehicles | `SWOOP.VEHICLE` | ✅ Done |
| Promos | `SWOOP.PROMO_CODE` | ✅ Done |
| Zones | `SWOOP.PRICE_ZONE` | ✅ Done |
| Rules | `SWOOP.RULE` | ✅ Done |
| Contacts | `SWOOP.CONTACT` | ✅ Done |
| Bank | `SWOOP.STRIPE_FINANCIAL_CONNECTIONS_ACCOUNT` | ✅ Done |
| History | `POSTGRES_SWOOP.SUBSCRIPTION_LOG` | ✅ Done |

### ❌ Missing Features (CRUD Operations)

| Feature | Priority | Description | Status |
|---------|----------|-------------|--------|
| **Add Member** | Medium | INSERT into POSTGRES_SWOOP.USER | ❌ TODO |
| **Update Member Role** | Medium | UPDATE role_slug | ❌ TODO |
| **Update Risk Details** | Low | Edit risk assessment | ❌ TODO |
| **Update Postgres Plan** | Low | Edit plan configuration | ❌ TODO |

---

## Quick Actions Comparison

| Retool Action | Native Status | Notes |
|--------------|---------------|-------|
| Open Customer Portal | ✅ Done | Uses domain |
| View in HubSpot | ✅ Done | Links to company page |
| Add HubSpot Note | ✅ Done | Links to notes tab |
| Copy Stripe Login Link | ✅ Done | Stripe Express link |
| View Moovs Chat Logs | ✅ Done | Intercom link |
| Search Email Logs | ✅ Done | Sendgrid tab link |
| View Matrix History | ✅ Done | Activity tab link |
| Sendgrid Missing Alert | ✅ Done | Email health banner |
| Copy Operator ID | ✅ Done | CopyActionButton |
| Copy Stripe ID | ✅ Done | CopyActionButton |
| Update Postgres Plan | ❌ Missing | Need modal/form |
| Add Member | ❌ Missing | Need modal + INSERT |
| Update Risk Details | ❌ Missing | Need form |
| Update Member Role | ❌ Missing | Need UPDATE query |

---

## File Structure

```
app/
├── (dashboard)/
│   └── matrix/
│       ├── page.tsx                 # ✅ Search page (debounced)
│       └── [operatorId]/
│           └── page.tsx             # ✅ Detail page with tabs
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
│           └── platform-data/route.ts # ✅ Promos/Zones/Rules/Contacts/Bank/History
lib/
└── integrations/
    ├── snowflake.ts                 # ✅ Direct + Metabase fallback
    ├── snowflake-direct.ts          # ✅ Pure direct connection
    ├── stripe.ts                    # ✅ Dual account support
    ├── hubspot.ts                   # ✅ Contacts & activity
    ├── notion.ts                    # ✅ Tickets
    └── metabase.ts                  # ✅ Fallback queries
```

---

## Snowflake Queries Implemented

### Core Queries (`lib/integrations/snowflake.ts`)

| Function | Table | Status |
|----------|-------|--------|
| `searchOperators` | MOOVS.CSM_MOOVS | ✅ |
| `getOperatorById` | MOOVS.CSM_MOOVS | ✅ |
| `getOperatorPlatformCharges` | MOZART_NEW.MOOVS_PLATFORM_CHARGES | ✅ |
| `getMonthlyChargesSummary` | MOZART_NEW.MOOVS_PLATFORM_CHARGES | ✅ |
| `getReservationsOverview` | MOZART_NEW.RESERVATIONS | ✅ |
| `getRiskOverview` | MOZART_NEW.MOOVS_PLATFORM_CHARGES | ✅ |
| `getOperatorMembers` | POSTGRES_SWOOP.USER | ✅ |
| `getOperatorDrivers` | POSTGRES_SWOOP.DRIVER | ✅ |
| `getOperatorVehicles` | SWOOP.VEHICLE | ✅ |
| `getOperatorEmailLog` | POSTGRES_SWOOP.EMAIL_LOG | ✅ |
| `getOperatorPromoCodes` | SWOOP.PROMO_CODE | ✅ |
| `getOperatorPriceZones` | SWOOP.PRICE_ZONE | ✅ |
| `getOperatorRules` | SWOOP.RULE | ✅ |
| `getOperatorSettings` | POSTGRES_SWOOP.OPERATOR_SETTINGS | ✅ |
| `getOperatorContacts` | SWOOP.CONTACT | ✅ |
| `getOperatorBankAccounts` | SWOOP.STRIPE_FINANCIAL_CONNECTIONS_ACCOUNT | ✅ |
| `getOperatorSubscriptionLog` | POSTGRES_SWOOP.SUBSCRIPTION_LOG | ✅ |

---

## Implementation Plan

### Phase 1: Fix Critical Bugs ✅ COMPLETE
- [x] Update `/api/integrations/accounts/[id]` to return `operatorId` and `stripeAccountId`
- [x] Verify HubSpot link format
- [x] Test Copy buttons work

### Phase 2: Add Missing Platform Data ✅ COMPLETE
- [x] Add Promo Codes query and tab/section
- [x] Add Price Zones query and display
- [x] Add Business Rules display
- [x] Add Platform Contacts (distinct from HubSpot contacts)
- [x] Add Bank Account Info section
- [x] Add Subscription History

### Phase 3: Infrastructure Improvements ✅ COMPLETE
- [x] Direct Snowflake connection (bypass Metabase)
- [x] Search-as-you-type with debouncing
- [x] Stripe dual account support (platform + connected)
- [x] Update all STRIPE_SECRET_KEY references

### Phase 4: Add CRUD Operations 🔄 IN PROGRESS
- [ ] Add Member modal/form
- [ ] Update Member Role modal
- [ ] Update Risk Details form
- [ ] Update Postgres Plan form

### Phase 5: Polish & Enhancements (Future)
- [ ] Matrix History view (change log)
- [ ] Enhanced email search
- [ ] Stripe live data integration (balance, payouts)
- [ ] Bulk operations

---

## Notes

- Retool uses `{{ operatorId.value }}` which is the LAGO_EXTERNAL_CUSTOMER_ID
- This maps to `operator_id` in POSTGRES_SWOOP and SWOOP tables
- The URL param is HubSpot company ID, need to look up the operatorId from synced data
- Stats on page header come from HubSpot sync, platform data comes from Snowflake
- Vehicle table is in `SWOOP.VEHICLE` (not POSTGRES_SWOOP)
- Snowflake database ID for Metabase is 2 (not 3)

---

## Changelog

### 2026-01-26
- Added direct Snowflake connection with Metabase fallback
- Implemented search-as-you-type with 300ms debounce
- Updated Stripe integration for dual account support
- Updated all STRIPE_SECRET_KEY references to STRIPE_PLATFORM_SECRET_KEY
- Fixed VEHICLE table schema (SWOOP.VEHICLE)
- Fixed Snowflake database ID (use 2, not 3)
- Added Platform Data tab with 9 sub-tabs
- Completed Phase 1, 2, and 3 of migration

---

Last Updated: 2026-01-26
