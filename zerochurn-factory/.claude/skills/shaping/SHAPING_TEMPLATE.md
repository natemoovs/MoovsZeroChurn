# Shaping Document Template

Use this template to generate the final shaping document after completing the interview.

---

## Document Structure

```markdown
# [Project Name] - Shaping Document

**Date:** [Date]  
**Appetite:** [Small Batch (3-5 days) | Big Batch (3 weeks)]  
**Shaped by:** [Names]

---

## 1. Problem

### The Story

[Write a specific narrative describing when this problem occurs. Include:
- WHO experiences this problem (specific role/persona)
- WHAT they're trying to do
- WHAT goes wrong
- WHAT the consequence is

This should be a concrete story, not an abstract description.]

**Example:**
> Sarah is a dispatcher at Roberts Hawaii. At 6 AM, she gets a call from a panicked 
> driver: "I'm supposed to pick up 12 people at the airport in 20 minutes, but I don't 
> know which terminal." Sarah opens Moovs, but the flight info isn't connected to the 
> trip—she has to open FlightAware in another tab, cross-reference the airline code, 
> and then call the driver back. By the time she figures it out, the driver is late, 
> and the customer is frustrated.

### Current Workaround

[Describe how customers solve this problem today, if at all.]

### Why This Matters Now

[Explain the urgency. What's the cost of inaction? Who is affected?]

---

## 2. Appetite

**Time Budget:** [Small Batch (3-5 days) | Big Batch (3 weeks)]

### Justification

[Explain why this appetite is appropriate for this problem:]

- **Why not smaller?** [What would we lose if we spent less time?]
- **Why not bigger?** [Why doesn't this warrant more investment?]

### Success Criteria

Within this appetite, success means:
- [ ] [Specific measurable outcome 1]
- [ ] [Specific measurable outcome 2]
- [ ] [Specific measurable outcome 3]

---

## 3. Solution

### Solution Overview

[One paragraph summary of the approach. What are we building at a high level?]

### User Flow

[Describe the step-by-step flow. Use a breadboard format:]

```
[Starting Point]
    |
    v
[Screen/State 1] --> [Affordance: Button/Link] --> [Screen/State 2]
    |
    v
[Affordance: Action] --> [Outcome]
```

### Key Screens / Interactions

#### [Screen/Interaction 1 Name]

**Purpose:** [What is this screen for?]

**Elements:**
- [Element 1]: [Description]
- [Element 2]: [Description]
- [Element 3]: [Description]

**Behavior:**
- [What happens when the user does X]
- [What happens when the user does Y]

[Include a fat-marker sketch or ASCII diagram if helpful]

#### [Screen/Interaction 2 Name]

[Repeat the structure above for each key screen or interaction]

### Data Requirements

**Reads:**
- [What data does this feature read? From where?]

**Writes:**
- [What data does this feature write? To where?]

**New Data:**
- [Any new fields, tables, or structures needed?]

### Integration Points

[List any systems this needs to integrate with and how]

| System | Integration Type | Notes |
|--------|------------------|-------|
| [System 1] | [Read/Write/Both] | [Details] |
| [System 2] | [Read/Write/Both] | [Details] |

---

## 4. Rabbit Holes

### Identified Risks

#### Rabbit Hole 1: [Name]

**Risk:** [What could go wrong?]

**Mitigation:** [How are we avoiding this? Is it descoped? Simplified? Pre-solved?]

#### Rabbit Hole 2: [Name]

**Risk:** [What could go wrong?]

**Mitigation:** [How are we avoiding this?]

#### Rabbit Hole 3: [Name]

**Risk:** [What could go wrong?]

**Mitigation:** [How are we avoiding this?]

### Technical Decisions Made

[List any technical decisions made during shaping that the team should follow:]

- [Decision 1]: [Rationale]
- [Decision 2]: [Rationale]

---

## 5. No-Gos

**The following are explicitly OUT OF SCOPE for this project:**

1. **[No-Go 1]** - [Why we're not doing this]
2. **[No-Go 2]** - [Why we're not doing this]
3. **[No-Go 3]** - [Why we're not doing this]

---

## 6. Nice-to-Haves (Marked with ~)

If time permits, consider:

- ~[Nice-to-have 1]
- ~[Nice-to-have 2]
- ~[Nice-to-have 3]

These are the FIRST things to cut if the project is running long.

---

## 7. Open Questions

[List any questions that still need answers, even though the project is shaped enough to bet on:]

- [ ] [Question 1]
- [ ] [Question 2]

---

## 8. Definition of Done

This project is done when:

- [ ] [Core flow 1 works]
- [ ] [Core flow 2 works]
- [ ] [Deployed to production]
- [ ] [No critical bugs]

---

*This shaping document is ready for the betting table.*
```

---

## Writing Guidelines

### Problem Section

- **Be specific** - Names, times, places, numbers
- **Tell a story** - Narrative is more compelling than bullet points
- **Show the cost** - What's the consequence of the status quo?
- **Avoid solutions** - Don't describe what you'll build, describe what's broken

### Appetite Section

- **Justify the choice** - Why this size, not larger or smaller?
- **Define success** - What does "done" look like at this appetite?
- **Be honest** - If it can't fit, say so

### Solution Section

- **Stay rough** - Fat marker sketches, not wireframes
- **Focus on flows** - How does the user get from A to B?
- **Note affordances** - Buttons, links, inputs (not styling)
- **Specify data** - What's read, what's written, what's new?

### Rabbit Holes Section

- **Name the risk** - Be specific about what could go wrong
- **Explain the mitigation** - How are we avoiding this?
- **Include technical decisions** - Lock in decisions that prevent scope creep

### No-Gos Section

- **Be explicit** - Name specific features we're NOT building
- **Explain why** - Prevents future scope creep arguments
- **Anticipate requests** - What will users ask for that we'll say no to?

---

## Example Shaping Documents

See the `examples/` directory for complete examples:

- `examples/trip-cancellation.md` - Big Batch example
- `examples/driver-notification.md` - Small Batch example
