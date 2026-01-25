# Interview Guide for Task Shaping

This guide provides the question framework for **quick clarification interviews**. Unlike full shaping interviews (30-50 questions), task shaping interviews should be **5-10 questions maximum**.

## Interview Philosophy

### The Goal

You're not exploring the unknown. You're **clarifying the known**. The ticket already exists - you just need to fill the gaps.

### The Mindset

- **Efficient, not exhaustive** - Get what you need, nothing more
- **Targeted** - Ask only about what's missing
- **Practical** - Focus on what Chris needs to build
- **Skeptical** - Challenge vague scope and implicit assumptions

### When to Escalate

If you find yourself needing more than 10 questions, **stop**. This ticket might need:

- Full `/shaping` if it's bigger than it seemed
- `/problem` if the underlying problem isn't understood
- Split into multiple smaller tickets

---

## Question Bank by Gap Type

### Gap: Problem Is Unclear

Use when the ticket describes a solution but not why it matters.

1. **"What specific user pain does this solve?"**
   - Gets to the root problem
   - If they can't answer, the ticket isn't ready

2. **"Can you give me a concrete example of when this problem occurred?"**
   - Grounds abstract ideas in reality
   - Reveals whether this is real or theoretical

3. **"What's the cost of NOT doing this?"**
   - Tests if this actually matters
   - Helps prioritize

4. **"Who experiences this problem? How often?"**
   - Defines the affected users
   - Helps understand scale

### Gap: Solution Is Vague

Use when you understand the problem but the implementation is unclear.

5. **"Walk me through exactly what should happen when the user does X."**
   - Gets step-by-step clarity
   - Reveals hidden complexity

6. **"What data is needed? Where does it come from?"**
   - Uncovers data dependencies
   - Identifies integration needs

7. **"What does the user see before, during, and after this action?"**
   - Clarifies UI flow
   - Identifies screens affected

8. **"What happens if something goes wrong?"**
   - Reveals error handling needs
   - Often overlooked

### Gap: Scope Is Undefined

Use when the boundaries are fuzzy.

9. **"What's explicitly NOT included in this task?"**
   - Must have an answer
   - Prevents scope creep

10. **"If we had to cut this in half, what survives?"**
    - Reveals the true core
    - Identifies nice-to-haves

11. **"Is this a one-time fix or a pattern we're establishing?"**
    - Affects how general the solution needs to be
    - Impacts effort

12. **"What existing functionality should this NOT change?"**
    - Defines boundaries
    - Protects existing behavior

### Gap: Design Direction Missing

Use when you need visual or behavioral clarity.

13. **"Should this match an existing pattern in the app? Which one?"**
    - Promotes consistency
    - Reduces design decisions

14. **"What's the most important information on this screen/component?"**
    - Establishes hierarchy
    - Guides layout decisions

15. **"Mobile, desktop, or both?"**
    - Major scope consideration
    - Often assumed but not stated

16. **"Are there any specific colors, states, or behaviors required?"**
    - Gets explicit design requirements
    - Especially important for visual changes

### Gap: Acceptance Criteria Unclear

Use when "done" isn't defined.

17. **"How will we know this is working correctly?"**
    - Defines testable outcomes
    - Prevents endless iteration

18. **"What would make you say 'this isn't what I wanted'?"**
    - Reveals hidden expectations
    - Prevents misalignment

19. **"Should this be behind a feature flag or go live immediately?"**
    - Clarifies deployment strategy
    - Affects implementation

20. **"Who needs to review/approve this before it's done?"**
    - Identifies stakeholders
    - Sets expectations

---

## Interview Flow

### Step 1: Analyze the Ticket

Before asking questions, identify what's clear vs. unclear:

| Category   | What's Clear? | What's Missing? |
| ---------- | ------------- | --------------- |
| Problem    |               |                 |
| Solution   |               |                 |
| Scope      |               |                 |
| Design     |               |                 |
| Acceptance |               |                 |

### Step 2: Select Questions

Pick **only the questions needed** to fill the gaps. Don't ask about what's already clear.

Typical interview length:

- Very raw ticket: 8-10 questions
- Partially clear ticket: 5-7 questions
- Nearly complete ticket: 2-3 questions

### Step 3: Ask One at a Time

Never batch questions. Wait for each answer before asking the next.

### Step 4: Confirm Understanding

Before writing the brief, summarize:

> "Let me make sure I've got this right:
>
> - The problem is [X]
> - We're building [Y]
> - Explicitly NOT doing [Z]
> - Done when [criteria]
>
> Does that sound right?"

---

## Anti-Patterns

### Don't Do This

- **Batching questions** - "Can you tell me about the problem, the solution, and what's out of scope?"
- **Asking what's obvious** - If the ticket says "change icon color," don't ask "what's changing?"
- **Going deep on tangents** - Stay focused on what Chris needs to build THIS task
- **Asking for design specs** - You need direction, not pixel-perfect mockups
- **Asking hypotheticals** - "What if users want X?" is for full shaping, not task shaping

### Do This Instead

- **One question at a time**
- **Ask only about gaps**
- **Stay practical and focused**
- **Accept "good enough" answers**
- **Escalate if it's getting complex**

---

## Question Technique: The Scope Lock

For every task, you MUST establish the scope lock:

**Ask:** "What's explicitly NOT included in this task?"

If they say "nothing, just do everything," push back:

**Follow up:** "Let me list what I think could be adjacent to this. Tell me if any are included or out:"

- [Adjacent feature 1]
- [Adjacent feature 2]
- [Edge case 1]

This prevents the "I assumed you'd also do X" problem later.

---

## Termination Criteria

The interview is complete when you can confidently write:

1. **A 1-2 sentence problem statement**
2. **A clear solution description**
3. **An explicit "In Scope" list**
4. **An explicit "Out of Scope" list**
5. **Design direction (even if just "match existing pattern")**
6. **Acceptance criteria (how we know it's done)**

If you can write all of these, stop interviewing and write the brief.
