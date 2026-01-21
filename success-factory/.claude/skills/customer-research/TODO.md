# Customer Research Skill - Open Items & Tasks

**Last Updated:** 2026-01-16

---

## High Priority

### Testing & Validation
- [ ] Test Metabase query with a real operator_id to confirm OPERATOR_ID filter works
- [ ] Verify Lago external_customer_id format matches what operators actually use
- [ ] Test HubSpot company search - confirm `operator_id` custom property exists
- [ ] Validate Notion tickets database ID (13b8aeaa-3759-80f8-8d7c-dd2f627d2578)

### Data Quality
- [ ] Confirm operator_id format consistency across all systems (Lago, HubSpot, Metabase)
- [ ] Document any operator_id transformation needed (e.g., `op_12345` vs `12345`)

---

## Medium Priority

### Notion Tickets Integration
- [ ] Query Moovs Tickets database for customer-related tickets
- [ ] Determine how to filter tickets by operator (Tags? Name mention? Custom property?)
- [ ] Pull open tickets, recent closed tickets, and enterprise commitments
- [ ] Include ticket count and status in customer profiles
- [ ] Add ticket history to health score calculation

### Missing Integrations
- [x] Add Stripe payment data integration (failed payments, disputes) - **DONE 2026-01-16**
- [ ] Consider adding Intercom/support chat history
- [ ] Server database direct queries for real-time usage (if needed beyond Metabase)

### Report Enhancements
- [ ] Add "Churn Risk" dedicated report combining all signals
- [ ] Create "Account Review" template for QBRs
- [ ] Add export to PDF/Notion capability

### Health Score Refinement
- [ ] Calibrate health score weights based on actual churn data
- [ ] Add historical trend tracking for health scores
- [ ] Define thresholds for automated alerts

---

## Low Priority / Nice to Have

### Automation
- [ ] Weekly health score digest for at-risk customers
- [ ] Automated profile generation before scheduled customer calls
- [ ] Slack integration for quick lookups

### Data Enrichment
- [ ] Add Clearbit/similar for company enrichment
- [ ] Pull in G2/Capterra review mentions
- [ ] LinkedIn company size/funding data

### UX Improvements
- [ ] Create "quick profile" one-liner summary
- [ ] Add comparison mode (compare 2+ operators)
- [ ] Batch lookup for multiple operators

---

## Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| ? | ? | (Add issues as discovered) |

---

## Questions to Resolve

1. **HubSpot property name:** Is the custom property `operator_id` or something else like `moovs_operator_id`?
2. **Notion tags:** How are customers tagged in tickets? By name? By operator_id?
3. **Metabase access:** Any rate limits or query timeouts to be aware of?
4. **Multi-currency:** Do any operators bill in non-USD? How to handle?

---

## Notes

### 2026-01-16
- Added Metabase integration for reservation data (Card 642)
- OPERATOR_ID field confirmed (field ID: 58047)
- Database is Snowflake (ID: 2), schema MOZART
- 90+ fields available for reservation analysis
- Added Stripe payment data integration (Card 855)
- Card 855 requires JOIN with POSTGRES_SWOOP.OPERATOR to filter by operator_id
- Join pattern: `MOOVS_PLATFORM_CHARGES.STRIPE_ACCOUNT_ID = OPERATOR.STRIPE_ACCOUNT`
- Created STRIPE_GUIDE.md with query templates for payment analysis
- Added CSM Lookup via Card 1469 (MOOVS.CSM_MOOVS table)
- Card 1469 is master customer view combining Lago, Postgres, HubSpot, and reservation data
- Key lookup fields: P_STRIPE_ACCOUNT_ID, P_COMPANY_NAME, P_GENERAL_EMAIL
- Returns LAGO_EXTERNAL_CUSTOMER_ID (operator_id) for use in other queries
- Created LOOKUP_GUIDE.md with query templates for customer lookup

---

## Integration Status

| System | Status | Key Identifier | Notes |
|--------|--------|----------------|-------|
| Lago | Ready | `external_customer_id` | Billing & invoices |
| HubSpot | Ready | Company search / `operator_id` prop | Needs property name confirmation |
| Metabase (CSM Lookup) | Ready | `P_STRIPE_ACCOUNT_ID`, `P_COMPANY_NAME`, `P_GENERAL_EMAIL` (Card 1469) | Added 2026-01-16 |
| Metabase (Reservations) | Ready | `OPERATOR_ID` (Card 642) | Added 2026-01-16 |
| Metabase (Stripe) | Ready | `OPERATOR_ID` via JOIN (Card 855) | Added 2026-01-16 |
| Notion | Ready | Tags / name search | DB ID needs verification |

---

## Usage Examples to Document

- [ ] Full profile walkthrough with sample output
- [ ] Billing-only lookup example
- [ ] Reservation trend analysis example
- [ ] Health score calculation walkthrough
- [ ] Multi-source correlation example (billing healthy but usage declining)
