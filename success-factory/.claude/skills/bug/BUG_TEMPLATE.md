# Bug Ticket Template

This template defines the structure for bug tickets created by the `/bug` skill.

## Ticket Title Format

**Format:** `Bug: [Clear, searchable description]`

**Good examples:**

- `Bug: Dispatch page shows no trips for operators with 100+ vehicles`
- `Bug: Save button on reservation edit doesn't respond after selecting vehicle`
- `Bug: Driver app crashes when opening trip with no passenger phone`

**Bad examples:**

- `Bug: Not working` (too vague)
- `Bug: Customer can't do the thing they want to do` (not searchable)
- `Bug: Issue reported by John Smith` (doesn't describe the bug)

## Ticket Body Structure

```markdown
## Summary

[One sentence describing what's broken and who it affects]

## Severity

**[Critical/High/Medium/Low]** - [Brief justification]

## Steps to Reproduce

1. [First step - be specific about what to click/enter]
2. [Second step]
3. [Third step]
4. ...

**Starting state:** [Any setup required before step 1]

## Expected Behavior

[What should happen when following the steps above]

## Actual Behavior

[What actually happens - include error messages verbatim if available]

## Evidence

- **Operator ID:** [ID if available]
- **Trip/Reservation ID:** [ID if available]
- **Screenshot:** [Description or link]
- **Error message:** [Exact text if available]
- **Time of occurrence:** [When the customer experienced this]

## Environment

- **Browser/Device:** [Chrome, Safari, iOS app, Android app, etc.]
- **User Role:** [Admin, Dispatcher, Driver, Passenger]
- **Feature Flag State:** [If relevant]

## Technical Context

[What codebase research revealed - relevant files, code paths, related code]

**Likely affected files:**

- `[file path 1]` - [what this file does]
- `[file path 2]` - [what this file does]

**Related code:**

- [Any relevant API endpoints, components, or functions identified]

## Scope

**This IS about:**

- [Specific aspect of the bug]

**This is NOT about:**

- [Related issues that are separate tickets]
- [Feature requests mentioned by customer]

## Reporter

- **Customer:** [Operator name if relevant]
- **Reported via:** [Moovs Chat / Email / Phone]
- **CSM:** [Who submitted this bug report]
- **Date:** [When this was reported]
```

## Example: Completed Bug Ticket

```markdown
## Summary

Reservations with more than 3 stops don't save - the save button spins indefinitely and the reservation is lost.

## Severity

**High** - Customers lose work when creating multi-stop trips. Workaround is to create separate reservations.

## Steps to Reproduce

1. Log in as an operator admin
2. Go to Reservations → Create New
3. Add pickup and dropoff location
4. Click "Add Stop" and add a third stop
5. Click "Add Stop" and add a fourth stop
6. Fill in all required fields (passenger, date, time, vehicle)
7. Click "Save Reservation"

**Starting state:** Any operator account with multi-stop feature enabled

## Expected Behavior

Reservation saves successfully and appears in the reservations list.

## Actual Behavior

Save button shows loading spinner indefinitely. After ~30 seconds, user sees a generic error toast "Something went wrong." Reservation is not saved. Refreshing the page loses all entered data.

## Evidence

- **Operator ID:** 54321
- **Trip/Reservation ID:** N/A (never saved)
- **Screenshot:** Shows save button in loading state with 4 stops visible
- **Error message:** "Something went wrong" toast (no error code)
- **Time of occurrence:** 2026-01-20 2:30pm PST

## Environment

- **Browser/Device:** Chrome 120 on Windows 11
- **User Role:** Operator Admin
- **Feature Flag State:** Multi-stop enabled

## Technical Context

The reservation creation endpoint likely has a validation issue with more than 3 stops.

**Likely affected files:**

- `server/src/reservations/ReservationMutations.ts` - handles reservation creation
- `server/src/reservations/validation.ts` - validates reservation input
- `dooms-operator/src/components/reservations/CreateReservationForm.tsx` - the form component

**Related code:**

- POST `/api/reservations` endpoint
- `validateStops()` function in validation.ts appears to have a hardcoded limit

## Scope

**This IS about:**

- Reservations with 4+ stops failing to save

**This is NOT about:**

- Multi-stop pricing (separate feature)
- Stop reordering UI (works fine)
- Driver app multi-stop display (separate ticket)

## Reporter

- **Customer:** Premier Limo Services
- **Reported via:** Moovs Chat
- **CSM:** Sofia
- **Date:** 2026-01-20
```

## Severity Guidelines

| Severity     | Criteria                                                 | Examples                                                                |
| ------------ | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Critical** | System down, data loss, security breach, payments broken | Can't log in at all, payments not processing, data corruption           |
| **High**     | Major feature completely broken, no workaround           | Can't create reservations, dispatch not loading, driver can't see trips |
| **Medium**   | Feature partially broken, workaround exists              | Export missing some columns, filter doesn't work but can scroll         |
| **Low**      | Minor issue, cosmetic, rare edge case                    | Button slightly misaligned, typo in message, affects <1% of users       |

## Creating the Ticket

Once the bug ticket content is ready, create it in Notion:

```bash
python3 scripts/notion/create-ticket.py \
    --name "Bug: [Title]" \
    --type Bug \
    --priority [High/Medium/Low] \
    --stage "Backlog" \
    --team Eng \
    --body "[Full markdown content]"
```

**Notes:**

- Bugs always get `--type Bug`
- Bugs enter `--stage "Backlog"` (Bug Gatekeeper will review)
- Severity maps to priority: Critical/High → High, Medium → Medium, Low → Low
- Always assign to Eng team

## What NOT to Include

- Customer's personal information beyond what's needed
- Speculation about the cause (unless from codebase research)
- Feature requests the customer mentioned in passing
- Comparison to other software ("Limo Anywhere does this better")
- Emotional language ("this is unacceptable")
