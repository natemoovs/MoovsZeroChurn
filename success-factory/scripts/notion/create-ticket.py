#!/usr/bin/env python3
"""
Create a DOOM ticket in the Moovs Tickets database.

Usage:
    # From a markdown file
    python3 create-ticket.py ticket.md

    # With inline arguments
    python3 create-ticket.py --name "Fix login bug" --priority High --stage "Ready for dev" --type Bug

    # With content from stdin
    echo "Bug details here" | python3 create-ticket.py --name "Fix login bug" --stdin

    # Full example
    python3 create-ticket.py \\
        --name "Implement auto-scheduler" \\
        --summary "AI-powered driver scheduling" \\
        --priority High \\
        --stage "In Development" \\
        --type Feature \\
        --team Eng \\
        --body "## Requirements\\n- Schedule drivers automatically\\n- Prevent overtime"
"""

import sys
import os
import argparse
import json
import re

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from notion_client import (
    get_notion_token, create_page, markdown_to_blocks,
    DATABASES, TICKET_STATUS, TICKET_PRIORITY, TICKET_STAGE, TICKET_TYPE, TICKET_TEAM,
    title_property, rich_text_property, select_property, multi_select_property,
    status_property, date_property
)


def parse_markdown_file(file_path: str) -> dict:
    """Parse a markdown file to extract ticket data."""
    with open(file_path, 'r') as f:
        content = f.read()

    # Extract title from first H1
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else os.path.basename(file_path).replace('.md', '')

    # Extract metadata from YAML-like header or inline markers
    data = {
        "name": title,
        "body": content,
    }

    # Look for metadata patterns like **Priority:** High
    patterns = {
        "priority": r'\*\*Priority:\*\*\s*(\w+)',
        "stage": r'\*\*Stage:\*\*\s*([^\n]+)',
        "type": r'\*\*Type:\*\*\s*(\w+)',
        "team": r'\*\*Team:\*\*\s*(\w+)',
        "summary": r'\*\*Summary:\*\*\s*([^\n]+)',
        "due_date": r'\*\*Due Date:\*\*\s*(\d{4}-\d{2}-\d{2})',
        "operator_id": r'\*\*Operator ID:\*\*\s*([^\n]+)',
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            data[key] = match.group(1).strip()

    return data


def create_ticket(
    name: str,
    summary: str = None,
    priority: str = "Medium",
    stage: str = "Ingestion",
    type_: str = None,
    team: str = None,
    due_date: str = None,
    operator_id: str = None,
    body: str = None,
) -> dict:
    """Create a DOOM ticket."""
    token = get_notion_token()

    # Build properties
    properties = {
        "Name": title_property(name),
        "Status": status_property("Ingestion"),
    }

    if summary:
        properties["Summary"] = rich_text_property(summary)

    if priority and priority in TICKET_PRIORITY:
        properties["Priority"] = select_property(priority)

    if stage and stage in TICKET_STAGE:
        properties["Stage"] = multi_select_property([stage])

    if type_ and type_ in TICKET_TYPE:
        properties["Type"] = multi_select_property([type_])

    if team and team in TICKET_TEAM:
        properties["Team"] = multi_select_property([team])

    if due_date:
        properties["Due Date"] = date_property(due_date)

    if operator_id:
        properties["operator_id"] = rich_text_property(operator_id)

    # Convert body to blocks
    blocks = None
    if body:
        blocks = markdown_to_blocks(body)

    # Create the page
    result = create_page(token, DATABASES["tickets"], properties, blocks)

    return {
        "status": "success",
        "page_id": result.get("id"),
        "url": result.get("url"),
        "name": name,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Create a DOOM ticket in Notion",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Valid options:
  Priority: Low, Medium, High
  Stage: Not started, Problem Validation, Product Design / Work, UI Design,
         Ready for dev, Eng Design, In Development, QA, Code Review,
         Deployed / Done, Blocked, Backlog
  Type: Bug, Feature, Issue, Insight, Request, Enterprise, Product, Module
  Team: Pocketflows, Prod, Eng, Ensemble, Layer, Leadership, Support

Examples:
  %(prog)s ticket.md
  %(prog)s --name "Fix bug" --priority High --type Bug
  echo "Details" | %(prog)s --name "Fix bug" --stdin
        """
    )

    parser.add_argument("file", nargs="?", help="Markdown file with ticket content")
    parser.add_argument("--name", "-n", help="Ticket name/title")
    parser.add_argument("--summary", "-s", help="Short summary")
    parser.add_argument("--priority", "-p", choices=TICKET_PRIORITY, default="Medium", help="Priority level")
    parser.add_argument("--stage", choices=TICKET_STAGE, default="Ingestion", help="Development stage")
    parser.add_argument("--type", dest="type_", choices=TICKET_TYPE, help="Ticket type")
    parser.add_argument("--team", choices=TICKET_TEAM, help="Team assignment")
    parser.add_argument("--due-date", help="Due date (YYYY-MM-DD)")
    parser.add_argument("--operator-id", help="Operator ID if related to specific customer")
    parser.add_argument("--body", "-b", help="Ticket body content (markdown)")
    parser.add_argument("--stdin", action="store_true", help="Read body from stdin")

    args = parser.parse_args()

    # Determine source of ticket data
    if args.file:
        # Parse from markdown file
        data = parse_markdown_file(args.file)
        # CLI args override file data
        if args.name:
            data["name"] = args.name
        if args.summary:
            data["summary"] = args.summary
        if args.priority != "Medium":
            data["priority"] = args.priority
        if args.stage != "Ingestion":
            data["stage"] = args.stage
        if args.type_:
            data["type"] = args.type_
        if args.team:
            data["team"] = args.team
        if args.due_date:
            data["due_date"] = args.due_date
        if args.operator_id:
            data["operator_id"] = args.operator_id
        if args.body:
            data["body"] = args.body
    elif args.name:
        # Build from CLI args
        data = {
            "name": args.name,
            "summary": args.summary,
            "priority": args.priority,
            "stage": args.stage,
            "type": args.type_,
            "team": args.team,
            "due_date": args.due_date,
            "operator_id": args.operator_id,
            "body": args.body,
        }
        if args.stdin:
            data["body"] = sys.stdin.read()
    else:
        parser.error("Either provide a markdown file or use --name")

    # Create the ticket
    print(f"Creating ticket: {data['name']}...", file=sys.stderr)

    result = create_ticket(
        name=data["name"],
        summary=data.get("summary"),
        priority=data.get("priority", "Medium"),
        stage=data.get("stage", "Ingestion"),
        type_=data.get("type"),
        team=data.get("team"),
        due_date=data.get("due_date"),
        operator_id=data.get("operator_id"),
        body=data.get("body"),
    )

    print(f"Created: {result.get('url')}", file=sys.stderr)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
