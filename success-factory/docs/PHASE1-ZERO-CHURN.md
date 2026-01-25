# Phase 1: Zero Churn Enhancements

## Overview

High-impact features to reduce churn, focusing on early detection and proactive engagement.

**Target**: Reduce churn by catching issues in the first 90 days and improving CSM visibility.

---

## Feature 1: Onboarding Milestone Tracker (Time-to-Value)

### Why First

- First 90 days determine customer lifetime
- 40% of churn happens before customers see value
- Need to catch stalled onboardings early

### Milestones to Track (Moovs-specific)

| Milestone               | Target Days | Segment: SMB | Segment: Mid-Market | Segment: Enterprise |
| ----------------------- | ----------- | ------------ | ------------------- | ------------------- |
| First Login             | 1           | Required     | Required            | Required            |
| Profile Complete        | 3           | Required     | Required            | Required            |
| First Vehicle Added     | 7           | Required     | Required            | Required            |
| First Driver Added      | 7           | Optional     | Required            | Required            |
| First Trip Created      | 14          | Required     | Required            | Required            |
| First Payment Processed | 30          | Required     | Required            | Required            |
| Customer Portal Setup   | 30          | Optional     | Required            | Required            |
| First Recurring Booking | 60          | Optional     | Optional            | Required            |
| API Integration         | 90          | N/A          | Optional            | Required            |

### Schema Addition

```prisma
model OnboardingMilestone {
  id          String   @id @default(cuid())
  companyId   String
  milestone   String   // first_login, first_vehicle, first_trip, etc.
  targetDays  Int      // days from signup to complete
  completedAt DateTime?
  isOverdue   Boolean  @default(false)
  createdAt   DateTime @default(now())

  company     HubSpotCompany @relation(fields: [companyId], references: [companyId])

  @@unique([companyId, milestone])
  @@index([companyId])
  @@index([isOverdue])
}
```

### API Endpoints

- `GET /api/onboarding/[companyId]` - Get milestone status
- `POST /api/onboarding/[companyId]/complete` - Mark milestone complete
- `GET /api/onboarding/stalled` - Get all stalled onboardings
- `POST /api/onboarding/initialize` - Create milestones for new customer

### UI Components

- Onboarding progress bar on account detail page
- "Stalled Onboardings" widget on dashboard
- Milestone checklist component

### Playbook Triggers

- `onboarding_stalled_7_days` - No progress in 7 days
- `onboarding_stalled_14_days` - No progress in 14 days
- `milestone_overdue` - Specific milestone past target
- `onboarding_complete` - All milestones hit

---

## Feature 2: NPS Survey Collection

### Why

- 91% of unhappy customers leave without complaining
- NPS trends predict churn 60-90 days ahead
- Detractors need immediate intervention

### Survey Trigger Points

1. **Day 30** - Post-onboarding check
2. **Day 90** - Adoption check
3. **Post-Support Ticket** - After resolution (CSAT optional)
4. **Pre-Renewal (60 days)** - Renewal health check
5. **Quarterly** - Ongoing pulse

### Schema Addition

```prisma
model NPSSurvey {
  id            String   @id @default(cuid())
  companyId     String
  contactEmail  String?
  score         Int      // 0-10
  category      String   // promoter (9-10), passive (7-8), detractor (0-6)
  feedback      String?  // Optional comment
  triggerType   String   // day_30, day_90, post_support, pre_renewal, quarterly
  createdAt     DateTime @default(now())

  company       HubSpotCompany @relation(fields: [companyId], references: [companyId])

  @@index([companyId])
  @@index([category])
  @@index([createdAt])
}
```

### API Endpoints

- `POST /api/nps/send` - Send NPS survey email
- `POST /api/nps/respond` - Record response (public endpoint)
- `GET /api/nps/[companyId]` - Get NPS history for account
- `GET /api/nps/trends` - Get overall NPS trends
- `GET /api/nps/detractors` - Get recent detractors needing attention

### UI Components

- NPS score badge on account card/detail
- NPS trend chart on dashboard
- Detractor alert list
- Survey response modal

### Playbook Triggers

- `nps_detractor` - Score 0-6, immediate outreach
- `nps_passive` - Score 7-8, nurture
- `nps_promoter` - Score 9-10, ask for referral/review
- `nps_declined` - Score dropped from last survey

---

## Feature 3: Customer 360 Timeline

### Why

- CSMs waste time piecing together context
- Need unified view before calls
- Easier to spot patterns

### Event Types to Aggregate

| Source   | Events                                                   |
| -------- | -------------------------------------------------------- |
| HubSpot  | Emails, calls, meetings, notes, deal changes             |
| Stripe   | Payments, failed charges, subscription changes, disputes |
| Support  | Tickets opened, resolved, escalated                      |
| Platform | Health score changes, milestone completions              |
| NPS      | Survey responses                                         |
| Journey  | Stage changes                                            |
| Tasks    | CSM actions completed                                    |

### Schema Addition

```prisma
model ActivityEvent {
  id          String   @id @default(cuid())
  companyId   String
  source      String   // hubspot, stripe, support, platform, nps, journey, task
  eventType   String   // email_sent, payment_failed, ticket_opened, etc.
  title       String   // Human-readable title
  description String?  // Details
  metadata    Json?    // Source-specific data
  occurredAt  DateTime
  createdAt   DateTime @default(now())

  company     HubSpotCompany @relation(fields: [companyId], references: [companyId])

  @@index([companyId, occurredAt])
  @@index([source])
}
```

### API Endpoints

- `GET /api/timeline/[companyId]` - Get unified timeline
- `POST /api/timeline/log` - Log custom event
- `GET /api/timeline/[companyId]/summary` - AI-generated summary

### UI Components

- Timeline component on account detail page
- Filterable by source/type
- Expandable event details
- "Recent Activity" widget on dashboard

---

## Feature 4: Stakeholder/Champion Mapping

### Why

- Champion leaves = 40% churn risk increase
- Need to track relationship health per contact
- Multi-threading prevents single point of failure

### Contact Roles

- **Champion** - Primary advocate, drives adoption
- **Decision Maker** - Budget authority, signs contracts
- **User** - Daily user, provides feedback
- **Influencer** - Affects decisions but doesn't decide
- **Detractor** - Opposes product, risk factor

### Schema Addition

```prisma
model Stakeholder {
  id            String   @id @default(cuid())
  companyId     String
  contactId     String?  // HubSpot contact ID if synced
  name          String
  email         String?
  title         String?
  role          String   // champion, decision_maker, user, influencer, detractor
  sentiment     String   @default("neutral") // positive, neutral, negative
  influence     String   @default("medium") // high, medium, low
  lastContactAt DateTime?
  notes         String?
  isActive      Boolean  @default(true)
  leftCompanyAt DateTime? // Track if they left
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  company       HubSpotCompany @relation(fields: [companyId], references: [companyId])

  @@index([companyId])
  @@index([role])
  @@index([sentiment])
}
```

### API Endpoints

- `GET /api/stakeholders/[companyId]` - Get stakeholders for account
- `POST /api/stakeholders` - Add stakeholder
- `PATCH /api/stakeholders/[id]` - Update stakeholder
- `GET /api/stakeholders/at-risk` - Accounts with champion issues

### UI Components

- Stakeholder map on account detail
- Champion health indicator
- "Champion Left" alert
- Contact sentiment badges

### Playbook Triggers

- `champion_left` - Champion marked as left company
- `champion_sentiment_negative` - Champion sentiment dropped
- `no_champion_identified` - Account has no champion
- `single_threaded` - Only one contact engaged

---

## Implementation Order

### Week 1: Onboarding Milestones

1. Add schema + migrate
2. Build API endpoints
3. Create initialization logic (on HubSpot sync)
4. Add UI to account detail page
5. Add "Stalled Onboardings" to dashboard
6. Add playbook triggers

### Week 2: NPS Collection

1. Add schema + migrate
2. Build survey send/respond endpoints
3. Create email template for NPS survey
4. Add NPS display to account page
5. Add NPS trends to dashboard
6. Add playbook triggers

### Week 3: Customer 360 Timeline

1. Add schema + migrate
2. Build timeline aggregation logic
3. Hook into existing events (health changes, etc.)
4. Create timeline UI component
5. Add to account detail page
6. Add AI summary endpoint

### Week 4: Stakeholder Mapping

1. Add schema + migrate
2. Build CRUD endpoints
3. Sync initial contacts from HubSpot
4. Create stakeholder map UI
5. Add champion alerts
6. Add playbook triggers

---

## Success Metrics

| Metric                  | Current | Target                |
| ----------------------- | ------- | --------------------- |
| First 90-day churn      | ?       | -30%                  |
| Time to first value     | ?       | -40%                  |
| CSM prep time per call  | ~15 min | 5 min                 |
| Detractor response time | N/A     | < 24 hours            |
| Champion coverage       | ?       | 100% of paid accounts |

---

## Files to Create/Modify

### New Files

```
prisma/schema.prisma (modify - add 4 models)
app/api/onboarding/[companyId]/route.ts
app/api/onboarding/stalled/route.ts
app/api/nps/route.ts
app/api/nps/[companyId]/route.ts
app/api/nps/respond/route.ts
app/api/timeline/[companyId]/route.ts
app/api/stakeholders/route.ts
app/api/stakeholders/[companyId]/route.ts
components/onboarding-progress.tsx
components/nps-badge.tsx
components/timeline.tsx
components/stakeholder-map.tsx
lib/onboarding/milestones.ts
lib/nps/survey.ts
```

### Modified Files

```
app/(dashboard)/accounts/[id]/page.tsx - Add new sections
app/(dashboard)/page.tsx - Add new widgets
lib/segments/playbooks.ts - Add new triggers
app/api/health-history/snapshot/route.ts - Check milestones
```

---

## Next Steps

1. ✅ Plan created
2. ⏳ Add schema models
3. ⏳ Build onboarding milestone tracker
4. ⏳ Build NPS collection
5. ⏳ Build 360 timeline
6. ⏳ Build stakeholder mapping
7. ⏳ Add to dashboard
8. ⏳ Add playbook triggers
