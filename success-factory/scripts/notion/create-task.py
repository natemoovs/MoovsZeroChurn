#!/usr/bin/env python3
"""
Create a task in the Moovs Tasks database.

Usage:
    # Simple task
    python3 create-task.py --name "Review PR #123"

    # Task with details
    python3 create-task.py \\
        --name "Ship shuttle QR codes" \\
        --summary "Implement QR code scanning for shuttle check-in" \\
        --priority High \\
        --due 2026-01-25

    # From markdown file
    python3 create-task.py task.md
"""

import sys
import os
import argparse
import json
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from notion_client import (
    get_notion_token, create_page, markdown_to_blocks,
    DATABASES, TASK_STATUS, TASK_PRIORITY,
    title_property, rich_text_property, select_property, status_property, date_property
)


def parse_markdown_file(file_path: str) -> dict:
    """Parse a markdown file to extract task data."""
    with open(file_path, 'r') as f:
        content = f.read()

    # Extract title from first H1
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else os.path.basename(file_path).replace('.md', '')

    data = {
        "name": title,
        "body": content,
    }

    # Look for metadata patterns
    patterns = {
        "priority": r'\*\*Priority:\*\*\s*(\w+)',
        "status": r'\*\*Status:\*\*\s*([^\n]+)',
        "summary": r'\*\*Summary:\*\*\s*([^\n]+)',
        "due": r'\*\*Due:\*\*\s*(\d{4}-\d{2}-\d{2})',
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            data[key] = match.group(1).strip()

    return data


def create_task(
    name: str,
    summary: str = None,
    priority: str = "Medium",
    status: str = "Not Started",
    due: str = None,
    body: str = None,
) -> dict:
    """Create a task in Moovs Tasks."""
    token = get_notion_token()

    # Build properties
    properties = {
        "Task Name": title_property(name),
        "Status": status_property(status),
    }

    if summary:
        properties["Summary"] = rich_text_property(summary)

    if priority and priority in TASK_PRIORITY:
        properties["Priority"] = select_property(priority)

    if due:
        properties["Due"] = date_property(due)

    # Convert body to blocks
    blocks = None
    if body:
        blocks = markdown_to_blocks(body)

    # Create the page
    result = create_page(token, DATABASES["tasks"], properties, blocks)

    return {
        "status": "success",
        "page_id": result.get("id"),
        "url": result.get("url"),
        "name": name,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Create a task in Moovs Tasks",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Valid options:
  Priority: Low, Medium, High
  Status: Not Started, In Progress, Completed, Done, Archived

Examples:
  %(prog)s --name "Review PR" --priority High
  %(prog)s task.md
        """
    )

    parser.add_argument("file", nargs="?", help="Markdown file with task content")
    parser.add_argument("--name", "-n", help="Task name")
    parser.add_argument("--summary", "-s", help="Task summary")
    parser.add_argument("--priority", "-p", choices=TASK_PRIORITY, default="Medium", help="Priority level")
    parser.add_argument("--status", choices=TASK_STATUS, default="Not Started", help="Task status")
    parser.add_argument("--due", "-d", help="Due date (YYYY-MM-DD)")
    parser.add_argument("--body", "-b", help="Task body (markdown)")
    parser.add_argument("--stdin", action="store_true", help="Read body from stdin")

    args = parser.parse_args()

    if args.file:
        data = parse_markdown_file(args.file)
        # CLI args override
        if args.name:
            data["name"] = args.name
        if args.summary:
            data["summary"] = args.summary
        if args.priority != "Medium":
            data["priority"] = args.priority
        if args.status != "Not Started":
            data["status"] = args.status
        if args.due:
            data["due"] = args.due
        if args.body:
            data["body"] = args.body
    elif args.name:
        data = {
            "name": args.name,
            "summary": args.summary,
            "priority": args.priority,
            "status": args.status,
            "due": args.due,
            "body": args.body,
        }
        if args.stdin:
            data["body"] = sys.stdin.read()
    else:
        parser.error("Either provide a markdown file or use --name")

    print(f"Creating task: {data['name']}...", file=sys.stderr)

    result = create_task(
        name=data["name"],
        summary=data.get("summary"),
        priority=data.get("priority", "Medium"),
        status=data.get("status", "Not Started"),
        due=data.get("due"),
        body=data.get("body"),
    )

    print(f"Created: {result.get('url')}", file=sys.stderr)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
