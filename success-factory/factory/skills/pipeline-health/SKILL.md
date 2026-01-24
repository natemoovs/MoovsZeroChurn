---
name: Pipeline Health
description: Analyze your portfolio pipeline - renewals, at-risk accounts, and intervention priorities
outputPath: factory/knowledge/success-factory/pipeline/{{date}}-review.md
knowledge:
  - success-factory/csm-playbook.md
  - success-factory/health-scoring.md
data:
  hubspot:
    company: true
    deals: true
  stripe:
    subscriptions: true
---

# Pipeline Health Skill

Generate a comprehensive pipeline review showing renewals, at-risk accounts, and where to focus your time. Perfect for weekly planning or manager 1:1s.

## What This Skill Does

1. Summarizes portfolio health metrics
2. Identifies upcoming renewals and their risk levels
3. Prioritizes accounts needing attention
4. Recommends focus areas for the week

---

## Questions

### timeframe: What timeframe do you want to review?
Options:
- This week - Next 7 days focus
- Next 2 weeks - 14 day planning
- This month - 30 day view
- This quarter - 90 day strategic view

### focusArea: Any specific focus for this review?
Options:
- Renewals - Prioritize upcoming renewals
- At-risk accounts - Focus on red/yellow health
- Expansion opportunities - Look for upsell/growth
- New customers - Onboarding pipeline
- All areas - Full portfolio review

### includeMetrics: What metrics matter most to you right now?
Examples:
- NRR and churn rate
- Renewal close rate
- Time to value for new customers
- Support ticket volume
- All of the above

---

## Output Format

Generate a pipeline review with:

### Portfolio Snapshot
| Metric | Current | Trend |
|--------|---------|-------|
| Total Accounts | [count] | [up/down/stable] |
| Total ARR | $[amount] | [trend] |
| Health: Green | [count] ([%]) | [trend] |
| Health: Yellow | [count] ([%]) | [trend] |
| Health: Red | [count] ([%]) | [trend] |

### Renewals in [Timeframe]
| Customer | ARR | Renewal Date | Health | Risk Level | Action Needed |
|----------|-----|--------------|--------|-------------|---------------|
| [name] | $[arr] | [date] | [health] | [risk] | [action] |

### At-Risk Accounts (Priority Order)
1. **[Customer]** - $[ARR]
   - Risk signals: [list]
   - Recommended action: [action]
   - Owner: [CSM name]

2. **[Customer]** - $[ARR]
   - Risk signals: [list]
   - Recommended action: [action]

### Expansion Opportunities
| Customer | Current ARR | Opportunity | Next Step |
|----------|-------------|-------------|-----------|
| [name] | $[arr] | [opportunity] | [step] |

### This Week's Focus
Based on urgency and impact, prioritize:
1. **[Action]** for [Customer] - [reason]
2. **[Action]** for [Customer] - [reason]
3. **[Action]** for [Customer] - [reason]

### Health Trend Analysis
- Accounts improving: [list]
- Accounts declining: [list]
- New risks identified: [list]

### Notes for Manager 1:1
- Key wins this period: [list]
- Blockers needing escalation: [list]
- Resource requests: [list]
