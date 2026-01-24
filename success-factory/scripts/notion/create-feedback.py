#!/usr/bin/env python3
"""
Create a Factory Feedback entry in the Moovs Factory Feedback database.

Database: Factory Feedback (2ef8aeaa-3759-8063-a108-000cb1d3db49)

Properties:
    - Name (title)
    - Severity (select: Critical, Major, Minor, Suggestion)
    - Area (select: Skill, Knowledge, Integration, Other)
    - Skill (select: problem, shaping, ticket-shaping, etc.)
    - Reproducible (select: Always, Sometimes, Once, Not Sure)
    - Status (select: New, Investigating, In Progress, Fixed, Won't Fix, Duplicate)
    - Date Submitted (date)
    - Submitted By (rich_text)

Usage:
    python3 create-feedback.py \\
        --title "Customer research skill returned wrong data" \\
        --severity Major \\
        --area Skill \\
        --skill customer-research \\
        --reproducible Always \\
        --description "Full report content here..."

    # From stdin
    echo "Report content" | python3 create-feedback.py --title "Bug" --severity Minor --stdin
"""

import sys
import os
import argparse
import json
from datetime import datetime
from pathlib import Path


def get_configured_user() -> str:
    """Get the user name from ~/.moovs-factory.json if configured."""
    config_path = Path.home() / ".moovs-factory.json"
    try:
        if config_path.exists():
            with open(config_path) as f:
                config = json.load(f)
                return config.get("name", "")
    except Exception:
        pass
    return ""

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from notion_client import (
    get_notion_token, create_page, markdown_to_blocks, DATABASES,
    title_property, rich_text_property, select_property, date_property, people_property
)

# Add feedback database to DATABASES if not present
FEEDBACK_DATABASE_ID = os.environ.get(
    "NOTION_FEEDBACK_DATABASE",
    "2ef8aeaa-3759-80fd-ac7e-fe6253f444f5"  # Factory Feedback database
)

# Valid options
SEVERITY_OPTIONS = ["Critical", "Major", "Minor", "Suggestion"]
AREA_OPTIONS = ["Skill", "Knowledge", "Integration", "Other"]
REPRODUCIBLE_OPTIONS = ["Always", "Sometimes", "Once", "Not Sure"]
STATUS_OPTIONS = ["New", "Investigating", "In Progress", "Fixed", "Won't Fix", "Duplicate"]

# Known skills for validation
KNOWN_SKILLS = [
    "problem", "shaping", "ticket-shaping", "product-ops", "tickets",
    "customer-research", "blog-post", "email-sequence", "release-notes",
    "landing-page", "press-release", "design-brief", "image", "prototype",
    "moovs-walkthrough-capture", "feedback"
]

# Notion user ID mapping (for Person Submitted property)
# Maps lowercase names/emails to Notion user IDs
NOTION_USERS = {
    "amir": "69c13ad3-3e54-4f7b-bf7e-e93f6110915d",
    "amir ghorbani": "69c13ad3-3e54-4f7b-bf7e-e93f6110915d",
    "chris": "0900ccd6-ed95-4916-a40a-156bf72d664d",
    "chris behan": "0900ccd6-ed95-4916-a40a-156bf72d664d",
    "tyler": "516a8368-2322-4529-a1c7-746392851e18",
    "tyler montz": "516a8368-2322-4529-a1c7-746392851e18",
    "peter": "2e573a02-cf1c-4024-bd99-393ca013bcb4",
    "peter evenson": "2e573a02-cf1c-4024-bd99-393ca013bcb4",
    "ruben": "8696e784-ab57-417e-bb39-0a209f709b4f",
    "ruben schultz": "8696e784-ab57-417e-bb39-0a209f709b4f",
    "joan": "88e0df2d-a26d-4dda-b786-c3a872a2937d",
    "joan badia": "88e0df2d-a26d-4dda-b786-c3a872a2937d",
    "marton": "14032271-41be-46f7-bf58-fe1b914f5990",
    "márton": "14032271-41be-46f7-bf58-fe1b914f5990",
    "santiago": "db175734-fb75-41b0-a76f-e835f10ed991",
    "santiago gallo": "db175734-fb75-41b0-a76f-e835f10ed991",
    "pol": "34e46df4-06b4-46be-b7de-f7b7a66e13b0",
    "john cervantes": "34e46df4-06b4-46be-b7de-f7b7a66e13b0",
    "sebastian": "1c0d872b-594c-810a-b84c-0002b74ebf77",
    "sebastian contreras": "1c0d872b-594c-810a-b84c-0002b74ebf77",
    "nate": "2d5d872b-594c-8152-a869-0002a290d93f",
    "nate bullock": "2d5d872b-594c-8152-a869-0002a290d93f",
    "andrea": "2e6d872b-594c-815e-9450-0002a2899317",
    "andrea montealegre": "2e6d872b-594c-815e-9450-0002a2899317",
    "arwen": "245d872b-594c-812b-9492-000208fe6eaf",
    "arwen montana": "245d872b-594c-812b-9492-000208fe6eaf",
    "kate": "1f4d872b-594c-81f5-ab75-0002868705f4",
    "kate co": "1f4d872b-594c-81f5-ab75-0002868705f4",
}


def create_feedback(
    title: str,
    severity: str = "Minor",
    area: str = "Other",
    skill: str = None,
    reproducible: str = "Not Sure",
    description: str = None,
    session_context: str = None,
    submitted_by: str = None,
) -> dict:
    """Create a Factory Feedback entry."""
    token = get_notion_token()

    # Build properties
    properties = {
        "Name": title_property(title),
        "Severity": select_property(severity),
        "Area": select_property(area),
        "Reproducible": select_property(reproducible),
        "Status": select_property("New"),
        "Date Submitted": date_property(datetime.now().strftime("%Y-%m-%d")),
    }

    if skill:
        properties["Skill"] = select_property(skill)

    if submitted_by:
        # Try to find Notion user ID for Person Submitted property
        user_id = NOTION_USERS.get(submitted_by.lower())
        if user_id:
            properties["Person Submitted"] = people_property([user_id])
        else:
            # Fall back to text field if user not found
            properties["Submitted By"] = rich_text_property(submitted_by)
            print(f"Note: '{submitted_by}' not found in Notion users, using text field", file=sys.stderr)

    # Build page content
    content_parts = []

    if session_context:
        content_parts.append("## Session Context (Auto-Captured)")
        content_parts.append(session_context)
        content_parts.append("")

    if description:
        content_parts.append("## Feedback Report")
        content_parts.append(description)

    content_parts.append("")
    content_parts.append("---")
    content_parts.append(f"*Submitted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")

    body = "\n".join(content_parts)
    blocks = markdown_to_blocks(body) if body else None

    # Create the page
    result = create_page(token, FEEDBACK_DATABASE_ID, properties, blocks)

    return {
        "status": "success",
        "page_id": result.get("id"),
        "url": result.get("url"),
        "title": title,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Create a Factory Feedback entry in Notion",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Valid options:
  Severity: Critical, Major, Minor, Suggestion
  Area: Skill, Knowledge, Integration, Other
  Reproducible: Always, Sometimes, Once, Not Sure
  Skill: problem, shaping, ticket-shaping, product-ops, tickets,
         customer-research, blog-post, email-sequence, release-notes,
         landing-page, press-release, design-brief, image, prototype,
         moovs-walkthrough-capture, feedback

Examples:
  %(prog)s --title "HubSpot auth failing" --severity Major --area Integration
  %(prog)s --title "Wrong ICP info" --severity Minor --area Knowledge
  echo "Details" | %(prog)s --title "Bug" --severity Minor --stdin
        """
    )

    parser.add_argument("--title", "-t", required=True, help="Brief summary of the feedback")
    parser.add_argument("--severity", "-s", choices=SEVERITY_OPTIONS, default="Minor", help="Severity level")
    parser.add_argument("--area", "-a", choices=AREA_OPTIONS, default="Other", help="Area of the factory")
    parser.add_argument("--skill", help="Specific skill if area is Skill")
    parser.add_argument("--reproducible", "-r", choices=REPRODUCIBLE_OPTIONS, default="Not Sure", help="Reproducibility")
    parser.add_argument("--description", "-d", help="Full description/report")
    parser.add_argument("--session-context", help="Auto-captured session context")

    # Get default user from config
    default_user = get_configured_user()
    parser.add_argument(
        "--submitted-by",
        default=default_user or None,
        help=f"Name of person submitting (default: {default_user or 'not configured - run scripts/setup-user.sh'})"
    )
    parser.add_argument("--stdin", action="store_true", help="Read description from stdin")

    args = parser.parse_args()

    # Handle stdin
    description = args.description
    if args.stdin:
        description = sys.stdin.read()

    # Validate skill if provided
    if args.skill and args.skill not in KNOWN_SKILLS:
        print(f"Warning: Unknown skill '{args.skill}'. Known skills: {', '.join(KNOWN_SKILLS)}", file=sys.stderr)

    # Create the feedback
    print(f"Creating feedback: {args.title}...", file=sys.stderr)

    result = create_feedback(
        title=args.title,
        severity=args.severity,
        area=args.area,
        skill=args.skill,
        reproducible=args.reproducible,
        description=description,
        session_context=args.session_context,
        submitted_by=args.submitted_by,
    )

    print(f"Created: {result.get('url')}", file=sys.stderr)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
