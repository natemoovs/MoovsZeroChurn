# Operator Hub - Retool Parity Plan

> Tracking implementation progress to achieve feature parity with the original Moovs Matrix Retool app.

## Status Legend
- [ ] Not started
- [x] Completed
- [~] In progress

---

## Phase 1: Missing Features (No UI, No API)

### 1.1 Quotes Section
- [x] Create `/api/operator-hub/[operatorId]/quotes/route.ts` API
- [x] Add Snowflake query for quotes data (getOperatorQuotes, getOperatorQuotesSummary)
- [x] Add Quotes tab to operator detail page
- [x] Display quote conversion rates, monthly trends, filterable table

### 1.2 Disputes Analytics
- [x] Create `/api/operator-hub/[operatorId]/disputes/route.ts` API
- [x] Add Snowflake query for disputes data
- [x] Add Disputes section to Risk tab with:
  - [x] Total Disputes count stat
  - [x] Total Disputed Amount stat
  - [x] Disputes by Status bar chart
  - [x] Disputes by Reason bar chart
  - [x] Risk Level Distribution bar chart
  - [x] Disputes Over Time bar chart
  - [ ] Date range filter (future enhancement)

### 1.3 Sales Tools (AI Transcript Summarizer)
- [ ] Create `/api/sales-tools/summarize/route.ts` API
- [ ] Integrate Claude/OpenAI for transcript summarization
- [ ] Create `/matrix/sales-tools` page with:
  - [ ] Transcript input textarea
  - [ ] Summary type selector (Discovery, CSM Prep, HubSpot ICP)
  - [ ] Generate summary button
  - [ ] Copy summary button
  - [ ] Output display

### 1.4 Marketing AI Analysis
- [ ] Create `/api/marketing/analyze/route.ts` API
- [ ] Integrate with analytics data source
- [ ] Create marketing insights section with:
  - [ ] Google Analytics quote/reservation analysis
  - [ ] AI-generated recommendations

### 1.5 SendGrid Admin Actions
- [x] Create SendGrid suppression management client (`lib/email/sendgrid.ts`)
- [x] Create `/api/sendgrid/suppressions` API (GET + DELETE)
- [x] Add "Remove Bounce" button to Emails tab UI
- [x] Add "Remove Block" button to Emails tab UI
- [x] Add bounce/block search functionality in UI
- [x] Display suppression results with remove actions

### 1.6 Risk Management Admin Actions (Admin-only)
- [x] Create PATCH endpoint for `/api/operator-hub/[operatorId]/risk`
- [x] Add Snowflake write queries for:
  - [x] `updateOperatorInstantPayoutLimit` - Instant payout volume limit
  - [x] `updateOperatorDailyPaymentLimit` - Daily payment processing limit
  - [x] `updateOperatorRiskScore` - Internal risk score
- [x] Add `getOperatorRiskDetails` query to fetch current values
- [x] Add RiskUpdateModal component with:
  - [x] Instant Payout Limit input (currency format)
  - [x] Daily Processing Limit input (currency format)
  - [x] Internal Risk Score input
  - [x] Individual update buttons per field
- [x] Add "Update Risk Details" button in Risk tab (admin-only visibility)
- [x] Display current risk management settings in Risk Analysis card
- [x] Protect PATCH endpoint with `requireAdmin()` middleware

### 1.7 Customer Drill-down from Charges
- [x] Create `/api/operator-hub/[operatorId]/customer/[customerId]/route.ts` API
- [ ] Add Twilio SMS history lookup (future enhancement)
- [ ] Add SendGrid email history lookup (future enhancement)
- [x] Add customer detail modal/drawer in Payments tab
- [x] Show all customer charges with summary stats

### 1.8 Notion Tickets Integration
- [ ] Create Notion API integration in `/lib/integrations/notion.ts`
- [ ] Create `/api/operator-hub/[operatorId]/notion-tickets/route.ts` API
- [ ] Add Tickets by Alert Type section
- [ ] Add alert type charts (bar, pie, stacked by date)

---

## Phase 2: Enhance Existing Features

### 2.1 Charges Table - Add Missing Fields
- [x] Update Snowflake query to include:
  - [x] `CUSTOMER_ID`
  - [x] `TOTAL_DOLLARS_REFUNDED`
  - [x] `BILLING_DETAIL_NAME`
  - [x] `OUTCOME_NETWORK_STATUS`
  - [x] `OUTCOME_REASON`
  - [x] `OUTCOME_SELLER_MESSAGE`
  - [x] `OUTCOME_RISK_LEVEL`
  - [x] `OUTCOME_RISK_SCORE`
  - [x] `CARD_ID`
  - [x] `CALCULATED_STATEMENT_DESCRIPTOR`
  - [x] `DISPUTE_ID`, `DISPUTE_STATUS`, `DISPUTED_AMOUNT`, `DISPUTE_REASON`, `DISPUTE_DATE`
- [x] Update charges API response type
- [x] Update Payments tab UI to show new columns (Risk, Refund, Dispute)
- [x] Add charge detail modal (click row to view full charge info)

### 2.2 Drivers/Vehicles - Keep in Features Tab
- [x] Decision: Keep drivers/vehicles as sub-sections in Features tab (not promoted to dedicated tabs)
- [x] Add driver performance metrics (total trips, completion rate, revenue, last active)
- [x] Add vehicle utilization stats (total trips, revenue, last used, days idle)

### 2.3 SendGrid - Full Suppression Management
- [x] Add global bounce report table
- [x] Add invalid email report table
- [x] Add blocked email report table
- [x] Add spam reports table
- [x] Add email search by address
- [x] Add bulk removal actions

---

## Phase 3: Analytics & Visualizations

### 3.1 Add Chart Library
- [x] Install recharts or chart.js
- [x] Create reusable chart components

### 3.2 Charges Analytics
- [x] Monthly Total Charges bar chart (grouped by succeeded/failed)
- [x] Charges over time line chart

### 3.3 Risk Analytics
- [x] Risk score distribution chart (Disputes by Risk Level)
- [x] Disputes trend chart (Failed payments/disputes over time)

---

## Implementation Order (Priority)

1. **Disputes Analytics** - High value, builds on existing Risk tab ✅
2. **Charges Table Enhancement** - Quick win, improves existing feature ✅
3. **SendGrid Admin Actions** - High value for ops team ✅
4. **Quotes Section** - Core business metric ✅
5. **Customer Drill-down** - Power user feature ✅
6. **Risk Management Admin Actions** - Admin-only risk settings ✅
7. **Drivers/Vehicles Tabs** - Better organization (kept as sub-sections) ✅
8. **Sales Tools** - Nice to have
9. **Marketing AI** - Nice to have
10. **Notion Integration** - Nice to have

---

## Notes

- All Snowflake queries should be added to `/lib/integrations/snowflake.ts`
- Use existing UI patterns from current tabs
- Follow existing API route patterns
- Test with operators that have data in each area
