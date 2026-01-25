# Bug Interview Guide

This guide provides the question framework for extracting actionable bug information from CSM.

## Two Interview Modes

| Mode        | When                            | Questions     | Focus               |
| ----------- | ------------------------------- | ------------- | ------------------- |
| **Create**  | `/bug` (no ticket exists)       | 5-8 questions | Full reconstruction |
| **Enhance** | `/bug DOOM-XXX` (ticket exists) | 3-5 questions | Fill gaps only      |

## Philosophy: Forensic, Not Exploratory

Bug interviews are **forensic** - you're reconstructing exactly what happened. This is different from problem discovery (which explores pain) or shaping (which designs solutions).

**Good bug interview:** "What did they click, then what happened?"
**Bad bug interview:** "How does this make them feel about Moovs?"

---

## Create Mode Opening

When CSM invokes `/bug`, start with:

> "I'll help you create a bug ticket. First, tell me what the customer reported. Include:
>
> - What they said (direct quote if you have it)
> - When this happened
> - Any context you have"

This gives you the raw material to start the forensic process.

---

## Enhance Mode Opening

When CSM invokes `/bug DOOM-XXX` or `/bug <url>`:

1. **Fetch the ticket first** (using Notion MCP tools)
2. **Analyze what's documented vs. what's missing**
3. **Start with a summary:**

> "I've pulled up **DOOM-XXX: [Title]**. Here's what I found:
>
> **Has:**
>
> - [List what's already documented]
>
> **Missing:**
>
> - [List what's needed for an engineer to act]
>
> Let me ask a few quick questions to fill the gaps..."

### Enhance Mode Rules

- **Don't re-ask what's there** - If the ticket has steps to reproduce, don't ask for them again
- **3-5 questions max** - You're filling gaps, not starting over
- **Skip Phase 1 if present** - If the report is documented, go straight to gaps
- **Add technical context** - Even if the ticket is complete, add codebase research

### Common Gap Patterns

| What's in Ticket        | What's Missing    | Question to Ask                                      |
| ----------------------- | ----------------- | ---------------------------------------------------- |
| "Customer can't log in" | Specific steps    | "What exactly did they try? Username/password? SSO?" |
| Steps listed            | Expected behavior | "What should have happened after step 3?"            |
| Error description       | Evidence          | "Do you have the operator ID or a screenshot?"       |
| Everything documented   | Technical context | (Don't ask - search codebase yourself)               |

---

## Phase 1: The Report (2 questions)

Goal: Understand what was reported and when.

### Question 1.1: The Complaint

> "What exactly did the customer say was wrong?"

**Listen for:**

- Vague complaints ("it's not working") → Need to drill down
- Specific complaints ("when I click save, nothing happens") → Good starting point
- Feature requests disguised as bugs ("why can't I do X?") → Redirect to /problem

**Red flags:**

- "They said the whole thing is broken" → Too vague
- "They want it to work differently" → Feature request, not bug
- "They've been having issues for months" → Why wasn't this reported earlier?

### Question 1.2: The Timing

> "When did this happen? Do you have an approximate date/time?"

**Why this matters:**

- Helps find logs if we need to investigate
- Helps identify if this started after a recent deployment
- Helps distinguish one-time glitch from persistent bug

## Phase 2: The Reproduction (3-4 questions)

Goal: Reconstruct the exact steps to reproduce.

### Question 2.1: The Goal

> "What was the customer trying to do when they encountered this?"

**Listen for:**

- Clear goal: "They were trying to create a reservation"
- Unclear goal: "They were just using the app" → Need to drill down

### Question 2.2: The Steps

> "Walk me through what they did, step by step. Start from where they began."

**Listen for:**

- Specific sequence: "They went to Dispatch, clicked on a trip, clicked Edit..."
- Vague sequence: "They were clicking around" → Need more detail

**Follow-up if needed:**

- "What screen were they on?"
- "What did they click first?"
- "What happened after that?"

### Question 2.3: The Expectation

> "What did they expect to happen when they did that?"

**Listen for:**

- Clear expectation: "They expected the trip to save with the new time"
- Unclear expectation: "They expected it to work" → Need more detail

### Question 2.4: The Reality

> "What actually happened instead?"

**Listen for:**

- Error message: Great, we can search for this
- Nothing happened: Button didn't respond? Page didn't load?
- Wrong result: What was wrong about it?
- Unexpected behavior: How was it unexpected?

**Follow-up if needed:**

- "Did they see an error message?"
- "Did the page reload or stay the same?"
- "What exactly was wrong about what happened?"

## Phase 3: The Evidence (2 questions)

Goal: Get concrete evidence that helps reproduction and investigation.

### Question 3.1: The Identifiers

> "Do you have the operator ID, trip ID, or any other identifiers?"

**Why this matters:**

- Operator ID → We can look up their account, settings, data
- Trip ID → We can see the exact reservation state
- User email → We can check their permissions, recent activity

### Question 3.2: The Artifacts

> "Is there a screenshot, error message, or screen recording?"

**Listen for:**

- Screenshot: Ideal - shows exactly what happened
- Error message: Can search codebase for this
- Recording: Best - shows the full sequence
- "No, they just described it" → This is okay but lower confidence

## Phase 4: The Context (1-2 questions, if needed)

Goal: Understand environment and scope.

### Question 4.1: The Environment (ask if not already clear)

> "What browser/device were they using? And what's their role (admin, dispatcher, driver)?"

**Why this matters:**

- Some bugs are browser-specific
- Some bugs are role-specific (permissions, visibility)
- Mobile vs desktop behavior differences

### Question 4.2: The Scope (ask if pattern suspected)

> "Has anyone else reported this, or is it just this one customer?"

**Why this matters:**

- One customer: Might be their specific data or setup
- Multiple customers: Likely a real platform bug
- Pattern: Higher priority

## Classification Signals

### Signals it's a REAL BUG:

- Clear steps to reproduce
- Unexpected behavior vs documented/designed behavior
- Error messages in the UI
- Multiple customers affected
- Codebase research confirms it shouldn't work that way

### Signals it's USER ERROR:

- Customer trying to do something the feature doesn't support
- Missing required fields or inputs
- Permissions issue (they don't have access)
- "They didn't know you had to click X first"
- Codebase research confirms it's working as designed

### Signals it's a FEATURE REQUEST:

- "They want it to work differently"
- "They wish they could do X"
- "Other software lets them do this"
- The current behavior is intentional, just not what customer wants

### Signals it CANNOT BE REPRODUCED:

- Steps are too vague to follow
- Can't get operator ID or evidence
- CSM says "they couldn't reproduce it either"
- One-time glitch that never recurred

## Interview Length

**Target: 5-8 questions**

If you've asked 8 questions and still don't have enough to reproduce:

- Either the bug report is too vague
- Or it's not actually a bug

At that point, ask CSM to get more information from the customer before proceeding.

## Sample Interview Flow

**CSM:** "Customer says they can't see their reservations"

**Q1:** "What exactly did they say? And when did this happen?"

**CSM:** "They said 'all my reservations disappeared' - this was about an hour ago"

**Q2:** "What were they trying to do when they noticed this?"

**CSM:** "They opened the Dispatch page to see today's trips"

**Q3:** "When they opened Dispatch, what did they see?"

**CSM:** "They said it just showed 'No trips' even though they know they have reservations"

**Q4:** "What did they expect to see?"

**CSM:** "Their trips for today - they had at least 5 booked"

**Q5:** "Do you have their operator ID?"

**CSM:** "Yes, it's 12345"

**Q6:** "Did they send a screenshot of the empty Dispatch page?"

**CSM:** "Yes, I'll share it"

**[Now we can search codebase, check their data, and classify]**

## When to Stop

Stop the interview when you have:

- [ ] Clear steps to reproduce (or clear that you can't get them)
- [ ] Expected vs actual behavior
- [ ] Operator ID or other identifier
- [ ] Screenshot or error message (or confirmation none exists)

Don't keep asking questions just to fill time. Get what you need and move to classification.
