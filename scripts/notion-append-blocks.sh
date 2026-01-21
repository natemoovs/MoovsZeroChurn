#!/bin/bash
# Append blocks to a Notion page
# Bypasses MCP tool limitations for large content

set -e

if [ -z "$NOTION_API_KEY" ]; then
    echo "Error: NOTION_API_KEY environment variable not set"
    exit 1
fi

PAGE_ID="${1}"
BLOCKS_FILE="${2}"

if [ -z "$PAGE_ID" ] || [ -z "$BLOCKS_FILE" ]; then
    echo "Usage: $0 <page_id> <blocks_file>"
    echo ""
    echo "Arguments:"
    echo "  page_id       UUID of the page to append to"
    echo "  blocks_file   JSON file containing array of block objects"
    echo ""
    echo "Example:"
    echo "  $0 2e88aeaa-3759-80f7-b04f-dbc9fe53ee1b blocks.json"
    exit 1
fi

if [ ! -f "$BLOCKS_FILE" ]; then
    echo "Error: Blocks file not found: $BLOCKS_FILE"
    exit 1
fi

# Read blocks from file
BLOCKS_JSON=$(cat "$BLOCKS_FILE")

# Build request body
REQUEST_BODY=$(jq -n --argjson children "$BLOCKS_JSON" '{children: $children}')

# Make the API request
RESPONSE=$(curl -s -X PATCH "https://api.notion.com/v1/blocks/$PAGE_ID/children" \
    -H "Authorization: Bearer $NOTION_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Notion-Version: 2022-06-28" \
    -d "$REQUEST_BODY")

# Check for errors
if echo "$RESPONSE" | jq -e '.object == "error"' > /dev/null 2>&1; then
    echo "Error appending blocks:"
    echo "$RESPONSE" | jq .
    exit 1
fi

echo "Blocks appended successfully!"
echo "$RESPONSE" | jq -r '.results | length' | xargs -I {} echo "Added {} blocks"
