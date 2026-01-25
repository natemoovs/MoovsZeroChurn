# Task Brief Template

Use this template to generate the Task Brief after completing the clarification interview.

---

## Template Structure

```markdown
---

## Task Brief

**Shaped:** [Date]
**Ticket:** [DOOM-XX]
**Appetite:** [Small | Medium | Large]

---

### Problem

[1-2 sentences describing what's broken and why it matters. Be specific - who is affected? What's the consequence?]

---

### Solution

[Clear description of what we're building. Focus on WHAT, not HOW. Leave implementation details to the developer.]

---

### In Scope

- [Explicit item 1]
- [Explicit item 2]
- [Explicit item 3]

---

### Out of Scope

- [Explicit exclusion 1] - [Why]
- [Explicit exclusion 2] - [Why]
- [Explicit exclusion 3] - [Why]

---

### Design Direction

[Visual and behavioral guidance. This could be:]

- Reference to existing patterns ("Match the dispatch status badges")
- Specific requirements ("Use green for OTW, yellow for On Location")
- Behavioral notes ("Should update in real-time without refresh")

[If there are specific screens affected, list them:]

- **Screen/Component 1:** [What changes]
- **Screen/Component 2:** [What changes]

---

### Appetite

**[Small | Medium | Large]**

| Size   | Definition |
| ------ | ---------- |
| Small  | < 4 hours  |
| Medium | 1-2 days   |
| Large  | 3-5 days   |

**Justification:** [Why this size? What would make it bigger?]

---

### Acceptance Criteria

- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]
- [ ] [Edge case handled]

---

### Notes for Developer

[Optional: Any additional context, links to related code, or technical hints that would help.]

---
```

---

## Writing Guidelines

### Problem Section

**Good:**

> Customers tracking their driver on passenger links see a blue icon regardless of trip status. This makes it impossible to know at a glance whether the driver is en route, on location, or has passengers on board.

**Bad:**

> We need to update the driver icons.

The problem statement should answer:

- Who is affected?
- What's broken?
- What's the consequence?

### Solution Section

**Good:**

> Change the driver icon color on tracking surfaces to reflect dispatch status: green for OTW (On The Way), yellow for On Location, blue for POB (Passenger on Board).

**Bad:**

> Make the icons dynamic based on status.

The solution should be:

- Specific enough to build
- Abstract enough to allow developer judgment on implementation

### In Scope vs. Out of Scope

This is the **most critical section**. Ambiguity here causes rework.

**Good In Scope:**

- Passenger tracking links
- Shuttle tracking links
- Operator app dispatch view

**Good Out of Scope:**

- Driver app (separate ticket) - different codebase
- Historical trip views - only live tracking
- Custom operator color schemes - use system colors

**Bad Out of Scope:**

- "Everything else"
- [No out of scope section at all]

### Design Direction

Be prescriptive enough to prevent ping-pong questions, flexible enough to allow judgment.

**Good:**

> Use the existing dispatch status color palette:
>
> - OTW: Green (#22C55E)
> - On Location: Yellow (#EAB308)
> - POB: Blue (#3B82F6)
>
> Match the existing icon style. No animation needed.

**Bad:**

> Make it look good.

### Acceptance Criteria

Must be **testable**. If you can't verify it, it's not a criterion.

**Good:**

- [ ] Passenger link shows green icon when trip status is OTW
- [ ] Icon updates within 5 seconds of status change
- [ ] Works on mobile and desktop

**Bad:**

- [ ] Icons look correct
- [ ] Feature works as expected

---

## Appetite Guidance

| Appetite              | Scope                                 | Risk Tolerance                   |
| --------------------- | ------------------------------------- | -------------------------------- |
| **Small** (< 4 hrs)   | Single component, minimal logic       | Ship it, iterate if needed       |
| **Medium** (1-2 days) | Multiple components OR moderate logic | Some testing, review before ship |
| **Large** (3-5 days)  | Cross-cutting OR complex logic        | Full testing, consider staging   |

If a task feels bigger than **Large**, it probably needs full `/shaping`.

---

## Notion Update Instructions

After generating the Task Brief, update the Notion ticket:

### 1. Append the Brief

Add the full Task Brief to the page content. Use Notion's block structure:

- `heading_3` for section headers
- `paragraph` for content
- `bulleted_list_item` for lists
- `to_do` for acceptance criteria

### 2. Update Properties

| Property    | Update To                                      |
| ----------- | ---------------------------------------------- |
| Status      | "Shaped" (or next appropriate status)          |
| Description | Problem statement (first 1-2 sentences)        |
| Summary     | Solution statement (brief)                     |
| Type        | Identify if clear (Bug, Enhancement, UX, etc.) |

### 3. Confirm with User

After updating, report:

> "I've updated DOOM-XX with the Task Brief. Here's what changed:
>
> - Added Task Brief to page content
> - Updated Status to [X]
> - Updated Description to [Y]
>
> [Link to ticket]"

---

## Example Task Brief

```markdown
---

## Task Brief

**Shaped:** 2024-01-16
**Ticket:** DOOM-47
**Appetite:** Medium

---

### Problem

Customers tracking their driver on passenger links, shuttle links, and the operator app always see a blue driver icon regardless of trip status. This makes it impossible to know at a glance whether the driver is en route, waiting at pickup, or has passengers on board.

---

### Solution

Update the driver icon color on all tracking surfaces to reflect the current dispatch status:

- **OTW (On The Way):** Green
- **On Location:** Yellow
- **POB (Passenger on Board):** Blue (current default)

---

### In Scope

- Passenger tracking links
- Shuttle tracking links
- Operator app dispatch map view
- Real-time updates when status changes

---

### Out of Scope

- Driver app - different codebase, separate ticket
- Historical/completed trips - only live tracking views
- Custom operator color theming - use system colors
- Other dispatch statuses (Accepted, Done, Cancelled) - future enhancement

---

### Design Direction

Use the existing dispatch status color palette from the status badges:

- OTW: Green (#22C55E)
- On Location: Yellow (#EAB308)
- POB: Blue (#3B82F6)

Match the existing vehicle icon style. The icon shape stays the same - only the fill color changes.

**Affected surfaces:**

- `dooms-customer`: Passenger link tracking map
- `dooms-customer`: Shuttle link tracking map
- `dooms-operator`: Dispatch map vehicle markers

---

### Appetite

**Medium** (1-2 days)

This touches multiple surfaces across two repos but the logic is straightforward: read dispatch status, apply corresponding color. No new data required.

---

### Acceptance Criteria

- [ ] Passenger link shows correct icon color for OTW, On Location, POB
- [ ] Shuttle link shows correct icon color for OTW, On Location, POB
- [ ] Operator dispatch map shows correct icon color
- [ ] Icon color updates in real-time when dispatch status changes
- [ ] Works on both mobile and desktop views
- [ ] No regression to other icon functionality

---

### Notes for Developer

The dispatch status is likely already available in the trip/route data used by these components. Check how the existing status badges get their color - we should reuse that mapping.

---
```

---

## Checklist Before Updating Notion

Before finalizing the Task Brief, confirm:

- [ ] Problem is specific (who, what, consequence)
- [ ] Solution is clear but not over-specified
- [ ] In Scope is explicit (no "etc.")
- [ ] Out of Scope is explicit with reasons
- [ ] Design direction is actionable
- [ ] Appetite is justified
- [ ] Acceptance criteria are testable
- [ ] Ready for developer to start building
