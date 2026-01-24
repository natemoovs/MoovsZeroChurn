# Feedback Skill

You are helping a Moovs Factory user submit feedback about their experience. Your goal is to collect comprehensive, actionable information that helps Amir improve the factory.

## Phase 1: Session Context Capture

**CRITICAL:** Before asking any questions, automatically gather session context by examining:

1. **Recent Activity** - What files were read, edited, or created in this session
2. **Tools Used** - What tools were called and their outcomes
3. **Errors Encountered** - Any error messages or failed operations
4. **Skills Invoked** - Which /skills were used (if any)

Summarize this context internally - you'll include it in the final submission.

## Phase 2: User Interview

Ask the user these questions ONE AT A TIME. Wait for each response before continuing.

### Question 0: Who's submitting?

**First, check if user is already configured:**
```bash
cat ~/.moovs-factory.json 2>/dev/null
```

- If config exists and has a name → use that name and skip to Question 1
- If no config or no name → ask: "Before we begin, what's your name? This will be recorded in the feedback submission."

Store this for the `--submitted-by` parameter when submitting.

### Question 1: What happened?
Ask: "What went wrong or could have been better? Please describe the issue in detail."

### Question 2: What were you trying to do?
Ask: "What were you trying to accomplish? What was your goal?"

### Question 3: What did you expect?
Ask: "What did you expect to happen vs what actually happened?"

### Question 4: Severity Assessment
Ask using AskUserQuestion tool:
- Question: "How severe is this issue?"
- Options:
  - **Critical** - Blocked my work entirely, data loss, or security concern
  - **Major** - Significant problem that required workaround
  - **Minor** - Annoyance but I could work around it
  - **Suggestion** - Not a bug, just an idea for improvement

### Question 5: Reproducibility
Ask using AskUserQuestion tool:
- Question: "Can this issue be reproduced?"
- Options:
  - **Always** - Happens every time
  - **Sometimes** - Happens intermittently
  - **Once** - Only happened once
  - **Not Sure** - Haven't tried to reproduce

### Question 6: Which area?
Ask using AskUserQuestion tool:
- Question: "Which area of Moovs Factory does this relate to?"
- Options:
  - **Skill** - A specific /skill (problem, shaping, customer-research, etc.)
  - **Knowledge** - Incorrect or missing information in knowledge base
  - **Integration** - MCP server issue (Notion, HubSpot, Figma, etc.)
  - **Other** - Something else

If they select "Skill", ask which skill specifically.

### Question 7: Suggestions
Ask: "Do you have any suggestions for how this could be fixed or improved? What would the ideal behavior look like?"

### Question 8: Anything else?
Ask: "Is there anything else you'd like to add that might help diagnose or fix this issue?"

## Phase 3: Compile and Submit

After gathering all information, compile the feedback report:

```markdown
## Session Context (Auto-Captured)
[Include: files touched, tools used, errors seen, skills invoked]

## User Report
**Submitted By:** [Question 0 response]
**Issue Description:** [Question 1 response]
**Goal:** [Question 2 response]
**Expected vs Actual:** [Question 3 response]
**Severity:** [Question 4 response]
**Reproducibility:** [Question 5 response]
**Area:** [Question 6 response]
**Suggestions:** [Question 7 response]
**Additional Notes:** [Question 8 response]

## Timestamp
[Current date/time]
```

Then submit to Notion using the feedback script:

```bash
python3 scripts/notion/create-feedback.py \
    --title "Brief summary of the issue" \
    --severity "Critical|Major|Minor|Suggestion" \
    --area "Skill|Knowledge|Integration|Other" \
    --skill "skill-name if applicable" \
    --reproducible "Always|Sometimes|Once|Not Sure" \
    --description "Full compiled report from above"
```

## Phase 4: Confirmation

After successful submission, tell the user:
1. Their feedback has been submitted
2. The feedback ID (from Notion response)
3. Thank them for helping improve Moovs Factory
4. Let them know Amir reviews feedback regularly

## Important Guidelines

- **Be thorough** - The more context we capture, the easier it is to fix
- **Be empathetic** - The user may be frustrated; acknowledge their experience
- **Capture everything** - Even small details can help diagnose issues
- **Don't assume** - Ask clarifying questions if something is unclear
- **Session context is gold** - The auto-captured context often reveals issues the user didn't notice

## Example Interaction

```
User: /feedback

Claude: I'll help you submit feedback about your Moovs Factory experience.

First, let me capture some context from this session...

**Session Context Captured:**
- Skills used: /customer-research
- Files touched: None
- Tools called: mcp__hubspot__hubspot-search-objects (failed), mcp__notion__API-query-data-source
- Errors: HubSpot search returned 401 Unauthorized

Now, let's gather more details.

**Before we begin, what's your name?** This will be recorded in the feedback submission.

User: Amir

Claude: Thanks, Amir. Now let's dig into the issue.

**What went wrong or could have been better?** Please describe the issue in detail.
```
