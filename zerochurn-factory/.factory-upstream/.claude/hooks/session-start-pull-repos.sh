#!/bin/bash
#
# SessionStart hook: Pull latest from all Moovs repos
#
# Ensures we have the most up-to-date code when starting a Claude session.
#
# This script automatically detects repo locations relative to moovs-factory.
# Expected directory structure:
#   ~/Dev/moovs-factory/     (this repo)
#   ~/Dev/server/            (or as git submodule in moovs-factory/server)
#   ~/Dev/dooms-operator/    (or as git submodule in moovs-factory/dooms-operator)
#   ~/Dev/dooms-customer/    (or as git submodule in moovs-factory/dooms-customer)
#   ~/Dev/dooms-native-driver/ (or as git submodule in moovs-factory/dooms-native-driver)
#

# Get the moovs-factory directory (parent of .claude/hooks)
FACTORY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PARENT_DIR="$(dirname "$FACTORY_DIR")"

# Build list of repos - check both submodule and sibling locations
REPOS=("$FACTORY_DIR")

for REPO_NAME in server dooms-operator dooms-customer dooms-native-driver; do
    # First check if it exists as a submodule/subdirectory within moovs-factory
    if [[ -d "$FACTORY_DIR/$REPO_NAME/.git" ]]; then
        REPOS+=("$FACTORY_DIR/$REPO_NAME")
    # Then check if it exists as a sibling directory
    elif [[ -d "$PARENT_DIR/$REPO_NAME/.git" ]]; then
        REPOS+=("$PARENT_DIR/$REPO_NAME")
    fi
done

echo "🔄 Pulling latest from all repos..."

for REPO in "${REPOS[@]}"; do
    if [[ -d "$REPO/.git" ]]; then
        REPO_NAME=$(basename "$REPO")
        cd "$REPO"

        # Get current branch
        BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

        # Only pull if on main/master and no uncommitted changes
        if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
            if git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
                OUTPUT=$(git pull --quiet 2>&1)
                if [[ $? -eq 0 ]]; then
                    echo "  ✓ $REPO_NAME ($BRANCH)"
                else
                    echo "  ⚠ $REPO_NAME - pull failed"
                fi
            else
                echo "  ⏭ $REPO_NAME - uncommitted changes, skipping"
            fi
        else
            echo "  ⏭ $REPO_NAME - on branch '$BRANCH', skipping"
        fi
    else
        echo "  ✗ $(basename "$REPO") - not found"
    fi
done

echo "✅ Repos updated"
exit 0
