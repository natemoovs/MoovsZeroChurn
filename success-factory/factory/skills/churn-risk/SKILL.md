---
name: Churn Risk Analysis
description: Analyze churn signals and create an intervention plan to save an at-risk account
outputPath: factory/knowledge/success-factory/risk-analysis/{{customerName}}.md
knowledge:
  - success-factory/csm-playbook.md
  - success-factory/health-scoring.md
  - csm-playbooks/churn-save.md
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

# Churn Risk Analysis Skill

Generate a detailed churn risk assessment with root cause analysis and a save playbook.

## What This Skill Does

1. Gathers all risk signals and context
2. Analyzes root causes and severity
3. Produces an intervention plan with specific actions

## Required Knowledge

Before generating, load:

- @knowledge/success-factory/csm-playbook.md - Escalation and save call frameworks
- @knowledge/success-factory/health-scoring.md - Red flag combinations

---

## Questions

### customerName: Customer name and account value?

Examples:

- Acme Corp - $36K ARR, 14 months tenure
- StartupCo - $8K ARR, 4 months in, still onboarding
- BigEnterprise - $200K ARR, 3 year customer, strategic account

### riskSignals: What warning signs are you seeing? List all that apply.

Examples:

- Usage dropped 60% in last 30 days
- Champion (Sarah) left the company 2 weeks ago
- 5 support escalations in past month
- Missed last 2 scheduled check-ins
- Asked for export of all their data
- Saw them on competitor's webinar attendee list

### knownIssues: Any specific complaints or unresolved issues?

Examples:

- Frustrated with reporting limitations - requested feature 3x
- Implementation took longer than promised
- Billing dispute from Q2 still unresolved
- "Not seeing the ROI we expected" - said in last call

### recentInteractions: What's happened in recent conversations?

Examples:

- Last call 3 weeks ago - seemed disengaged, cut meeting short
- Email response times went from hours to days
- Escalated to their VP, no response yet
- Haven't been able to reach anyone in 2 weeks

### whatWeKnow: Any internal context about their business situation?

Examples:

- Company had layoffs last month - 20% workforce
- New CTO joined, reevaluating all vendors
- Just raised Series B, should have budget
- Acquired by larger company, integration underway

---

## Template

```markdown
# Churn Risk Analysis: {{customerName}}

**Account Value:** [ARR from context]
**Risk Level:** [Critical / High / Elevated]
**Days Until Action Required:** [Estimate based on renewal or signals]

---

## Executive Summary

[2-3 sentences: What's happening, why it matters, what we need to do]

---

## Risk Signal Assessment

| Signal     | Severity             | First Detected | Trend                |
| ---------- | -------------------- | -------------- | -------------------- |
| [Signal 1] | Critical/High/Medium | [Date]         | Worsening/Stable/New |
| [Signal 2] | Critical/High/Medium | [Date]         | Worsening/Stable/New |
| [Signal 3] | Critical/High/Medium | [Date]         | Worsening/Stable/New |

### Risk Pattern Identified

[Which red flag combination from health scoring applies - e.g., "Silent Churn Risk", "Frustrated User", "Political Risk"]

---

## Root Cause Analysis

### Primary Cause

[What's the core issue driving the risk?]

### Contributing Factors

1. [Factor 1 - with evidence]
2. [Factor 2 - with evidence]
3. [Factor 3 - with evidence]

### What We Could Have Done Differently

[Honest assessment - for learning, not blame]

---

## Stakeholder Map

| Person | Role    | Sentiment                 | Engagement | Priority             |
| ------ | ------- | ------------------------- | ---------- | -------------------- |
| [Name] | [Title] | Positive/Neutral/Negative | High/Low   | Retain/Win back/Find |
| [Name] | [Title] | Positive/Neutral/Negative | High/Low   | Retain/Win back/Find |

**Key Relationship Gap:** [Who do we need to reach that we can't?]

---

## Save Playbook

### Immediate Actions (Next 48 hours)

1. [ ] [Specific action with owner]
2. [ ] [Specific action with owner]
3. [ ] [Specific action with owner]

### Short-term Plan (Next 2 weeks)

1. [ ] [Action with owner and target date]
2. [ ] [Action with owner and target date]
3. [ ] [Action with owner and target date]

### Escalation Path

- **Internal:** [Who needs to be involved - leadership, product, support?]
- **Customer:** [Who on their side should we escalate to?]

---

## Conversation Strategy

### Opening

> "[How to acknowledge the situation without being defensive]"

### Key Messages

1. [Message 1 - empathy/acknowledgment]
2. [Message 2 - concrete action we're taking]
3. [Message 3 - value reminder without being salesy]

### Questions to Ask

- [Question to understand their perspective]
- [Question to uncover real concerns]
- [Question to identify what would make it right]

### What NOT to Say

- [Pitfall to avoid]
- [Pitfall to avoid]

---

## Concession Options (If Needed)

| Option     | Cost to Us | Value to Them     | When to Offer |
| ---------- | ---------- | ----------------- | ------------- |
| [Option 1] | [$/effort] | [Perceived value] | [Trigger]     |
| [Option 2] | [$/effort] | [Perceived value] | [Trigger]     |
| [Option 3] | [$/effort] | [Perceived value] | [Trigger]     |

**Authority Needed:** [What approvals required for each]

---

## Success Metrics

How we'll know the save worked:

- [ ] [Measurable indicator 1]
- [ ] [Measurable indicator 2]
- [ ] [Measurable indicator 3]

**Review Date:** [When to reassess]
```

---

## Quality Checklist

- [ ] Risk signals are specific with dates
- [ ] Root cause goes beyond symptoms
- [ ] Actions are specific with owners
- [ ] Conversation strategy sounds authentic
- [ ] Concessions are realistic and approved
