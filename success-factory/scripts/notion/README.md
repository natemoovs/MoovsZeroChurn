# Notion Scripts

Direct API scripts for writing to Notion databases. These bypass the MCP tool's limitations for reliable page creation with structured properties and markdown content.

## Setup

Scripts read the Notion token automatically from `~/.claude.json` (same token used by the Notion MCP server).

## Scripts

### create-ticket.py

Create DOOM tickets in the Moovs Tickets database.

```bash
# From markdown file
python3 scripts/notion/create-ticket.py ticket.md

# With arguments
python3 scripts/notion/create-ticket.py \
    --name "Fix login bug" \
    --priority High \
    --stage "Ready for dev" \
    --type Bug \
    --team Eng \
    --body "## Problem\n\nUsers can't log in..."
```

**Options:**

- `--name`, `-n`: Ticket name (required)
- `--summary`, `-s`: Short summary
- `--priority`, `-p`: Low, Medium, High (default: Medium)
- `--stage`: Not started, Problem Validation, Product Design / Work, UI Design, Ready for dev, Eng Design, In Development, QA, Code Review, Deployed / Done, Blocked, Backlog (default: Ingestion)
- `--type`: Bug, Feature, Issue, Insight, Request, Enterprise, Product, Module
- `--team`: Pocketflows, Prod, Eng, Ensemble, Layer, Leadership, Support
- `--due-date`: YYYY-MM-DD format
- `--operator-id`: Customer operator ID if related
- `--body`, `-b`: Markdown content for page body
- `--stdin`: Read body from stdin

### create-task.py

Create tasks in the Moovs Tasks database.

```bash
python3 scripts/notion/create-task.py \
    --name "Review shuttle PR" \
    --priority High \
    --due 2026-01-25
```

**Options:**

- `--name`, `-n`: Task name (required)
- `--summary`, `-s`: Task summary
- `--priority`, `-p`: Low, Medium, High (default: Medium)
- `--status`: Not Started, In Progress, Completed, Done, Archived (default: Not Started)
- `--due`, `-d`: Due date (YYYY-MM-DD)
- `--body`, `-b`: Markdown content
- `--stdin`: Read body from stdin

### create-document.py

Create documents in the Moovs Documents database.

```bash
python3 scripts/notion/create-document.py \
    --name "Q1 OKRs" \
    --category Project \
    --team Product
```

**Options:**

- `--name`, `-n`: Document name (required)
- `--status`, `-s`: Open, Urgent, Archived, Done, Launched, Implementation (default: Open)
- `--category`, `-c`: Project, Research, Marketing, ICP, Process, etc.
- `--team`, `-t`: Product, Moovs, Marketing, Growth, etc.
- `--type`: Feature, Bug, Issue, Insight, Enterprise, etc.
- `--body`, `-b`: Markdown content
- `--stdin`: Read body from stdin

### create-page.py

Create a page under a parent page (not in a database).

```bash
python3 scripts/notion/create-page.py \
    --parent <page_id> \
    --name "Design Brief" \
    --body "## Context\n\nDetails here..."
```

**Options:**

- `--parent`, `-p`: Parent page ID (required)
- `--name`, `-n`: Page title (required)
- `--body`, `-b`: Markdown content
- `--stdin`: Read body from stdin

## Database IDs

| Database             | ID                                     |
| -------------------- | -------------------------------------- |
| Moovs Tickets (DOOM) | `13b8aeaa-3759-80f8-8d7c-dd2f627d2578` |
| Moovs Tasks          | `739c0084-7ce2-4e58-a7c2-f205d5910567` |
| Documents            | `c6e840ca-0c08-4565-99ef-ec7b2dfa6789` |
| Problem Docs         | `2e88aeaa-3759-8063-ae62-e4005676ae46` |
| Mooving Board        | `2d98aeaa-3759-807f-955f-e439615a02d4` |

## Markdown Support

The scripts convert markdown to Notion blocks:

- Headings (H1-H4)
- Bold (`**text**`), italic (`*text*`), code (`` `text` ``)
- Bullet lists (`- item`)
- Numbered lists (`1. item`)
- Checkboxes (`- [ ] todo`, `- [x] done`)
- Blockquotes (`> quote`)
- Code blocks (```language)
- Horizontal rules (`---`)
- Tables (rendered as code blocks)

## Using from Claude Code

These scripts are callable from Claude Code sessions:

```bash
# Create a ticket
python3 scripts/notion/create-ticket.py --name "Bug: Payment failing" --type Bug --priority High

# Create from a markdown file generated in the session
python3 scripts/notion/create-ticket.py shaping/some-feature.md
```

The scripts output JSON with the created page ID and URL.
