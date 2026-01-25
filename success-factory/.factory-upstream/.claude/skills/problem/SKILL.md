---
name: moovs-problem
description: Creates problem definition documents for the Moovs product development process. Use when the user wants to capture a new problem, feature request, customer complaint, or raw idea. Conducts a focused interview to understand the real problem (not the customer's imagined solution) before producing a problem.md file that feeds into the shaping process.
---

# Moovs Problem Discovery Skill

This skill helps you create a **problem definition document** (`problem.md`) that serves as the foundation for the Moovs shaping process.

## Why This Matters

From the Moovs philosophy:

> "Customers describe problems, we propose solutions. We are the software developers. When a customer says 'I need a scheduler board,' our job is to understand WHY, then design the right solution ourselves."

The problem skill is the FIRST step. Before you can shape a solution, you must deeply understand the problem. Most feature requests come as solutions ("we need X") rather than problems ("we're struggling with Y"). This skill helps you dig past the solution to find the real pain.

## When to Use This Skill

Use this skill when:

- A customer requests a feature
- Sales brings a new requirement
- Someone on the team has an idea
- You notice a recurring support issue
- You want to capture a problem for future shaping

## Process Overview

1. **Gather initial context** - What brought this problem to your attention?
2. **Conduct problem discovery interview** - Dig into the real pain (5-10 questions)
3. **Generate problem.md** - Document the problem for future shaping

## Philosophy: Problems, Not Solutions

When someone says they need a feature, they've already jumped to a solution. Your job is to work backwards:

| What You Hear               | What You Ask                                   | What You Discover                                         |
| --------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| "We need a scheduler board" | "What happens when you try to schedule today?" | Dispatchers can't see driver availability alongside trips |
| "Add a customer portal"     | "What are customers calling you about?"        | They want to change pickup times without calling          |
| "We need realtime tracking" | "When did you last lose track of a vehicle?"   | Operations doesn't know if shuttles are running late      |

**The goal: Understand the pain so well that YOU can propose the right solution.**

## The Interview Process

You MUST conduct a focused interview before creating the problem.md. Use the questions in [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md).

### Interview Rules

1. **Ask ONE question at a time** - Never batch questions
2. **Start with the trigger** - What specific event made this problem visible?
3. **Get stories, not abstractions** - "Tell me about a specific time when..."
4. **Challenge solutions** - If they describe a feature, ask what problem it solves
5. **Quantify the pain** - What's the actual cost? Time? Money? Frustration?
6. **Identify the actors** - Who experiences this? Who else is affected?
7. **Understand frequency** - How often does this happen?

### Interview Phases

#### Phase 1: The Trigger (2-3 questions)

- What specific event brought this problem to your attention?
- Who raised this? Customer? Sales? Internal observation?

#### Phase 2: The Story (3-5 questions)

- Walk me through a specific recent instance of this problem
- What did the person do? What went wrong? What was the consequence?

#### Phase 3: The Scope (2-4 questions)

- Who else experiences this? How often?
- What's the cost of the status quo?
- What workarounds exist today?

#### Phase 4: The Stakes (2-3 questions)

- What happens if we do nothing for 6 months?
- Is this a burning platform or a nice-to-have?

## Output: problem.md

After the interview, generate a `problem.md` file following the template in [PROBLEM_TEMPLATE.md](PROBLEM_TEMPLATE.md).

The document captures:

1. **Source** - Where did this problem come from?
2. **The Story** - A specific narrative showing the pain
3. **Who's Affected** - The people experiencing this
4. **Current Workarounds** - How they cope today
5. **Cost of Inaction** - Why this matters
6. **Raw Quotes** - Actual customer/user language
7. **Initial Thoughts** - Early solution ideas (marked as such, not commitments)

## Starting the Process

When the user invokes this skill:

1. Ask: "What problem or idea would you like to capture? This could be a customer request, a feature idea, a recurring issue, or anything that might need attention."

2. Based on their response, begin the problem discovery interview

3. After sufficient understanding (usually 8-12 questions), generate the `problem.md` file

**Important:** If the user describes a solution instead of a problem, your first question should be: "That sounds like a solution. What problem would that solve? Can you tell me about a specific situation where someone struggled?"

## After Problem Discovery

Once you've created the `problem.md`, the user can:

- Run `/shaping` to begin the full shaping process
- Save it for future shaping sessions
- Share it with the team for prioritization

The problem.md is an INPUT to shaping, not the final output. Keep it focused on the problem, not the solution.

## Codebase Research

**When capturing problems, search the codebase to understand current state:**

| Repo                    | Path                                          | What to Look For                           |
| ----------------------- | --------------------------------------------- | ------------------------------------------ |
| **server**              | `/Users/amirghorbani/Dev/server`              | Existing data models, APIs, business logic |
| **dooms-operator**      | `/Users/amirghorbani/Dev/dooms-operator`      | Current UI/UX, existing workflows          |
| **dooms-customer**      | `/Users/amirghorbani/Dev/dooms-customer`      | Customer-facing features                   |
| **dooms-native-driver** | `/Users/amirghorbani/Dev/dooms-native-driver` | Driver app capabilities                    |

During problem discovery:

- Search repos to verify claims about current functionality
- Find where existing workarounds live in the code
- Understand what's already built that relates to the problem
- Note specific files/patterns in the "Initial Thoughts" section of problem.md

## Reference

For the complete question bank, see [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md).
For the output template, see [PROBLEM_TEMPLATE.md](PROBLEM_TEMPLATE.md).
