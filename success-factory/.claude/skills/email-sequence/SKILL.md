# Email Sequence Skill

Create outbound email sequences for prospecting, nurturing, or re-engagement campaigns.

## Invocation

```
/email-sequence
```

## What This Skill Does

1. Conducts a brief interview to understand the campaign goal and audience
2. Designs a sequence with appropriate timing and escalation
3. Writes each email following Moovs voice guidelines
4. Outputs sequence ready for HubSpot or other email platform

## Required Knowledge

Before writing, load these knowledge files:
- @knowledge/brand/voice-guidelines.md - Writing style and tone
- @knowledge/customers/icp-definitions.md - Target audience details
- @knowledge/product/platform-overview.md - Product capabilities to reference

## Interview Questions

### 1. Sequence Type
"What type of email sequence is this?"

- **Cold outbound** - First contact with prospects who don't know us
- **Warm nurture** - Following up with leads who've shown interest
- **Re-engagement** - Reconnecting with cold leads or churned users
- **Onboarding** - Helping new users get started
- **Feature announcement** - Introducing something new to existing users

### 2. Target ICP
"Which ICP is this for? (Black Car, Shuttle, NEMT, Charter - or specific segment)"

*Include any additional targeting criteria: fleet size, geography, tech stack, etc.*

### 3. Entry Trigger
"What action or event puts someone into this sequence?"

*Examples: Downloaded guide, requested demo, signed up for trial, inactive for 30 days*

### 4. Goal & CTA
"What's the primary goal? What action do we want them to take?"

*Examples: Book a demo, start a trial, reply to email, complete onboarding step*

### 5. Sequence Length
"How many emails and over what timeframe?"

*Default: 4-5 emails over 2-3 weeks for cold outbound*

## Email Structure

### Subject Lines
- Keep under 50 characters
- Be specific, not clever
- Avoid spam triggers ("FREE", all caps, excessive punctuation)
- Test curiosity vs. clarity based on sequence type

**Good:** "Question about dispatch at [Company]"
**Good:** "The spreadsheet problem"
**Bad:** "Quick question for you!"
**Bad:** "TRANSFORM your operations TODAY!!!"

### Email Body

**Cold outbound emails should be:**
- Under 100 words (3-4 short paragraphs max)
- One clear ask per email
- Easy to read on mobile
- Personalized where possible (company name, ICP-specific pain point)

**Nurture emails can be:**
- Slightly longer (150-200 words)
- Include more context or education
- Link to resources (blog posts, case studies)

### Call to Action
- One CTA per email
- Make it easy (reply vs. click vs. call)
- Escalate commitment through the sequence

**Sequence example:**
1. Email 1: "Worth a conversation?" (reply)
2. Email 2: "Here's what similar operators are doing" (read blog)
3. Email 3: "15 minutes this week?" (book meeting)
4. Email 4: "Last note" (reply yes/no)

## Timing & Cadence

### Cold Outbound
- Email 1: Day 0
- Email 2: Day 3
- Email 3: Day 7
- Email 4: Day 12
- Email 5: Day 18

### Nurture
- More spaced out: 5-7 days between emails
- Can be triggered by engagement (opened, clicked)

### Onboarding
- More frequent: Days 0, 1, 3, 5, 7
- Tied to user actions where possible

## Voice Guidelines for Email

From @knowledge/brand/voice-guidelines.md, adapted for email:

- **Sound like a human** - First person, conversational
- **Get to the point** - Operators are busy, respect their time
- **Operator language** - Trips, dispatch, drivers (not journeys, operations, chauffeurs)
- **No marketing fluff** - Skip "I hope this email finds you well"

### Opening Lines to Avoid
- "I hope this email finds you well"
- "I wanted to reach out because..."
- "I'm reaching out to introduce..."
- "I noticed you..."

### Better Openings
- Start with their problem: "Running dispatch off spreadsheets works until it doesn't."
- Ask a question: "How much time does your team spend on confirmation calls?"
- State a fact: "Most limo operators we talk to are still chasing payments by email."

## Output Format

Save to `/content/email-sequences/[sequence-name]/` with:

```
sequence-name/
├── SEQUENCE.md          # Overview, timing, entry criteria
├── email-1.md
├── email-2.md
├── email-3.md
└── ...
```

### SEQUENCE.md Template

```markdown
---
name: "Sequence Name"
type: cold-outbound | nurture | re-engagement | onboarding
target_icp: black-car | shuttle | nemt | charter | all
entry_trigger: "What puts someone in this sequence"
goal: "Primary conversion goal"
created: YYYY-MM-DD
---

# [Sequence Name]

## Overview
[Brief description of the sequence purpose and strategy]

## Entry Criteria
[Who enters this sequence and how]

## Exit Criteria
[What removes someone: reply, conversion, unsubscribe, sequence complete]

## Timing

| Email | Day | Subject | Goal |
|-------|-----|---------|------|
| 1 | 0 | Subject line | Introduce problem |
| 2 | 3 | Subject line | Provide value |
| ... | ... | ... | ... |
```

### Individual Email Template

```markdown
---
email_number: 1
subject: "Subject line here"
preview_text: "Preview text shown in inbox (50-100 chars)"
send_day: 0
---

[Email body here]

---

**CTA:** [What action we're asking for]
**Fallback:** [What happens if no response]
```

## Quality Checklist

Before finalizing:

- [ ] Subject lines are under 50 characters
- [ ] Each email has one clear CTA
- [ ] Cold emails are under 100 words
- [ ] Timing makes sense for the sequence type
- [ ] Language matches target ICP
- [ ] No marketing fluff or corporate speak
- [ ] Personalization tokens are clearly marked: [Company], [First Name]
- [ ] Sequence has clear entry and exit criteria
