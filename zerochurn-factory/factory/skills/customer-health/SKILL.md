---
name: Customer Health Summary
description: Full customer context for calls, QBRs, or renewals — data fetched automatically
outputPath: factory/knowledge/zerochurn/health-summaries/{{customer}}.md
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

Generate a complete customer health summary with data pulled automatically from HubSpot and Stripe. No copying/pasting data — just enter the customer name and get a full briefing.

## What This Skill Does

1. **Fetches live data** from HubSpot (company, contacts, deals, activity) and Stripe (subscription, invoices, payment history)
2. **Synthesizes** the data into a 1-page health summary
3. **Surfaces risks** and talking points based on the data

## When to Use

- Before a **check-in call** — get quick context
- Preparing for a **QBR** — have the full picture
- Going into a **renewal** — know the account health
- Handling an **escalation** — understand the history
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
| **MRR/ARR** | [From Stripe] |
| **Customer Since** | [From data] |
| **Plan** | [Current subscription] |
| **Payment Status** | [Current/Overdue/At Risk] |

---

## Account Overview

### Company Profile
[From HubSpot: industry, size, location, lifecycle stage]

### Key Contacts
| Name | Role | Last Contact |
|------|------|--------------|
| [Contact 1] | [Title] | [Date] |
| [Contact 2] | [Title] | [Date] |

### Relationship History
- **Tenure:** [X months/years]
- **Deals:** [Open/Won/Lost summary]
- **Last Interaction:** [Most recent activity]

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

The health score is calculated from integration data:

### Green (Healthy)
- Payment status current
- Active subscription
- Recent activity in HubSpot
- No overdue invoices
- Contacts engaged

### Yellow (Monitor)
- Minor payment delays
- Decreasing activity
- Open support issues
- Contact gaps

### Red (At Risk)
- Failed payments or overdue invoices
- Subscription canceled or past due
- No recent activity
- Champion left or unknown
- Multiple risk signals

---

## Quality Checklist

Before using this summary:

- [ ] Verify health score reflects actual status
- [ ] Confirm billing data is current
- [ ] Check that contacts are still accurate
- [ ] Talking points match meeting type
- [ ] Actions are specific and achievable
