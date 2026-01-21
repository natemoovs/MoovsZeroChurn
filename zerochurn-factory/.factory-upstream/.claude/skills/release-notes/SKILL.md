# Release Notes Skill

Write clear, helpful release notes that inform operators about new features, improvements, and fixes.

## Invocation

```
/release-notes
```

## What This Skill Does

1. Gathers information about what shipped (from tickets, PRs, or conversation)
2. Organizes changes by category and impact
3. Writes user-facing release notes in Moovs voice
4. Outputs ready-to-publish content

## Required Knowledge

Before writing, load:
- @knowledge/brand/voice-guidelines.md - Writing style
- @knowledge/product/platform-overview.md - Feature context

## Input Options

### Option 1: From Notion Tickets
"Here are the tickets that shipped this release: DOOM-123, DOOM-124, DOOM-125"

*Skill will fetch ticket details and extract user-facing changes.*

### Option 2: Manual Description
"We shipped flight tracking for airport pickups and fixed a bug where invoices weren't generating for farm-out trips."

### Option 3: From Git/PR
"Here's the list of PRs merged this release: [list]"

*Skill will analyze PR titles/descriptions for user-facing changes.*

## Interview Questions

### 1. Release Scope
"What's the release version or date? (e.g., v2.14.0 or January 2024)"

### 2. Highlight Feature
"Is there a hero feature we should lead with, or is this mostly incremental?"

### 3. Breaking Changes
"Are there any breaking changes or things operators need to do differently?"

### 4. Known Issues
"Any known issues or limitations we should call out?"

## Release Notes Structure

### Title
Format: `Release Notes - [Version or Date]`

### Hero Section (if applicable)
For major releases with a standout feature:
- Feature name as H2
- 2-3 sentence description of what it does
- Screenshot or GIF if available
- Quick "how to use it"

### Categories

Organize changes into these buckets (skip empty categories):

#### New Features
Things operators couldn't do before that they can do now.

#### Improvements
Existing features that now work better, faster, or easier.

#### Fixes
Bugs that were resolved.

#### Under the Hood
Technical changes that don't directly affect operators but might be interesting (performance, infrastructure). Keep brief.

### Entry Format

For each item:
```markdown
**[Feature/Area]: Brief title**
[One sentence explaining what changed and why it matters]
```

**Example:**
```markdown
**Dispatch: Drag-and-drop driver assignment**
You can now drag trips directly onto drivers in the dispatch view instead of clicking through the assignment modal.
```

## Writing Guidelines

### Lead with Benefit
Not: "Added flight tracking integration"
But: "Airport pickups now adjust automatically when flights are delayed"

### Be Specific
Not: "Improved performance"
But: "Dispatch page loads 40% faster for operators with 50+ daily trips"

### Acknowledge Limitations
If a feature has caveats, say so:
"Flight tracking works for US domestic flights. International support coming soon."

### Keep It Scannable
- Short paragraphs
- Bold the feature/area name
- Use consistent formatting

### Skip Internal Details
Operators don't care about:
- Refactored X module
- Updated Y dependency
- Fixed typo in Z

Unless it affects them directly, leave it out.

## Output Format

Save to `/content/release-notes/[version-or-date].md`:

```markdown
---
version: "2.14.0"
release_date: YYYY-MM-DD
hero_feature: "Feature name" (or null)
breaking_changes: true | false
---

# Release Notes - [Version or Date]

[Hero section if applicable]

## New Features

**[Area]: Title**
Description

**[Area]: Title**
Description

## Improvements

**[Area]: Title**
Description

## Fixes

**[Area]: Title**
Description

---

Questions about this release? Reply to this email or reach out to support@moovs.app.
```

## Quality Checklist

Before finalizing:

- [ ] Every entry explains the benefit, not just the change
- [ ] Technical jargon is translated to operator language
- [ ] Breaking changes are clearly highlighted (if any)
- [ ] Known issues are acknowledged (if any)
- [ ] Entries are scannable (bold titles, short descriptions)
- [ ] No internal-only changes included
- [ ] Tone is helpful and clear, not salesy
