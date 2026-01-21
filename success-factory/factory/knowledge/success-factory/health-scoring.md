# Success Factory Health Scoring Framework

## Overview

Health scores predict customer retention likelihood. A good health score combines leading indicators (behavior) with lagging indicators (outcomes).

---

## Health Score Components

### 1. Engagement (40% weight)

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Login frequency | Daily/Weekly | Bi-weekly | Monthly or less |
| Feature adoption | >70% of plan | 40-70% | <40% |
| Active users vs seats | >80% | 50-80% | <50% |
| Time in product | Growing/Stable | Slight decline | Significant decline |

**How to calculate:**
- Daily active: +10 points
- Weekly active: +7 points
- Bi-weekly: +4 points
- Monthly or less: +1 point

### 2. Support Health (20% weight)

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Open tickets | 0-1 | 2-3 | 4+ |
| Ticket trend | Stable/Down | Slight increase | 2x+ increase |
| Resolution satisfaction | >4.0 | 3.0-4.0 | <3.0 |
| Escalations | None | 1 in 90 days | 2+ in 90 days |

**How to calculate:**
- No open tickets: +10 points
- 1-2 tickets, resolved quickly: +7 points
- 3+ tickets or slow resolution: +3 points
- Escalation: -5 points each

### 3. Relationship (20% weight)

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| NPS score | 9-10 (Promoter) | 7-8 (Passive) | 0-6 (Detractor) |
| QBR attendance | Attended | Rescheduled | Missed |
| Response time | <24 hours | 24-72 hours | >72 hours |
| Champion status | Strong, engaged | Present but passive | Left or unknown |

**How to calculate:**
- Promoter NPS: +10 points
- Passive NPS: +5 points
- Detractor NPS: +0 points
- Champion strong: +5 points
- Champion unknown: -3 points

### 4. Business Fit (20% weight)

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Contract value trend | Growing | Stable | Shrinking/at risk |
| Payment history | On-time | Occasional late | Chronic issues |
| Tenure | >12 months | 6-12 months | <6 months |
| Expansion signals | Multiple | Some | None |

**How to calculate:**
- Growing contract: +10 points
- Stable contract: +7 points
- At-risk contract: +2 points
- On-time payments: +5 points
- Late payments: -3 points

---

## Score Calculation

```
Total Score = (Engagement × 0.4) + (Support × 0.2) + (Relationship × 0.2) + (Business Fit × 0.2)
```

**Score Ranges:**
- 80-100: Green (Healthy)
- 50-79: Yellow (Needs Attention)
- 0-49: Red (At Risk)

---

## Interpreting Trends

### Improving (↑)
Score increased 10+ points in 30 days
- **Signal:** Intervention working or organic improvement
- **Action:** Maintain momentum, explore expansion

### Stable (→)
Score changed <10 points in 30 days
- **Signal:** Status quo maintained
- **Action:** Monitor for early warning signs

### Declining (↓)
Score dropped 10+ points in 30 days
- **Signal:** Something changed, investigate
- **Action:** Immediate outreach, root cause analysis

---

## Red Flag Combinations

These combinations warrant immediate attention:

1. **Silent Churn Risk**
   - Low engagement + No support tickets + Champion went quiet
   - They've mentally churned but haven't told you yet

2. **Frustrated User**
   - High engagement + High support tickets + Low NPS
   - Power user hitting walls, may become vocal detractor

3. **Political Risk**
   - Strong champion + Champion leaving/left + No backup relationships
   - Entire account depends on one person

4. **Economic Risk**
   - Late payments + Contract coming up + No expansion signals
   - May be looking to cut costs

---

## Using Health Scores in Conversations

### Don't say:
- "Your health score is 45"
- "You're in the red zone"
- "Our system flagged you as at-risk"

### Do say:
- "I noticed your team's usage has shifted recently"
- "I wanted to check in - are you getting what you need from us?"
- "I see you've had a few support interactions lately - let's make sure those are fully resolved"

Health scores are internal tools. Customers should feel supported, not scored.
