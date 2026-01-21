# Problem Discovery Interview Guide

This guide provides the question framework for conducting problem discovery interviews. The goal is to understand the REAL problem before any shaping begins.

## Interview Philosophy

### The DHH/Tobi Mindset

**DHH (Basecamp):** "People don't know what they want until you show it to them. But they DO know what hurts. Find the pain, and you'll find the opportunity."

**Tobi (Shopify):** "The best features come from watching people struggle, not from asking them what they want. What they want is usually just 'less pain.' Your job is to figure out where the pain comes from."

### What Makes a Good Problem Discovery Question

Good problem discovery questions:
- **Surface pain** - "What's frustrating about this?"
- **Get specific** - "Tell me about the last time this happened"
- **Reveal stakes** - "What happened as a result?"
- **Expose workarounds** - "How do you deal with this today?"
- **Challenge solutions** - "That sounds like a solution. What problem does it solve?"

Bad problem discovery questions:
- "What features do you need?" (solution-seeking)
- "Would X be helpful?" (leading)
- "On a scale of 1-10, how important is this?" (abstract)
- "What do you want us to build?" (abdicating responsibility)

### Your Role

You are NOT a requirements gatherer. You are an investigative journalist trying to understand:
1. What is actually happening today?
2. Why is it painful?
3. For whom?
4. What are the stakes?

**You propose solutions later. Right now, you're just understanding the problem.**

---

## Phase 1: The Trigger

Goal: Understand what surfaced this problem and from where.

### Opening Questions

1. **"What brought this to your attention? Was there a specific incident or request?"**
   - Grounds the problem in a real event
   - Reveals the source (customer, internal, support)

2. **"Who raised this, and what did they actually say?"**
   - Get the original language
   - Often reveals whether it's a problem or a pre-formed solution

3. **"When did this happen? Is this recent or ongoing?"**
   - Establishes timeline
   - Reveals if this is acute or chronic

### If They Describe a Solution

4. **"That sounds like a feature request. What problem would that solve?"**
   - Redirects to the underlying pain
   - Classic "job to be done" question

5. **"Before you had that solution in mind, what was happening that made you think of it?"**
   - Works backward from solution to problem
   - Gets to the triggering event

---

## Phase 2: The Story

Goal: Get a specific, concrete narrative of the problem occurring.

### Story Questions

6. **"Walk me through a specific recent time this happened. What was the situation?"**
   - Anchors in reality
   - Follow up: "Who was involved?" "What time of day?" "Where were they?"

7. **"What was [person] trying to accomplish when this went wrong?"**
   - Identifies the goal
   - The gap between goal and outcome IS the problem

8. **"Step by step, what did they do? And then what happened?"**
   - Maps the workflow
   - Pain points emerge in the steps

9. **"At what point did things go wrong? What specifically failed?"**
   - Pinpoints the breakdown
   - This is where solutions should focus

10. **"What was the consequence? What happened next?"**
    - Reveals stakes
    - Consequences justify investment

### Deepening the Story

11. **"How did [person] feel at that moment?"**
    - Emotional weight reveals priority
    - "Frustrated" vs "Panicked" tells you a lot

12. **"What did they have to do to recover?"**
    - Reveals the cost of failure
    - Recovery effort = opportunity to save

13. **"Has this exact scenario happened before?"**
    - Tests if it's a pattern
    - One-offs might not be worth solving

---

## Phase 3: The Scope

Goal: Understand who else is affected and how widespread the problem is.

### Scope Questions

14. **"Who else experiences this problem? Is it just this person or many?"**
    - Tests if it's a segment or universal
    - A problem for 10% of users has different appetite

15. **"How often does this happen? Daily? Weekly? Every transaction?"**
    - Frequency × impact = total pain
    - Rare but severe vs. frequent but minor

16. **"Are there situations where this problem DOESN'T occur? What's different?"**
    - The exception often reveals the root cause
    - Might be a workaround already in place

17. **"Who else is affected downstream when this happens?"**
    - Identifies secondary stakeholders
    - The driver, the customer, the manager...

### Workaround Questions

18. **"How do people work around this today?"**
    - Workarounds reveal the constraint
    - Often the seed of the solution is here

19. **"Why isn't the workaround good enough?"**
    - Reveals what's unacceptable
    - Too slow? Too manual? Too error-prone?

20. **"Have you tried solving this before? What happened?"**
    - Avoids repeating failures
    - Reveals hidden constraints

---

## Phase 4: The Stakes

Goal: Understand the cost of inaction and urgency.

### Cost Questions

21. **"What does this problem cost in actual time?"**
    - Quantify: hours/week spent on workarounds
    - Time is tangible

22. **"Has this ever cost you money directly?"**
    - Lost deals, refunds, inefficiency
    - Money gets attention

23. **"Has this affected a customer relationship?"**
    - Churn risk, reputation damage
    - Relationship costs compound

24. **"What's the support burden? Do people call/email about this?"**
    - Support tickets = measurable pain
    - "15% of tickets are about X" is compelling

### Urgency Questions

25. **"If we do nothing for 6 months, what happens?"**
    - Tests urgency
    - "Nothing much" = maybe not a priority

26. **"Is this a burning platform or a gradual pain?"**
    - Burning platform: urgent, must solve now
    - Gradual pain: important but can be planned

27. **"What would change if we solved this perfectly tomorrow?"**
    - Vision of success
    - Helps understand true goals

---

## Phase 5: Validation

Goal: Confirm understanding and identify gaps.

### Validation Questions

28. **"Let me play this back: [summary]. Did I get that right?"**
    - Confirms understanding
    - Often surfaces nuance you missed

29. **"What haven't I asked that I should have?"**
    - Opens the door for context you missed
    - They often have more to share

30. **"Is there anyone else I should talk to about this?"**
    - Identifies other stakeholders
    - Might reveal the "real" decision maker

31. **"If you could only tell me one thing about this problem, what would it be?"**
    - Forces prioritization
    - The answer is often the core insight

---

## The 5 Whys Technique

When someone gives you a surface-level problem, use "Why?" to dig deeper:

**Example:**
- "We need better reporting" → **Why?**
- "Because we can't see trip performance" → **Why do you need to see that?**
- "Because we don't know which drivers are running late" → **Why does that matter?**
- "Because late drivers cause customer complaints" → **Why are drivers late?**
- "Because they don't know about traffic until they're already on the road"

**Now we understand:** The real problem isn't reporting—it's that drivers lack proactive traffic alerts.

---

## Interview Termination Criteria

The interview is complete when you can confidently write:

1. **A specific trigger** - What event surfaced this?
2. **A concrete story** - WHO did WHAT and WHAT went wrong?
3. **Clear scope** - WHO is affected and HOW often?
4. **Current workarounds** - HOW do they cope?
5. **Cost of inaction** - WHAT happens if we do nothing?

If you can't write any of these, keep asking questions.

---

## Red Flags to Watch For

### "We need X" without pain
If they can't describe actual pain, this might be a solution looking for a problem.

### Everyone's affected but no one can give a story
Theoretical problems aren't problems yet.

### The workaround works fine
If the workaround is acceptable, the problem isn't urgent.

### No quantifiable cost
"It's frustrating" isn't enough. Time, money, or relationships should be at stake.

### Solution already baked in
If they've decided the solution, they might resist problem exploration. Push back gently: "I want to make sure we solve the right problem."

---

## Adaptive Questioning

These questions are starting points. Always:

- **Follow the thread** - If something interesting emerges, pursue it
- **Use silence** - Let them fill the gap; they often add crucial details
- **Mirror back** - "So what you're saying is..." invites correction
- **Validate emotions** - "That sounds frustrating" opens up honesty

Never ask questions just to check boxes. Each question should reveal something new about the problem.

Use the AskUserQuestion tool for asking all questions during the interview.
