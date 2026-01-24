---
name: Customer Feedback
description: Capture and categorize customer feedback from calls, emails, or support tickets
outputPath: factory/knowledge/success-factory/feedback/{{customerName}}-{{date}}.md
knowledge:
  - success-factory/csm-playbook.md
data:
  hubspot:
    company: true
    contacts: true
---

# Customer Feedback Skill

Capture customer feedback in a structured format. Categorizes feedback, assesses sentiment, and identifies actionable insights for product and success teams.

## What This Skill Does

1. Records feedback with full customer context
2. Categorizes by type (feature request, complaint, praise, suggestion)
3. Assesses sentiment and urgency
4. Identifies patterns and actionable next steps

---

## Questions

### customerName: Which customer provided this feedback?
Examples:
- Acme Corp
- StartupCo
- BigEnterprise

### feedbackSource: Where did this feedback come from?
Options:
- QBR call
- Support ticket
- Email
- Slack message
- NPS survey response
- Onboarding call
- Check-in call

### feedbackType: What type of feedback is this?
Options:
- Feature request - They want something new
- Complaint - Something isn't working for them
- Praise - They're happy about something
- Suggestion - Ideas for improvement
- Question - Needed clarification
- Churn signal - Mentioned leaving or alternatives

### feedbackContent: What exactly did the customer say? Quote them if possible.
Examples:
- "We really wish the dispatch view showed driver locations in real-time. Our competitors have this."
- "The new booking form is so much faster! My team loves it."
- "We've been looking at [competitor] because your pricing doesn't work for our volume."

### sentiment: How did the customer seem overall?
Options:
- Very positive - Enthusiastic, happy
- Positive - Generally satisfied
- Neutral - Matter-of-fact
- Negative - Frustrated or disappointed
- Very negative - Angry, threatening to leave

### urgency: How urgent is addressing this?
Options:
- Urgent - Affects retention, needs immediate action
- Important - Should address soon
- Normal - Good to know, standard priority
- Low - Nice to have context

### csmNotes: Any additional context or your interpretation?
Examples:
- Customer seems frustrated but not ready to churn. Champion is still engaged.
- This is the third time they've asked for this feature.
- Might be a good candidate for beta testing new dispatch features.

---

## Output Format

Generate a feedback record with:

### Customer Context
- **Customer:** [name] ([ARR], [tenure], [segment])
- **Health Status:** [current health]
- **Contact:** [who gave feedback]
- **Source:** [feedbackSource]
- **Date:** [today]

### Feedback Summary
- **Type:** [feedbackType]
- **Sentiment:** [sentiment]
- **Urgency:** [urgency]

### Verbatim Feedback
> [exact quote or close paraphrase]

### Analysis
- **Key Theme:** [what this feedback is really about]
- **Pattern Check:** [is this a common request? have others said similar?]
- **Churn Risk Impact:** [does this change their risk level?]

### Recommended Actions
1. [Immediate action if needed]
2. [Follow-up action]
3. [Product team escalation if relevant]

### Tags
[List relevant tags: feature-request, dispatch, pricing, competitor-mention, champion-risk, etc.]
