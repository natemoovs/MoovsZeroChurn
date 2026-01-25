---
name: bug
description: Creates well-structured bug tickets from raw customer complaints. Use when CSM has a bug report from chat, email, or phone. Interviews CSM to extract reproducible details, searches codebase for technical context, checks for duplicates, and creates an actionable ticket in Notion.
---

# Bug Ticket Skill

This skill transforms **raw customer complaints** into **actionable bug tickets** that engineers can pick up and fix without additional discovery.

## Two Modes

| Mode        | Invocation                             | What It Does                                       |
| ----------- | -------------------------------------- | -------------------------------------------------- |
| **Create**  | `/bug`                                 | Interview CSM, create new bug ticket               |
| **Enhance** | `/bug DOOM-XXX` or `/bug <notion-url>` | Fetch existing ticket, fill gaps, update in Notion |

## The Problem We're Solving

Today's bug flow:

```
Customer complains to CSM
    ↓
CSM creates ticket with whatever they heard
    ↓
Engineer picks up ticket
    ↓
Engineer spends 30+ minutes figuring out what the bug actually is
    ↓
Engineer may still not be able to reproduce
```

With this skill:

```
Customer complains to CSM
    ↓
CSM runs /bug (or /bug DOOM-XXX to enhance existing)
    ↓
Skill interviews CSM, searches codebase, checks duplicates
    ↓
Well-structured ticket created/updated in Notion
    ↓
Engineer picks up ticket and starts fixing immediately
```

## When to Use This Skill

**Use `/bug` (create mode) when:**

- CSM receives a new bug report via Moovs Chat, email, or phone
- Customer reports something isn't working as expected
- Support notices a pattern of complaints about the same issue

**Use `/bug DOOM-XXX` (enhance mode) when:**

- A rough bug ticket already exists but lacks detail
- An AI-generated ticket needs human validation and context
- A ticket was created quickly and needs to be made actionable

**Don't use this for:**

- Feature requests (use `/problem` instead)
- Ideas or enhancements (use `/problem` instead)
- Task clarification for non-bugs (use `/ticket-shaping` instead)

---

## Mode 1: Create New Bug Ticket

### Philosophy: Classify Before Creating

Not every customer complaint is a bug. Before creating a ticket, this skill classifies:

| Classification       | What It Is                         | Action                           |
| -------------------- | ---------------------------------- | -------------------------------- |
| **Bug**              | Platform not working as designed   | Create bug ticket                |
| **User Error**       | Customer using feature incorrectly | Explain correct usage, no ticket |
| **Feature Request**  | Customer wants something new       | Redirect to `/problem`           |
| **Duplicate**        | Already reported                   | Link to existing ticket          |
| **Cannot Reproduce** | Can't verify the issue             | Ask for more info or close       |

**Most "bugs" are user error.** The interview process helps distinguish real bugs from confusion.

### Create Mode Process

1. **Gather initial complaint** - What did the customer report?
2. **Interview CSM** - Extract repro steps, context, and evidence (5-8 questions)
3. **Search codebase** - Find relevant code, understand current behavior
4. **Check duplicates** - Query existing bug tickets
5. **Classify** - Bug, user error, feature request, or cannot reproduce
6. **Create ticket** - If it's a real bug, create actionable ticket in Notion

### Starting Create Mode

When the user invokes `/bug` (no arguments):

1. Ask: "What did the customer report? Include as much detail as you have - what they said, when it happened, and any context."

2. Based on their response, begin the forensic interview

3. After sufficient information (usually 5-8 questions), search the codebase

4. Check for duplicates in existing tickets

5. Classify: Bug, user error, feature request, or cannot reproduce

6. If it's a real bug:
   - Generate the bug ticket content using [BUG_TEMPLATE.md](BUG_TEMPLATE.md)
   - Create the ticket in Notion using the script
   - Share the Notion URL with the CSM

7. If it's NOT a bug:
   - Explain why (user error, feature request, duplicate, cannot reproduce)
   - Suggest next steps (correct usage, redirect to /problem, link to existing ticket)

---

## Mode 2: Enhance Existing Ticket

### Philosophy: Fill Gaps, Don't Start Over

When a ticket already exists, don't re-do all the work. Analyze what's there, identify what's missing, and fill the gaps.

### Enhance Mode Process

1. **Fetch the ticket** from Notion using the ID or URL
2. **Analyze what's there** - What's already documented?
3. **Identify gaps** - What's missing for an engineer to act on it?
4. **Interview for gaps only** - Ask targeted questions (3-5 max)
5. **Search codebase** - Add technical context if missing
6. **Update the ticket** - Append structured bug report to existing content

### Starting Enhance Mode

When the user invokes `/bug DOOM-XXX` or `/bug <notion-url>`:

1. **Fetch the ticket** using `mcp__notion__API-retrieve-a-page` and `mcp__notion__API-get-block-children`

2. **Summarize the current state:**

   > "I've pulled up **DOOM-XXX: [Title]**. Here's what I found:
   >
   > **Has:** [What's documented]
   > **Missing:** [What's needed]
   >
   > Let me ask a few questions to fill the gaps..."

3. **Ask only what's missing** - Don't re-ask things already in the ticket

4. **Search codebase** for technical context if not present

5. **Update the ticket** by appending the structured bug report

### What to Look For in Existing Tickets

| Check                      | If Missing                                   |
| -------------------------- | -------------------------------------------- |
| Steps to reproduce         | Ask "What steps did the customer take?"      |
| Expected behavior          | Ask "What should have happened?"             |
| Actual behavior            | Ask "What actually happened?"                |
| Evidence (screenshot, IDs) | Ask "Do you have operator ID or screenshot?" |
| Environment                | Ask "What browser/device/role?"              |
| Technical context          | Search codebase and add                      |

### Updating Existing Tickets

Use the Notion MCP tools to update:

```
1. Fetch page: mcp__notion__API-retrieve-a-page (get properties)
2. Fetch content: mcp__notion__API-get-block-children (get existing body)
3. Append content: mcp__notion__API-patch-block-children (add structured report)
4. Update properties: mcp__notion__API-patch-page (update Type, Priority, Stage if needed)
```

**Append format:**

```markdown
---
## Bug Report (Enhanced [Date])

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
...

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Evidence
- **Operator ID:** [ID]
- **Screenshot:** [Description]
- **Error message:** [Text]

### Technical Context
[Codebase research findings]

**Likely affected files:**
- `[file path]` - [description]

### Environment
- **Browser/Device:** [Info]
- **User Role:** [Role]
---
```

**Property updates:**

- Set `Type` to include `Bug` if not already
- Set `Stage` to `Backlog` if currently `Ingestion` or `Not started`
- Set `Priority` based on severity assessment

---

## The Interview Process

Unlike `/problem` (which explores pain deeply) or `/shaping` (which designs solutions), the bug interview is **forensic** - extracting facts needed to reproduce.

See [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) for the complete question framework.

### Interview Rules

1. **Ask ONE question at a time** - Never batch questions
2. **Get specifics, not generalities** - "What did they click?" not "What were they doing?"
3. **Demand evidence** - Screenshots, operator IDs, error messages
4. **Challenge vague reports** - "It's broken" is not a bug report
5. **5-8 questions for create mode, 3-5 for enhance mode**

### What Makes a Bug Actionable

An engineer needs exactly these things to fix a bug:

| Required               | Why                                       |
| ---------------------- | ----------------------------------------- |
| **Steps to reproduce** | Exact sequence of actions                 |
| **Expected behavior**  | What should have happened                 |
| **Actual behavior**    | What actually happened                    |
| **Evidence**           | Screenshot, error message, or operator ID |
| **Environment**        | Browser, device, user role                |

If the CSM can't provide these after the interview, the ticket shouldn't be created/enhanced.

### Interview Phases

#### Phase 1: The Report (2 questions) - Skip in enhance mode if present

- What exactly did the customer say? (Direct quote if possible)
- When did this happen? (Timestamp helps find logs)

#### Phase 2: The Reproduction (3-4 questions)

- What was the customer trying to do? (The goal)
- What steps did they take? (The sequence)
- What did they expect to happen?
- What actually happened instead?

#### Phase 3: The Evidence (2 questions)

- Do you have the operator ID or trip ID?
- Is there a screenshot, error message, or recording?

## Codebase Research

**Before classifying or creating/updating, search the codebase to understand:**

| Repo                    | Path                                          | What to Look For                              |
| ----------------------- | --------------------------------------------- | --------------------------------------------- |
| **server**              | `/Users/amirghorbani/Dev/server`              | API endpoints, business logic, error handling |
| **dooms-operator**      | `/Users/amirghorbani/Dev/dooms-operator`      | UI components, form validation, user flows    |
| **dooms-customer**      | `/Users/amirghorbani/Dev/dooms-customer`      | Customer-facing features                      |
| **dooms-native-driver** | `/Users/amirghorbani/Dev/dooms-native-driver` | Mobile app code                               |

**Research goals:**

1. Understand the current expected behavior (is it actually a bug or working as designed?)
2. Find the relevant code paths that would be affected
3. Identify if there are known edge cases or limitations
4. Add technical context to the ticket so engineers know where to start

## Duplicate Check

Before creating a new ticket (or if enhancing and suspicious), query existing bugs:

```
/tickets type:bug search:<keywords from complaint>
```

If a duplicate exists:

- In create mode: Don't create new ticket, link to existing
- In enhance mode: Consider merging information, flag as potential duplicate

## Severity Classification

| Severity     | Definition                                         | Examples                                        | Priority |
| ------------ | -------------------------------------------------- | ----------------------------------------------- | -------- |
| **Critical** | System down, data loss, security, payments broken  | Can't process payments, data corruption         | High     |
| **High**     | Major feature broken, significant workflow blocked | Can't create reservations, dispatch not working | High     |
| **Medium**   | Feature partially broken, workaround exists        | Export missing columns, filter not working      | Medium   |
| **Low**      | Minor issue, cosmetic, edge case                   | UI alignment, typo, rare edge case              | Low      |

**Critical and High bugs should be escalated immediately, not wait for cooldown.**

## Output: The Bug Ticket

After the interview and research, generate a bug ticket following the template in [BUG_TEMPLATE.md](BUG_TEMPLATE.md).

The ticket includes:

1. **Title** - Clear, searchable description
2. **Severity** - Critical, High, Medium, Low
3. **Steps to Reproduce** - Exact sequence
4. **Expected vs Actual** - What should happen vs what does happen
5. **Evidence** - Screenshots, operator IDs, error messages
6. **Technical Context** - Relevant code paths from codebase research
7. **Environment** - Browser, device, user role

## Creating New Tickets in Notion

Use the create-ticket script:

```bash
python3 scripts/notion/create-ticket.py \
    --name "Bug: [Clear description]" \
    --type Bug \
    --priority [High/Medium/Low] \
    --stage "Backlog" \
    --body "[Formatted bug report]"
```

**Note:** Bugs enter the "Backlog" stage. The Bug Gatekeeper will review and prioritize them for the next cooldown.

## Quality Gates

A bug ticket should NOT be created or marked as ready if:

- [ ] Steps to reproduce are vague or missing
- [ ] No evidence provided (no screenshot, no operator ID, no error message)
- [ ] It's actually a feature request disguised as a bug
- [ ] It's user error (customer using the feature incorrectly)
- [ ] It's a duplicate of an existing ticket
- [ ] Codebase research shows it's working as designed

**It's better to reject a bad bug report than to create an unactionable ticket.**

## Reference

- [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) - Question framework for CSM interview
- [BUG_TEMPLATE.md](BUG_TEMPLATE.md) - Output template for bug tickets
