---
name: Success Story Draft
description: Draft a customer success story or case study for marketing and sales use
outputPath: factory/knowledge/zerochurn/success-stories/{{customerName}}.md
---

# Success Story Draft Skill

Generate a compelling customer success story that showcases real results and can be used for marketing, sales enablement, or customer advocacy.

## What This Skill Does

1. Gathers customer context and results
2. Structures the narrative around challenge → solution → results
3. Produces a draft ready for customer approval and marketing polish

## Required Knowledge

Before generating, load:
- @knowledge/zerochurn/csm-playbook.md - For authentic customer voice

---

## Questions

### customerName: Customer name and brief description?
Examples:
- Acme Corp - Mid-market SaaS company, 200 employees, B2B sales
- TechStart - Early-stage startup, Series A, consumer app
- Enterprise Inc - Fortune 500 retailer, 50K employees, global

### challenge: What was their situation before working with you? What problems did they face?
Examples:
- Manual customer health tracking in spreadsheets, missing churn signals
- CSM team of 3 managing 500 accounts, no way to prioritize
- Renewals were reactive - only knew about issues at contract end
- No visibility into product usage, flying blind on customer health

### solution: How did they use your product/service? What was the implementation like?
Examples:
- Implemented health scoring across all accounts in 2 weeks
- Integrated with their CRM to automate CSM workflows
- Started with pilot team of 5 CSMs, expanded company-wide
- Customized playbooks for their specific customer segments

### results: What measurable outcomes did they achieve? Be specific with numbers.
Examples:
- Reduced churn from 15% to 8% in first year
- CSMs now manage 2x accounts with better outcomes
- 94% renewal rate, up from 82%
- Identified at-risk accounts 60 days earlier on average
- NPS improved from 32 to 58

### quote: Any direct quotes or feedback from the customer?
Examples:
- "We finally have visibility into what's actually happening with our customers" - Sarah Chen, VP CS
- "The ROI was obvious within the first quarter" - Mike Johnson, CRO
- "Our CSMs went from firefighting to proactive outreach" - Team Lead
- No direct quote yet - will need to request

---

## Template

```markdown
# Customer Success Story: {{customerName}}

## Quick Stats
| Metric | Result |
|--------|--------|
| [Key metric 1] | [Result] |
| [Key metric 2] | [Result] |
| [Key metric 3] | [Result] |

---

## Company Overview

**Company:** {{customerName}}
**Industry:** [From context]
**Size:** [From context]
**Use Case:** [Primary use case]

---

## The Challenge

[2-3 paragraphs describing the situation before. Write in third person, past tense. Be specific about pain points and what was at stake.]

### Key Pain Points
- [Pain point 1]
- [Pain point 2]
- [Pain point 3]

---

## The Solution

[2-3 paragraphs describing how they implemented and used the solution. Focus on the journey, not just features.]

### Implementation Highlights
- **Timeline:** [How long to get value]
- **Team:** [Who was involved]
- **Approach:** [Phased rollout, big bang, etc.]

---

## The Results

[2-3 paragraphs describing outcomes. Lead with the most impressive metric. Connect results to business impact.]

### By the Numbers

| Before | After | Impact |
|--------|-------|--------|
| [Baseline metric 1] | [New metric 1] | [% improvement] |
| [Baseline metric 2] | [New metric 2] | [% improvement] |
| [Baseline metric 3] | [New metric 3] | [% improvement] |

### Qualitative Wins
- [Non-numeric benefit 1]
- [Non-numeric benefit 2]

---

## In Their Words

> "[Primary quote from customer - the most compelling one]"
>
> — **[Name]**, [Title] at {{customerName}}

[Optional: second supporting quote]

---

## What's Next

[Brief mention of expansion, continued partnership, or future plans]

---

## Key Takeaways

For companies facing similar challenges:

1. **[Takeaway 1]** - [Brief explanation]
2. **[Takeaway 2]** - [Brief explanation]
3. **[Takeaway 3]** - [Brief explanation]

---

*[Note: This draft requires customer approval before publication. Verify all metrics and quotes directly with the customer.]*
```

---

## Quality Checklist

- [ ] Challenge section creates empathy without being negative
- [ ] Results are specific and verifiable
- [ ] Quote sounds natural, not marketing-speak
- [ ] Story flows logically: problem → solution → outcome
- [ ] Customer approval note is included
- [ ] No confidential information without explicit permission
