---
name: Customer Health Summary
description: Full customer context for calls, QBRs, or renewals — data fetched automatically
outputPath: factory/knowledge/success-factory/health-summaries/{{customer}}.md
knowledge:
  - success-factory/csm-playbook.md
  - success-factory/health-scoring.md
data:
  hubspot:
    company: true
    contacts: true
    deals: true
    activity: true
  stripe:
    customer: true
    subscriptions: true
    invoices: true
---

# Customer Health Summary

Generate a complete customer health summary for Moovs transportation operator customers with data pulled automatically from HubSpot and Stripe. No copying/pasting data — just enter the customer name and get a full briefing.

## Context: Moovs Customers

**Moovs** is a B2B SaaS platform for ground transportation operators (black car/limo services and shuttle programs).

### Customer Segments
- **SMB** ($50K-$250K revenue, 1-5 vehicles) — Owner-operators on Free/Standard plans
- **Mid-Market** ($250K-$1M revenue, 6-19 vehicles) — Growing operators on Pro plans
- **Enterprise** ($1M+ revenue, 20+ vehicles) — Large fleets on Enterprise plans
- **Shuttle** — University, Corporate, or Third-party operator programs

### Moovs Pricing Tiers
| Plan | Price | Key Features |
|------|-------|--------------|
| Free | $0/mo | 3 users, 10 vehicles, 4% + $0.30 CC rate |
| Standard | $149/mo | 3 users, unlimited vehicles, 3.4% CC rate |
| Pro | $199/mo | 5 users, unlimited promo codes, 3% CC rate |
| Enterprise | $499+/mo | Unlimited users, AI features, custom rates |
| Shuttle Add-on | $499+/mo | Full shuttle operations platform |

## What This Skill Does

1. **Fetches live data** from HubSpot (company, contacts, deals, activity) and Stripe (subscription, invoices, payment history)
2. **Synthesizes** the data into a 1-page health summary specific to transportation operators
3. **Surfaces risks** and talking points based on segment-appropriate signals

## When to Use

- Before a **check-in call** — get quick context on the operator
- Preparing for a **QBR** — have the full picture of their Moovs usage
- Going into a **renewal** — know the account health and expansion potential
- Handling an **escalation** — understand their history and relationship
- Anytime you need customer context fast

---

## Questions

### customer: Customer name or domain?
Examples:
- Acme Corp
- acme.com
- Smith & Associates

### meetingType: What's this for?
Examples:
- Check-in call
- QBR (Quarterly Business Review)
- Renewal discussion
- Escalation / save call
- General research

### notes: Anything specific to address? (optional)
Examples:
- Champion mentioned budget concerns last call
- They asked about our enterprise plan
- Support escalation about API issues
- Just want a general overview

---

## Template

```markdown
# Customer Health Summary: {{customer}}

**Prepared For:** {{meetingType}}
**Generated:** {{date}}

---

## Quick Stats

| Metric | Value |
|--------|-------|
| **Health Score** | [Calculated: Green/Yellow/Red] |
| **Segment** | [SMB/Mid-Market/Enterprise based on plan + revenue] |
| **MRR** | [From Stripe] |
| **Customer Since** | [From data] |
| **Plan** | [Free/Standard/Pro/Enterprise + Add-ons] |
| **Payment Status** | [Current/Overdue/At Risk] |

---

## Operator Profile

### Company Overview
| Field | Value |
|-------|-------|
| **Company** | [Name from HubSpot] |
| **Type** | [Black Car / Shuttle / Both] |
| **Fleet Size** | [If available] |
| **Location** | [City, State] |
| **Industry** | [Ground Transportation / Limo / Shuttle Service] |

### Key Contacts
| Name | Role | Last Contact |
|------|------|--------------|
| [Contact 1] | [Owner/GM/Dispatcher/Ops Mgr] | [Date] |
| [Contact 2] | [Title] | [Date] |

### Relationship History
- **Tenure:** [X months/years]
- **Onboarding:** [Completed/In Progress]
- **Last CSM Touch:** [Most recent activity]
- **Support Tickets:** [Open/Recent]

---

## Billing & Subscription

### Current Plan
| Field | Value |
|-------|-------|
| **Plan** | [Plan name] |
| **Amount** | [$/period] |
| **Status** | [Active/Trialing/Past Due/Canceled] |
| **Billing Cycle** | [Monthly/Annual] |
| **Next Invoice** | [Date] |

### Payment Health
| Indicator | Status |
|-----------|--------|
| **Recent Payments** | [Last 3 payment statuses] |
| **Outstanding** | [$X or None] |
| **Payment Success Rate** | [X%] |

### Invoice History (Last 3)
| Date | Amount | Status |
|------|--------|--------|
| [Date] | [$X] | [Paid/Pending/Failed] |

---

## Health Assessment

### Positive Signals
- [Signal 1 with evidence from data]
- [Signal 2 with evidence from data]
- [Signal 3 with evidence from data]

### Risk Signals
| Signal | Severity | Evidence |
|--------|----------|----------|
| [Risk 1] | High/Medium/Low | [Data point] |
| [Risk 2] | High/Medium/Low | [Data point] |

### Overall Assessment
[2-3 sentence summary of account health, trajectory, and key considerations for this meeting type]

---

## Talking Points

Based on the data and meeting type ({{meetingType}}):

### Open With
> "[Personalized opener acknowledging their situation]"

### Celebrate
- [Win or positive trend to highlight]

### Explore
- [Question to ask based on data gaps or opportunities]

### Address
- [How to bring up any risks or concerns]

### Propose
- [Next step or action to suggest]

---

## Recommended Actions

- [ ] [Specific action based on health assessment]
- [ ] [Follow-up item based on data]
- [ ] [Timeline for next touchpoint]

---

## Notes & Context

{{notes}}

---

*Data pulled from HubSpot and Stripe at {{date}}. Verify any time-sensitive information directly.*
```

---

## Health Score Calculation

The health score is calculated from integration data with Moovs-specific signals:

### Green (Healthy)
- Payment status current, no failed charges
- Active subscription on paid plan (Standard+)
- Recent CSM/Support activity in HubSpot
- Using key features (Dispatch, Customer Portal, Driver App)
- Contacts engaged, champion identified

### Yellow (Monitor)
- Minor payment delays (1 failed charge retried)
- Stuck on Free plan too long (60+ days)
- Decreasing login/usage (from Moovs metrics if available)
- Open support issues
- No contact in 30+ days
- Champion role change (new dispatcher/GM)

### Red (At Risk)
- Failed payments or overdue invoices (2+ failures)
- Subscription past due or cancel pending
- No activity in 60+ days
- Champion left company
- Competitor mention in notes
- Downgrade request
- Multiple risk signals combined

---

## Quality Checklist

Before using this summary:

- [ ] Verify health score reflects actual status
- [ ] Confirm billing data is current
- [ ] Check that contacts are still accurate
- [ ] Talking points match meeting type
- [ ] Actions are specific and achievable
