# n8n Integration Plan for Success Factory

> Last updated: January 26, 2026
> Status: Planning Phase

## Overview

This document outlines the complete integration strategy for connecting Success Factory with your existing tools via n8n. The goal is to create a fully automated Customer Success platform that pulls data from all sources and triggers actions in real-time.

---

## Available Credentials (from n8n)

### Tier 1: Critical Integrations (High Value)

| Service | Credential | Priority | Use Case |
|---------|------------|----------|----------|
| **Stripe** | Stripe Billing for Moovs, Stripe account 2 | 🔴 P0 | Payment health, MRR tracking, churn detection |
| **HubSpot** | HubSpot OAuth2, HubSpot App Token | 🔴 P0 | Customer data, deals, lifecycle stages |
| **Intercom** | Intercom API (2x) | 🔴 P0 | Support tickets, sentiment, engagement |
| **Snowflake** | Snowflake account | 🔴 P0 | Product usage data, analytics |
| **Slack** | Swoop Helper BOT, MEB BOT | 🟡 P1 | CSM alerts, notifications |

### Tier 2: Enhancement Integrations

| Service | Credential | Priority | Use Case |
|---------|------------|----------|----------|
| **Gmail** | Gmail account 2 | 🟡 P1 | Email sequences, notifications |
| **Twilio** | Twilio account | 🟡 P1 | SMS alerts for critical issues |
| **Calendly** | Calendly account (2x) | 🟡 P1 | Meeting tracking, engagement signals |
| **Apollo** | Apollo API Key, apollo key | 🟡 P1 | Stakeholder enrichment |
| **Notion** | Notion account 2 | 🟢 P2 | Task sync (already built!) |

### Tier 3: Utility Integrations

| Service | Credential | Priority | Use Case |
|---------|------------|----------|----------|
| **Google Sheets** | Multiple accounts | 🟢 P2 | Reporting, dashboards, exports |
| **Google Drive** | swoop google drive | 🟢 P2 | QBR storage, document management |
| **Google Docs** | Google Docs account | 🟢 P2 | Generate QBR documents |
| **Google Calendar** | Google Calendar account 2 | 🟢 P2 | Meeting sync |
| **Supabase** | Supabase account | 🟢 P2 | Backup/alternative database |

### Tier 4: To Investigate

| Service | Credential | Notes |
|---------|------------|-------|
| **Quo API** | quo api key | What is this? Payment? |
| **Firestream** | Firestream API | Analytics? |
| **blend.ai** | blend.ai | AI service? |
| **Apify** | Apify account | Web scraping? |
| **Dataforso** | dataforso | Data enrichment? |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                 │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┤
│   Stripe    │  HubSpot    │  Intercom   │  Snowflake  │  Calendly   │
│  (Billing)  │   (CRM)     │  (Support)  │  (Usage)    │ (Meetings)  │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┘
       │             │             │             │             │
       ▼             ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              n8n                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Webhooks  │  Scheduled Jobs  │  Event Processing  │ Logic  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SUCCESS FACTORY                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Webhooks │  │  Agents  │  │  Alerts  │  │ Journey  │            │
│  │   API    │  │   API    │  │   API    │  │   API    │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         OUTPUT CHANNELS                              │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┤
│    Slack    │    Gmail    │   Twilio    │   Sheets    │    Drive    │
│  (Alerts)   │  (Emails)   │   (SMS)     │ (Reports)   │   (Docs)    │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

---

## Phase 1: Core Data Ingestion (Week 1)

### 1.1 Stripe → Success Factory

**Purpose:** Real-time payment health monitoring

**Webhook Events to Capture:**
- `invoice.payment_failed` → Alert + at-risk task
- `invoice.payment_succeeded` → Clear payment risk flag
- `customer.subscription.updated` → MRR change detection
- `customer.subscription.deleted` → Journey → churned
- `charge.dispute.created` → Critical alert

**n8n Workflow:**
```
[Stripe Trigger: Webhook]
    │
    ▼
[Switch: Event Type]
    │
    ├─► payment_failed ──► [HTTP: POST /api/webhooks/n8n/stripe]
    │                           │
    │                           ▼
    │                      [Slack: Alert #cs-alerts]
    │
    ├─► subscription_deleted ──► [HTTP: POST /api/journey]
    │                                 body: { stage: "churned" }
    │
    └─► subscription_updated ──► [HTTP: POST /api/webhooks/n8n/stripe]
                                      (MRR update)
```

**Success Factory Endpoint Needed:**
```typescript
// POST /api/webhooks/n8n/stripe
{
  event: "payment_failed" | "payment_succeeded" | "subscription_updated" | "subscription_deleted",
  customerId: string,
  customerEmail: string,
  amount?: number,
  mrr?: number,
  metadata: Record<string, any>
}
```

---

### 1.2 HubSpot → Success Factory

**Purpose:** Real-time CRM sync, deal stage changes, contact updates

**Webhook Events to Capture:**
- Company property changes (health_score, lifecycle_stage)
- Deal stage changes (especially to "Closed Lost")
- Contact added/removed from company
- Owner assignment changes

**n8n Workflow:**
```
[HubSpot Trigger: Webhook]
    │
    ▼
[Switch: Event Type]
    │
    ├─► company.propertyChange ──► [HTTP: POST /api/sync/hubspot]
    │
    ├─► deal.propertyChange ──► [IF: stage = "closedlost"]
    │                               │
    │                               ▼
    │                          [HTTP: POST /api/journey]
    │                               body: { stage: "churned" }
    │
    └─► contact.creation ──► [HTTP: POST /api/stakeholders/{companyId}]
```

**Bidirectional Sync:**
```
[Cron: Every 15 minutes]
    │
    ▼
[HTTP: GET /api/integrations/hubspot/companies?needsSync=true]
    │
    ▼
[Loop: For each company]
    │
    ▼
[HubSpot: Update Company Properties]
    - health_score
    - last_activity_date
    - churn_risk_score
```

---

### 1.3 Intercom → Success Factory

**Purpose:** Support ticket sentiment, volume tracking, engagement signals

**Webhook Events to Capture:**
- `conversation.created` → New ticket
- `conversation.closed` → Resolution tracking
- `conversation.rated` → CSAT data
- `contact.tag.created` → Sentiment signals

**n8n Workflow:**
```
[Intercom Trigger: Webhook]
    │
    ▼
[Switch: Event Type]
    │
    ├─► conversation.created ──► [HTTP: POST /api/webhooks/n8n/intercom]
    │                                 │
    │                                 ▼
    │                            [IF: Priority = Urgent]
    │                                 │
    │                                 ▼
    │                            [Slack: Alert CSM]
    │
    └─► conversation.rated ──► [IF: Rating < 3]
                                    │
                                    ▼
                               [HTTP: POST /api/activity]
                                    event: "negative_csat"
```

**Daily Aggregation:**
```
[Cron: 6 AM Daily]
    │
    ▼
[Intercom: Search Conversations]
    filter: created_at > yesterday
    │
    ▼
[Code: Aggregate by Company]
    - ticket_count
    - avg_response_time
    - sentiment_score
    │
    ▼
[HTTP: POST /api/webhooks/n8n/intercom/daily-summary]
```

---

### 1.4 Snowflake → Success Factory

**Context:** Snowflake is the raw data source that Metabase queries. We can either:
1. Keep using Metabase (queries already built)
2. Go direct to Snowflake via n8n (real-time, no middleman)

**Recommendation:** Start with Metabase (already working), then migrate to direct Snowflake queries for real-time data.

**Current Metabase Query ID:** 948 (used throughout Success Factory)

**Equivalent Snowflake Query (to recreate):**
```sql
-- Daily usage metrics per company (matches Metabase query 948)
SELECT
  MOOVS_COMPANY_NAME as company_name,
  COMPANY_ID as company_id,
  ALL_TRIPS_COUNT as total_trips,
  DAYS_SINCE_LAST_IDENTIFY as days_since_login,
  CHURN_STATUS as churn_status,
  TOTAL_MRR_NUMERIC as mrr,
  LAGO_PLAN_NAME as plan
FROM <schema>.<table>  -- Need to confirm table name
WHERE ...
```

**n8n Workflow:**
```
[Cron: 5 AM Daily]
    │
    ▼
[Snowflake: Execute Query]
    │
    ▼
[Loop: For each company]
    │
    ▼
[HTTP: POST /api/webhooks/n8n/usage-metrics]
    body: {
      companyId,
      totalTrips,
      daysSinceLastLogin,
      churnStatus
    }
```

**Success Factory Changes Needed:**
- Create `/api/webhooks/n8n/usage-metrics` endpoint
- Update `HubSpotCompany` with usage data
- Remove Metabase dependency (optional)

---

## Phase 2: Alerting & Notifications (Week 2)

### 2.1 Slack Alerts

**Alert Types:**
| Alert | Channel | Urgency |
|-------|---------|---------|
| Payment Failed | #cs-alerts | 🔴 Immediate |
| Subscription Canceled | #cs-alerts | 🔴 Immediate |
| Health Declined (→ Red) | #cs-alerts | 🟡 Within 1 hour |
| Renewal in 30 days | CSM DM | 🟢 Daily digest |
| New at-risk account | #cs-alerts | 🟡 Within 1 hour |

**n8n Workflow: Critical Alerts**
```
[Success Factory Webhook: Alert Created]
    │
    ▼
[Switch: Alert Type]
    │
    ├─► payment_failed ──► [Slack: Post to #cs-alerts]
    │                           │
    │                           ▼
    │                      [Twilio: SMS to CSM] (if MRR > $1000)
    │
    ├─► subscription_canceled ──► [Slack: Post to #cs-alerts]
    │
    └─► health_declined ──► [Slack: Post to #cs-alerts]
```

**n8n Workflow: Daily Digest**
```
[Cron: 8 AM Daily]
    │
    ▼
[HTTP: GET /api/alerts/prioritized?limit=20]
    │
    ▼
[HTTP: GET /api/dashboard/stats]
    │
    ▼
[Code: Format Digest Message]
    │
    ▼
[Slack: Post to #cs-daily-digest]
    │
    ▼
[Loop: For each CSM]
    │
    ▼
[Slack: DM personalized tasks]
```

---

### 2.2 Email Sequences (Gmail)

**Sequences to Automate:**
1. **At-Risk Outreach** - When health drops to red
2. **Renewal Reminder** - 60, 30, 14 days before
3. **Onboarding Check-in** - Day 7, 14, 30
4. **Win-back Campaign** - 30, 60, 90 days after churn

**n8n Workflow: At-Risk Email Sequence**
```
[Success Factory Webhook: Journey → at_risk]
    │
    ▼
[HTTP: GET /api/customer/{companyId}]
    │
    ▼
[Gmail: Send Email]
    to: primary_contact
    subject: "Quick check-in from {csm_name}"
    template: at_risk_outreach
    │
    ▼
[Wait: 3 days]
    │
    ▼
[IF: No response & still at_risk]
    │
    ▼
[Gmail: Send Follow-up]
```

---

### 2.3 SMS Alerts (Twilio)

**Critical SMS Triggers:**
- Payment failed for accounts > $1000 MRR
- Subscription canceled for accounts > $500 MRR
- Multiple failed payments (3+)

**n8n Workflow:**
```
[Success Factory Webhook: Critical Alert]
    │
    ▼
[IF: MRR > threshold AND alert_type in critical_types]
    │
    ▼
[HTTP: GET /api/integrations/hubspot/owners/{ownerId}]
    │
    ▼
[Twilio: Send SMS]
    to: owner.phone
    body: "🚨 {company_name}: {alert_type}. Check Success Factory."
```

---

## Phase 3: Enrichment & Intelligence (Week 3)

### 3.1 Apollo Stakeholder Enrichment

**Purpose:** Automatically enrich stakeholder data with Apollo

**n8n Workflow:**
```
[Success Factory Webhook: Stakeholder Created]
    │
    ▼
[Apollo: Person Enrichment]
    email: stakeholder.email
    │
    ▼
[HTTP: PATCH /api/stakeholders/{companyId}/{id}]
    body: {
      title: apollo.title,
      linkedIn: apollo.linkedin_url,
      seniorityLevel: apollo.seniority,
      department: apollo.department
    }
```

---

### 3.2 Calendly Meeting Tracking

**Purpose:** Track engagement through meeting activity

**Webhook Events:**
- `invitee.created` → Meeting scheduled
- `invitee.canceled` → Meeting canceled (risk signal!)

**n8n Workflow:**
```
[Calendly Trigger: Webhook]
    │
    ▼
[Code: Extract company from email domain]
    │
    ▼
[HTTP: GET /api/companies?domain={domain}]
    │
    ▼
[IF: Company found]
    │
    ├─► invitee.created ──► [HTTP: POST /api/activity]
    │                            event: "meeting_scheduled"
    │
    └─► invitee.canceled ──► [HTTP: POST /api/activity]
                                  event: "meeting_canceled"
                                  │
                                  ▼
                             [IF: 2+ cancellations in 30 days]
                                  │
                                  ▼
                             [HTTP: POST /api/tasks]
                                  title: "Follow up on canceled meetings"
```

---

## Phase 4: Reporting & Exports (Week 4)

### 4.1 Google Sheets Dashboard

**Purpose:** Executive dashboard that updates automatically

**Sheets to Create:**
1. **CSM Leaderboard** - Weekly metrics by CSM
2. **At-Risk Accounts** - Current red/yellow accounts
3. **Revenue Forecast** - MRR projections
4. **Churn Analysis** - Monthly churn breakdown

**n8n Workflow: Weekly Dashboard Update**
```
[Cron: Monday 6 AM]
    │
    ▼
[Parallel]
    ├─► [HTTP: GET /api/csm/leaderboard]
    ├─► [HTTP: GET /api/churn-prediction?riskLevel=high]
    ├─► [HTTP: GET /api/agents/revenue-forecast]
    └─► [HTTP: GET /api/dashboard/stats]
    │
    ▼
[Google Sheets: Update "CSM Dashboard"]
    │
    ▼
[Slack: Post dashboard link to #cs-leadership]
```

---

### 4.2 QBR Document Generation

**Purpose:** Auto-generate QBR documents and store in Drive

**n8n Workflow:**
```
[Cron: 1st of month]
    │
    ▼
[HTTP: GET /api/integrations/renewals?daysUntil=90]
    │
    ▼
[Loop: For each renewal]
    │
    ▼
[HTTP: GET /api/agents/qbr-prep?companyId={id}]
    │
    ▼
[Google Docs: Create from Template]
    │
    ▼
[Google Drive: Upload to Customer Folder]
    │
    ▼
[HTTP: POST /api/tasks]
    title: "QBR ready for {company_name}"
    │
    ▼
[Slack: DM CSM with doc link]
```

---

## Success Factory API Endpoints Needed

### New Endpoints to Build

```typescript
// Webhook receivers for n8n
POST /api/webhooks/n8n/stripe
POST /api/webhooks/n8n/intercom
POST /api/webhooks/n8n/usage-metrics
POST /api/webhooks/n8n/calendly

// Outbound webhooks (n8n listens)
// Configure in Settings to POST to n8n when:
// - Alert created
// - Journey stage changed
// - Task created
// - Health score changed
```

### Webhook Configuration Model

```prisma
model WebhookSubscription {
  id        String   @id @default(cuid())
  url       String   // n8n webhook URL
  events    String[] // ["alert.created", "journey.changed", etc.]
  secret    String   // HMAC signing secret
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}
```

---

## Environment Variables Needed

```bash
# n8n Cloud Instance
N8N_CLOUD_URL=https://moovs.app.n8n.cloud

# n8n Webhook URLs (set after creating workflows)
N8N_WEBHOOK_BASE_URL=https://moovs.app.n8n.cloud/webhook

# Webhook secrets for validation
N8N_WEBHOOK_SECRET=your-secret-here

# Optional: n8n API for programmatic workflow management
N8N_API_KEY=your-api-key
N8N_API_URL=https://moovs.app.n8n.cloud/api/v1
```

---

## Implementation Checklist

### Week 1: Core Data
- [ ] Build `/api/webhooks/n8n/stripe` endpoint
- [ ] Build `/api/webhooks/n8n/intercom` endpoint
- [ ] Build `/api/webhooks/n8n/usage-metrics` endpoint
- [ ] Create n8n workflow: Stripe → Success Factory
- [ ] Create n8n workflow: HubSpot bidirectional sync
- [ ] Create n8n workflow: Intercom → Success Factory
- [ ] Create n8n workflow: Snowflake daily usage sync

### Week 2: Alerting
- [ ] Build outbound webhook system in Success Factory
- [ ] Create n8n workflow: Critical Slack alerts
- [ ] Create n8n workflow: Daily digest
- [ ] Create n8n workflow: SMS for critical alerts
- [ ] Create n8n workflow: At-risk email sequence

### Week 3: Enrichment
- [ ] Create n8n workflow: Apollo stakeholder enrichment
- [ ] Create n8n workflow: Calendly meeting tracking
- [ ] Build `/api/webhooks/n8n/calendly` endpoint

### Week 4: Reporting
- [ ] Create Google Sheets dashboard template
- [ ] Create n8n workflow: Weekly dashboard update
- [ ] Create n8n workflow: QBR document generation
- [ ] Create QBR Google Docs template

---

## n8n Workflow Templates

Once we start building, I'll create exportable JSON templates for each workflow that you can import directly into n8n.

**Files to create:**
- `n8n/stripe-webhook.json`
- `n8n/hubspot-sync.json`
- `n8n/intercom-webhook.json`
- `n8n/snowflake-usage.json`
- `n8n/slack-alerts.json`
- `n8n/email-sequences.json`
- `n8n/daily-digest.json`
- `n8n/apollo-enrichment.json`
- `n8n/calendly-tracking.json`
- `n8n/sheets-dashboard.json`
- `n8n/qbr-generation.json`

---

## n8n AI Prompts

> Copy-paste these prompts into n8n AI to create each workflow quickly.

### Endpoint Status - ALL READY! ✅

| Integration | Endpoint | Status |
|-------------|----------|--------|
| **Stripe** | `/api/webhooks/n8n/stripe` | ✅ Ready |
| **HubSpot** | `/api/webhooks/n8n/hubspot` | ✅ Ready |
| **Intercom** | `/api/webhooks/n8n/intercom` | ✅ Ready |
| **Calendly** | `/api/webhooks/n8n/calendly` | ✅ Ready |
| **Quo (Phone)** | `/api/webhooks/n8n/quo` | ✅ Ready |
| **Snowflake** | `/api/webhooks/n8n/usage-metrics` | ✅ Ready |
| **Slack** | Outbound only | ✅ Ready (use Slack node) |
| **Gmail** | Outbound only | ✅ Ready (use Gmail node) |

**All endpoints built!** Just create the n8n workflows using the prompts below.

---

### Prompt 1: Stripe → Success Factory ✅ DONE

```
Create a workflow that:

1. Triggers on Stripe webhook events:
   - invoice.payment_failed
   - invoice.payment_succeeded
   - customer.subscription.updated (include when cancel_at_period_end is set)
   - customer.subscription.deleted
   - charge.dispute.created

2. For each event, extract:
   - Event type (map to: payment_failed, payment_succeeded, subscription_updated, subscription_canceled, subscription_scheduled_cancel, dispute_created)
   - Customer ID, Customer email
   - Amount (convert from cents to dollars)
   - MRR (for subscription events, calculate monthly value)
   - Previous MRR (for detecting downgrades)
   - Failure message (for payment_failed)
   - Cancel reason, cancelAt date (for cancellations - IMPORTANT: if cancel_at_period_end is true, use subscription_scheduled_cancel event)
   - Plan name, Invoice ID, Subscription ID

3. Send POST request to:
   URL: https://success-factory.vercel.app/api/webhooks/n8n/stripe
   Headers: x-webhook-secret = {{$env.N8N_WEBHOOK_SECRET}}
   Body: { "event": "<type>", "customerId": "<id>", "customerEmail": "<email>", "amount": <dollars>, "mrr": <mrr>, "previousMrr": <prev_mrr>, "failureMessage": "<msg>", "cancelReason": "<reason>", "cancelAt": "<iso_date>", "planName": "<plan>", "invoiceId": "<inv_id>", "subscriptionId": "<sub_id>" }

IMPORTANT: For "subscription_scheduled_cancel" - this is when a customer has scheduled their subscription to end but it hasn't cancelled yet. This is a SAVE opportunity! Include the cancelAt date.

Use Stripe Trigger node and HTTP Request node.
```

---

### Prompt 2: HubSpot → Success Factory

```
Create a workflow that:

1. Triggers on HubSpot webhook events:
   - company.propertyChange (when company properties update)
   - deal.propertyChange (when deal stage changes)

2. For company changes, extract:
   - Company ID, Company name, Changed properties array

3. For deal stage changes, extract:
   - Deal ID, Associated company ID, Previous stage, New stage, Deal amount

4. Send POST request to:
   URL: https://success-factory.vercel.app/api/webhooks/n8n/hubspot
   Headers: x-webhook-secret = {{$env.N8N_WEBHOOK_SECRET}}
   Body: { "event": "<type>", "companyId": "<id>", "companyName": "<name>", "dealId": "<deal_id>", "previousStage": "<prev>", "newStage": "<new>", "changedProperties": [...] }

Use HubSpot Trigger node and HTTP Request node.
```

---

### Prompt 3: Intercom → Success Factory

```
Create a workflow that:

1. Triggers on Intercom webhook events:
   - conversation.created (new support ticket)
   - conversation.closed (ticket resolved)
   - conversation.rated (CSAT rating)

2. For each event, extract:
   - Conversation ID, Contact email, Contact name, Company name
   - Subject, Rating (1-5), Response time, Message count

3. Send POST request to:
   URL: https://success-factory.vercel.app/api/webhooks/n8n/intercom
   Headers: x-webhook-secret = {{$env.N8N_WEBHOOK_SECRET}}
   Body: { "event": "<type>", "conversationId": "<id>", "contactEmail": "<email>", "companyName": "<company>", "rating": <1-5>, "responseTimeMinutes": <mins> }

Use Intercom Trigger node and HTTP Request node.
```

---

### Prompt 4: Calendly → Success Factory

```
Create a workflow that:

1. Triggers on Calendly webhook events:
   - invitee.created (meeting scheduled)
   - invitee.canceled (meeting canceled)
   - invitee.no_show (IMPORTANT: customer didn't show up - this is a churn signal!)
   - routing_form_submission (if you use rescheduling forms)

2. For each event, extract:
   - Event ID, Invitee email, Invitee name
   - Meeting type, Scheduled time, Duration
   - Cancel reason (if canceled)
   - Host name

3. Map events to our types:
   - invitee.created → meeting_scheduled
   - invitee.canceled → meeting_canceled
   - invitee.no_show → meeting_no_show
   - rescheduled → meeting_rescheduled

4. Send POST request to:
   URL: https://success-factory.vercel.app/api/webhooks/n8n/calendly
   Headers: x-webhook-secret = {{$env.N8N_WEBHOOK_SECRET}}
   Body: { "event": "<type>", "eventId": "<id>", "inviteeEmail": "<email>", "inviteeName": "<name>", "meetingType": "<type>", "scheduledAt": "<iso_time>", "durationMinutes": <mins>, "hostName": "<host>", "cancelReason": "<reason>" }

IMPORTANT: No-shows are important churn signals - make sure this event is captured!

Use Calendly Trigger node and HTTP Request node.
```

---

### Prompt 5: Quo (Phone - formerly OpenPhone) → Success Factory

```
Create a workflow that:

1. Triggers on Quo/OpenPhone webhook events:
   - call.completed (call ended)
   - call.missed (missed call)
   - message.received (SMS received)
   - voicemail.received

2. For call events, extract:
   - Call ID, From number, To number, Duration (seconds)
   - Direction (inbound/outbound), Recording URL, Outcome

3. For SMS, extract:
   - Message ID, From/To numbers, Message body

4. Send POST request to:
   URL: https://success-factory.vercel.app/api/webhooks/n8n/quo
   Headers: x-webhook-secret = {{$env.N8N_WEBHOOK_SECRET}}
   Body: { "event": "<type>", "fromNumber": "<from>", "toNumber": "<to>", "durationSeconds": <secs>, "direction": "<dir>", "recordingUrl": "<url>", "messageBody": "<sms_text>" }

Use HTTP Request node with Quo API credentials.
```

---

### Prompt 6: Snowflake Daily Sync → Success Factory

```
Create a workflow that:

1. Triggers on schedule: Every day at 5 AM UTC

2. Run Snowflake query (enhance based on available columns):
   SELECT
     MOOVS_COMPANY_NAME,
     COMPANY_ID,
     ALL_TRIPS_COUNT as totalTrips,
     DAYS_SINCE_LAST_IDENTIFY as daysSinceLastLogin,
     CHURN_STATUS,
     TOTAL_MRR_NUMERIC as mrr,
     LAGO_PLAN_NAME as plan,
     -- If available, include these for better health signals:
     -- TRIPS_THIS_MONTH, TRIPS_LAST_MONTH (for MoM trend)
     -- ACTIVE_USERS (for adoption depth)
     -- LAST_TRIP_DATE, LAST_LOGIN_DATE
   FROM <schema>.<table>
   WHERE MOOVS_COMPANY_NAME IS NOT NULL

3. For each row, POST to:
   URL: https://success-factory.vercel.app/api/webhooks/n8n/usage-metrics
   Headers: x-webhook-secret = {{$env.N8N_WEBHOOK_SECRET}}
   Body: {
     "companyName": "<name>",
     "totalTrips": <trips>,
     "daysSinceLastLogin": <days>,
     "churnStatus": "<status>",
     "mrr": <mrr>,
     "plan": "<plan>",
     // Optional enhanced fields (if available in Snowflake):
     "tripsThisMonth": <this_month>,
     "tripsLastMonth": <last_month>,
     "activeUsers": <user_count>,
     "lastTripDate": "<date>",
     "lastLoginDate": "<date>"
   }

TIP: Can send array of records in one request for efficiency:
POST body: [ {record1}, {record2}, ... ]

Use Schedule Trigger, Snowflake node, SplitInBatches (100 per batch), and HTTP Request node.
```

---

### Prompt 7: Slack Alerts (Outbound from Success Factory)

```
Create a workflow that:

1. Triggers on webhook: https://moovs.app.n8n.cloud/webhook/slack-alert

2. Expects POST body:
   { "alertType": "<type>", "companyName": "<name>", "urgency": "critical|high|medium", "message": "<msg>" }

3. Post to Slack #cs-alerts channel:
   - 🚨 for critical
   - ⚠️ for high
   - ℹ️ for medium
   - Include company name and message

Use Webhook Trigger and Slack node (Swoop Helper BOT credentials).
```

---

### Prompt 8: Daily CSM Digest Email

```
Create a workflow that:

1. Triggers on schedule: Every day at 8 AM

2. Fetch from Success Factory:
   - GET /api/alerts/prioritized?limit=10
   - GET /api/dashboard/stats

3. Format email with:
   - Summary stats
   - Top priority alerts
   - Link to dashboard

4. Send via Gmail to CSM team

Use Schedule Trigger, HTTP Request nodes, and Gmail node.
```

---

## Questions to Resolve

1. ~~**Quo API**~~ - ✅ Phone system (formerly OpenPhone) - for call/SMS tracking
2. **Firestream** - Analytics service?
3. **blend.ai** - AI service we could leverage?
4. **Apify** - Web scraping for competitor intel?
5. **Snowflake schema** - What table powers Metabase query 948?
6. ~~**n8n hosting**~~ - ✅ Using n8n Cloud: `https://moovs.app.n8n.cloud`

---

## Next Steps

1. ✅ Build Stripe webhook endpoint - DONE
2. 🔨 Build remaining webhook endpoints (HubSpot, Intercom, Calendly, Quo, Snowflake)
3. 🔜 Create each n8n workflow using prompts above
4. 🔜 Test with real data
5. 🔜 Activate workflows

---

*Get some sleep! Endpoints will be ready when you wake up. 🌙*
