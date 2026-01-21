---
name: Portfolio Health Review
description: Health overview for your entire book of business — Enterprise or SMB/Mid-Market
outputPath: factory/knowledge/zerochurn/portfolio-reviews/{{segment}}-{{date}}.md
data:
  batch: true
  hubspot:
    company: true
    contacts: true
  stripe:
    customer: true
    subscriptions: true
    invoices: true
---

# Portfolio Health Review

Get a health overview of your entire book of business with one click. Perfect for weekly portfolio reviews, pipeline meetings, or identifying accounts that need attention.

## Context: CSM Books of Business

At Moovs, CSMs are assigned by segment:

| Role | Segment | Revenue Range | Typical Fleet |
|------|---------|---------------|---------------|
| **SMB/Mid-Market CSM** | SMB + Mid-Market | $50K - $1M | 1-19 vehicles |
| **Enterprise CSM** | Enterprise | $1M+ | 20+ vehicles |

## What This Skill Does

1. **Fetches all accounts** in your segment from HubSpot
2. **Pulls billing data** for each from Stripe (subscription, payment status)
3. **Calculates health scores** using Moovs-specific signals
4. **Generates a portfolio view** with:
   - Summary stats (total accounts, health distribution, total MRR)
   - Account-by-account breakdown
   - At-risk accounts requiring immediate attention
   - Recommended actions

## When to Use

- **Weekly portfolio review** — See your full book of business
- **Before 1:1 with manager** — Know your numbers
- **Pipeline meeting** — Which accounts need attention?
- **Quarter start** — Prioritize your time
- **Churn review** — Find at-risk accounts before they leave

---

## Questions

### segment: Which book of business?
Examples:
- Enterprise (accounts $1M+ revenue)
- SMB/Mid-Market (accounts $50K-$1M revenue)
- All (full portfolio view)

### focus: Any specific focus for this review? (optional)
Examples:
- Accounts up for renewal this quarter
- Accounts with payment issues
- Recently onboarded accounts
- Just want the full picture

---

## Template

```markdown
# Portfolio Health Review: {{segment}}

**Generated:** {{date}}
**Focus:** {{focus}}

---

## Portfolio Summary

| Metric | Value |
|--------|-------|
| **Total Accounts** | [Count from data] |
| **Healthy (Green)** | [Count] |
| **Monitor (Yellow)** | [Count] |
| **At Risk (Red)** | [Count] |
| **Total MRR** | [$X] |
| **At-Risk MRR** | [$X at risk] |

### Health Distribution

```
Green:  ████████████████ X accounts
Yellow: ██████████       X accounts
Red:    ████             X accounts
```

---

## Account Overview

| Company | Health | MRR | Plan | Payment | Key Signal |
|---------|--------|-----|------|---------|------------|
| [Company 1] | 🟢/🟡/🔴 | $X | [Plan] | [Status] | [Top signal] |
| [Company 2] | 🟢/🟡/🔴 | $X | [Plan] | [Status] | [Top signal] |
| ... | | | | | |

---

## At-Risk Accounts (Immediate Attention)

### [Company Name] — 🔴 Red
**MRR:** $X | **Plan:** [Plan] | **Customer Since:** [Date]

**Risk Signals:**
- [Signal 1 with evidence]
- [Signal 2 with evidence]

**Recommended Action:**
> [Specific next step for this account]

---

### [Company Name 2] — 🔴 Red
...

---

## Monitor Accounts (Watch List)

| Company | MRR | Signal | Recommended Check-in |
|---------|-----|--------|---------------------|
| [Company] | $X | [Signal] | [When/What] |
| ... | | | |

---

## Healthy Accounts (Expansion Opportunities)

These accounts are healthy and may be ready for expansion:

| Company | MRR | Plan | Expansion Signal |
|---------|-----|------|------------------|
| [Company] | $X | [Plan] | [Growing usage / adding vehicles / etc.] |
| ... | | | |

---

## Recommended Actions This Week

Based on this portfolio review:

1. [ ] **Urgent:** [Action for highest-risk account]
2. [ ] **This week:** [Action for second priority]
3. [ ] **Schedule:** [Proactive outreach for monitor accounts]
4. [ ] **Explore:** [Expansion conversation with healthy account]

---

## Portfolio Trends

### vs. Last Review
- Accounts moved to Green: [X]
- Accounts moved to Yellow: [X]
- Accounts moved to Red: [X]
- New accounts added: [X]
- Accounts churned: [X]

### MRR Movement
- Expansion: +$X
- Contraction: -$X
- Churn: -$X
- Net: ±$X

---

*Data pulled from HubSpot and Stripe at {{date}}. Review individual accounts for time-sensitive decisions.*
```

---

## Health Score Criteria

### 🟢 Green (Healthy)
- Active paid subscription
- Payments current (no failed charges)
- Recent engagement (login, support, CSM contact)
- Multiple contacts on file
- No cancellation signals

### 🟡 Yellow (Monitor)
- Minor payment delays (1 retry)
- No engagement in 30+ days
- Single point of contact
- On Free plan 60+ days
- Support escalation open

### 🔴 Red (At Risk)
- Payment failures (2+ attempts)
- Past due or cancel pending
- No engagement 60+ days
- Champion departed
- Downgrade request
- Competitor mentioned

---

## Segment Definitions

### Enterprise ($1M+ revenue)
- Named CSM relationship
- QBRs expected
- High-touch support
- AI features, custom integrations
- Longer sales cycles, higher switching cost

### Mid-Market ($250K-$1M revenue)
- Pooled CSM coverage
- Growth-focused conversations
- Efficiency features
- Expanding operations

### SMB ($50K-$250K revenue)
- Scaled/tech-touch
- Self-service where possible
- Quick wins matter
- Cost-sensitive

---

## Quality Checklist

Before acting on this review:

- [ ] Verify red accounts have current data
- [ ] Check for recent support tickets not reflected
- [ ] Confirm contact info is still accurate
- [ ] Cross-reference with any recent conversations
- [ ] Prioritize by MRR impact, not just count
