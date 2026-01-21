---
name: Renewal Prep Summary
description: Prepare a comprehensive renewal strategy document before contract discussions
outputPath: factory/knowledge/zerochurn/renewals/{{customerName}}.md
---

# Renewal Prep Summary Skill

Generate a renewal preparation document with value delivered, expansion opportunities, and negotiation strategy.

## What This Skill Does

1. Gathers contract and relationship context
2. Collects value metrics and risk factors
3. Produces a renewal strategy brief with talking points

## Required Knowledge

Before generating, load:
- @knowledge/zerochurn/csm-playbook.md - Renewal conversation framework
- @knowledge/zerochurn/health-scoring.md - Health interpretation

---

## Questions

### customerName: Customer name and contract details?
Examples:
- Acme Corp - $48K ARR, renews March 15, 2-year contract
- TechStart - $12K ARR, month-to-month, been with us 8 months
- Enterprise Co - $150K ARR, auto-renew in 60 days, multi-year

### relationshipHealth: How would you describe the relationship health?
Examples:
- Strong - Executive sponsor engaged, high NPS, expanding usage
- Moderate - Day-to-day contact good but limited exec visibility
- At risk - Champion left, usage declining, support escalations

### valueDelivered: What concrete value have they gotten from us? (metrics, outcomes, quotes)
Examples:
- Reduced churn by 23% since implementation
- Saved 10 hours/week on manual reporting
- "Best decision we made this year" - VP Customer Success
- Launched 3 new markets using our platform

### risks: What risks or concerns might come up in renewal?
Examples:
- Budget pressure - heard they're cutting SaaS spend
- Competitor evaluation - saw LinkedIn connection to rival
- Underutilization - only using 40% of features
- Price sensitivity - pushed back on last increase

### expansionOpps: Any expansion or upsell opportunities?
Examples:
- Additional seats - team grew from 5 to 12
- New module interest - asked about analytics add-on
- Additional locations - opening 2 new offices
- None obvious - focus on retention

---

## Template

```markdown
# Renewal Prep: {{customerName}}

**Renewal Date:** [From context]
**Current ARR:** [From context]
**Contract Type:** [From context]

---

## Executive Summary

[2-3 sentence overview of renewal outlook and recommended strategy]

---

## Value Delivered

### Key Outcomes
| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| [Metric 1] | [Baseline] | [Current] | [% change] |
| [Metric 2] | [Baseline] | [Current] | [% change] |

### Customer Proof Points
> "[Quote or feedback from customer]"

### ROI Summary
[Calculate or estimate ROI based on value delivered]

---

## Relationship Assessment

**Current Health:** [Green/Yellow/Red]

| Factor | Status | Notes |
|--------|--------|-------|
| Executive Sponsor | [Status] | [Name/engagement level] |
| Day-to-day Champion | [Status] | [Name/engagement level] |
| Product Adoption | [%] | [Key features used/unused] |
| Support Health | [Status] | [Ticket trends] |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [Specific action] |
| [Risk 2] | High/Med/Low | High/Med/Low | [Specific action] |

---

## Expansion Opportunity

**Potential Additional ARR:** $[estimate]

| Opportunity | Fit | Timing | Next Step |
|-------------|-----|--------|-----------|
| [Opp 1] | Strong/Moderate | [When] | [Action] |
| [Opp 2] | Strong/Moderate | [When] | [Action] |

---

## Renewal Strategy

### Recommended Approach
[Straightforward renewal / Renewal with expansion / Defensive renewal with concessions]

### Key Talking Points
1. **Open with:** [Specific value highlight]
2. **Reinforce:** [ROI or outcome they care about]
3. **Address:** [Proactive handling of likely concerns]
4. **Propose:** [Renewal terms + any expansion]

### Negotiation Boundaries
- **Ideal outcome:** [Best case]
- **Acceptable:** [Middle ground]
- **Walk-away:** [Minimum acceptable terms]

---

## Pre-Renewal Action Items

- [ ] [Action 1 with owner and date]
- [ ] [Action 2 with owner and date]
- [ ] [Action 3 with owner and date]
- [ ] Schedule renewal call for [date]
```

---

## Quality Checklist

- [ ] Value metrics are specific and quantified
- [ ] Risks have concrete mitigation strategies
- [ ] Talking points sound natural, not scripted
- [ ] Expansion opportunity is realistically sized
- [ ] Action items have owners and dates
