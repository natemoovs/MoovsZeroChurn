#!/bin/bash
#
# PostToolUse hook: Sync problem.md files to Notion
#
# This hook triggers after the Write tool creates/updates a file.
# It checks if the file matches problems/*.md and syncs to Notion.
#

set -e

# Read the hook input from stdin
INPUT=$(cat)

# Extract the file path from the tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Check if we have a file path
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Check if the file matches the problems/*.md pattern
if [[ ! "$FILE_PATH" =~ problems/[^/]+\.md$ ]]; then
    exit 0
fi

# Check if file exists
if [[ ! -f "$FILE_PATH" ]]; then
    exit 0
fi

echo "Syncing problem doc to Notion: $FILE_PATH"

# Run the sync script
SCRIPT_DIR="$(dirname "$0")/../../scripts"
python3 "$SCRIPT_DIR/sync-problem-to-notion.py" "$FILE_PATH"

exit 0
