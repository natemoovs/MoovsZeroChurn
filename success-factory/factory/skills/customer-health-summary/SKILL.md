---
name: Customer Health Summary
description: Generate a quick health summary for a customer account to prep for a call or QBR
outputPath: factory/knowledge/success-factory/health-summaries/{{customerName}}.md
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

# Customer Health Summary Skill

Generate a quick health summary for a customer account to prep for a call or QBR. Perfect for CSMs who need to walk into meetings prepared with context, wins to celebrate, and risks to address.

## What This Skill Does

1. Gathers account context and meeting type
2. Collects any known issues, wins, and raw data
3. Produces a 1-page summary with health score, talking points, and next steps

## Required Knowledge

Before generating, the skill loads:
- @knowledge/success-factory/csm-playbook.md - Best practices for customer success conversations
- @knowledge/success-factory/health-scoring.md - How to interpret health signals

---

## Questions

### customerName: What's the customer name and any relevant account context?
Examples:
- Acme Corp - Enterprise, 18 months tenure, $50K ARR
- Smith & Co - Mid-market, just renewed last quarter
- TechStart Inc - SMB, 6 months in, growing fast

### meetingType: What type of meeting is this?
Examples:
- Check-in call (regular touch-base)
- QBR (Quarterly Business Review)
- Renewal discussion
- Escalation / save call

### winsAndIssues: Any known wins or issues to highlight?
Examples:
- Win: Successfully launched their second location using our platform
- Win: Reduced churn by 15% since implementing our recommendations
- Issue: Support tickets up 40% this month
- Issue: Champion left the company, need to rebuild relationships

### rawData: Paste any usage stats, support tickets, or other data you have
Examples:
- Login frequency: Daily active for 28/30 days
- Feature adoption: Using 8/12 core features
- Support: 3 tickets this month (2 resolved, 1 pending)
- NPS response: 8 (passive)
- Usage trend: Up 25% MoM

---

## Output Format

The summary should be concise (1 page max) and actionable.

## Template

```markdown
# Customer Health Summary: {{customerName}}

**Meeting Type:** {{meetingType}}
**Prepared:** {{date}}

---

## Account Snapshot

| Metric | Value | Trend |
|--------|-------|-------|
| Health Score | [Calculated] | [Up/Down/Stable] |
| Tenure | [From context] | - |
| ARR | [From context] | - |
| Last Contact | [If known] | - |

---

## Recent Wins to Celebrate

- [Win 1 - be specific, tie to business impact]
- [Win 2 - quantify if possible]

> **Talking Point:** "I wanted to start by celebrating [specific win]. [Tie to their goals]."

---

## Risk Signals to Address

| Signal | Severity | Recommended Action |
|--------|----------|-------------------|
| [Issue 1] | High/Medium/Low | [Specific action] |
| [Issue 2] | High/Medium/Low | [Specific action] |

> **Talking Point:** "I noticed [signal]. I'd love to understand more about [probe question]."

---

## Recommended Talking Points

1. **Open with:** [Personalized opener based on context]
2. **Celebrate:** [Specific win to highlight]
3. **Explore:** [Probing question about their goals]
4. **Address:** [How to bring up any concerns]
5. **Close with:** [Next steps to propose]

---

## Proposed Next Steps

- [ ] [Specific action item 1]
- [ ] [Specific action item 2]
- [ ] [Follow-up date/cadence]

---

## Raw Data Reference

<details>
<summary>Click to expand data used for this summary</summary>

{{rawData}}

</details>
```

---

## Quality Checklist

Before finalizing, verify:

- [ ] Health score interpretation is clear
- [ ] Wins are specific and quantified where possible
- [ ] Risks have actionable recommendations
- [ ] Talking points sound natural, not scripted
- [ ] Next steps are concrete and time-bound
- [ ] Summary fits on 1 page when printed
