---
name: moovs-shaping
description: Creates comprehensive shaping documents for the Moovs product development process. Use when the user wants to shape a product feature, has a problem.md file describing an idea, mentions "shaping", "pitch", or wants to prepare work for the betting table. Conducts deep interviews to understand problems, constraints, solutions, and risks before producing a formal pitch document.
---

# Moovs Shaping Skill

This skill guides you through creating a complete **shaping document** (pitch) for the Moovs product development process, adapted from 37 Signals' Shape Up methodology.

## Prerequisites

The user must have created a `problem.md` file in their working directory containing a high-level description of the problem or idea they want to shape.

## Philosophy

**Shaping is NOT specification.** You are not creating a detailed spec with every field and edge case. You are defining:
- The **boundaries** of what we're solving
- A **rough solution** concrete enough to execute but abstract enough to allow creativity
- **De-risked** areas where rabbit holes have been identified and patched
- Clear **appetite** (time budget, not estimate)

Remember: Customers describe problems, we propose solutions. The shaping interview uncovers the REAL problem, not just the stated solution.

## Process Overview

1. **Read problem.md** to understand the raw idea
2. **Conduct a deep interview** using progressive questioning
3. **Generate the shaping document** with all five required ingredients

## The Interview Process

You MUST conduct an extensive interview before writing the shaping document. This is not optional. The interview follows the progression detailed in [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md).

### Interview Rules

1. **Ask ONE question at a time** - Never batch multiple questions
2. **Go deep before going wide** - Follow up on answers before moving to new topics
3. **Challenge assumptions** - If the user describes a solution, ask what problem it solves
4. **Uncover the story** - Get specific scenarios, not abstract needs
5. **Be skeptical** - Question whether features are must-haves or nice-to-haves
6. **Don't accept "yes" easily** - Ask "why" and "how do you know"
7. **Listen for rabbit holes** - Technical unknowns, integrations, edge cases

### Interview Phases

The interview proceeds through these phases. Do not skip phases or rush.

#### Phase 1: Problem Understanding (5-10 questions minimum)
- Understand the current broken workflow
- Get specific stories and examples
- Identify who experiences this problem and when
- Understand the cost of the status quo

#### Phase 2: Appetite & Boundaries (3-5 questions minimum)
- Establish time budget (Small Batch: 3-5 days, or Big Batch: 3 weeks)
- Identify what success looks like in that timeframe
- Narrow the problem to fit the appetite

#### Phase 3: Solution Exploration (8-15 questions minimum)
- Explore user flows and interactions
- Discuss UI/UX approaches
- Understand data and system requirements
- Identify integration points

#### Phase 4: Risk Assessment (5-8 questions minimum)
- Uncover technical unknowns
- Identify edge cases
- Explore dependencies and integrations
- Assess what could blow up the timeline

#### Phase 5: Trade-offs & No-Gos (3-5 questions minimum)
- Explicitly define what we are NOT building
- Identify features to cut if time runs short
- Confirm must-haves vs nice-to-haves

### Interview Technique

Use the **5 Whys** technique: When the user states a problem or need, ask "why" at least 5 times to get to the root cause.

Example:
- "We need a scheduler board" → Why?
- "So dispatchers can see all trips" → Why do they need to see all trips?
- "To know which drivers to assign" → Why is that hard today?
- "Because they have to check multiple screens" → Why multiple screens?
- "Because driver availability is separate from trip info" → **Now we understand the real problem**

## Output Format

After completing the interview, generate a shaping document following the template in [SHAPING_TEMPLATE.md](SHAPING_TEMPLATE.md).

The document MUST include:

1. **Problem** - A specific story showing what's broken today
2. **Appetite** - Small Batch (3-5 days) or Big Batch (3 weeks) with justification
3. **Solution** - Breadboard flows and/or rough visual concepts
4. **Rabbit Holes** - Identified risks and how we're addressing them
5. **No-Gos** - Explicit list of what we're NOT building

## Starting the Process

When the user invokes this skill:

1. First, read the `problem.md` file in the current directory
2. Summarize your understanding of the raw idea
3. Begin the interview with Phase 1

Start with: "I've read your problem.md. Before I can create a shaping document, I need to interview you to deeply understand this problem. Let's begin..."

Then ask your first question from Phase 1.

## Codebase Research

**Before finalizing solutions, search the Moovs codebase to understand existing patterns:**

| Repo | Path | What to Look For |
|------|------|------------------|
| **server** | `/Users/amirghorbani/Dev/server` | Data models, API endpoints, business logic |
| **dooms-operator** | `/Users/amirghorbani/Dev/dooms-operator` | UI patterns, existing features, component structure |
| **dooms-customer** | `/Users/amirghorbani/Dev/dooms-customer` | Customer-facing patterns, booking flows |
| **dooms-native-driver** | `/Users/amirghorbani/Dev/dooms-native-driver` | Driver app patterns, mobile considerations |

During solution exploration (Phase 3), actively search the repos to:
- Find similar features that can be extended or reused
- Understand existing data models that relate to the problem
- Identify UI patterns the new feature should follow
- Assess technical feasibility based on current architecture

Reference specific files/code when discussing implementation approaches in the shaping doc.

## Reference

For the complete interview question bank, see [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md).
For the output template, see [SHAPING_TEMPLATE.md](SHAPING_TEMPLATE.md).
For examples of completed shaping docs, see the [examples/](examples/) directory.
