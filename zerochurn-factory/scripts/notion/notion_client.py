#!/usr/bin/env python3
"""
Shared Notion client library for moovs-factory scripts.

Provides:
- Authentication via ~/.claude.json
- Markdown-to-Notion block conversion
- Common API operations
"""

import os
import re
import json
import urllib.request
import urllib.error
from typing import Optional, Dict, List, Any


# Database IDs
DATABASES = {
    "tickets": "13b8aeaa-3759-80f8-8d7c-dd2f627d2578",    # Moovs Tickets (DOOM)
    "tasks": "739c0084-7ce2-4e58-a7c2-f205d5910567",      # Moovs Tasks
    "documents": "c6e840ca-0c08-4565-99ef-ec7b2dfa6789",  # Documents
    "problems": "2e88aeaa-3759-8063-ae62-e4005676ae46",   # Problem Docs
    "mooving": "2d98aeaa-3759-807f-955f-e439615a02d4",    # Mooving Board
}

# Valid options for Moovs Tickets
TICKET_STATUS = ["Not doing anymore", "Accepted", "Ingestion", "In progress", "Archived", "Done"]
TICKET_PRIORITY = ["Low", "Medium", "High"]
TICKET_STAGE = [
    "Not started", "Problem Validation", "Product Design / Work", "UI Design",
    "Ready for dev", "Eng Design", "In Development", "QA", "Code Review",
    "Deployed / Done", "Blocked", "Backlog"
]
TICKET_TYPE = ["Bug", "Feature", "Issue", "Insight", "Request", "Enterprise", "Product", "Module"]
TICKET_TEAM = ["Pocketflows", "Prod", "Eng", "Ensemble", "Layer", "Leadership", "Support"]

# Valid options for Moovs Tasks
TASK_STATUS = ["Not Started", "In Progress", "Completed", "Done", "Archived"]
TASK_PRIORITY = ["Low", "Medium", "High"]


def get_notion_token() -> str:
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
        raise RuntimeError(f"Could not read Notion token from ~/.claude.json: {e}")
    raise RuntimeError("Notion token not found in ~/.claude.json")


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
        raise RuntimeError(f"Notion API error: {e.code} - {error_body}")


def parse_inline_formatting(text: str) -> List[Dict[str, Any]]:
    """Parse inline markdown formatting and convert to Notion rich_text array."""
    rich_text = []

    # Pattern to match bold (**text**), italic (*text* or _text_), and code (`text`)
    pattern = r'(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|[^`*_]+)'
    parts = re.findall(pattern, text)

    for part in parts:
        if not part:
            continue

        annotations = {
            "bold": False, "italic": False, "code": False,
            "strikethrough": False, "underline": False, "color": "default"
        }
        content = part

        if part.startswith('`') and part.endswith('`'):
            content = part[1:-1]
            annotations["code"] = True
        elif part.startswith('**') and part.endswith('**'):
            content = part[2:-2]
            annotations["bold"] = True
        elif (part.startswith('*') and part.endswith('*')) or (part.startswith('_') and part.endswith('_')):
            content = part[1:-1]
            annotations["italic"] = True

        rich_text.append({
            "type": "text",
            "text": {"content": content[:2000]},
            "annotations": annotations
        })

    if not rich_text:
        rich_text.append({
            "type": "text",
            "text": {"content": text[:2000]},
            "annotations": {"bold": False, "italic": False, "code": False, "strikethrough": False, "underline": False, "color": "default"}
        })

    return rich_text


def markdown_to_blocks(markdown: str) -> List[Dict[str, Any]]:
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
                "heading_2": {"rich_text": parse_inline_formatting(line[3:].strip())}
            })
            i += 1
            continue

        # H3
        if line.startswith('### '):
            blocks.append({
                "object": "block",
                "type": "heading_3",
                "heading_3": {"rich_text": parse_inline_formatting(line[4:].strip())}
            })
            i += 1
            continue

        # H4 (render as H3)
        if line.startswith('#### '):
            blocks.append({
                "object": "block",
                "type": "heading_3",
                "heading_3": {"rich_text": parse_inline_formatting(line[5:].strip())}
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
            blocks.append({
                "object": "block",
                "type": "quote",
                "quote": {"rich_text": parse_inline_formatting(line[2:].strip())}
            })
            i += 1
            continue

        # Checkbox list
        if line.startswith('- [ ] ') or line.startswith('- [x] '):
            checked = line.startswith('- [x] ')
            blocks.append({
                "object": "block",
                "type": "to_do",
                "to_do": {
                    "rich_text": parse_inline_formatting(line[6:].strip()),
                    "checked": checked
                }
            })
            i += 1
            continue

        # Bullet list
        if line.startswith('- ') or line.startswith('* '):
            blocks.append({
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {"rich_text": parse_inline_formatting(line[2:].strip())}
            })
            i += 1
            continue

        # Numbered list
        if re.match(r'^\d+\.\s', line):
            text = re.sub(r'^\d+\.\s', '', line)
            blocks.append({
                "object": "block",
                "type": "numbered_list_item",
                "numbered_list_item": {"rich_text": parse_inline_formatting(text.strip())}
            })
            i += 1
            continue

        # Table (convert to code block)
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
            valid_langs = ["javascript", "python", "json", "bash", "sql", "typescript", "html", "css", "go", "ruby", "java"]
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
                "paragraph": {"rich_text": parse_inline_formatting(text)}
            })
        i += 1

    return blocks


def create_page(token: str, database_id: str, properties: Dict[str, Any], blocks: List[Dict] = None) -> Dict:
    """Create a new page in a Notion database."""
    page_data = {
        "parent": {"database_id": database_id},
        "properties": properties,
    }

    if blocks:
        # Add first batch of blocks (max 100)
        page_data["children"] = blocks[:100]

    result = notion_request("POST", "/pages", token, page_data)

    # If there are more blocks, append them in batches
    if blocks and len(blocks) > 100:
        page_id = result["id"]
        for i in range(100, len(blocks), 100):
            batch = blocks[i:i+100]
            notion_request("PATCH", f"/blocks/{page_id}/children", token, {"children": batch})

    return result


def update_page(token: str, page_id: str, properties: Dict[str, Any] = None, blocks: List[Dict] = None, replace_blocks: bool = False) -> Dict:
    """Update an existing Notion page."""
    result = None

    # Update properties if provided
    if properties:
        result = notion_request("PATCH", f"/pages/{page_id}", token, {"properties": properties})

    # Handle blocks
    if blocks:
        if replace_blocks:
            # Delete all existing blocks first
            has_more = True
            while has_more:
                existing = notion_request("GET", f"/blocks/{page_id}/children?page_size=100", token)
                for block in existing.get("results", []):
                    try:
                        notion_request("DELETE", f"/blocks/{block['id']}", token)
                    except:
                        pass
                has_more = existing.get("has_more", False)

        # Add new blocks in batches
        for i in range(0, len(blocks), 100):
            batch = blocks[i:i+100]
            notion_request("PATCH", f"/blocks/{page_id}/children", token, {"children": batch})

    return result or {"id": page_id, "status": "updated"}


def search_in_database(token: str, database_id: str, title: str) -> Optional[str]:
    """Search for a page with a given title in a database."""
    data = {
        "filter": {
            "property": "title",
            "title": {"equals": title}
        }
    }
    try:
        result = notion_request("POST", f"/databases/{database_id}/query", token, data)
        if result.get("results") and len(result["results"]) > 0:
            return result["results"][0]["id"]
    except:
        pass
    return None


# Property builders for common types
def title_property(text: str) -> Dict:
    """Build a title property."""
    return {"title": [{"text": {"content": text}}]}


def rich_text_property(text: str) -> Dict:
    """Build a rich_text property."""
    return {"rich_text": [{"text": {"content": text[:2000]}}]}


def select_property(option: str) -> Dict:
    """Build a select property."""
    return {"select": {"name": option}}


def multi_select_property(options: List[str]) -> Dict:
    """Build a multi_select property."""
    return {"multi_select": [{"name": opt} for opt in options]}


def status_property(status: str) -> Dict:
    """Build a status property."""
    return {"status": {"name": status}}


def date_property(date: str, end: str = None) -> Dict:
    """Build a date property. Date format: YYYY-MM-DD"""
    prop = {"date": {"start": date}}
    if end:
        prop["date"]["end"] = end
    return prop


def people_property(user_ids: List[str]) -> Dict:
    """Build a people property with user IDs."""
    return {"people": [{"id": uid} for uid in user_ids]}


def url_property(url: str) -> Dict:
    """Build a URL property."""
    return {"url": url}


def number_property(value: float) -> Dict:
    """Build a number property."""
    return {"number": value}
