# Interview Guide for Moovs Shaping

This guide provides the question framework for conducting deep shaping interviews. Questions are organized by phase but should be adapted based on the specific problem.

## Interview Philosophy

### What Makes a Good Shaping Question

Good shaping questions:

- **Uncover hidden assumptions** - "You mentioned X, but what if Y isn't true?"
- **Reveal edge cases** - "What happens when this goes wrong?"
- **Challenge scope** - "Do we really need this for v1?"
- **Expose integration complexity** - "What systems does this touch?"
- **Surface user behavior** - "How do you know customers do this?"

Bad shaping questions:

- "What features do you want?" (accepts solutions, not problems)
- "Is this important?" (of course they'll say yes)
- "Do you need X or Y?" (binary choice limits discovery)

### The Shaping Mindset

You are NOT a requirements gatherer. You are a skeptical investigator trying to:

1. Find the SMALLEST solution that solves the REAL problem
2. Identify everything that could blow up the timeline
3. Understand what we can cut when time runs short
4. Ensure we're not building what customers imagine, but what they need

---

## Phase 1: Problem Understanding

Goal: Understand the REAL problem, not the stated solution. Get specific stories.

### Opening Questions

1. **"Walk me through a specific recent situation where this problem occurred. What happened, step by step?"**
   - This grounds the discussion in reality, not abstractions
   - Follow up: "When was this?" "Who was involved?" "What did they do next?"

2. **"Before this feature existed in your mind, how did you work around this problem?"**
   - Reveals what customers actually do today
   - The workaround often reveals the true constraint

3. **"What's the actual cost of this problem? Not 'it's annoying'—what happens as a result?"**
   - Lost revenue? Lost customers? Wasted time? Support burden?
   - If they can't quantify it, maybe it's not worth solving

### Digging Deeper

4. **"You mentioned [X], but I noticed you didn't mention [Y]. Why is that?"**
   - Reveals unconscious prioritization
   - Helps understand what's truly important vs. nice to have

5. **"If we do nothing, what happens in 6 months?"**
   - Tests urgency and importance
   - Reveals if this is a burning platform or a nice-to-have

6. **"Who else experiences this problem? Is it everyone, or a specific segment?"**
   - Helps narrow the scope
   - A feature for 10% of users might have different appetite

7. **"When does this problem NOT occur? What makes those situations different?"**
   - The inverse often reveals the root cause
   - Helps identify the triggering conditions

8. **"What have you tried before? Why didn't it work?"**
   - Avoids repeating failed approaches
   - Reveals hidden constraints

### Challenging the Problem

9. **"If I'm being honest, this sounds like [simpler interpretation]. What am I missing?"**
   - Forces them to articulate the non-obvious complexity
   - Or reveals you can simplify the solution

10. **"You're describing a solution. What's the underlying problem that led you to this solution?"**
    - Classic "job to be done" thinking
    - Separates problem from solution space

---

## Phase 2: Appetite & Boundaries

Goal: Establish how much time this is worth and narrow the scope accordingly.

### Setting the Appetite

11. **"If you could only have this feature for 3 days of engineering effort, what would it absolutely have to do?"**
    - Forces prioritization
    - Reveals the core value proposition

12. **"What would make this a 'win' even if we couldn't do everything you imagined?"**
    - Establishes minimum viable scope
    - Identifies the must-have core

13. **"Between 'quick fix that handles 80% of cases' and 'robust solution that handles everything,' where does this need to land?"**
    - Reveals true quality requirements
    - Helps calibrate Small Batch vs Big Batch

### Boundary Definition

14. **"What's explicitly OUT of scope for this work? What are we NOT trying to solve?"**
    - Must be answered before proceeding
    - Prevents scope creep

15. **"If we had to ship this tomorrow with what we have today, what would be unacceptable?"**
    - Reveals the true dealbreakers
    - Separates must-haves from nice-to-haves

16. **"Which customer segment does this primarily serve? What about the others?"**
    - Helps narrow the target
    - Prevents trying to please everyone

17. **"Is this a 'doing a new thing' problem or a 'doing an existing thing better' problem?"**
    - Changes the solution approach significantly
    - New things are inherently riskier

---

## Phase 3: Solution Exploration

Goal: Sketch the solution at the right level of abstraction—concrete enough to build, rough enough to allow creativity.

### User Flow Questions

18. **"Walk me through exactly how a user would start this task. What do they see first?"**
    - Establishes the entry point
    - Reveals where this fits in existing workflows

19. **"At each step, what decision is the user making? What information do they need?"**
    - Identifies key affordances
    - Reveals data dependencies

20. **"What's the 'happy path'? Walk me through a perfect scenario."**
    - Establishes the core flow
    - This is what we build first

21. **"Now walk me through when something goes wrong. What errors can occur?"**
    - Reveals error handling requirements
    - Often forgotten in initial scoping

### UI/UX Exploration

22. **"When you picture this in your head, is it a new screen, a modification to an existing screen, or something else entirely?"**
    - Establishes UI scope
    - Modifications are often simpler than new screens

23. **"What's the minimum information density required here? Maximum?"**
    - Tables vs. cards vs. lists
    - Affects design approach significantly

24. **"Does this need to work on mobile, desktop, or both?"**
    - Major scope consideration
    - Mobile often doubles complexity

25. **"What existing UI patterns in the app could we reuse here?"**
    - Reduces design complexity
    - Maintains consistency

26. **"If this was just text on a page with no fancy UI, would it still be useful?"**
    - Tests if the value is in the data or the presentation
    - Reveals opportunities to simplify

### Data & System Questions

27. **"Where does the data for this come from? Does it exist today?"**
    - Reveals data modeling needs
    - Missing data = major scope

28. **"What happens when this data changes? Who changes it? How often?"**
    - Reveals real-time requirements
    - Affects architecture significantly

29. **"Does this need to integrate with any external systems?"**
    - Integrations are notorious rabbit holes
    - Each integration should be explicitly scoped or excluded

30. **"What data does this need to write? Where does it go?"**
    - Reveals persistence requirements
    - Write operations are more complex than read

### Technical Probing

31. **"What's the performance expectation here? Instant, few seconds, or batch OK?"**
    - Real-time is harder than async
    - Sets technical constraints

32. **"Are there any parts of this that require technology we haven't used before?"**
    - New technology = risk
    - Should be explicitly acknowledged

33. **"If we had to build this with NO new database tables, could we?"**
    - Forces creative problem solving
    - Often possible with clever design

---

## Phase 4: Risk Assessment

Goal: Find everything that could blow up the timeline and either solve it or explicitly exclude it.

### Technical Risks

34. **"What's the scariest technical part of this project?"**
    - Get it on the table
    - Scare you should address in shaping

35. **"Have we ever built anything similar? What went wrong?"**
    - Learn from history
    - Reveals patterns of failure

36. **"If this was going to take 3x longer than expected, what would be the cause?"**
    - Forces identification of risks
    - The answer IS the rabbit hole

37. **"What edge case are you most worried about?"**
    - They usually know
    - Get it explicit

### Integration Risks

38. **"What third-party dependencies does this have? What's their reliability like?"**
    - External dependencies fail
    - Rate limits, downtime, API changes

39. **"What happens if [external system] is down when the user tries this?"**
    - Reveals error handling complexity
    - Often not considered initially

### Scope Risks

40. **"What question hasn't been answered yet that could change everything?"**
    - Reveals known unknowns
    - These need resolution before betting

41. **"If the designer/developer comes back and says 'this is harder than you thought,' what would you cut?"**
    - Must have an answer
    - Prepares for reality

42. **"Is there anything here that 'seems simple' but you have a feeling might not be?"**
    - Trust their intuition
    - Simple-seeming things often aren't

---

## Phase 5: Trade-offs & No-Gos

Goal: Explicitly define what we're NOT building and what we'll cut if time runs short.

### Explicit No-Gos

43. **"What features have you explicitly decided NOT to include in v1?"**
    - Must be documented
    - Prevents scope creep

44. **"If a customer asked for [related feature X], what would you tell them?"**
    - Reveals how they think about boundaries
    - Good test of scope clarity

45. **"What would make this project 'too big' and need to be re-scoped?"**
    - Defines the upper bound
    - Circuit breaker trigger

### Priority Stack Ranking

46. **"Rank these capabilities in order of importance: [list what's been discussed]"**
    - Forces prioritization
    - Reveals true values

47. **"If we had to cut 50% of what we've discussed, what survives?"**
    - The survivors are the must-haves
    - Everything else is nice-to-have

48. **"What's the 'nice-to-have' that you most hope we have time for?"**
    - Document with ~ prefix
    - First to cut

### Confirming Readiness

49. **"Is there anyone else I should talk to before writing this up?"**
    - Reveals stakeholders
    - Prevents surprises

50. **"If we bet on this next cycle and it shipped, would you feel we spent our time well?"**
    - Final gut check
    - If hesitation, keep digging

---

## Interview Termination Criteria

The interview is complete when you can confidently write:

1. **A specific problem story** (not abstract, with real details)
2. **Clear appetite** (Small Batch or Big Batch with justification)
3. **Solution elements** (screens, flows, data, interactions)
4. **At least 3 rabbit holes** with patches or exclusions
5. **At least 3 explicit no-gos**

If you cannot write any of these, continue interviewing.

---

## Adaptive Questioning

The questions above are a starting point. You should:

- **Follow the thread** - If something interesting comes up, pursue it
- **Go deeper** - Use "Why?" and "How do you know?" liberally
- **Challenge** - "That sounds easy, but what if [edge case]?"
- **Summarize and verify** - "So what you're saying is..."

Never ask questions just to check boxes. Each question should reveal something new.
Use the AskUserQuestion tool for asking all questions.
