#!/usr/bin/env python3
"""
Create a page under a parent page in Notion.

Usage:
    # Create a page under a specific parent
    python3 create-page.py --parent <page_id> --name "My Page"

    # From markdown file
    python3 create-page.py --parent <page_id> document.md

    # With body content
    python3 create-page.py --parent <page_id> --name "Design Brief" --body "## Context\\n\\nDetails..."
"""

import sys
import os
import argparse
import json
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from notion_client import (
    get_notion_token, notion_request, markdown_to_blocks, title_property
)


def parse_markdown_file(file_path: str) -> dict:
    """Parse a markdown file to extract page data."""
    with open(file_path, 'r') as f:
        content = f.read()

    # Extract title from first H1
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else os.path.basename(file_path).replace('.md', '')

    return {
        "name": title,
        "body": content,
    }


def create_page(
    parent_id: str,
    name: str,
    body: str = None,
) -> dict:
    """Create a page under a parent page."""
    token = get_notion_token()

    # Build page data
    page_data = {
        "parent": {"page_id": parent_id},
        "properties": {
            "title": title_property(name)["title"]  # Page title format is different
        }
    }

    # Convert body to blocks
    if body:
        blocks = markdown_to_blocks(body)
        page_data["children"] = blocks[:100]

    # Create the page
    result = notion_request("POST", "/pages", token, page_data)

    # If there are more blocks, append them
    if body:
        blocks = markdown_to_blocks(body)
        if len(blocks) > 100:
            page_id = result["id"]
            for i in range(100, len(blocks), 100):
                batch = blocks[i:i+100]
                notion_request("PATCH", f"/blocks/{page_id}/children", token, {"children": batch})

    return {
        "status": "success",
        "page_id": result.get("id"),
        "url": result.get("url"),
        "name": name,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Create a page under a parent page in Notion",
        epilog="""
Examples:
  %(prog)s --parent abc123 --name "My Page"
  %(prog)s --parent abc123 document.md
  echo "Content" | %(prog)s --parent abc123 --name "Page" --stdin
        """
    )

    parser.add_argument("file", nargs="?", help="Markdown file with page content")
    parser.add_argument("--parent", "-p", required=True, help="Parent page ID")
    parser.add_argument("--name", "-n", help="Page name/title")
    parser.add_argument("--body", "-b", help="Page body (markdown)")
    parser.add_argument("--stdin", action="store_true", help="Read body from stdin")

    args = parser.parse_args()

    if args.file:
        data = parse_markdown_file(args.file)
        if args.name:
            data["name"] = args.name
        if args.body:
            data["body"] = args.body
    elif args.name:
        data = {
            "name": args.name,
            "body": args.body,
        }
        if args.stdin:
            data["body"] = sys.stdin.read()
    else:
        parser.error("Either provide a markdown file or use --name")

    print(f"Creating page: {data['name']}...", file=sys.stderr)

    result = create_page(
        parent_id=args.parent,
        name=data["name"],
        body=data.get("body"),
    )

    print(f"Created: {result.get('url')}", file=sys.stderr)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
