---
name: task-shaping
description: Transforms raw Moovs tickets into clear, actionable Task Briefs for developers. Use when you have a Notion ticket (DOOM-XX) that needs clarification before Chris can build it. Lighter than full /shaping - designed for hours-to-days work, not multi-week bets. Conducts a brief interview to fill gaps, then updates the Notion ticket directly with the structured brief.
---

# Task Shaping Skill

This skill transforms **raw Moovs tickets** into **clear Task Briefs** that developers can execute confidently. It's designed for small-to-medium work that doesn't warrant full shaping.

## When to Use This Skill

Use `/task-shaping` when:
- You have a Notion ticket (DOOM-XX) that's too vague to build
- The work is estimated at hours-to-days, not weeks
- You need to clarify problem, solution, and design direction
- You want the ticket updated directly in Notion

**Don't use this for:**
- Multi-week features (use `/shaping` instead)
- Raw ideas without a ticket (use `/problem` first)
- Strategic decisions that need betting table review

## Philosophy: Clarity Without Bureaucracy

Full shaping is overkill for small tasks. But "just build it" leads to:
- Developers pinging you with questions
- Wrong assumptions baked into code
- Rework and frustration

Task Shaping is the middle ground: **enough clarity to build with confidence, no more**.

### What Developers Actually Need

Chris needs exactly three things to build confidently:

1. **The Problem** - What's broken? Why does it matter? (1-2 sentences)
2. **The Solution** - What are we building? What's the boundary? (Clear scope)
3. **The Design** - What should it look like/behave like? (No ambiguity)

That's it. No rabbit holes analysis, no pitch narrative, no betting table presentation.

## Full Shaping vs. Task Shaping

| Aspect | Full Shaping | Task Shaping |
|--------|--------------|--------------|
| **Appetite** | 1-6 weeks | Hours to days |
| **Output** | Pitch for betting table | Brief for developer |
| **Interview** | 30-50 questions | 5-10 questions |
| **Solution detail** | Fat marker sketches | Design notes |
| **Risk analysis** | Rabbit holes + mitigations | Boundaries only |
| **Destination** | Betting table | Directly to builder |
| **Notion update** | Separate document | Updates ticket directly |

## Process Overview

1. **Fetch the ticket** from Notion using the provided URL/ID
2. **Analyze what's missing** - Problem? Solution? Design? Scope?
3. **Conduct a brief interview** to fill gaps (5-10 questions max)
4. **Generate the Task Brief** following the template
5. **Update the Notion ticket** with the structured content

## The Interview Process

Unlike full shaping, Task Shaping interviews are **targeted and fast**. You're not exploring the unknown - you're clarifying the known.

See [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) for the question framework.

### Interview Rules

1. **Start with what you have** - Read the ticket, understand what's already clear
2. **Ask only what's missing** - Don't re-ask things already in the ticket
3. **One question at a time** - Never batch questions
4. **Stay focused** - This is clarification, not discovery
5. **5-10 questions max** - If you need more, this might need full shaping

### What to Clarify

| Gap | Questions to Ask |
|-----|------------------|
| **Problem unclear** | "What specific user pain does this solve?" |
| **Solution vague** | "What exactly should happen when X?" |
| **Scope undefined** | "What's explicitly NOT included?" |
| **Design missing** | "Should this match [existing pattern] or be new?" |
| **Acceptance unclear** | "How will we know this is done?" |

## Output: The Task Brief

After the interview, generate a Task Brief following the template in [TASK_BRIEF_TEMPLATE.md](TASK_BRIEF_TEMPLATE.md).

The brief contains:
1. **Problem** - 1-2 sentences on what's broken and why it matters
2. **Solution** - Clear description of what we're building
3. **In Scope** - Explicit list of what's included
4. **Out of Scope** - Explicit list of what's NOT included (critical)
5. **Design Direction** - Visual/behavioral clarity
6. **Appetite** - Small (< 4 hrs), Medium (1-2 days), Large (3-5 days)
7. **Acceptance Criteria** - How we know it's done

## Updating Notion

After generating the Task Brief, you MUST update the Notion ticket:

1. **Append the Task Brief** to the page content as structured blocks
2. **Update the Status** to "Shaped" (or appropriate next status)
3. **Fill in empty fields** where applicable:
   - Description/Summary with the problem statement
   - Type if identifiable
   - Any other relevant metadata

### Notion Update Format

The Task Brief should be appended to the ticket with clear headers:

```
---
## Task Brief (Shaped [Date])

### Problem
[Problem statement]

### Solution
[Solution description]

### In Scope
- [Item 1]
- [Item 2]

### Out of Scope
- [Item 1]
- [Item 2]

### Design Direction
[Design notes]

### Appetite
[Small/Medium/Large] - [Justification]

### Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
---
```

## Starting the Process

When the user invokes this skill with a ticket URL or ID:

1. **Fetch the ticket** from Notion
2. **Summarize the current state** - What's clear? What's missing?
3. **Ask clarifying questions** - Target the gaps
4. **Generate the Task Brief** - Use the template
5. **Update the Notion ticket** - Append the brief and update fields
6. **Confirm completion** - Show what was updated

### Opening Message

After fetching the ticket:

> "I've pulled up **[DOOM-XX: Ticket Title]**. Here's what I understand so far:
>
> [Summary of what's clear]
>
> I need to clarify a few things before this is ready for Chris to build. Let me ask you..."

Then ask your first clarifying question.

## Codebase Research

**Before finalizing the Task Brief, search the Moovs codebase:**

| Repo | Path | What to Look For |
|------|------|------------------|
| **server** | `/Users/amirghorbani/Dev/server` | Data models, APIs, existing logic to extend |
| **dooms-operator** | `/Users/amirghorbani/Dev/dooms-operator` | UI components, patterns to follow |
| **dooms-customer** | `/Users/amirghorbani/Dev/dooms-customer` | Customer-facing patterns |
| **dooms-native-driver** | `/Users/amirghorbani/Dev/dooms-native-driver` | Mobile app patterns |

For each task brief:
- Find existing code that relates to the feature
- Identify specific files/functions that will need changes
- Note UI patterns the implementation should follow
- Include relevant file references in the brief so the developer knows where to start

This saves the developer discovery time and ensures consistency with existing patterns.

## Reference

- [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) - Question framework
- [TASK_BRIEF_TEMPLATE.md](TASK_BRIEF_TEMPLATE.md) - Output template
