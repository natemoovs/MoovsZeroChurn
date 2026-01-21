#!/bin/bash
# Direct Notion page creation script
# Bypasses MCP tool's JSON serialization bug

set -e

# Usage: ./notion-create-page.sh <parent_type> <parent_id> <title> [content_file]
# parent_type: "database" or "page"
# parent_id: The UUID of the database or page
# title: The title for the new page
# content_file: Optional path to JSON file containing blocks to add

if [ -z "$NOTION_API_KEY" ]; then
    echo "Error: NOTION_API_KEY environment variable not set"
    exit 1
fi

PARENT_TYPE="${1:-database}"
PARENT_ID="${2}"
TITLE="${3}"
CONTENT_FILE="${4}"

if [ -z "$PARENT_ID" ] || [ -z "$TITLE" ]; then
    echo "Usage: $0 <parent_type> <parent_id> <title> [content_file]"
    echo ""
    echo "Arguments:"
    echo "  parent_type   'database' or 'page'"
    echo "  parent_id     UUID of the parent database or page"
    echo "  title         Title for the new page"
    echo "  content_file  Optional: JSON file with blocks to add as children"
    echo ""
    echo "Example:"
    echo "  $0 database c6e840ca-0c08-4565-99ef-ec7b2dfa6789 'My New Page'"
    echo "  $0 page 2e88aeaa-3759-80f7-b04f-dbc9fe53ee1b 'Child Page' content.json"
    exit 1
fi

# Build parent object based on type
if [ "$PARENT_TYPE" = "database" ]; then
    PARENT_JSON="{\"database_id\": \"$PARENT_ID\"}"
else
    PARENT_JSON="{\"page_id\": \"$PARENT_ID\"}"
fi

# Build properties object (title is required)
PROPERTIES_JSON="{\"title\": [{\"text\": {\"content\": \"$TITLE\"}}]}"

# Build the full request body
if [ -n "$CONTENT_FILE" ] && [ -f "$CONTENT_FILE" ]; then
    CHILDREN_JSON=$(cat "$CONTENT_FILE")
    REQUEST_BODY=$(jq -n \
        --argjson parent "$PARENT_JSON" \
        --argjson properties "$PROPERTIES_JSON" \
        --argjson children "$CHILDREN_JSON" \
        '{parent: $parent, properties: $properties, children: $children}')
else
    REQUEST_BODY=$(jq -n \
        --argjson parent "$PARENT_JSON" \
        --argjson properties "$PROPERTIES_JSON" \
        '{parent: $parent, properties: $properties}')
fi

# Make the API request
RESPONSE=$(curl -s -X POST "https://api.notion.com/v1/pages" \
    -H "Authorization: Bearer $NOTION_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Notion-Version: 2022-06-28" \
    -d "$REQUEST_BODY")

# Check for errors
if echo "$RESPONSE" | jq -e '.object == "error"' > /dev/null 2>&1; then
    echo "Error creating page:"
    echo "$RESPONSE" | jq .
    exit 1
fi

# Output the new page info
PAGE_ID=$(echo "$RESPONSE" | jq -r '.id')
PAGE_URL=$(echo "$RESPONSE" | jq -r '.url')

echo "Page created successfully!"
echo "Page ID: $PAGE_ID"
echo "URL: $PAGE_URL"

# Return the full response for parsing
echo ""
echo "Full response:"
echo "$RESPONSE" | jq .
