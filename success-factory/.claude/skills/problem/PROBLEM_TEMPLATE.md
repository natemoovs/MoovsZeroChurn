# Problem Document Template

Use this template to generate the `problem.md` file after completing the problem discovery interview.

---

## Document Structure

```markdown
# Problem: [Short Problem Title]

**Captured:** [Date]
**Source:** [Customer name / Sales / Internal / Support ticket / etc.]
**Captured by:** [Your name]

---

## 1. The Trigger

**What brought this to our attention?**

[Describe the specific event, customer request, or observation that surfaced this problem. Include who raised it and when.]

---

## 2. The Story

**A specific instance of this problem:**

[Write a concrete narrative. Use real names (or role names like "the dispatcher"). Include:
- WHO was involved
- WHAT they were trying to do
- WHAT went wrong
- WHAT the consequence was

This should read like a story, not bullet points.]

**Example format:**
> [Name/Role] was trying to [goal]. They [action taken], but [what went wrong].
> As a result, [consequence]. This took [time/cost] and left [person] feeling [impact].

---

## 3. Who's Affected

**Primary:** [Role/persona who experiences this directly]

**Secondary:** [Others impacted - customers, drivers, other team members]

**Frequency:** [How often does this happen? Daily? Weekly? Per transaction?]

**Scale:** [How many people/transactions are affected?]

---

## 4. Current Workarounds

**How do they cope today?**

[Describe the manual processes, hacks, or alternative tools people use to work around this problem. These workarounds often reveal the true constraint.]

- Workaround 1: [Description]
- Workaround 2: [Description]

**Why aren't workarounds sufficient?**

[What's wrong with the current approach? Too slow? Error-prone? Doesn't scale?]

---

## 5. Cost of Inaction

**What happens if we do nothing?**

[Be specific about the impact:]

- **Time cost:** [Hours/week spent on workarounds]
- **Money cost:** [Lost revenue, refunds, inefficiency]
- **Relationship cost:** [Customer frustration, churn risk]
- **Operational cost:** [Support burden, errors, delays]

**Urgency:** [Is this a burning platform or a gradual pain?]

---

## 6. Raw Quotes

**What did people actually say?**

[Capture the exact language used by customers/users. These quotes are gold for understanding the emotional weight of the problem.]

> "[Direct quote from customer/user]"
> - [Attribution]

> "[Another quote]"
> - [Attribution]

---

## 7. What This Is NOT About

**Explicitly not in scope:**

[List any related problems or adjacent issues that are NOT part of this problem. This prevents scope creep later.]

- This is NOT about [related but separate issue]
- This is NOT about [another adjacent concern]

---

## 8. Initial Solution Ideas (Unvalidated)

**Early thoughts (to be validated during shaping):**

[Capture any solution ideas that came up, but mark them clearly as unvalidated. These are starting points for shaping, not commitments.]

- Idea 1: [Brief description]
- Idea 2: [Brief description]

**Note:** These are NOT shaped solutions. They're raw ideas to explore during shaping.

---

## 9. Open Questions

**What we still don't know:**

- [ ] [Question that needs answering]
- [ ] [Another unknown]
- [ ] [Something to investigate]

---

## Next Steps

- [ ] Review with [stakeholder] for additional context
- [ ] Schedule shaping session (run `/shaping`)
- [ ] Gather additional data on [specific metric]

---

*This problem is ready for shaping when we have a clear story, understand who's affected, and can articulate the cost of inaction.*
```

---

## Writing Guidelines

### The Trigger
- Be specific about the source
- Include date/timeframe if relevant
- Note if this is a recurring theme or one-off

### The Story
- **Use narrative form** - "Maria was trying to..." not "Users need to..."
- **Be concrete** - Specific times, places, numbers
- **Show consequences** - What happened as a result?
- **Avoid solutions** - Describe what's broken, not what to build

### Who's Affected
- Name specific roles, not generic "users"
- Distinguish primary (experiences directly) from secondary (affected by consequences)
- Quantify if possible

### Current Workarounds
- These reveal the true constraint
- The workaround IS often the seed of the solution
- Note why the workaround isn't good enough

### Cost of Inaction
- Make it tangible
- Time, money, relationships, operations
- This justifies the appetite later

### Raw Quotes
- Exact language matters
- Emotional words reveal priorities
- These will appear in the shaping doc too

### Initial Ideas
- Mark clearly as unvalidated
- Don't overthink - capture what came up
- These get refined in shaping

---

## Good vs. Bad Problem Statements

### Bad: Solution-Disguised-as-Problem
> "We need a dashboard for drivers to see their schedule"

This is a solution. The problem might be: Drivers miss pickups because they don't know their schedule in advance.

### Good: Pain-Focused Problem
> "Drivers are showing up late to pickups because they find out about jobs at the last minute. Last week, Roberto missed a $400 airport pickup because he didn't check his phone. The dispatcher had to scramble to find a replacement."

This tells us the pain, the consequence, and gives us room to explore solutions.

### Bad: Abstract Need
> "Customers want more visibility into their bookings"

This is too vague. What kind of visibility? What are they trying to do?

### Good: Specific Story
> "Jennifer from Carey Transportation called twice last week asking 'where is my driver?' Her clients land at LAX and can't find their pickup. She has to call dispatch, who has to call the driver, who then calls Jennifer back. By the time she has an answer, 15 minutes have passed and her client is furious."

This gives us a specific scenario to design for.

---

## Checklist Before Finishing

Before generating the problem.md, confirm you have:

- [ ] A specific trigger event (not just "customers want X")
- [ ] A concrete story with real details
- [ ] Clear identification of who's affected
- [ ] Understanding of current workarounds
- [ ] Tangible cost of inaction
- [ ] At least one raw quote (if available)
- [ ] Explicit non-scope items

If you're missing any of these, ask more questions.
