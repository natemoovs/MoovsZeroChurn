---
name: Bug Report
description: Document a bug reported by a customer and create an actionable ticket for the dev team
outputPath: factory/knowledge/success-factory/bugs/{{customerName}}-{{issueTitle}}.md
knowledge:
  - success-factory/csm-playbook.md
data:
  hubspot:
    company: true
    contacts: true
---

# Bug Report Skill

Create a detailed, actionable bug report from customer feedback. Generates a ticket-ready document with reproduction steps, impact assessment, and customer context.

## What This Skill Does

1. Captures bug details and reproduction steps
2. Assesses customer impact and urgency
3. Adds customer context (ARR, tenure, health status)
4. Produces a dev-ready bug ticket

---

## Questions

### customerName: Which customer reported this bug?
Examples:
- Acme Corp
- StartupCo
- BigEnterprise

### issueTitle: Brief title for the bug (2-5 words)
Examples:
- Payment sync failing
- Driver app crashes
- Booking form broken

### issueDescription: What's happening? Include any error messages the customer shared.
Examples:
- "When I try to create a reservation, the save button doesn't work. No error message appears but nothing saves."
- "The driver app shows 'Network Error' when drivers try to start a trip. Started happening yesterday."

### reproductionSteps: How can the dev team reproduce this? (if known)
Examples:
- 1. Go to Reservations > New, 2. Fill in contact, 3. Click Save
- Unknown - customer just said it happens randomly
- Only happens for trips over 100 miles

### frequency: How often does this happen?
Examples:
- Every time
- Intermittent - about 50% of the time
- Just started today
- Has been happening for a week

### workaround: Is there a workaround the customer can use?
Examples:
- Yes - they can use the mobile app instead
- No workaround found
- Refreshing the page sometimes helps

### urgency: How urgent is this for the customer?
Options:
- Critical - blocking their operations
- High - significant impact, need fix this week
- Medium - annoying but they can work around it
- Low - minor issue, fix when possible

---

## Output Format

Generate a bug report with:

### Summary
- **Customer:** [name] ([ARR], [tenure])
- **Health Status:** [current health score]
- **Reported by:** [contact name if known]
- **Date:** [today]

### Bug Details
- **Title:** [issueTitle]
- **Description:** [clear technical description]
- **Reproduction Steps:** [numbered steps]
- **Frequency:** [frequency]
- **Workaround:** [workaround or "None"]

### Impact Assessment
- **Customer Impact:** [how this affects their operations]
- **Business Impact:** [ARR at risk, relationship impact]
- **Urgency:** [urgency level with justification]

### Recommended Priority
Based on customer value and issue severity, recommend a priority level for the dev team.

### Additional Context
Any relevant customer history, recent changes, or related issues.
