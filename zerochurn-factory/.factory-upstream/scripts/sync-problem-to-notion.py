#!/usr/bin/env python3
"""
Sync a problem.md file to Notion Problem Docs database.

Usage: python3 sync-problem-to-notion.py <path-to-problem.md>

This script:
1. Parses the problem.md file to extract title and metadata
2. Checks if a page with the same title already exists in Notion
3. Creates a new page or updates the existing one
4. Syncs the markdown content as Notion blocks
"""

import sys
import os
import re
import json
import subprocess
import urllib.request
import urllib.error
from typing import Optional, Dict, List, Any

# Notion database ID for Problem Docs
PROBLEM_DOCS_DATABASE_ID = "2e88aeaa-3759-8063-ae62-e4005676ae46"


def get_notion_token():
    """Get Notion token from Claude config."""
    config_path = os.path.expanduser("~/.claude.json")
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        headers_str = config.get("mcpServers", {}).get("notion", {}).get("env", {}).get("OPENAPI_MCP_HEADERS", "{}")
        headers = json.loads(headers_str)
        auth = headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth[7:]
    except Exception as e:
        print(f"Warning: Could not read Notion token from claude config: {e}", file=sys.stderr)
    return None


def notion_request(method: str, endpoint: str, token: str, data: dict = None) -> dict:
    """Make a request to the Notion API."""
    url = f"https://api.notion.com/v1{endpoint}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }

    req = urllib.request.Request(url, method=method, headers=headers)
    if data:
        req.data = json.dumps(data).encode('utf-8')

    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"Notion API error: {e.code} - {error_body}", file=sys.stderr)
        raise


def parse_problem_md(file_path: str) -> dict:
    """Parse a problem.md file and extract structured data."""
    with open(file_path, 'r') as f:
        content = f.read()

    # Extract title from first H1
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else os.path.basename(file_path)

    # Extract captured date
    date_match = re.search(r'\*\*Captured:\*\*\s*(\d{4}-\d{2}-\d{2})', content)
    captured_date = date_match.group(1) if date_match else None

    # Extract source
    source_match = re.search(r'\*\*Source:\*\*\s*(.+?)(?:\n|$)', content)
    source = source_match.group(1).strip() if source_match else None

    # Determine priority based on content keywords
    priority = "Medium"  # default
    if re.search(r'(adoption blocker|table stakes|critical|urgent)', content, re.IGNORECASE):
        priority = "High"
    elif re.search(r'(nice.to.have|low priority|minor)', content, re.IGNORECASE):
        priority = "Low"

    return {
        "title": title,
        "captured_date": captured_date,
        "source": source,
        "priority": priority,
        "content": content,
        "file_path": file_path
    }


def parse_inline_formatting(text: str) -> List[Dict[str, Any]]:
    """Parse inline markdown formatting and convert to Notion rich_text array."""
    rich_text = []

    # Pattern to match bold (**text**), italic (*text* or _text_), and code (`text`)
    # Process in order: code first (to avoid conflicts), then bold, then italic
    pattern = r'(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|[^`*_]+)'

    parts = re.findall(pattern, text)

    for part in parts:
        if not part:
            continue

        if part.startswith('`') and part.endswith('`'):
            # Code
            content = part[1:-1]
            rich_text.append({
                "type": "text",
                "text": {"content": content[:2000]},
                "annotations": {"code": True, "bold": False, "italic": False, "strikethrough": False, "underline": False, "color": "default"}
            })
        elif part.startswith('**') and part.endswith('**'):
            # Bold
            content = part[2:-2]
            rich_text.append({
                "type": "text",
                "text": {"content": content[:2000]},
                "annotations": {"bold": True, "italic": False, "code": False, "strikethrough": False, "underline": False, "color": "default"}
            })
        elif (part.startswith('*') and part.endswith('*')) or (part.startswith('_') and part.endswith('_')):
            # Italic
            content = part[1:-1]
            rich_text.append({
                "type": "text",
                "text": {"content": content[:2000]},
                "annotations": {"italic": True, "bold": False, "code": False, "strikethrough": False, "underline": False, "color": "default"}
            })
        else:
            # Plain text
            rich_text.append({
                "type": "text",
                "text": {"content": part[:2000]},
                "annotations": {"bold": False, "italic": False, "code": False, "strikethrough": False, "underline": False, "color": "default"}
            })

    # If no parts were found, return the original text
    if not rich_text:
        rich_text.append({
            "type": "text",
            "text": {"content": text[:2000]},
            "annotations": {"bold": False, "italic": False, "code": False, "strikethrough": False, "underline": False, "color": "default"}
        })

    return rich_text


def markdown_to_notion_blocks(markdown: str) -> list:
    """Convert markdown to Notion block objects."""
    blocks = []
    lines = markdown.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i]

        # Skip empty lines
        if not line.strip():
            i += 1
            continue

        # H1 - skip (used as page title)
        if line.startswith('# '):
            i += 1
            continue

        # H2
        if line.startswith('## '):
            blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": parse_inline_formatting(line[3:].strip())
                }
            })
            i += 1
            continue

        # H3
        if line.startswith('### '):
            blocks.append({
                "object": "block",
                "type": "heading_3",
                "heading_3": {
                    "rich_text": parse_inline_formatting(line[4:].strip())
                }
            })
            i += 1
            continue

        # H4
        if line.startswith('#### '):
            blocks.append({
                "object": "block",
                "type": "heading_3",
                "heading_3": {
                    "rich_text": parse_inline_formatting(line[5:].strip())
                }
            })
            i += 1
            continue

        # Horizontal rule
        if line.strip() == '---':
            blocks.append({"object": "block", "type": "divider", "divider": {}})
            i += 1
            continue

        # Blockquote
        if line.startswith('> '):
            quote_text = line[2:].strip()
            blocks.append({
                "object": "block",
                "type": "quote",
                "quote": {
                    "rich_text": parse_inline_formatting(quote_text)
                }
            })
            i += 1
            continue

        # Bullet list
        if line.startswith('- ') or line.startswith('* '):
            bullet_text = line[2:].strip()
            # Skip checkbox items here - they're handled separately
            if not (bullet_text.startswith('[ ]') or bullet_text.startswith('[x]')):
                blocks.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": parse_inline_formatting(bullet_text)
                    }
                })
            i += 1
            continue

        # Checkbox list
        if line.startswith('- [ ] ') or line.startswith('- [x] '):
            checked = line.startswith('- [x] ')
            todo_text = line[6:].strip()
            blocks.append({
                "object": "block",
                "type": "to_do",
                "to_do": {
                    "rich_text": parse_inline_formatting(todo_text),
                    "checked": checked
                }
            })
            i += 1
            continue

        # Table (convert to code block to preserve formatting)
        if line.startswith('|'):
            table_lines = []
            while i < len(lines) and lines[i].startswith('|'):
                table_lines.append(lines[i])
                i += 1
            blocks.append({
                "object": "block",
                "type": "code",
                "code": {
                    "rich_text": [{"type": "text", "text": {"content": '\n'.join(table_lines)[:2000]}}],
                    "language": "plain text"
                }
            })
            continue

        # Code block
        if line.startswith('```'):
            lang = line[3:].strip() or "plain text"
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing ```
            valid_langs = ["javascript", "python", "json", "bash", "sql", "typescript", "html", "css"]
            blocks.append({
                "object": "block",
                "type": "code",
                "code": {
                    "rich_text": [{"type": "text", "text": {"content": '\n'.join(code_lines)[:2000]}}],
                    "language": lang if lang in valid_langs else "plain text"
                }
            })
            continue

        # Regular paragraph
        text = line.strip()
        if text:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": parse_inline_formatting(text)
                }
            })
        i += 1

    return blocks


def search_existing_page(token: str, title: str) -> Optional[str]:
    """Search for an existing page with the same title."""
    try:
        data = {
            "filter": {
                "property": "title",
                "title": {
                    "equals": title
                }
            }
        }
        result = notion_request("POST", f"/databases/{PROBLEM_DOCS_DATABASE_ID}/query", token, data)
        if result.get("results") and len(result["results"]) > 0:
            return result["results"][0]["id"]
    except Exception as e:
        print(f"Warning: Could not search for existing page: {e}", file=sys.stderr)
    return None


def create_notion_page(token: str, data: dict, blocks: list) -> dict:
    """Create a new Notion page."""
    page_data = {
        "parent": {"database_id": PROBLEM_DOCS_DATABASE_ID},
        "properties": {
            "Name": {
                "title": [{"text": {"content": data["title"]}}]
            },
            "Status": {
                "status": {"name": "Not started"}
            },
            "Priority": {
                "select": {"name": data["priority"]}
            },
            "Tags": {
                "multi_select": [{"name": "Problem Doc"}]
            }
        },
        # Add first batch of blocks (max 100)
        "children": blocks[:100]
    }

    result = notion_request("POST", "/pages", token, page_data)

    # If there are more blocks, append them in batches
    if len(blocks) > 100:
        page_id = result["id"]
        for i in range(100, len(blocks), 100):
            batch = blocks[i:i+100]
            notion_request("PATCH", f"/blocks/{page_id}/children", token, {"children": batch})

    return result


def update_notion_page(token: str, page_id: str, data: dict, blocks: list) -> dict:
    """Update an existing Notion page."""
    # Update page properties
    page_data = {
        "properties": {
            "Name": {
                "title": [{"text": {"content": data["title"]}}]
            },
            "Priority": {
                "select": {"name": data["priority"]}
            }
        }
    }

    result = notion_request("PATCH", f"/pages/{page_id}", token, page_data)

    # Get ALL existing blocks and delete them (handle pagination)
    try:
        has_more = True
        while has_more:
            existing_blocks = notion_request("GET", f"/blocks/{page_id}/children?page_size=100", token)
            for block in existing_blocks.get("results", []):
                try:
                    notion_request("DELETE", f"/blocks/{block['id']}", token)
                except Exception as e:
                    print(f"Warning: Could not delete block {block['id']}: {e}", file=sys.stderr)
            has_more = existing_blocks.get("has_more", False)
    except Exception as e:
        print(f"Warning: Could not delete existing blocks: {e}", file=sys.stderr)

    # Add new blocks
    if blocks:
        for i in range(0, len(blocks), 100):
            batch = blocks[i:i+100]
            notion_request("PATCH", f"/blocks/{page_id}/children", token, {"children": batch})

    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: sync-problem-to-notion.py <path-to-problem.md>", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    if not file_path.endswith('.md'):
        print(f"Skipping non-markdown file: {file_path}", file=sys.stderr)
        sys.exit(0)

    # Get Notion token
    token = get_notion_token()
    if not token:
        print("Error: Could not get Notion token from ~/.claude.json", file=sys.stderr)
        sys.exit(1)

    print(f"Syncing {file_path} to Notion...", file=sys.stderr)

    # Parse the problem file
    data = parse_problem_md(file_path)
    print(f"  Title: {data['title']}", file=sys.stderr)
    print(f"  Priority: {data['priority']}", file=sys.stderr)

    # Convert markdown to Notion blocks
    blocks = markdown_to_notion_blocks(data["content"])
    print(f"  Blocks: {len(blocks)}", file=sys.stderr)

    # Check for existing page
    existing_page_id = search_existing_page(token, data["title"])

    if existing_page_id:
        print(f"  Updating existing page: {existing_page_id}", file=sys.stderr)
        result = update_notion_page(token, existing_page_id, data, blocks)
        print(f"  Updated: {result.get('url', 'success')}", file=sys.stderr)
    else:
        print(f"  Creating new page...", file=sys.stderr)
        result = create_notion_page(token, data, blocks)
        print(f"  Created: {result.get('url', 'success')}", file=sys.stderr)

    # Output the result
    print(json.dumps({
        "status": "success",
        "page_id": result.get("id"),
        "url": result.get("url"),
        "title": data["title"]
    }))


if __name__ == "__main__":
    main()
