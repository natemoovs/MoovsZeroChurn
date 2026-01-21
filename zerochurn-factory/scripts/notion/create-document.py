#!/usr/bin/env python3
"""
Create a document in the Moovs Documents database.

Usage:
    # From markdown file
    python3 create-document.py document.md

    # With inline arguments
    python3 create-document.py --name "Q1 OKRs" --category Project --team Product

    # Full example with body
    python3 create-document.py \\
        --name "Shuttle Platform Spec" \\
        --category Project \\
        --team Product \\
        --status Open \\
        --body "## Overview\\n\\nThis document outlines..."
"""

import sys
import os
import argparse
import json
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from notion_client import (
    get_notion_token, create_page, markdown_to_blocks,
    DATABASES, title_property, select_property, multi_select_property
)

# Valid options for Documents
DOC_STATUS = ["Open", "Urgent", "Archived", "Done", "Launched", "Implementation"]
DOC_CATEGORY = [
    "Category 1", "Outreach", "Project", "Research", "Competitor Analysis",
    "Moovs Training", "Marketing", "ICP", "Process", "Swoop Sales"
]
DOC_TEAM = [
    "Accounting", "Product", "Fundraising", "People", "Moovs Marketing",
    "Swoop Marketplace", "Marketing", "Moovs Sales", "Moovs", "Growth", "Swop Inc"
]
DOC_TYPE = [
    "Bug", "Insight", "Feature", "Issue", "Enterprise", "Product",
    "CRM", "Passenger App", "Request", "Module", "Swoop", "Bookkeeping"
]


def parse_markdown_file(file_path: str) -> dict:
    """Parse a markdown file to extract document data."""
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
        "status": r'\*\*Status:\*\*\s*(\w+)',
        "category": r'\*\*Category:\*\*\s*([^\n]+)',
        "team": r'\*\*Team:\*\*\s*([^\n]+)',
        "type": r'\*\*Type:\*\*\s*(\w+)',
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            data[key] = match.group(1).strip()

    return data


def create_document(
    name: str,
    status: str = "Open",
    category: str = None,
    team: str = None,
    type_: str = None,
    body: str = None,
) -> dict:
    """Create a document in Moovs Documents."""
    token = get_notion_token()

    # Build properties
    properties = {
        "Name": title_property(name),
    }

    if status and status in DOC_STATUS:
        properties["Status"] = select_property(status)

    if category and category in DOC_CATEGORY:
        properties["Category"] = select_property(category)

    if team and team in DOC_TEAM:
        properties["Team"] = select_property(team)

    if type_ and type_ in DOC_TYPE:
        properties["Type"] = multi_select_property([type_])

    # Convert body to blocks
    blocks = None
    if body:
        blocks = markdown_to_blocks(body)

    # Create the page
    result = create_page(token, DATABASES["documents"], properties, blocks)

    return {
        "status": "success",
        "page_id": result.get("id"),
        "url": result.get("url"),
        "name": name,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Create a document in Moovs Documents",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Valid options:
  Status: Open, Urgent, Archived, Done, Launched, Implementation
  Category: Project, Research, Marketing, ICP, Process, Outreach, etc.
  Team: Product, Moovs, Marketing, Growth, etc.
  Type: Feature, Bug, Issue, Insight, Enterprise, etc.

Examples:
  %(prog)s document.md
  %(prog)s --name "Q1 OKRs" --category Project --team Product
        """
    )

    parser.add_argument("file", nargs="?", help="Markdown file with document content")
    parser.add_argument("--name", "-n", help="Document name")
    parser.add_argument("--status", "-s", choices=DOC_STATUS, default="Open", help="Document status")
    parser.add_argument("--category", "-c", choices=DOC_CATEGORY, help="Document category")
    parser.add_argument("--team", "-t", choices=DOC_TEAM, help="Team")
    parser.add_argument("--type", dest="type_", choices=DOC_TYPE, help="Document type")
    parser.add_argument("--body", "-b", help="Document body (markdown)")
    parser.add_argument("--stdin", action="store_true", help="Read body from stdin")

    args = parser.parse_args()

    if args.file:
        data = parse_markdown_file(args.file)
        # CLI args override
        if args.name:
            data["name"] = args.name
        if args.status != "Open":
            data["status"] = args.status
        if args.category:
            data["category"] = args.category
        if args.team:
            data["team"] = args.team
        if args.type_:
            data["type"] = args.type_
        if args.body:
            data["body"] = args.body
    elif args.name:
        data = {
            "name": args.name,
            "status": args.status,
            "category": args.category,
            "team": args.team,
            "type": args.type_,
            "body": args.body,
        }
        if args.stdin:
            data["body"] = sys.stdin.read()
    else:
        parser.error("Either provide a markdown file or use --name")

    print(f"Creating document: {data['name']}...", file=sys.stderr)

    result = create_document(
        name=data["name"],
        status=data.get("status", "Open"),
        category=data.get("category"),
        team=data.get("team"),
        type_=data.get("type"),
        body=data.get("body"),
    )

    print(f"Created: {result.get('url')}", file=sys.stderr)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
